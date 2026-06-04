/** @type {BeadGame} */
let debugGame;
const DEBUG_INPUT_MOUSE = 0;
const DEBUG_INPUT_HAND = 1;
const DEBUG_TEST_BEAD_CRAFT = 0;
const DEBUG_TEST_POT_DECORATE = 1;
const DEBUG_TEST_BUTTONS = [
    { x: 18, y: 18, w: 176, h: 36, mode: DEBUG_TEST_BEAD_CRAFT, label: "Bead craft test" },
    { x: 206, y: 18, w: 196, h: 36, mode: DEBUG_TEST_POT_DECORATE, label: "Pot decoration test" }
];
const DEBUG_MODE_BUTTON = { x: 18, y: 66, w: 176, h: 36 };
let debugInputMode = DEBUG_INPUT_MOUSE;
let debugTestMode = DEBUG_TEST_BEAD_CRAFT;
let debugWasPinching = false;
let debugPotDecoratePot = null;

function debugSceneSetup() {
    debugSceneDestroyGame();

    if (typeof handDetector !== "undefined") {
        handDetector.stop();
    }

    debugInputMode = DEBUG_INPUT_MOUSE;
    debugTestMode = DEBUG_TEST_BEAD_CRAFT;
    debugWasPinching = false;
    debugSceneSetupBeadCraftTest();
    gameState = DEBUG;
}

function debugSceneDraw() {
    if (debugTestMode === DEBUG_TEST_POT_DECORATE) {
        debugSceneDrawPotDecorateTest();
    } else {
        debugSceneDrawBeadCraftTest();
    }

    debugSceneDrawTestButtons();
}

function debugSceneDrawBeadCraftTest() {
    debugSceneEnsureBeadCraftTest();

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

function debugSceneDrawPotDecorateTest() {
    debugSceneEnsurePotDecorateTest();

    push();
    background(232);
    if (typeof gardenUI !== "undefined") {
        gardenUI.draw();
    }
    if (typeof potDecorateUI !== "undefined") {
        potDecorateUI.draw();
    }
    pop();
}

function debugSceneMousePressed() {
    let testButton = debugSceneTestButtonAtMouse();
    if (testButton) {
        debugSceneSetTestMode(testButton.mode);
        return;
    }

    if (debugTestMode === DEBUG_TEST_POT_DECORATE) {
        debugSceneForwardPotDecorateMousePressed();
        return;
    }

    debugSceneEnsureBeadCraftTest();

    if (debugSceneMouseOverModeButton()) {
        debugSceneToggleInputMode();
        return;
    }

    if (debugInputMode === DEBUG_INPUT_MOUSE) {
        debugGame.tryHoldWire();
    }
}

function debugSceneMouseReleased() {
    if (debugTestMode === DEBUG_TEST_POT_DECORATE) {
        if (typeof potDecorateUI !== "undefined") {
            potDecorateUI.onMouseReleased();
        }
        return;
    }

    if (!debugGame) {
        return;
    }

    if (debugInputMode === DEBUG_INPUT_MOUSE) {
        debugGame.releaseWire();
    }
}

function debugSceneMouseDragged() {
    if (debugTestMode === DEBUG_TEST_POT_DECORATE && typeof potDecorateUI !== "undefined") {
        potDecorateUI.onMouseDragged();
    }
}

function debugSceneMouseWheel(delta) {
    if (debugTestMode === DEBUG_TEST_POT_DECORATE && typeof potDecorateUI !== "undefined") {
        potDecorateUI.onMouseWheel(delta);
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

/**
 * @param {Number} mode
 * @returns {void}
 */
function debugSceneSetTestMode(mode) {
    if (debugTestMode === mode) {
        return;
    }

    if (debugGame) {
        debugGame.releaseWire();
    }
    debugWasPinching = false;

    if (typeof handDetector !== "undefined") {
        handDetector.stop();
    }
    debugInputMode = DEBUG_INPUT_MOUSE;
    debugTestMode = mode;

    if (mode === DEBUG_TEST_BEAD_CRAFT) {
        if (typeof potDecorateUI !== "undefined") {
            potDecorateUI.hide();
        }
        debugSceneSetupBeadCraftTest();
    } else {
        debugSceneDestroyGame();
        debugSceneEnsurePotDecorateTest();
    }

    gameState = DEBUG;
}

function debugSceneSetupBeadCraftTest() {
    debugSceneDestroyGame();
    debugGame = new BeadGame();
    debugGame.setupDebugObjects();
}

function debugSceneEnsureBeadCraftTest() {
    if (!debugGame) {
        debugSceneSetupBeadCraftTest();
    }
}

function debugSceneDestroyGame() {
    if (!debugGame) {
        return;
    }

    debugGame.destroy();
    debugGame = null;
}

function debugSceneEnsurePotDecorateTest() {
    if (typeof potDecorateUI === "undefined") {
        return;
    }

    if (!debugPotDecoratePot) {
        debugPotDecoratePot = {
            name: "디버그 화분",
            desc: "화분 꾸미기 디버그 테스트",
            createdAt: "2026.06.03",
            stems: [{ beadCount: 8 }, { beadCount: 6 }, { beadCount: 10 }],
            locked: false
        };
    }

    if (!potDecorateUI.isVisible) {
        potDecorateUI.show("edit", debugPotDecoratePot);
    }
}

function debugSceneForwardPotDecorateMousePressed() {
    if (typeof potDecorateUI === "undefined") {
        return;
    }

    potDecorateUI.onMousePressed();
    gameState = DEBUG;
    debugSceneEnsurePotDecorateTest();
}

function debugSceneDrawTestButtons() {
    push();
    textAlign(CENTER, CENTER);
    textSize(14);
    textStyle(BOLD);

    for (let button of DEBUG_TEST_BUTTONS) {
        let selected = debugTestMode === button.mode;
        let hovering = debugSceneMouseInRect(button);
        stroke(40);
        strokeWeight(selected ? 2 : 1);
        fill(selected ? 30 : hovering ? 230 : 248);
        rect(button.x, button.y, button.w, button.h, 6);
        noStroke();
        fill(selected ? 255 : 35);
        text(button.label, button.x + button.w / 2, button.y + button.h / 2);
    }

    pop();
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
    return debugSceneMouseInRect(DEBUG_MODE_BUTTON);
}

/**
 * @returns {{x: Number, y: Number, w: Number, h: Number, mode: Number, label: string} | null}
 */
function debugSceneTestButtonAtMouse() {
    for (let button of DEBUG_TEST_BUTTONS) {
        if (debugSceneMouseInRect(button)) {
            return button;
        }
    }

    return null;
}

/**
 * @param {{x: Number, y: Number, w: Number, h: Number}} rect
 * @returns {boolean}
 */
function debugSceneMouseInRect(rect) {
    return mouseX >= rect.x &&
        mouseX <= rect.x + rect.w &&
        mouseY >= rect.y &&
        mouseY <= rect.y + rect.h;
}
