const DEBUG_LANDING_EXIT_BUTTON = { x: 0, y: 0, w: 190, h: 36, label: "Exit debugging" };

const DEBUG_HAND_SETTING_OPTIONS = Object.freeze({
    runtimePreference: ["tfjs", "mediapipe"],
    modelType: ["lite", "full"],
    inferenceWidth: [128, 160, 192, 256, 320],
    cameraFrameRate: [15, 24, 30, 45, 60],
    minimumDetectionIntervalMs: [0, 16, 33, 50, 75, 100],
    maximumPredictionMs: [0, 150, 300, 520, 700],
    trackingResponse: [0.72, 0.85, 0.92, 1],
});

function debugLandingSceneSetup() {
    debugInProgressSceneReset();
    if (typeof potSetupUI !== "undefined") {
        potSetupUI.hide();
    }
    if (typeof potDetailUI !== "undefined") {
        potDetailUI.hide();
    }
    if (typeof potLockUI !== "undefined") {
        potLockUI.hide();
    }
    goTo(GAME_STATE.DEBUG_MENU);
}

function debugLandingSceneDraw() {
    debugLandingSceneDrawHeader();

    for (let section of debugLandingSceneSections()) {
        debugLandingSceneDrawSection(section);
    }

    for (let button of debugLandingSceneButtons()) {
        debugLandingSceneDrawButton(button);
    }

    debugLandingSceneDrawHandDetectorStatus(debugLandingSceneHandSectionRect());
}

function debugLandingSceneMousePressed() {
    if (debugLandingSceneMouseInRect(debugLandingSceneExitButton())) {
        debugInProgressSceneExit();
        return;
    }

    for (let button of debugLandingSceneButtons()) {
        if (debugLandingSceneMouseInRect(button)) {
            button.action();
            return;
        }
    }
}

function debugLandingSceneDrawHeader() {
    push();
    fill(35);
    noStroke();
    textAlign(LEFT, CENTER);
    textSize(28);
    textStyle(BOLD);
    text("Debug Menu", 48, 44);

    textAlign(LEFT, CENTER);
    textSize(12);
    textStyle(NORMAL);
    fill(95);
    text("Use these controls to test scenes and tune runtime behavior.", 50, 74);
    pop();

    debugLandingSceneDrawButton(debugLandingSceneExitButton());
}

function debugLandingSceneSections() {
    return [
        {
            ...debugLandingSceneTestSectionRect(),
            title: "Test Scenes",
            subtitle: "Open isolated flows."
        },
        {
            ...debugLandingSceneSystemSectionRect(),
            title: "System",
            subtitle: "Persistent app toggles."
        },
        {
            ...debugLandingSceneHandSectionRect(),
            title: "Hand Detection",
            subtitle: "Performance and latency tuning."
        }
    ];
}

function debugLandingSceneButtons() {
    return [
        ...debugLandingSceneTestButtons(),
        ...debugLandingSceneSystemButtons(),
        ...debugLandingSceneHandButtons()
    ];
}

function debugLandingSceneTestButtons() {
    let section = debugLandingSceneTestSectionRect();
    return debugLandingSceneStackedButtons(section, [
        {
            label: "Bead craft test",
            action: () => debugInProgressSceneStart(DEBUG_TEST_BEAD_CRAFT)
        },
        {
            label: "Pot decoration test",
            action: () => debugInProgressSceneStart(DEBUG_TEST_POT_DECORATE)
        },
        {
            label: "Pot management",
            action: () => debugInProgressSceneStart(DEBUG_TEST_POT_MANAGEMENT)
        },
        {
            label: "Long QR code test",
            action: () => debugInProgressSceneStart(DEBUG_TEST_QR_CODE)
        }
    ]);
}

function debugLandingSceneSystemButtons() {
    let section = debugLandingSceneSystemSectionRect();
    let databaseMode = getDatabaseMode() === DATABASE_SERVER ? "Server" : "Local";
    let idleEnabled = idleResetTimer.isEnabled();

    return debugLandingSceneStackedButtons(section, [
        {
            label: `Database: ${databaseMode}`,
            detail: getDatabaseStatus(),
            action: () => {
                let nextMode = getDatabaseMode() === DATABASE_SERVER ? DATABASE_LOCAL : DATABASE_SERVER;
                setDatabaseMode(nextMode);
            }
        },
        {
            label: `Idle reset: ${idleEnabled ? "Enabled" : "Disabled"}`,
            detail: "Click to toggle idle reset timer.",
            action: () => idleResetTimer.toggle()
        }
    ]);
}

