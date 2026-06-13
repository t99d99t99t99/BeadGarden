/** @type {BeadGame} */
let debugGame;
const DEBUG_INPUT_MOUSE = 0;
const DEBUG_INPUT_HAND = 1;
const DEBUG_TEST_BEAD_CRAFT = 0;
const DEBUG_TEST_POT_DECORATE = 1;
const DEBUG_TEST_POT_MANAGEMENT = 2;
const DEBUG_MODE_BUTTON = { x: 18, y: 66, w: 176, h: 36 };
const DEBUG_MENU_BUTTON = { x: 18, y: 18, w: 176, h: 36, label: "Back to debug menu" };
const DEBUG_EXIT_BUTTON = { x: 1208, y: 18, w: 214, h: 36, label: "Exit debugging" };
let debugInputMode = DEBUG_INPUT_MOUSE;
let debugTestMode = null;
let debugWasPinching = false;
let debugPotDecoratePot = null;

/**
 * @param {Number} mode
 * @returns {void}
 */
function debugInProgressSceneStart(mode) {
    debugInProgressSceneReset();
    debugTestMode = mode;

    if (mode === DEBUG_TEST_BEAD_CRAFT) {
        debugInProgressSceneSetupBeadCraftTest();
    } else if (mode === DEBUG_TEST_POT_DECORATE) {
        debugInProgressSceneEnsurePotDecorateTest();
    } else {
        debugPotManagementSceneSetup();
    }

    goTo(GAME_STATE.DEBUG);
}

function debugInProgressSceneDraw() {
    if (debugTestMode === DEBUG_TEST_POT_MANAGEMENT) {
        debugPotManagementSceneDraw();
    } else if (debugTestMode === DEBUG_TEST_POT_DECORATE) {
        debugInProgressSceneDrawPotDecorateTest();
    } else {
        debugInProgressSceneDrawBeadCraftTest();
    }

    debugInProgressSceneDrawButton(DEBUG_MENU_BUTTON);
    debugInProgressSceneDrawButton(DEBUG_EXIT_BUTTON);
}

function debugInProgressSceneDrawBeadCraftTest() {
    debugInProgressSceneEnsureBeadCraftTest();

    let thumbPosition = null;
    if (debugInputMode === DEBUG_INPUT_HAND) {
        thumbPosition = debugInProgressSceneUpdateHandInput();
    }

    debugGame.update(thumbPosition);
    debugGame.display();
    debugInProgressSceneDrawModeButton();

    if (debugInputMode === DEBUG_INPUT_HAND) {
        debugInProgressSceneDrawHandMarkers(thumbPosition);
    }
}

