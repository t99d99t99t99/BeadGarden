const HAND_DETECTOR_GLOBAL = /** @type {any} */ (globalThis);
const HAND_DETECTOR_PERFORMANCE_STORAGE_KEY = "beadgarden_debug_hand_detector_performance";

class HandDetector {
    constructor() {
        this.handPose = null;
        this.video = null;
        this.hands = [];
        this.ready = false;
        this.started = false;
        this.loading = false;
        this.error = null;
        this.pinchThresholdRatio = 0.32;
        this.closeHandScale = 110;
        this.closeHandThresholdBoost = 0.0015;
        this.minimumPinchThreshold = 10;
        this.maximumPinchThreshold = 96;
        this.fallbackPinchThreshold = 34;
        this.pinchCloseAngle = 18;
        this.pinchOpenAngle = 32;
        this.pinchReleaseDistanceMultiplier = 1.35;
        this.pinchState = false;
        this.previousPinchAngle = 90;
        this.runtimePreference = "tfjs";
        this.modelType = "lite";
        this.inferenceWidth = 192;
        this.cameraFrameRate = 30;
        this.trackedTips = {
            thumb: this.#emptyTrackedPoint(),
            indexFinger: this.#emptyTrackedPoint()
        };
        this.lastTrackingFrame = -1;
        this.trackingResponse = 1;
        this.maximumPredictionMs = 520;
        this.minimumDetectionIntervalMs = 0;
        this.detectionLoopId = 0;
        this.detecting = false;
        this.sessionId = 0;
        this.activeRuntime = null;
        this.activeModelType = null;
        this.lastDetectionDurationMs = 0;
        this.averageDetectionDurationMs = 0;
        this.detectionCount = 0;
        this.snapshotFrame = -1;
        this.snapshot = {
            thumb: null,
            index: null,
            pointer: null,
            pinched: false,
            fingerPath: []
        };
        this.#applyStoredPerformanceSettings();
    }

    /**
     * @returns {void}
     */
    start() {
        if (this.started || this.loading) {
            return;
        }

        let ml5Library = HAND_DETECTOR_GLOBAL.ml5;
        if (!ml5Library || typeof createCapture !== "function") {
            return;
        }

        this.loading = true;
        this.started = true;
        let sessionId = ++this.sessionId;
        this.lastDetectionDurationMs = 0;
        this.averageDetectionDurationMs = 0;
        this.detectionCount = 0;

        try {
            let inferenceHeight = Math.round(
                this.inferenceWidth * this.#canvasHeight() / this.#canvasWidth()
            );
            this.video = createCapture({
                video: {
                    width: { ideal: this.inferenceWidth },
                    height: { ideal: inferenceHeight },
                    frameRate: { ideal: this.cameraFrameRate, max: this.cameraFrameRate },
                    facingMode: "user"
                },
                audio: false
            });
            if (this.video.elt) {
                this.video.elt.setAttribute("playsinline", "");
                this.video.elt.muted = true;
            }
            this.video.size(this.inferenceWidth, inferenceHeight);
            this.video.hide();

            this.#loadHandPoseModel(ml5Library)
                .then((loaded) => {
                    let model = loaded.model;
                    if (sessionId !== this.sessionId || !this.started) {
                        if (model && typeof model.detectStop === "function") {
                            model.detectStop();
                        }
                        return;
                    }

                    this.handPose = model;
                    this.activeRuntime = loaded.options.runtime;
                    this.activeModelType = loaded.options.modelType;
                    this.ready = true;
                    this.loading = false;
                    this.#startDetectionLoop();
                })
                .catch((error) => {
                    if (sessionId !== this.sessionId) {
                        return;
                    }

                    this.error = error;
                    this.loading = false;
                    console.error("HandDetector failed to load ml5.handPose:", error);
                });
        } catch (error) {
            this.error = error;
            this.loading = false;
            console.error("HandDetector failed to start:", error);
        }
    }