function debugLandingSceneHandButtons() {
    if (typeof handDetector === "undefined" ||
        typeof handDetector.performanceSettings !== "function") {
        return [];
    }

    let section = debugLandingSceneHandSectionRect();
    let settings = handDetector.performanceSettings();
    let buttons = [
        debugLandingSceneHandSettingButton(
            section,
            0,
            "Runtime",
            debugLandingSceneFormatRuntime(settings.runtimePreference),
            "runtimePreference"
        ),
        debugLandingSceneHandSettingButton(
            section,
            1,
            "Model",
            settings.modelType,
            "modelType"
        ),
        debugLandingSceneHandSettingButton(
            section,
            2,
            "Input width",
            `${settings.inferenceWidth}px`,
            "inferenceWidth"
        ),
        debugLandingSceneHandSettingButton(
            section,
            3,
            "Camera FPS",
            `${settings.cameraFrameRate}`,
            "cameraFrameRate"
        ),
        debugLandingSceneHandSettingButton(
            section,
            4,
            "Detect interval",
            `${settings.minimumDetectionIntervalMs}ms`,
            "minimumDetectionIntervalMs"
        ),
        debugLandingSceneHandSettingButton(
            section,
            5,
            "Prediction",
            `${settings.maximumPredictionMs}ms`,
            "maximumPredictionMs"
        ),
        debugLandingSceneHandSettingButton(
            section,
            6,
            "Tracking",
            settings.trackingResponse.toFixed(2),
            "trackingResponse"
        ),
        debugLandingSceneHandActionButton(section, 7, "Restart detector", () => {
            handDetector.stop();
            handDetector.start();
        }),
        debugLandingSceneHandActionButton(section, 8, "Stop detector", () => {
            handDetector.stop();
        }),
        debugLandingSceneHandActionButton(section, 9, "Reset hand settings", () => {
            handDetector.resetPerformanceSettings();
        })
    ];

    return buttons;
}

function debugLandingSceneHandSettingButton(section, index, label, value, key) {
    let rectValue = debugLandingSceneHandButtonRect(section, index);
    return {
        ...rectValue,
        label: `${label}: ${value}`,
        detail: "Click to cycle.",
        action: () => debugLandingSceneCycleHandSetting(key)
    };
}

function debugLandingSceneHandActionButton(section, index, label, action) {
    return {
        ...debugLandingSceneHandButtonRect(section, index),
        label,
        action
    };
}

function debugLandingSceneCycleHandSetting(key) {
    if (typeof handDetector === "undefined" ||
        typeof handDetector.performanceSettings !== "function" ||
        typeof handDetector.configurePerformance !== "function") {
        return;
    }

    let options = DEBUG_HAND_SETTING_OPTIONS[key];
    if (!options || options.length === 0) {
        return;
    }

    let settings = handDetector.performanceSettings();
    let currentValue = settings[key];
    let currentIndex = options.findIndex(option => option === currentValue);
    let nextValue = options[(currentIndex + 1) % options.length];
    handDetector.configurePerformance({ [key]: nextValue });
}

function debugLandingSceneDrawSection(section) {
    push();
    noStroke();
    fill(255);
    rect(section.x, section.y, section.w, section.h, 18);

    stroke(215);
    strokeWeight(1);
    noFill();
    rect(section.x, section.y, section.w, section.h, 18);

    noStroke();
    fill(35);
    textAlign(LEFT, TOP);
    textStyle(BOLD);
    textSize(18);
    text(section.title, section.x + 22, section.y + 20);

    fill(115);
    textStyle(NORMAL);
    textSize(12);
    text(section.subtitle, section.x + 22, section.y + 46);
    pop();
}

function debugLandingSceneDrawButton(button) {
    let hovering = debugLandingSceneMouseInRect(button);

    push();
    stroke(40);
    strokeWeight(1);
    fill(hovering ? 230 : 248);
    rect(button.x, button.y, button.w, button.h, 8);

    noStroke();
    fill(35);
    textAlign(CENTER, CENTER);
    textSize(13);
    textStyle(BOLD);
    text(button.label, button.x + button.w / 2, button.y + button.h / 2 - (button.detail ? 7 : 0));

    if (button.detail) {
        fill(105);
        textSize(10);
        textStyle(NORMAL);
        text(button.detail, button.x + button.w / 2, button.y + button.h / 2 + 13);
    }
    pop();
}

