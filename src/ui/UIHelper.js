/**
 * 
 * @param {number} x 
 * @param {number} y
 * @param {number} w
 * @param {number} h
 */
function isClicked(x, y, w, h) {
    return mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h && mouseIsPressed;
}

function isHovered(x, y, w, h) {
    return mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h;
}

// ── 공유 색상/모양 상수 ────────────────────────────────────────────────────────
const POT_COLORS  = ['#F4A7B9','#89C4E1','#90E0AE','#D4A8E8','#F5F5F5','#CCCCCC','#888888','#333333'];
const BG_COLORS   = ['#EEEEF5','#E8F4F8','#F0F8F0','#FDFDE6','#F5EEF8','#F8F8F8','#BABABA','#1C1C1C'];
const STEM_COLORS = ['#222222','#FFFFFF','#1A7A1A','#66FF44','#AAAAAA'];

// 테마별 줄기 색상 팔레트 (potDetailUI, gardenUI 공용)
const STEM_COLORS_BY_THEME = {
  [POT_THEMES?.PLANT ?? 'plant']: ['#222222','#FFFFFF','#1A7A1A','#66FF44','#AAAAAA'],
  [POT_THEMES?.OCEAN ?? 'ocean']: ['#222222','#FFFFFF','#1B3FA0','#7BE8F5','#AAAAAA'],
  [POT_THEMES?.STAR  ?? 'star' ]: ['#222222','#FFFFFF','#CC00CC','#00CCBB','#AAAAAA'],
};

function getStemColor(pot, colorIndex) {
  if (colorIndex === undefined || colorIndex === null) return '#AAAAAA';
  const theme = (typeof normalizePotTheme === 'function') ? normalizePotTheme(pot) : 'plant';
  const palette = STEM_COLORS_BY_THEME[theme] ?? STEM_COLORS;
  return palette[colorIndex] ?? '#AAAAAA';
}

function beadPathPlacements(
  points,
  beads,
  count,
  beadHeight,
  gap = 0.5,
  alignment = 'center'
) {
  if (!points || points.length < 2 || count <= 0) return [];

  let lengths = [0];
  for (let i = 1; i < points.length; i++) {
    lengths.push(
      lengths[i - 1] + dist(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y)
    );
  }
  let pathLength = lengths[lengths.length - 1];
  if (pathLength <= 0) return [];

  let sizes = [];
  for (let i = 0; i < count; i++) {
    let bead = beads[i];
    let asset = bead?.assetId ? getBeadAtlasEntry(bead.assetId) : null;
    let width = asset ? beadHeight * asset.source.w / asset.source.h : beadHeight;
    let visibleWidth = asset
      ? width * asset.collisionWidth / asset.gameplayWidth
      : width;
    sizes.push({
      width,
      visibleWidth,
      height: beadHeight,
    });
  }

  let occupiedLength = sizes.reduce((total, size) => total + size.visibleWidth, 0)
    + gap * Math.max(0, count - 1);
  let fitScale = occupiedLength > pathLength ? pathLength / occupiedLength : 1;
  let cursor = alignment === 'start'
    ? 0
    : Math.max(0, (pathLength - occupiedLength * fitScale) / 2);

  return sizes.map((size) => {
    let width = size.width * fitScale;
    let visibleWidth = size.visibleWidth * fitScale;
    let height = size.height * fitScale;
    let centerDistance = cursor + visibleWidth / 2;
    cursor += visibleWidth + gap * fitScale;

    let segment = 0;
    while (
      segment < lengths.length - 2 &&
      lengths[segment + 1] < centerDistance
    ) {
      segment++;
    }
    let segmentLength = lengths[segment + 1] - lengths[segment];
    let localT = segmentLength > 0
      ? (centerDistance - lengths[segment]) / segmentLength
      : 0;
    let start = points[segment];
    let end = points[segment + 1];
    return {
      x: lerp(start.x, end.x, localT),
      y: lerp(start.y, end.y, localT),
      angle: atan2(end.y - start.y, end.x - start.x),
      width,
      visibleWidth,
      height,
      pathDistance: centerDistance,
    };
  });
}

function stemPathLength(points) {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += dist(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
  }
  return length;
}

