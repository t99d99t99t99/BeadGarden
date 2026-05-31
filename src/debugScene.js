/** @type {BeadGame} */
let debugGame;
const DEBUG_INPUT_MOUSE = 0;
const DEBUG_INPUT_HAND = 1;
const DEBUG_MODE_BUTTON = { x: 18, y: 18, w: 176, h: 36 };
let debugInputMode = DEBUG_INPUT_MOUSE;
let debugWasPinching = false;

function debugSceneSetup() {
    if (debugGame) {
        debugGame.destroy();
    }

    if (typeof handDetector !== "undefined") {
        handDetector.stop();
    }

    debugInputMode = DEBUG_INPUT_MOUSE;
    debugWasPinching = false;
    debugGame = new BeadGame();
    debugGame.setupDebugObjects();
    gameState = DEBUG;
}

function debugSceneDraw() {
    if (!debugGame) {
        return;
    }

    let thumbPosition = null;
    if (debugInputMode === DEBUG_INPUT_HAND) {
        thumbPosition = debugSceneUpdateHandInput();
    }

    debugGame.update(thumbPosition);
    debugGame.display();
    debugSceneDrawModeButton();

    if (debugInputMode === DEBUG_INPUT_HAND) {
        debugSceneDrawHandMarkers(thumbPosition);
    }
}

function debugSceneMousePressed() {
    if (!debugGame) {
        return;
    }

    if (debugSceneMouseOverModeButton()) {
        debugSceneToggleInputMode();
        return;
    }

    if (debugInputMode === DEBUG_INPUT_MOUSE) {
        debugGame.tryHoldWire();
    }
}

function debugSceneMouseReleased() {
    if (!debugGame) {
        return;
    }

    if (debugInputMode === DEBUG_INPUT_MOUSE) {
        debugGame.releaseWire();
    }
}

/**
 * @returns {Matter.Vector | null}
 */
function debugSceneUpdateHandInput() {
    if (typeof handDetector === "undefined") {
        return null;
    }

    handDetector.start();
    let thumbPosition = handDetector.thumbPosition();
    let pinching = handDetector.pinched();

    if (pinching && !debugWasPinching) {
        debugGame.tryHoldWireAt(thumbPosition);
    } else if (!pinching && debugWasPinching) {
        debugGame.releaseWire();
    }

    debugWasPinching = pinching;
    return thumbPosition;
}

function debugSceneToggleInputMode() {
    debugInputMode = debugInputMode === DEBUG_INPUT_MOUSE ? DEBUG_INPUT_HAND : DEBUG_INPUT_MOUSE;
    debugWasPinching = false;

    if (debugGame) {
        debugGame.releaseWire();
    }

    if (debugInputMode === DEBUG_INPUT_HAND && typeof handDetector !== "undefined") {
        handDetector.start();
    } else if (debugInputMode === DEBUG_INPUT_MOUSE && typeof handDetector !== "undefined") {
        handDetector.stop();
    }
}

function debugSceneDrawModeButton() {
    let handMode = debugInputMode === DEBUG_INPUT_HAND;
    let hovering = debugSceneMouseOverModeButton();

    push();
    stroke(40);
    strokeWeight(1);
    fill(handMode ? color(28, 72, 120) : color(245));
    if (hovering) {
        fill(handMode ? color(36, 92, 150) : color(230));
    }
    rect(DEBUG_MODE_BUTTON.x, DEBUG_MODE_BUTTON.y, DEBUG_MODE_BUTTON.w, DEBUG_MODE_BUTTON.h, 6);

    noStroke();
    fill(handMode ? 255 : 35);
    textAlign(CENTER, CENTER);
    textSize(14);
    text(handMode ? "Mode: Hand" : "Mode: Mouse", DEBUG_MODE_BUTTON.x + DEBUG_MODE_BUTTON.w / 2, DEBUG_MODE_BUTTON.y + DEBUG_MODE_BUTTON.h / 2);
    pop();
}

/**
 * @param {Matter.Vector | null} thumbPosition
 * @returns {void}
 */
function debugSceneDrawHandMarkers(thumbPosition) {
    let gumjiPosition = typeof handDetector !== "undefined" ? handDetector.gumjiPosition() : null;

    push();
    noStroke();

    if (gumjiPosition) {
        fill(255, 0, 0, 80);
        circle(gumjiPosition.x, gumjiPosition.y, 9);
    }

    if (thumbPosition) {
        fill(255, 0, 0);
        circle(thumbPosition.x, thumbPosition.y, 14);
        fill(255, 255, 255, 180);
        circle(thumbPosition.x, thumbPosition.y, 5);
    }

    pop();
}

/**
 * @returns {boolean}
 */
function debugSceneMouseOverModeButton() {
    return mouseX >= DEBUG_MODE_BUTTON.x &&
        mouseX <= DEBUG_MODE_BUTTON.x + DEBUG_MODE_BUTTON.w &&
        mouseY >= DEBUG_MODE_BUTTON.y &&
        mouseY <= DEBUG_MODE_BUTTON.y + DEBUG_MODE_BUTTON.h;
}
