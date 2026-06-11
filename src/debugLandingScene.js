const DEBUG_TEST_BUTTONS = [
    { x: 520, y: 310, w: 400, h: 56, mode: DEBUG_TEST_BEAD_CRAFT, label: "Bead craft test" },
    { x: 520, y: 382, w: 400, h: 56, mode: DEBUG_TEST_POT_DECORATE, label: "Pot decoration test" },
    { x: 520, y: 454, w: 400, h: 56, mode: DEBUG_TEST_POT_MANAGEMENT, label: "Pot management" }
];
const DEBUG_LANDING_EXIT_BUTTON = { x: 1208, y: 18, w: 214, h: 36, label: "Exit debugging" };
const DEBUG_DATABASE_BUTTON = { x: 520, y: 542, w: 400, h: 56 };

function debugLandingSceneSetup() {
    debugInProgressSceneReset();
    gameState = DEBUG_MENU;
}

function debugLandingSceneDraw() {
    for (let button of DEBUG_TEST_BUTTONS) {
        debugLandingSceneDrawButton(button);
    }
    debugLandingSceneDrawDatabaseButton();
    debugLandingSceneDrawButton(DEBUG_LANDING_EXIT_BUTTON);
}

function debugLandingSceneMousePressed() {
    if (debugLandingSceneMouseInRect(DEBUG_LANDING_EXIT_BUTTON)) {
        debugInProgressSceneExit();
        return;
    }

    if (debugLandingSceneMouseInRect(DEBUG_DATABASE_BUTTON)) {
        let nextMode = getDatabaseMode() === DATABASE_SERVER ? DATABASE_LOCAL : DATABASE_SERVER;
        setDatabaseMode(nextMode);
        return;
    }

    for (let button of DEBUG_TEST_BUTTONS) {
        if (debugLandingSceneMouseInRect(button)) {
            debugInProgressSceneStart(button.mode);
            return;
        }
    }
}

function debugLandingSceneDrawDatabaseButton() {
    let mode = getDatabaseMode() === DATABASE_SERVER ? "Server" : "Local";
    debugLandingSceneDrawButton({
        ...DEBUG_DATABASE_BUTTON,
        label: `Database: ${mode} (click to toggle)`,
    });

    push();
    noStroke();
    fill(90);
    textAlign(CENTER, CENTER);
    textSize(12);
    textStyle(NORMAL);
    text(getDatabaseStatus(), width / 2, DEBUG_DATABASE_BUTTON.y + DEBUG_DATABASE_BUTTON.h + 18);
    pop();
}

function debugLandingSceneDrawButton(button) {
    let hovering = debugLandingSceneMouseInRect(button);

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

/**
 * @param {{x: Number, y: Number, w: Number, h: Number}} rect
 * @returns {boolean}
 */
function debugLandingSceneMouseInRect(rect) {
    return mouseX >= rect.x &&
        mouseX <= rect.x + rect.w &&
        mouseY >= rect.y &&
        mouseY <= rect.y + rect.h;
}