    /**
     * @returns {void}
     */
    stop() {
        this.sessionId++;
        this.detecting = false;
        this.detectionLoopId++;

        if (this.handPose && typeof this.handPose.detectStop === "function") {
            this.handPose.detectStop();
        }

        if (this.video && typeof this.video.remove === "function") {
            this.video.remove();
        }

        this.handPose = null;
        this.video = null;
        this.hands = [];
        this.ready = false;
        this.started = false;
        this.loading = false;
        this.activeRuntime = null;
        this.activeModelType = null;
        this.trackedTips = {
            thumb: this.#emptyTrackedPoint(),
            indexFinger: this.#emptyTrackedPoint()
        };
        this.lastTrackingFrame = -1;
        this.snapshotFrame = -1;
        this.pinchState = false;
        this.previousPinchAngle = 90;
        this.snapshot = {
            thumb: null,
            index: null,
            pointer: null,
            pinched: false,
            fingerPath: []
        };
    }

    /**
     * @returns {Matter.Vector | null}
     */
    thumbPosition() {
        let snapshot = this.#frameSnapshot();
        return snapshot.thumb ? { ...snapshot.thumb } : null;
    }

    /**
     * @returns {Matter.Vector | null}
     */
    gumjiPosition() {
        let snapshot = this.#frameSnapshot();
        return snapshot.index ? { ...snapshot.index } : null;
    }

    /**
     * @returns {{thumb: Matter.Vector | null, index: Matter.Vector | null}}
     */
    fingerJointPositions() {
        this.#ensureStarted();
        let hand = this.#currentHand();
        let thumb = hand ? this.#toCanvasPoint(this.#keypointByIndex(hand, 3)) : null;
        let index = hand ? this.#toCanvasPoint(this.#keypointByIndex(hand, 7)) : null;
        return {
            thumb: thumb ? { ...thumb } : null,
            index: index ? { ...index } : null
        };
    }

    /**
     * Returns the ml5 hand-skeleton path from thumb tip to index-finger tip.
     * @returns {Matter.Vector[]}
     */
    thumbToIndexPath() {
        return this.#frameSnapshot().fingerPath.map((point) => ({ ...point }));
    }

    /**
     * @returns {boolean}
     */
    pinched() {
        return this.#frameSnapshot().pinched;
    }

    /**
     * @returns {boolean}
     */
    get pinching() {
        return this.pinched();
    }

    /**
     * @returns {Matter.Vector | null}
     */
    pointerPosition() {
        let pointer = this.#frameSnapshot().pointer;
        return pointer ? { ...pointer } : null;
    }

    /**
     * @returns {object}
     */
    performanceSettings() {
        return {
            runtimePreference: this.runtimePreference,
            modelType: this.modelType,
            activeRuntime: this.activeRuntime,
            activeModelType: this.activeModelType,
            inferenceWidth: this.inferenceWidth,
            cameraFrameRate: this.cameraFrameRate,
            minimumDetectionIntervalMs: this.minimumDetectionIntervalMs,
            maximumPredictionMs: this.maximumPredictionMs,
            trackingResponse: this.trackingResponse,
            lastDetectionDurationMs: this.lastDetectionDurationMs,
            averageDetectionDurationMs: this.averageDetectionDurationMs,
            detectionCount: this.detectionCount,
            ready: this.ready,
            started: this.started,
            loading: this.loading,
            detecting: this.detecting,
            errorMessage: this.error ? String(this.error.message || this.error) : ""
        };
    }

