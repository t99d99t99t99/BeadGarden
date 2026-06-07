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
        this.inferenceWidth = 640;
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
            this.video = createCapture(HAND_DETECTOR_GLOBAL.VIDEO || "video");
            let inferenceHeight = Math.round(
                this.inferenceWidth * this.#canvasHeight() / this.#canvasWidth()
            );
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
    }

    /**
     * @returns {Matter.Vector | null}
     */
    thumbPosition() {
        // 엄지 위치
        this.#ensureStarted();
        return this.#tipPosition("thumb");
    }

    /**
     * @returns {Matter.Vector | null}
     */
    gumjiPosition() {
        // 검지 위치
        this.#ensureStarted();
        return this.#tipPosition("indexFinger");
    }

    /**
     * @returns {boolean}
     */
    pinched() {
        // 엄지와 검지가 맞닿아 있는지를 반환
        this.#ensureStarted();

        let thumb = this.thumbPosition();
        let index = this.gumjiPosition();
        if (!thumb || !index) {
            return false;
        }

        return this.#distance(thumb, index) <= this.#dynamicPinchThreshold();
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
        // 엄지 위치와 검지 위치의 중간점을 반환
        this.#ensureStarted();

        let thumb = this.thumbPosition();
        let index = this.gumjiPosition();
        if (!thumb || !index) {
            return null;
        }

        return {
            x: (thumb.x + index.x) / 2,
            y: (thumb.y + index.y) / 2
        };
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
    #tipPosition(finger) {
        let hand = this.#currentHand();
        if (!hand) {
            return null;
        }

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
