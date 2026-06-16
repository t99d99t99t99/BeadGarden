const HAND_DETECTOR_GLOBAL = /** @type {any} */ (globalThis);

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
        this.inferenceWidth = 256;
        this.trackedTips = {
            thumb: this.#emptyTrackedPoint(),
            indexFinger: this.#emptyTrackedPoint()
        };
        this.lastTrackingFrame = -1;
        this.trackingResponse = 0.9;
        this.maximumPredictionMs = 150;
        this.snapshotFrame = -1;
        this.snapshot = {
            thumb: null,
            index: null,
            pointer: null,
            pinched: false
        };
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

        try {
            let inferenceHeight = Math.round(
                this.inferenceWidth * this.#canvasHeight() / this.#canvasWidth()
            );
            this.video = createCapture({
                video: {
                    width: { ideal: this.inferenceWidth },
                    height: { ideal: inferenceHeight },
                    frameRate: { ideal: 30, max: 30 },
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

            let handPose = ml5Library.handPose({
                flipped: true,
                maxHands: 1
            });

            let ready = handPose.ready ? handPose.ready.then(() => handPose) : handPose;
            Promise.resolve(ready)
                .then((model) => {
                    this.handPose = model;
                    this.ready = true;
                    this.loading = false;
                    this.handPose.detectStart(this.video, (results) => {
                        this.hands = results || [];
                        this.#recordInferenceResult();
                    });
                })
                .catch((error) => {
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
        this.trackedTips = {
            thumb: this.#emptyTrackedPoint(),
            indexFinger: this.#emptyTrackedPoint()
        };
        this.lastTrackingFrame = -1;
        this.snapshotFrame = -1;
        this.pinchState = false;
        this.previousPinchAngle = 90;
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
        this.#ensureStarted();
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
        this.snapshot = {
            thumb: thumb ? { ...thumb } : null,
            index: index ? { ...index } : null,
            pointer,
            pinched: this.pinchState
        };
        return this.snapshot;
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
    #recordInferenceResult() {
        let now = performance.now();
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
