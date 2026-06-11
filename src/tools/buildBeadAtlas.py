#!/usr/bin/env python3

import json
import hashlib
import re
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage
from scipy.optimize import linear_sum_assignment
from scipy.spatial import ConvexHull


ROOT = Path(__file__).resolve().parents[2]
ASSET_ROOT = ROOT / "assets"
SOURCE_SHEET = ASSET_ROOT / "beads.png"
OUTPUT_MANIFEST = ROOT / "src" / "assets" / "beadAtlasManifest.js"

THEME_BANDS = {
    "plant": (0, 1000),
    "star": (1000, 2000),
    "ocean": (2000, 3272),
}
LABEL_BOXES = {
    "plant": {
        (316, 288, 64, 24),
        (266, 289, 43, 23),
        (564, 289, 64, 23),
        (1298, 289, 42, 23),
        (1731, 289, 64, 23),
        (1997, 287, 36, 37),  # Decorative flower not present in source inventory.
    },
    "star": {
        (564, 1166, 64, 23),
        (1309, 1166, 41, 23),
        (1747, 1166, 64, 23),
    },
    "ocean": {
        (564, 2143, 64, 23),
        (1317, 2143, 42, 23),
        (1756, 2143, 64, 23),
    },
}
SOURCE_PADDING = 3


def asset_id(theme, path):
    stem = re.sub(r"[^a-zA-Z0-9]+", "-", path.stem).strip("-").lower()
    return f"{theme}-{stem}"


def opaque_crop(image):
    alpha = np.asarray(image.getchannel("A")) > 5
    ys, xs = np.where(alpha)
    if len(xs) == 0:
        raise RuntimeError("Source bead image has no visible pixels")
    return image.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


def component_boxes(sheet):
    alpha = np.asarray(sheet.getchannel("A")) > 5
    connected = ndimage.binary_dilation(alpha, iterations=3)
    labels, _ = ndimage.label(connected)
    boxes = []

    for slices in ndimage.find_objects(labels):
        if not slices:
            continue
        y_slice, x_slice = slices
        component_alpha = alpha[y_slice, x_slice]
        ys, xs = np.where(component_alpha)
        if len(xs) == 0:
            continue

        box = (
            x_slice.start + int(xs.min()),
            y_slice.start + int(ys.min()),
            int(xs.max() - xs.min() + 1),
            int(ys.max() - ys.min() + 1),
        )
        if 3 <= box[2] <= 100 and 3 <= box[3] <= 100:
            boxes.append(box)

    return boxes


def image_difference(source, target):
    best = float("inf")
    for resampling in (Image.Resampling.NEAREST, Image.Resampling.BILINEAR):
        resized = np.asarray(
            source.resize(target.size, resampling),
            dtype=np.float32,
        )
        expected = np.asarray(target, dtype=np.float32)
        resized_alpha = resized[:, :, 3:4] / 255
        expected_alpha = expected[:, :, 3:4] / 255
        color_difference = np.abs(
            resized[:, :, :3] * resized_alpha
            - expected[:, :, :3] * expected_alpha
        ).mean()
        alpha_difference = np.abs(
            resized[:, :, 3] - expected[:, :, 3]
        ).mean()
        best = min(best, color_difference + alpha_difference * 0.5)
    return best


def polygon_centroid(points):
    area_twice = 0
    centroid_x = 0
    centroid_y = 0
    for index, point in enumerate(points):
        next_point = points[(index + 1) % len(points)]
        cross = point[0] * next_point[1] - next_point[0] * point[1]
        area_twice += cross
        centroid_x += (point[0] + next_point[0]) * cross
        centroid_y += (point[1] + next_point[1]) * cross

    if abs(area_twice) < 0.001:
        return np.mean(points, axis=0)
    return np.array([
        centroid_x / (3 * area_twice),
        centroid_y / (3 * area_twice),
    ])


def collision_metadata(sheet, x, y, width, height):
    alpha = np.asarray(
        sheet.getchannel("A").crop((x, y, x + width, y + height))
    )
    ys, xs = np.where(alpha >= 32)
    points = np.column_stack((xs, ys))
    hull = points[ConvexHull(points).vertices].astype(np.float64)
    visible_center = np.array([
        (float(xs.min()) + float(xs.max())) / 2,
        (float(ys.min()) + float(ys.max())) / 2,
    ])

    # Pull the hull slightly inward so antialiased edge pixels do not enlarge collisions.
    hull = visible_center + (hull - visible_center) * 0.96
    crop_center = np.array([width / 2, height / 2])
    vertices = [
        {
            "x": round(float(point[0] - visible_center[0]), 2),
            "y": round(float(point[1] - visible_center[1]), 2),
        }
        for point in hull
    ]
    return {
        "collisionVertices": vertices,
        "collisionWidth": round(float(xs.max() - xs.min() + 1) * 0.96, 2),
        "collisionHeight": round(float(ys.max() - ys.min() + 1) * 0.96, 2),
        "renderOffsetX": round(float(crop_center[0] - visible_center[0]), 2),
        "renderOffsetY": round(float(crop_center[1] - visible_center[1]), 2),
    }


