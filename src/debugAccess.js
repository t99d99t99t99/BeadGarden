const DEBUG_ACCESS_STORAGE_KEY = "beadGardenStaffDebug";
const DEBUG_ACCESS_ENABLED_VALUE = "1";
const DEBUG_ACCESS_REQUIRED_TAPS_PER_CORNER = 5;
const DEBUG_ACCESS_GESTURE_TIMEOUT_MS = 6000;

let debugAccessTapStep = 0;
let debugAccessGestureStartedAt = 0;
let debugAccessMessage = "";
let debugAccessMessageUntil = 0;

function debugAccessHandleKeyPressed() {
    if (keyIsDown(SHIFT) && keyIsDown(ALT) && (key === "D" || key === "d")) {
        debugAccessTryOpen();
        return true;
    }

    return false;
}

function debugAccessHandleMousePressed() {
    let now = performance.now();
    if (debugAccessTapStep > 0 &&
        now - debugAccessGestureStartedAt > DEBUG_ACCESS_GESTURE_TIMEOUT_MS) {
        debugAccessResetGesture();
    }

    let expectedCorner = debugAccessTapStep < DEBUG_ACCESS_REQUIRED_TAPS_PER_CORNER
        ? "top-left"
        : "bottom-right";
    let tappedExpectedCorner = expectedCorner === "top-left"
        ? debugAccessPointInTopLeftCorner(mouseX, mouseY)
        : debugAccessPointInBottomRightCorner(mouseX, mouseY);

    if (!tappedExpectedCorner) {
        if (debugAccessPointInTopLeftCorner(mouseX, mouseY) ||
            debugAccessPointInBottomRightCorner(mouseX, mouseY)) {
            debugAccessResetGesture();
        }
        return false;
    }

    if (debugAccessTapStep === 0) {
        debugAccessGestureStartedAt = now;
    }
    debugAccessTapStep++;

    if (debugAccessTapStep >= DEBUG_ACCESS_REQUIRED_TAPS_PER_CORNER * 2) {
        debugAccessResetGesture();
        debugAccessTryOpen();
    }

    return true;
}

function debugAccessDrawStatus() {
    if (!debugAccessMessage || performance.now() > debugAccessMessageUntil) {
        return;
    }

    push();
    rectMode(CENTER);
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(14);

    let boxW = Math.min(width - 80, 620);
    let boxH = 52;
    let boxX = width / 2;
    let boxY = height - 92;

    noStroke();
    fill(20, 20, 20, 210);
    rect(boxX, boxY, boxW, boxH, 12);
    fill(255);
    text(debugAccessMessage, boxX, boxY);
    pop();
}

function debugAccessTryOpen() {
    if (!debugAccessStaffEnabled()) {
        debugAccessShowMessage("스태프 디버그 권한이 이 기기에 설정되어 있지 않습니다.");
        return false;
    }

    debugLandingSceneSetup();
    return true;
}

function debugAccessStaffEnabled() {
    try {
        return localStorage.getItem(DEBUG_ACCESS_STORAGE_KEY) === DEBUG_ACCESS_ENABLED_VALUE;
    } catch (error) {
        console.warn("[DebugAccess] localStorage is unavailable:", error);
        return false;
    }
}

function debugAccessPointInTopLeftCorner(x, y) {
    let size = debugAccessCornerSize();
    return x >= 0 && x <= size && y >= 0 && y <= size;
}

function debugAccessPointInBottomRightCorner(x, y) {
    let size = debugAccessCornerSize();
    return x >= width - size && x <= width && y >= height - size && y <= height;
}

function debugAccessCornerSize() {
    return Math.min(180, Math.max(96, Math.min(width, height) * 0.12));
}

function debugAccessResetGesture() {
    debugAccessTapStep = 0;
    debugAccessGestureStartedAt = 0;
}

function debugAccessShowMessage(message) {
    debugAccessMessage = message;
    debugAccessMessageUntil = performance.now() + 3000;
}