function debugInProgressSceneDrawPotDecorateTest() {
    debugInProgressSceneEnsurePotDecorateTest();

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

function debugInProgressSceneMousePressed() {
    if (debugInProgressSceneMouseInRect(DEBUG_EXIT_BUTTON)) {
        debugInProgressSceneExit();
        return;
    }

    if (debugInProgressSceneMouseInRect(DEBUG_MENU_BUTTON)) {
        debugLandingSceneSetup();
        return;
    }

    if (debugTestMode === DEBUG_TEST_POT_MANAGEMENT) {
        debugPotManagementSceneMousePressed();
        return;
    }

    if (debugTestMode === DEBUG_TEST_POT_DECORATE) {
        debugInProgressSceneForwardPotDecorateMousePressed();
        return;
    }

    debugInProgressSceneEnsureBeadCraftTest();

    if (debugInProgressSceneMouseOverModeButton()) {
        debugInProgressSceneToggleInputMode();
        return;
    }

    if (debugInputMode === DEBUG_INPUT_MOUSE) {
        debugGame.tryHoldWire();
    }
}

function debugInProgressSceneMouseReleased() {
    if (debugTestMode === DEBUG_TEST_POT_MANAGEMENT) {
        debugPotManagementSceneMouseReleased();
        return;
    }

    if (debugTestMode === DEBUG_TEST_POT_DECORATE) {
        if (typeof potDecorateUI !== "undefined") {
            potDecorateUI.onMouseReleased();
        }
        return;
    }

    if (debugGame && debugInputMode === DEBUG_INPUT_MOUSE) {
        debugGame.releaseWire();
    }
}

function debugInProgressSceneMouseDragged() {
    if (debugTestMode === DEBUG_TEST_POT_MANAGEMENT) {
        debugPotManagementSceneMouseDragged();
        return;
    }

    if (debugTestMode === DEBUG_TEST_POT_DECORATE && typeof potDecorateUI !== "undefined") {
        potDecorateUI.onMouseDragged();
    }
}

function debugInProgressSceneMouseWheel(delta) {
    if (debugTestMode === DEBUG_TEST_POT_MANAGEMENT) {
        debugPotManagementSceneMouseWheel(delta);
        return;
    }

    if (debugTestMode === DEBUG_TEST_POT_DECORATE && typeof potDecorateUI !== "undefined") {
        potDecorateUI.onMouseWheel(delta);
    }
}

function debugInProgressSceneExit() {
    debugInProgressSceneReset();
    goTo(GAME_STATE.INTRO);
}

function debugInProgressSceneReset() {
    if (debugGame) {
        debugGame.releaseWire();
        debugGame.destroy();
        debugGame = null;
    }

    if (typeof potDecorateUI !== "undefined") {
        potDecorateUI.hide();
    }
    if (typeof handDetector !== "undefined") {
        handDetector.stop();
    }
    if (typeof debugPotManagementSceneReset !== "undefined") {
        debugPotManagementSceneReset();
    }

    debugInputMode = DEBUG_INPUT_MOUSE;
    debugTestMode = null;
    debugWasPinching = false;
}

/**
 * @returns {Matter.Vector | null}
 */
function debugInProgressSceneUpdateHandInput() {
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

function debugInProgressSceneToggleInputMode() {
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

function debugInProgressSceneSetupBeadCraftTest() {
    debugGame = new BeadGame();
    debugGame.setupDebugObjects();
}

function debugInProgressSceneEnsureBeadCraftTest() {
    if (!debugGame) {
        debugInProgressSceneSetupBeadCraftTest();
    }
}

function debugInProgressSceneEnsurePotDecorateTest() {
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

function debugInProgressSceneForwardPotDecorateMousePressed() {
    if (typeof potDecorateUI === "undefined") {
        return;
    }

    potDecorateUI.onMousePressed();
    goTo(GAME_STATE.DEBUG);
    debugInProgressSceneEnsurePotDecorateTest();
}

function debugInProgressSceneDrawButton(button) {
    let hovering = debugInProgressSceneMouseInRect(button);

    push();
    stroke(40);
    strokeWeight(1);
    fill(hovering ? 230 : 248);
    rect(button.x, button.y, button.w, button.h, 6);
    noStroke();
    fill(35);
    textAlign(CENTER, CENTER);
    textSize(14);
    textStyle(BOLD);
    text(button.label, button.x + button.w / 2, button.y + button.h / 2);
    pop();
}

function debugInProgressSceneDrawModeButton() {
    let handMode = debugInputMode === DEBUG_INPUT_HAND;
    let hovering = debugInProgressSceneMouseOverModeButton();

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
function debugInProgressSceneDrawHandMarkers(thumbPosition) {
    let gumjiPosition = typeof handDetector !== "undefined" ? handDetector.gumjiPosition() : null;

    push();
    noStroke();

    let pointerColor = color(255, 0, 0, 80);
    if (handDetector.pinched()) {
        pointerColor = color(0, 0, 255, 80);
    }

    if (gumjiPosition) {
        fill(pointerColor);
        circle(gumjiPosition.x, gumjiPosition.y, 9);
    }

    if (thumbPosition) {
        fill(red(pointerColor), green(pointerColor), blue(pointerColor), 255);
        circle(thumbPosition.x, thumbPosition.y, 14);
        fill(255, 255, 255, 180);
        circle(thumbPosition.x, thumbPosition.y, 5);
    }

    pop();
}

function debugInProgressSceneMouseOverModeButton() {
    return debugInProgressSceneMouseInRect(DEBUG_MODE_BUTTON);
}

/**
 * @param {{x: Number, y: Number, w: Number, h: Number}} rect
 * @returns {boolean}
 */
function debugInProgressSceneMouseInRect(rect) {
    return mouseX >= rect.x &&
        mouseX <= rect.x + rect.w &&
        mouseY >= rect.y &&
        mouseY <= rect.y + rect.h;
}