    /**
     * @param {object} settings
     * @returns {void}
     */
    configurePerformance(settings) {
        if (!settings) return;

        let needsRestart = false;
        let wasActive = this.started || this.loading;

        if (Object.prototype.hasOwnProperty.call(settings, "runtimePreference")) {
            let runtimePreference = settings.runtimePreference === "mediapipe"
                ? "mediapipe"
                : "tfjs";
            if (runtimePreference !== this.runtimePreference) {
                this.runtimePreference = runtimePreference;
                needsRestart = true;
            }
        }

        if (Object.prototype.hasOwnProperty.call(settings, "modelType")) {
            let modelType = settings.modelType === "full" ? "full" : "lite";
            if (modelType !== this.modelType) {
                this.modelType = modelType;
                needsRestart = true;
            }
        }

        if (Object.prototype.hasOwnProperty.call(settings, "inferenceWidth")) {
            let inferenceWidth = this.#clampNumber(settings.inferenceWidth, 96, 640, this.inferenceWidth);
            if (inferenceWidth !== this.inferenceWidth) {
                this.inferenceWidth = inferenceWidth;
                needsRestart = true;
            }
        }

        if (Object.prototype.hasOwnProperty.call(settings, "cameraFrameRate")) {
            let cameraFrameRate = this.#clampNumber(settings.cameraFrameRate, 10, 60, this.cameraFrameRate);
            if (cameraFrameRate !== this.cameraFrameRate) {
                this.cameraFrameRate = cameraFrameRate;
                needsRestart = true;
            }
        }

        if (Object.prototype.hasOwnProperty.call(settings, "minimumDetectionIntervalMs")) {
            this.minimumDetectionIntervalMs = this.#clampNumber(
                settings.minimumDetectionIntervalMs,
                0,
                250,
                this.minimumDetectionIntervalMs
            );
        }