def match_theme(sheet, theme, boxes):
    files = sorted((ASSET_ROOT / theme).glob("*.png"))
    files_by_hash = {}
    for path in files:
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        files_by_hash.setdefault(digest, []).append(path)
    unique_files = [paths[0] for paths in files_by_hash.values()]

    candidates = [
        box for box in boxes
        if THEME_BANDS[theme][0] <= box[1] < THEME_BANDS[theme][1]
        and box not in LABEL_BOXES[theme]
    ]

    if len(unique_files) != len(candidates):
        raise RuntimeError(
            f"{theme}: expected {len(unique_files)} unique sprite boxes, "
            f"found {len(candidates)}"
        )

    costs = np.full((len(unique_files), len(candidates)), 100000, dtype=np.float32)
    source_crops = []
    for path in unique_files:
        with Image.open(path) as source:
            source_crops.append(opaque_crop(source.convert("RGBA")))

    for file_index, source in enumerate(source_crops):
        source_ratio = source.width / source.height
        for box_index, (x, y, width, height) in enumerate(candidates):
            target_ratio = width / height
            if abs(np.log(target_ratio / source_ratio)) > 0.65:
                continue
            target = sheet.crop((x, y, x + width, y + height))
            costs[file_index, box_index] = image_difference(source, target)

    rows, columns = linear_sum_assignment(costs)
    if costs[rows, columns].max() >= 120:
        worst = int(np.argmax(costs[rows, columns]))
        raise RuntimeError(
            f"{theme}: unreliable match for {unique_files[rows[worst]].name} "
            f"(difference {costs[rows[worst], columns[worst]]:.1f})"
        )

    entries = []
    for row, column in zip(rows, columns):
        x, y, width, height = candidates[column]
        padded_x = max(0, x - SOURCE_PADDING)
        padded_y = max(0, y - SOURCE_PADDING)
        padded_right = min(sheet.width, x + width + SOURCE_PADDING)
        padded_bottom = min(sheet.height, y + height + SOURCE_PADDING)
        matched_path = unique_files[row]
        digest = hashlib.sha256(matched_path.read_bytes()).hexdigest()
        for source_path in files_by_hash[digest]:
            entry = {
                "id": asset_id(theme, source_path),
                "theme": theme,
                "x": padded_x,
                "y": padded_y,
                "w": padded_right - padded_x,
                "h": padded_bottom - padded_y,
            }
            entry.update(collision_metadata(
                sheet,
                entry["x"],
                entry["y"],
                entry["w"],
                entry["h"],
            ))
            entries.append(entry)

    return sorted(entries, key=lambda entry: entry["id"])


def write_manifest(entries):
    counts = {
        theme: sum(entry["theme"] == theme for entry in entries)
        for theme in THEME_BANDS
    }
    payload = json.dumps(entries, ensure_ascii=True, separators=(",", ":"))
    count_payload = json.dumps(counts, separators=(",", ":"))
    OUTPUT_MANIFEST.write_text(
        "// Generated by src/tools/buildBeadAtlas.py. Do not edit manually.\n"
        f"const BEAD_ATLAS_MANIFEST = Object.freeze({payload});\n"
        f"const BEAD_ATLAS_THEME_COUNTS = Object.freeze({count_payload});\n",
        encoding="ascii",
    )


def main():
    sheet = Image.open(SOURCE_SHEET).convert("RGBA")
    boxes = component_boxes(sheet)
    entries = []
    for theme in THEME_BANDS:
        entries.extend(match_theme(sheet, theme, boxes))
    write_manifest(entries)

    counts = {
        theme: sum(entry["theme"] == theme for entry in entries)
        for theme in THEME_BANDS
    }
    print(f"Mapped {len(entries)} original sprites from {SOURCE_SHEET.relative_to(ROOT)}")
    print(f"Wrote {OUTPUT_MANIFEST.relative_to(ROOT)}: {counts}")


if __name__ == "__main__":
    main()