function fitStemPathLength(baseX, baseY, angle, targetLength, buildPoints) {
  let directionX = sin(angle);
  let directionY = -cos(angle);
  let makeCandidate = (endpointDistance) => {
    let geometry = {
      baseX,
      baseY,
      tipX: baseX + directionX * endpointDistance,
      tipY: baseY + directionY * endpointDistance,
    };
    return {
      geometry,
      points: buildPoints(geometry),
    };
  };

  let minimum = makeCandidate(0.01);
  if (stemPathLength(minimum.points) > targetLength) {
    let full = makeCandidate(targetLength);
    let fullLength = stemPathLength(full.points);
    let scale = fullLength > 0 ? targetLength / fullLength : 1;
    let points = full.points.map((point) => ({
      x: baseX + (point.x - baseX) * scale,
      y: baseY + (point.y - baseY) * scale,
    }));
    return {
      geometry: {
        ...full.geometry,
        tipX: points[points.length - 1].x,
        tipY: points[points.length - 1].y,
      },
      points,
    };
  }

  let low = 0;
  let high = targetLength;
  let best = makeCandidate(high);
  for (let i = 0; i < 24; i++) {
    let midpoint = (low + high) / 2;
    let candidate = makeCandidate(midpoint);
    if (stemPathLength(candidate.points) > targetLength) {
      high = midpoint;
    } else {
      low = midpoint;
      best = candidate;
    }
  }
  return best;
}

function normalizeRenderableStem(stem, index) {
  const defaultAngles = [340, 0, 20, 330, 30];
  const defaultOffsets = [-48, 0, 48, -24, 24];
  return {
    ...(stem ?? {}),
    stemColor: stem?.stemColor ?? 0,
    stemShape: stem?.stemShape ?? 0,
    stemAngle: stem?.stemAngle ?? stem?.angle ?? defaultAngles[index % defaultAngles.length],
    baseOffset: stem?.baseOffset ?? defaultOffsets[index % defaultOffsets.length],
    stemLength: stem?.stemLength ?? 210,
    curveSharpness: stem?.curveSharpness ?? 45,
    curveDepth: stem?.curveDepth ?? 45,
    waveWidth: stem?.waveWidth ?? (stem?.stemShape === 3 ? 12 : 13),
    beads: stem?.beads ?? [],
  };
}

function createPotRenderLayout(pot, x, y, w, h, options = {}) {
  const asset = getPotAssetForPot(pot);
  const potMaxWidth = options.potMaxWidth ?? min(220, w * 0.55);
  const potMaxHeight = options.potMaxHeight ?? min(190, h * 0.55);
  const preserveAtlasScale = options.preserveAtlasScale ?? true;
  const potSize = getPotAssetDrawSize(
    asset,
    potMaxWidth,
    potMaxHeight,
    preserveAtlasScale
  );
  const stemYOffset = (asset?.stemYRatio ?? 0) * potSize.height;
  const openingCenterRatio = asset?.stemOpeningCenterRatio ?? 0.5;
  const potTopY = y + h - (options.bottomMargin ?? 45) - potMaxHeight;
  const cx = x + w / 2;
  return {
    asset,
    potMaxWidth,
    potMaxHeight,
    preserveAtlasScale,
    potSize,
    cx,
    potDrawX: cx - (openingCenterRatio - 0.5) * potSize.width,
    potTopY,
    baseY: potTopY + stemYOffset,
  };
}

function potRenderStemOffsetLimit(layout) {
  const openingRatio = layout.asset?.stemOpeningRatio ?? 0.8;
  return max(0, layout.potSize.width * openingRatio / 2 - 4);
}

function potRenderStemBaseY(layout, baseOffset) {
  const maxOffset = potRenderStemOffsetLimit(layout);
  if (maxOffset <= 0) return layout.baseY;

  const normalizedX = constrain(baseOffset / maxOffset, -1, 1);
  const curve = layout.asset?.stemOpeningCurveRatio ?? 0;
  const tilt = layout.asset?.stemOpeningTiltRatio ?? 0;
  return layout.baseY +
    layout.potSize.height * (
      curve * normalizedX * normalizedX +
      tilt * normalizedX
    );
}

function buildPotRenderStemPath(stem) {
  switch (stem.data.stemShape) {
    case 1:
      return buildCurvedPotStemPath(stem);
    case 2:
      return buildWavePotStemPath(stem, 5, true);
    case 3:
      return buildWavePotStemPath(stem, 3, false);
    default:
      return [
        { x: stem.baseX, y: stem.baseY },
        { x: stem.tipX, y: stem.tipY },
      ];
  }
}