        if (Object.prototype.hasOwnProperty.call(settings, "maximumPredictionMs")) {
            this.maximumPredictionMs = this.#clampNumber(
                settings.maximumPredictionMs,
                0,
                1000,
                this.maximumPredictionMs
            );
        }

        if (Object.prototype.hasOwnProperty.call(settings, "trackingResponse")) {
            this.trackingResponse = this.#clampNumber(
                settings.trackingResponse,
                0.05,
                1,
                this.trackingResponse
            );
        }

        this.error = null;
        this.#storePerformanceSettings();
        if (needsRestart && wasActive) {
            this.stop();
            this.start();
        }
    }

    /**
     * @returns {void}
     */
    resetPerformanceSettings() {
        this.configurePerformance({
            runtimePreference: "tfjs",
            modelType: "lite",
            inferenceWidth: 192,
            cameraFrameRate: 30,
            minimumDetectionIntervalMs: 0,
            maximumPredictionMs: 520,
            trackingResponse: 1
        });
    }

    /**
     * @returns {void}
     */
    #applyStoredPerformanceSettings() {
        try {
            let raw = localStorage.getItem(HAND_DETECTOR_PERFORMANCE_STORAGE_KEY);
            if (!raw) return;

            let stored = JSON.parse(raw);
            if (!stored || typeof stored !== "object") return;

            this.configurePerformance({
                runtimePreference: stored.runtimePreference,
                modelType: stored.modelType,
                inferenceWidth: stored.inferenceWidth,
                cameraFrameRate: stored.cameraFrameRate,
                minimumDetectionIntervalMs: stored.minimumDetectionIntervalMs,
                maximumPredictionMs: stored.maximumPredictionMs,
                trackingResponse: stored.trackingResponse
            });
        } catch (error) {
            console.warn("[HandDetector] Failed to read stored performance settings:", error);
        }
    }

    /**
     * @returns {void}
     */
    #storePerformanceSettings() {
        try {
            let settings = this.performanceSettings();
            localStorage.setItem(HAND_DETECTOR_PERFORMANCE_STORAGE_KEY, JSON.stringify({
                runtimePreference: settings.runtimePreference,
                modelType: settings.modelType,
                inferenceWidth: settings.inferenceWidth,
                cameraFrameRate: settings.cameraFrameRate,
                minimumDetectionIntervalMs: settings.minimumDetectionIntervalMs,
                maximumPredictionMs: settings.maximumPredictionMs,
                trackingResponse: settings.trackingResponse
            }));
        } catch (error) {
            console.warn("[HandDetector] Failed to store performance settings:", error);
        }
    }

    /**
     * @param {object} ml5Library
     * @returns {Promise<object>}
     */
    async #loadHandPoseModel(ml5Library) {
        let lastError = null;
        for (let options of this.#handPoseModelOptions()) {
            try {
                let handPose = ml5Library.handPose(options);
                let model = await Promise.resolve(
                    handPose.ready ? handPose.ready.then(() => handPose) : handPose
                );
                return { model, options };
            } catch (error) {
                lastError = error;
                console.warn(
                    `HandDetector failed to load ${options.runtime}/${options.modelType}; trying fallback:`,
                    error
                );
            }
        }

        throw lastError || new Error("No handPose model configuration loaded.");
    }

    /**
     * @returns {object[]}
     */
    #handPoseModelOptions() {
        let fallbackRuntime = this.runtimePreference === "tfjs" ? "mediapipe" : "tfjs";
        return [
            {
                runtime: this.runtimePreference,
                modelType: this.modelType,
                maxHands: 1,
                flipped: true
            },
            {
                runtime: fallbackRuntime,
                modelType: this.modelType,
                maxHands: 1,
                flipped: true
            }
        ];
    }

    /**
     * @returns {void}
     */
    #startDetectionLoop() {
        if (!this.handPose || !this.video || this.detecting) {
            return;
        }

        this.detecting = true;
        let loopId = ++this.detectionLoopId;
        this.#runDetectionLoop(loopId).catch((error) => {
            if (loopId !== this.detectionLoopId) {
                return;
            }

            this.error = error;
            this.detecting = false;
            console.error("HandDetector detection loop stopped:", error);
        });
    }

    /**
     * @param {Number} loopId
     * @returns {Promise<void>}
     */
    async #runDetectionLoop(loopId) {
        while (this.detecting &&
            loopId === this.detectionLoopId &&
            this.handPose &&
            this.video) {
            let sampledAt = performance.now();

            try {
                let results = await this.handPose.detect(this.video);
                if (!this.detecting ||
                    loopId !== this.detectionLoopId ||
                    !this.handPose ||
                    !this.video) {
                    return;
                }

                let durationMs = performance.now() - sampledAt;
                this.#recordDetectionDuration(durationMs);
                this.hands = results || [];
                this.#recordInferenceResult(sampledAt);
            } catch (error) {
                if (!this.detecting || loopId !== this.detectionLoopId) {
                    return;
                }

                this.error = error;
                console.error("HandDetector failed during hand detection:", error);
                await this.#sleep(500);
            }

            let elapsed = performance.now() - sampledAt;
            let delayMs = Math.max(0, this.minimumDetectionIntervalMs - elapsed);
            if (delayMs > 0) {
                await this.#sleep(delayMs);
            } else {
                await this.#nextAnimationFrame();
            }
        }
    }

    /**
     * @param {Number} ms
     * @returns {Promise<void>}
     */
    #sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * @returns {Promise<void>}
     */
    #nextAnimationFrame() {
        return new Promise((resolve) => {
            if (typeof requestAnimationFrame === "function") {
                requestAnimationFrame(() => resolve());
                return;
            }

            setTimeout(resolve, 0);
        });
    }

    /**
     * @param {Number} value
     * @param {Number} minimum
     * @param {Number} maximum
     * @param {Number} fallback
     * @returns {Number}
     */
    #clampNumber(value, minimum, maximum, fallback) {
        let number = Number(value);
        if (!Number.isFinite(number)) {
            return fallback;
        }

        return Math.min(maximum, Math.max(minimum, number));
    }

    /**
     * @param {Number} durationMs
     * @returns {void}
     */
    #recordDetectionDuration(durationMs) {
        if (!Number.isFinite(durationMs)) {
            return;
        }

        this.lastDetectionDurationMs = durationMs;
        this.detectionCount++;
        this.averageDetectionDurationMs = this.averageDetectionDurationMs === 0
            ? durationMs
            : this.averageDetectionDurationMs * 0.9 + durationMs * 0.1;
    }

    /**
     * @returns {void}
     */
    #ensureStarted() {
        if (!this.started) {
            this.start();
        }
    }

    /**
     * @returns {object | null}
     */
    #currentHand() {
        return this.hands.length > 0 ? this.hands[0] : null;
    }

    /**
     * @param {"thumb" | "indexFinger"} finger
     * @returns {Matter.Vector | null}
     */
    #frameSnapshot() {
        this.#ensureStarted();
        let currentFrame = typeof frameCount === "number"
            ? frameCount
            : Math.floor(performance.now() / 16);
        if (currentFrame === this.snapshotFrame) {
            return this.snapshot;
        }

        this.snapshotFrame = currentFrame;
        this.#advanceTrackedTips();
        let thumb = this.trackedTips.thumb.display;
        let index = this.trackedTips.indexFinger.display;
        let pointer = thumb && index
            ? {
                x: (thumb.x + index.x) / 2,
                y: (thumb.y + index.y) / 2
            }
            : null;
        let fingerPath = this.#rawThumbToIndexPath();
        if (fingerPath.length > 0 && thumb) {
            fingerPath[0] = { ...thumb };
        }
        if (fingerPath.length > 1 && index) {
            fingerPath[fingerPath.length - 1] = { ...index };
        }
        this.snapshot = {
            thumb: thumb ? { ...thumb } : null,
            index: index ? { ...index } : null,
            pointer,
            pinched: this.pinchState,
            fingerPath
        };
        return this.snapshot;
    }

    /**
     * @returns {Matter.Vector[]}
     */
    #rawThumbToIndexPath() {
        let hand = this.#currentHand();
        if (!hand) return [];

        let points = [4, 2, 0, 6, 8]
            .map((index) => this.#toCanvasPoint(this.#keypointByIndex(hand, index)));
        if (points.some((point) => point === null)) {
            return [];
        }

        return points.map((point) => ({ ...point }));
    }

    /**
     * @param {"thumb" | "indexFinger"} finger
     * @returns {Matter.Vector | null}
     */
    #rawTipPosition(finger) {
        let hand = this.#currentHand();
        if (!hand) return null;
        let point = null;
        if (finger === "thumb") {
            point = hand.thumb_tip ||
                this.#keypointByName(hand, "thumb_tip") ||
                this.#keypointByIndex(hand, 4) ||
                this.#annotationTip(hand, "thumb", 3);
        } else {
            point = hand.index_finger_tip ||
                this.#keypointByName(hand, "index_finger_tip") ||
                this.#keypointByIndex(hand, 8) ||
                this.#annotationTip(hand, "indexFinger", 3);
        }

        return this.#toCanvasPoint(point);
    }

    /**
     * @returns {{display: Matter.Vector | null, target: Matter.Vector | null, velocity: Matter.Vector, updatedAt: Number}}
     */
    #emptyTrackedPoint() {
        return {
            display: null,
            target: null,
            velocity: { x: 0, y: 0 },
            updatedAt: 0
        };
    }

    /**
     * @returns {void}
     */
    #recordInferenceResult(sampledAt = performance.now()) {
        let now = sampledAt;
        for (let finger of ["thumb", "indexFinger"]) {
            let position = this.#rawTipPosition(finger);
            let tracked = this.trackedTips[finger];
            if (!position) {
                tracked.target = null;
                tracked.display = null;
                tracked.velocity = { x: 0, y: 0 };
                tracked.updatedAt = now;
                continue;
            }

            if (tracked.target && tracked.updatedAt > 0) {
                let elapsed = Math.max(1, now - tracked.updatedAt);
                tracked.velocity = {
                    x: (position.x - tracked.target.x) / elapsed,
                    y: (position.y - tracked.target.y) / elapsed
                };
            }
            tracked.target = position;
            tracked.display = tracked.display || { ...position };
            tracked.updatedAt = now;
        }
        this.#updatePinchState();
    }

    /**
     * @returns {void}
     */
    #updatePinchState() {
        let hand = this.#currentHand();
        if (!hand) {
            this.pinchState = false;
            this.previousPinchAngle = 90;
            return;
        }

        let thumbBase = this.#toCanvasPoint(this.#keypointByIndex(hand, 2));
        let indexBase = this.#toCanvasPoint(this.#keypointByIndex(hand, 5));
        let thumbTip = this.#rawTipPosition("thumb");
        let indexTip = this.#rawTipPosition("indexFinger");
        if (!thumbBase || !indexBase || !thumbTip || !indexTip) {
            this.pinchState = false;
            this.previousPinchAngle = 90;
            return;
        }

        let pivot = {
            x: (thumbBase.x + indexBase.x) / 2,
            y: (thumbBase.y + indexBase.y) / 2
        };
        let angle = this.#angleBetweenRays(pivot, thumbTip, indexTip);
        let tipDistance = this.#distance(thumbTip, indexTip);
        let closeDistance = this.#dynamicPinchThreshold();
        let releaseDistance = closeDistance * this.pinchReleaseDistanceMultiplier;

        if (!this.pinchState) {
            let crossedCloseAngle =
                this.previousPinchAngle > this.pinchCloseAngle &&
                angle <= this.pinchCloseAngle;
            if (
                (crossedCloseAngle || angle <= this.pinchCloseAngle) &&
                tipDistance <= closeDistance
            ) {
                this.pinchState = true;
            }
        } else {
            let crossedOpenAngle =
                this.previousPinchAngle < this.pinchOpenAngle &&
                angle >= this.pinchOpenAngle;
            if (
                crossedOpenAngle ||
                angle >= this.pinchOpenAngle ||
                tipDistance >= releaseDistance
            ) {
                this.pinchState = false;
            }
        }

        this.previousPinchAngle = angle;
    }

    /**
     * @param {Matter.Vector} pivot
     * @param {Matter.Vector} first
     * @param {Matter.Vector} second
     * @returns {Number}
     */
    #angleBetweenRays(pivot, first, second) {
        let firstX = first.x - pivot.x;
        let firstY = first.y - pivot.y;
        let secondX = second.x - pivot.x;
        let secondY = second.y - pivot.y;
        let firstLength = Math.sqrt(firstX * firstX + firstY * firstY);
        let secondLength = Math.sqrt(secondX * secondX + secondY * secondY);
        if (firstLength === 0 || secondLength === 0) {
            return 90;
        }

        let cosine = (firstX * secondX + firstY * secondY)
            / (firstLength * secondLength);
        cosine = Math.max(-1, Math.min(1, cosine));
        let angle = Math.acos(cosine) * 180 / Math.PI;
        return angle > 90 ? 180 - angle : angle;
    }

    /**
     * @returns {void}
     */
    #advanceTrackedTips() {
        let currentFrame = typeof frameCount === "number"
            ? frameCount
            : Math.floor(performance.now() / 16);
        if (currentFrame === this.lastTrackingFrame) return;
        this.lastTrackingFrame = currentFrame;

        let now = performance.now();
        for (let tracked of Object.values(this.trackedTips)) {
            if (!tracked.target || !tracked.display) continue;

            let predictionMs = Math.min(
                this.maximumPredictionMs,
                Math.max(0, now - tracked.updatedAt)
            );
            let predicted = {
                x: tracked.target.x + tracked.velocity.x * predictionMs,
                y: tracked.target.y + tracked.velocity.y * predictionMs
            };
            tracked.display.x += (predicted.x - tracked.display.x) * this.trackingResponse;
            tracked.display.y += (predicted.y - tracked.display.y) * this.trackingResponse;
        }
    }

    /**
     * @param {object} hand
     * @param {string} name
     * @returns {object | null}
     */
    #keypointByName(hand, name) {
        if (!hand.keypoints) {
            return null;
        }

        return hand.keypoints.find((keypoint) => keypoint.name === name) || null;
    }

    /**
     * @param {object} hand
     * @param {Number} index
     * @returns {object | null}
     */
    #keypointByIndex(hand, index) {
        if (hand.keypoints && hand.keypoints[index]) {
            return hand.keypoints[index];
        }

        if (hand.landmarks && hand.landmarks[index]) {
            return hand.landmarks[index];
        }

        return null;
    }

    /**
     * @param {object} hand
     * @param {string} finger
     * @param {Number} index
     * @returns {object | null}
     */
    #annotationTip(hand, finger, index) {
        if (!hand.annotations || !hand.annotations[finger]) {
            return null;
        }

        return hand.annotations[finger][index] || null;
    }

    /**
     * @param {object | Number[]} point
     * @returns {Matter.Vector | null}
     */
    #toCanvasPoint(point) {
        if (!point) {
            return null;
        }

        let x = Array.isArray(point) ? point[0] : point.x;
        let y = Array.isArray(point) ? point[1] : point.y;
        if (typeof x !== "number" || typeof y !== "number") {
            return null;
        }

        let canvasWidth = this.#canvasWidth();
        let canvasHeight = this.#canvasHeight();
        let videoWidth = this.video && this.video.width ? this.video.width : canvasWidth;
        let videoHeight = this.video && this.video.height ? this.video.height : canvasHeight;
        return {
            x: x * (canvasWidth / videoWidth),
            y: y * (canvasHeight / videoHeight)
        };
    }

    /**
     * @returns {Number}
     */
    #canvasWidth() {
        return typeof width === "number" && width > 0 ? width : 640;
    }

    /**
     * @returns {Number}
     */
    #canvasHeight() {
        return typeof height === "number" && height > 0 ? height : 480;
    }

    /**
     * @returns {Number}
     */
    #dynamicPinchThreshold() {
        let hand = this.#currentHand();
        let wrist = hand ? this.#keypointByIndex(hand, 0) : null;
        let indexBase = hand ? this.#keypointByIndex(hand, 5) : null;
        let middleBase = hand ? this.#keypointByIndex(hand, 9) : null;
        let pinkyBase = hand ? this.#keypointByIndex(hand, 17) : null;

        let palmLength = this.#distance(
            this.#toCanvasPoint(wrist),
            this.#toCanvasPoint(middleBase)
        );
        let palmWidth = this.#distance(
            this.#toCanvasPoint(indexBase),
            this.#toCanvasPoint(pinkyBase)
        );
        let validMeasurements = [palmLength, palmWidth].filter(
            (measurement) => Number.isFinite(measurement) && measurement > 0
        );

        if (validMeasurements.length === 0) {
            return this.fallbackPinchThreshold;
        }

        let handScale = validMeasurements.reduce(
            (total, measurement) => total + measurement,
            0
        ) / validMeasurements.length;
        let closeRangeRatioBoost = Math.max(
            0,
            handScale - this.closeHandScale
        ) * this.closeHandThresholdBoost;

        return Math.min(
            this.maximumPinchThreshold,
            Math.max(
                this.minimumPinchThreshold,
                handScale * (this.pinchThresholdRatio + closeRangeRatioBoost)
            )
        );
    }

    /**
     * @param {Matter.Vector | null} a
     * @param {Matter.Vector | null} b
     * @returns {Number}
     */
    #distance(a, b) {
        if (!a || !b) {
            return Infinity;
        }

        let dx = a.x - b.x;
        let dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

let handDetector = new HandDetector();
