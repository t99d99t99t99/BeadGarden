/** @type {BeadGame} */
let debugGame;

function debugSceneSetup() {
    if (debugGame) {
        debugGame.destroy();
    }

    debugGame = new BeadGame();
    debugGame.setupDebugObjects();
    gameState = DEBUG;
}

function debugSceneDraw() {
    debugGame.update();
    debugGame.display();
}

function debugSceneMousePressed() {
    if (!debugGame) {
        return;
    }

    debugGame.tryHoldWire();
}

function debugSceneMouseReleased() {
    if (!debugGame) {
        return;
    }

    debugGame.releaseWire();
}