function buildCurvedPotStemPath(stem) {
  const start = { x: stem.baseX, y: stem.baseY };
  const end = { x: stem.tipX, y: stem.tipY };
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) return [start];

  const tangent = { x: dx / length, y: dy / length };
  const normal = { x: -tangent.y, y: tangent.x };
  const depth = constrain(stem.data.curveDepth, -100, 100) / 100;
  const sharpness = constrain(stem.data.curveSharpness, 0, 100) / 100;
  const midpoint = {
    x: (start.x + end.x) / 2 + normal.x * length * depth * 0.5,
    y: (start.y + end.y) / 2 + normal.y * length * depth * 0.5,
  };
  const handle = length * 0.24;
  const controlIn = {
    x: lerp(midpoint.x - tangent.x * handle, lerp(start.x, midpoint.x, 0.55), sharpness),
    y: lerp(midpoint.y - tangent.y * handle, lerp(start.y, midpoint.y, 0.55), sharpness),
  };
  const controlOut = {
    x: lerp(midpoint.x + tangent.x * handle, lerp(midpoint.x, end.x, 0.45), sharpness),
    y: lerp(midpoint.y + tangent.y * handle, lerp(midpoint.y, end.y, 0.45), sharpness),
  };
  const quadraticPoint = (p0, p1, p2, t) => {
    const u = 1 - t;
    return {
      x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
      y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
    };
  };
  const points = [];
  for (let i = 0; i <= 14; i++) {
    points.push(quadraticPoint(start, controlIn, midpoint, i / 14));
  }
  for (let i = 1; i <= 14; i++) {
    points.push(quadraticPoint(midpoint, controlOut, end, i / 14));
  }
  return points;
}

function buildWavePotStemPath(stem, cycles, triangular) {
  const dx = stem.tipX - stem.baseX;
  const dy = stem.tipY - stem.baseY;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) return [{ x: stem.baseX, y: stem.baseY }];

  const normalX = -dy / length;
  const normalY = dx / length;
  const points = [];
  for (let i = 0; i <= cycles * 12; i++) {
    const t = i / (cycles * 12);
    const wave = triangular
      ? (2 / Math.PI) * Math.asin(Math.sin(t * cycles * TWO_PI))
      : sin(t * cycles * TWO_PI);
    points.push({
      x: lerp(stem.baseX, stem.tipX, t) + normalX * stem.data.waveWidth * wave,
      y: lerp(stem.baseY, stem.tipY, t) + normalY * stem.data.waveWidth * wave,
    });
  }
  return points;
}

function potPathPointsThroughDistance(points, endDistance) {
  if (points.length < 2) return points;

  const result = [points[0]];
  let travelled = 0;
  for (let i = 1; i < points.length; i++) {
    const segmentLength = dist(
      points[i - 1].x,
      points[i - 1].y,
      points[i].x,
      points[i].y
    );
    if (travelled + segmentLength >= endDistance) {
      const t = segmentLength > 0
        ? constrain((endDistance - travelled) / segmentLength, 0, 1)
        : 0;
      result.push({
        x: lerp(points[i - 1].x, points[i].x, t),
        y: lerp(points[i - 1].y, points[i].y, t),
      });
      return result;
    }
    result.push(points[i]);
    travelled += segmentLength;
  }
  return result;
}

function buildPotRenderStems(pot, layout, options = {}) {
  const lengthScale = options.lengthScale ?? 1.2;
  const beadHeight = options.beadHeight ?? 18;
  const maxOffset = potRenderStemOffsetLimit(layout);
  return (pot?.stems ?? []).map((rawStem, index) => {
    const data = normalizeRenderableStem(rawStem, index);
    data.baseOffset = constrain(data.baseOffset, -maxOffset, maxOffset);
    const baseX = layout.cx + data.baseOffset;
    const baseY = potRenderStemBaseY(layout, data.baseOffset);
    const fitted = fitStemPathLength(
      baseX,
      baseY,
      radians(data.stemAngle),
      data.stemLength * lengthScale,
      (geometry) => buildPotRenderStemPath({ ...geometry, data })
    );
    const count = data.beads.length || data.beadCount || 0;
    const beadPlacements = beadPathPlacements(
      fitted.points,
      data.beads,
      count,
      beadHeight,
      0.5,
      'start'
    );
    const lastBead = beadPlacements[beadPlacements.length - 1];
    const endDistance = lastBead
      ? lastBead.pathDistance + (lastBead.visibleWidth ?? lastBead.width) / 2
      : null;
    return {
      data,
      ...fitted.geometry,
      points: fitted.points,
      beadPlacements,
      displayPoints: endDistance === null
        ? fitted.points
        : potPathPointsThroughDistance(fitted.points, endDistance),
    };
  });
}

function drawPotRenderPath(points) {
  if (points.length < 2) return;
  noFill();
  beginShape();
  for (const point of points) vertex(point.x, point.y);
  endShape();
}

function distanceToPotRenderPath(x, y, points) {
  let closest = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared > 0
      ? constrain(((x - start.x) * dx + (y - start.y) * dy) / lengthSquared, 0, 1)
      : 0;
    closest = min(closest, dist(x, y, start.x + t * dx, start.y + t * dy));
  }
  return closest;
}