function debugLandingSceneDrawHandDetectorStatus(section) {
    if (typeof handDetector === "undefined" ||
        typeof handDetector.performanceSettings !== "function") {
        return;
    }

    let settings = handDetector.performanceSettings();
    let statusY = section.y + section.h - 78;
    let activeRuntime = settings.activeRuntime
        ? `${debugLandingSceneFormatRuntime(settings.activeRuntime)} / ${settings.activeModelType}`
        : "not loaded";
    let runState = settings.loading
        ? "loading"
        : settings.ready
            ? "ready"
            : settings.started
                ? "starting"
                : "stopped";
    let perfLine = `Runtime: ${activeRuntime} | State: ${runState}`;
    let timingLine = `Detect: ${settings.lastDetectionDurationMs.toFixed(1)}ms last, ${settings.averageDetectionDurationMs.toFixed(1)}ms avg`;
    let errorLine = settings.errorMessage ? `Error: ${settings.errorMessage}` : "";

    push();
    noStroke();
    fill(245);
    rect(section.x + 18, statusY - 12, section.w - 36, 70, 10);

    fill(85);
    textAlign(LEFT, TOP);
    textSize(11);
    textStyle(NORMAL);
    text(perfLine, section.x + 30, statusY);
    text(timingLine, section.x + 30, statusY + 20);
    if (errorLine) {
        fill(190, 60, 60);
        text(errorLine, section.x + 30, statusY + 40, section.w - 60);
    } else {
        fill(115);
        text("Some changes restart the detector if it is active.", section.x + 30, statusY + 40);
    }
    pop();
}

function debugLandingSceneStackedButtons(section, configs) {
    let buttons = [];
    let x = section.x + 22;
    let y = section.y + 84;
    let w = section.w - 44;
    let h = 56;
    let gap = 14;

    for (let i = 0; i < configs.length; i++) {
        buttons.push({
            x,
            y: y + i * (h + gap),
            w,
            h,
            ...configs[i]
        });
    }

    return buttons;
}

function debugLandingSceneHandButtonRect(section, index) {
    let columns = 2;
    let gap = 12;
    let left = section.x + 22;
    let top = section.y + 84;
    let w = (section.w - 44 - gap) / columns;
    let h = 48;
    let column = index % columns;
    let row = Math.floor(index / columns);

    return {
        x: left + column * (w + gap),
        y: top + row * (h + gap),
        w,
        h
    };
}

function debugLandingSceneTestSectionRect() {
    let layout = debugLandingSceneLayout();
    return {
        x: layout.margin,
        y: layout.panelY,
        w: layout.smallPanelW,
        h: layout.panelH
    };
}

function debugLandingSceneSystemSectionRect() {
    let layout = debugLandingSceneLayout();
    return {
        x: layout.margin + layout.smallPanelW + layout.gap,
        y: layout.panelY,
        w: layout.smallPanelW,
        h: layout.panelH
    };
}

function debugLandingSceneHandSectionRect() {
    let layout = debugLandingSceneLayout();
    return {
        x: layout.margin + (layout.smallPanelW + layout.gap) * 2,
        y: layout.panelY,
        w: layout.handPanelW,
        h: layout.panelH
    };
}

function debugLandingSceneLayout() {
    let margin = 48;
    let gap = 24;
    let panelY = 104;
    let panelH = Math.max(540, height - panelY - 44);
    let availableW = width - margin * 2 - gap * 2;
    let handPanelW = Math.max(480, availableW * 0.42);
    let smallPanelW = (availableW - handPanelW) / 2;

    return {
        margin,
        gap,
        panelY,
        panelH,
        smallPanelW,
        handPanelW
    };
}

function debugLandingSceneExitButton() {
    return {
        ...DEBUG_LANDING_EXIT_BUTTON,
        x: width - DEBUG_LANDING_EXIT_BUTTON.w - 48,
        y: 30
    };
}

function debugLandingSceneFormatRuntime(runtime) {
    return runtime === "mediapipe" ? "MediaPipe" : "TFJS";
}

/**
 * @param {{x: Number, y: Number, w: Number, h: Number}} rectValue
 * @returns {boolean}
 */
function debugLandingSceneMouseInRect(rectValue) {
    return mouseX >= rectValue.x &&
        mouseX <= rectValue.x + rectValue.w &&
        mouseY >= rectValue.y &&
        mouseY <= rectValue.y + rectValue.h;
}