function drawPotRenderBeads(stem) {
  const beads = stem.data.beads ?? [];
  const count = beads.length || stem.data.beadCount || 0;
  for (let i = 0; i < count; i++) {
    const placement = stem.beadPlacements[i];
    const bead = beads[i];
    const asset = bead?.assetId ? getBeadAtlasEntry(bead.assetId) : null;
    const imageAsset = bead?.beadId ? beadImages[bead.beadId] : null;
    if (!placement) continue;

    if (asset) {
      drawBeadAtlas(
        asset,
        placement.x,
        placement.y,
        placement.width,
        placement.height,
        placement.angle
      );
    } else if (imageAsset) {
      push();
      translate(placement.x, placement.y);
      rotate(placement.angle);
      imageMode(CENTER);
      image(imageAsset, 0, 0, placement.width, placement.height);
      pop();
    } else {
      noStroke();
      fill(bead?.color ?? 200);
      ellipse(placement.x, placement.y, placement.height);
    }
  }
}

function drawPotComposition(pot, x, y, w, h, options = {}) {
  const layout = createPotRenderLayout(pot, x, y, w, h, options);
  const stems = buildPotRenderStems(pot, layout, options);

  if (options.background !== false) {
    fill(options.backgroundColor ?? BG_COLORS[pot?.bgIndex ?? 0]);
    noStroke();
    rect(x, y, w, h, options.cornerRadius ?? 8);
  }

  if (!drawPotAsset(
    layout.asset,
    layout.asset?.theme,
    layout.potDrawX,
    layout.potTopY + layout.potSize.height / 2,
    layout.potMaxWidth,
    layout.potMaxHeight,
    pot?.colorIndex ?? 0,
    layout.preserveAtlasScale
  )) {
    fill(POT_COLORS[pot?.colorIndex ?? 0]);
    noStroke();
    drawPotShapeAt(layout.potDrawX, layout.potTopY, pot?.shapeIndex ?? 0, w / 400);
  }

  for (let i = 0; i < stems.length; i++) {
    if (i === options.selectedStemIndex) {
      stroke(100, 100, 220, 80);
      strokeWeight(14);
      drawPotRenderPath(stems[i].displayPoints);
    } else if (
      options.highlightHover &&
      distanceToPotRenderPath(mouseX, mouseY, stems[i].displayPoints) < 15
    ) {
      stroke(180, 180, 220, 60);
      strokeWeight(10);
      drawPotRenderPath(stems[i].displayPoints);
    }
  }
  for (const stem of stems) {
    stroke(getStemColor(pot, stem.data.stemColor));
    strokeWeight(options.stemWeight ?? 2);
    drawPotRenderPath(stem.displayPoints);
  }
  for (const stem of stems) drawPotRenderBeads(stem);

  return { layout, stems };
}

// ── 화분 모양 그리기 (scale 파라미터로 카드/팝업 크기 조정) ─────────────────────
// cx, baseY: 화분 상단 중앙 기준점 / scale: 1.0 = 원본, 0.6 = 카드용
function drawPotShapeAt(cx, baseY, shapeIdx, scale) {
    if (scale === undefined) scale = 1;
    let s = scale;
    noStroke();
    switch (shapeIdx) {
        case 0: // 사각형
            rect(cx - 45*s, baseY, 90*s, 80*s, 4); break;
        case 1: // 삼각형
            triangle(cx, baseY, cx - 50*s, baseY + 80*s, cx + 50*s, baseY + 80*s); break;
        case 2: // 원형
            ellipse(cx, baseY + 40*s, 90*s, 90*s); break;
        case 3: // 지그재그형
            beginShape();
            vertex(cx - 40*s, baseY);      vertex(cx - 20*s, baseY + 25*s);
            vertex(cx - 40*s, baseY + 50*s); vertex(cx + 40*s, baseY + 50*s);
            vertex(cx + 20*s, baseY + 25*s); vertex(cx + 40*s, baseY);
            endShape(CLOSE); break;
        case 4: // 비정형
            beginShape();
            vertex(cx - 30*s, baseY);      vertex(cx - 50*s, baseY + 30*s);
            vertex(cx - 30*s, baseY + 70*s); vertex(cx + 40*s, baseY + 65*s);
            vertex(cx + 45*s, baseY + 30*s); vertex(cx + 25*s, baseY);
            endShape(CLOSE); break;
        default:
            rect(cx - 45*s, baseY, 90*s, 80*s, 4);
    }
}

// ── 날짜 포맷: Firestore Timestamp → yyyy-mm-dd ────────────────────────────
function formatDate(timestamp) {
    if (!timestamp) return '날짜 없음';
    let date;
    if (typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else {
        return '날짜 없음';
    }
    let y = date.getFullYear();
    let m = String(date.getMonth() + 1).padStart(2, '0');
    let d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
