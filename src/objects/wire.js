// 비드 조립 중 나타나는 철사를 담당하는 클래스
const HIDDEN_CONSTRAINT_RENDER = {
    visible: false,
    lineWidth: 0,
    strokeStyle: "transparent"
};
const BEAD_BLOCKER_SIZE = 16;
let beadBlockerImage = null;

function preloadWireAssets() {
    beadBlockerImage = loadImage("assets/bead_blocker.png");
}

class Wire {
    /**
     * 
     * @param {Number} _wireLength 
     * @param {Number} _segNum 
     * @param {Number} _x 
     * @param {Number} _y 
     * @param {Number} _thickness
     * @param {Matter.Engine} engine
     */
    constructor(_wireLength, _segNum, _x, _y, _thickness, engine) {
        this.wireLength = _wireLength;
        this.segNum = Math.max(2, Math.floor(_segNum));
        this.segLength = this.wireLength / this.segNum;
        this.thickness = _thickness;
        this.blockerRadius = BEAD_BLOCKER_SIZE / 2;
        this.engine = engine;
        this.heldEndRestPosition = { x: _x, y: _y };
        this.unheldEndRestPosition = { x: _x + this.wireLength, y: _y };
        this.endOffsetFromHeld = {
            x: this.unheldEndRestPosition.x - this.heldEndRestPosition.x,
            y: this.unheldEndRestPosition.y - this.heldEndRestPosition.y
        };
        this.basePosition = this.heldEndRestPosition;
        this.heldEndPosition = null;
        this.safeMargin = 120;
        this.smoothedHeldEndPosition = { ...this.heldEndRestPosition };
        this.smoothedUnheldEndPosition = { ...this.unheldEndRestPosition };
        this.liftAmount = 0;
        this.graphPoints = [];
        this.shadowPoints = [];
        this.unheldEndStop = Matter.Bodies.circle(
            this.unheldEndRestPosition.x,
            this.unheldEndRestPosition.y,
            this.blockerRadius,
            {
                isStatic: true,
                friction: 0,
                restitution: 0,
                render: {
                    visible: false,
                    opacity: 0,
                    fillStyle: "transparent",
                    strokeStyle: "transparent",
                    lineWidth: 0
                }
            }
        );

        let segments = Matter.Composite.create();
        for (let i = this.segNum - 1; i >= 0; --i) {
            Matter.Composite.add(
                segments,
                Matter.Bodies.rectangle(_x + this.segLength * (i + 0.5), _y, this.thickness, this.segLength, {
                    isStatic: true
                }));
        }

        this.body = segments;
        this.segments = this.body.bodies.slice();
        Matter.Composite.add(this.body, this.unheldEndStop);
        this.#clampRestPositions(false);
        this.smoothedHeldEndPosition = { ...this.heldEndRestPosition };
        this.smoothedUnheldEndPosition = { ...this.unheldEndRestPosition };
        this.update();

        Matter.Composite.add(engine.world, this.body);
    }

    isHeld() {
        // 나중에 제대로 작동하도록 수정할 거임
        return this.heldEndPosition !== null;
    }

    /**
     * @param {Number} x
     * @param {Number} y
     */
    setHeldEnd(x, y) {
        this.heldEndPosition = this.#clampHeldEnd({ x, y }, true);
    }

    release() {
        if (this.heldEndPosition !== null) {
            this.heldEndRestPosition = this.#clampHeldEnd(this.heldEndPosition, false);
            this.unheldEndRestPosition = {
                x: this.heldEndRestPosition.x + this.endOffsetFromHeld.x,
                y: this.heldEndRestPosition.y + this.endOffsetFromHeld.y
            };
            this.basePosition = this.heldEndRestPosition;
        }

        this.heldEndPosition = null;
    }

    update() {
        let held = this.isHeld();
        let heldTarget = this.#clampHeldEnd(held ? this.#currentHeldEnd() : this.heldEndRestPosition, held);
        let unheldTarget = held ? {
            x: heldTarget.x + this.endOffsetFromHeld.x,
            y: heldTarget.y + this.endOffsetFromHeld.y
        } : this.unheldEndRestPosition;

        this.liftAmount += ((held ? 1 : 0) - this.liftAmount) * 0.16;
        this.smoothedHeldEndPosition.x += (heldTarget.x - this.smoothedHeldEndPosition.x) * 0.22;
        this.smoothedHeldEndPosition.y += (heldTarget.y - this.smoothedHeldEndPosition.y) * 0.22;
        this.smoothedUnheldEndPosition.x += (unheldTarget.x - this.smoothedUnheldEndPosition.x) * 0.22;
        this.smoothedUnheldEndPosition.y += (unheldTarget.y - this.smoothedUnheldEndPosition.y) * 0.22;
        this.graphPoints = this.#graphPoints();
        this.shadowPoints = this.#shadowPoints();

        for (let i = 0; i < this.segments.length; ++i) {
            let start = this.graphPoints[i];
            let end = this.graphPoints[i + 1];
            let segment = this.segments[i];
            let x = (start.x + end.x) / 2;
            let y = (start.y + end.y) / 2;
            let angle = Math.atan2(end.y - start.y, end.x - start.x) - HALF_PI;

            Matter.Body.setPosition(segment, { x, y });
            Matter.Body.setAngle(segment, angle);
        }

        let unheldEnd = this.graphPoints[0];
        Matter.Body.setPosition(this.unheldEndStop, unheldEnd);
    }

    display() {
        // 선을 출력하기
        let points = this.graphPoints.length > 0 ? this.graphPoints : this.#graphPoints();
        let shadowPoints = this.shadowPoints.length > 0 ? this.shadowPoints : this.#shadowPoints();

        push();
        noFill();

        stroke(0, 0, 0, 45);
        strokeWeight(this.thickness + 5);
        strokeCap(ROUND);
        strokeJoin(ROUND);
        this.#drawCurve(shadowPoints);

        stroke(60, 60, 60);
        strokeWeight(this.thickness);
        strokeCap(ROUND);
        strokeJoin(ROUND);
        this.#drawCurve(points);
        pop();
    }

    displayBlocker() {
        let position = this.unheldEndStop.position;

        push();
        imageMode(CENTER);
        if (beadBlockerImage) {
            image(
                beadBlockerImage,
                position.x,
                position.y,
                BEAD_BLOCKER_SIZE,
                BEAD_BLOCKER_SIZE
            );
        } else {
            noStroke();
            fill(25);
            circle(position.x, position.y, BEAD_BLOCKER_SIZE);
        }
        pop();
    }

    /**
     * @returns {Number}
     */
    reachableHeldEndMaxY() {
        return this.#heldEndTargetMaxY() - this.wireLength * 0.28;
    }

    #currentHeldEnd() {
        if (this.heldEndPosition !== null) {
            return this.#clampHeldEnd(this.heldEndPosition, true);
        }

        if (typeof mouseX === "number" && typeof mouseY === "number") {
            return this.#clampHeldEnd({ x: mouseX, y: mouseY }, true);
        }

        return this.heldEndRestPosition;
    }

    /**
     * @param {boolean} lifted
     * @returns {void}
     */
    #clampRestPositions(lifted) {
        this.heldEndRestPosition = this.#clampHeldEnd(this.heldEndRestPosition, lifted);
        this.unheldEndRestPosition = {
            x: this.heldEndRestPosition.x + this.endOffsetFromHeld.x,
            y: this.heldEndRestPosition.y + this.endOffsetFromHeld.y
        };
        this.basePosition = this.heldEndRestPosition;
    }

    /**
     * @param {Matter.Vector} position
     * @param {boolean} lifted
     * @returns {Matter.Vector}
     */
    #clampHeldEnd(position, lifted) {
        let margin = Math.min(this.safeMargin, Math.max(20, Math.min(this.#canvasWidth(), this.#canvasHeight()) * 0.2));
        let liftPadding = lifted ? this.wireLength * 0.28 : 0;
        let minHeldX = margin;
        let maxHeldX = this.#canvasWidth() - margin;
        let minHeldY = margin + liftPadding;
        let maxHeldY = this.#heldEndTargetMaxY();
        let unheldMinX = margin - this.endOffsetFromHeld.x;
        let unheldMinY = margin - this.endOffsetFromHeld.y;

        minHeldX = Math.max(minHeldX, unheldMinX);
        minHeldY = Math.max(minHeldY, unheldMinY);

        return {
            x: this.#clamp(position.x, minHeldX, maxHeldX),
            y: this.#clamp(position.y, minHeldY, maxHeldY)
        };
    }

    /**
     * @returns {Number}
     */
    #heldEndTargetMaxY() {
        let margin = Math.min(this.safeMargin, Math.max(20, Math.min(this.#canvasWidth(), this.#canvasHeight()) * 0.2));
        let maxHeldY = this.#canvasHeight() - margin;
        let unheldMaxY = this.#canvasHeight() - margin - this.endOffsetFromHeld.y;

        maxHeldY = Math.min(maxHeldY, unheldMaxY);

        return maxHeldY;
    }

    /**
     * @returns {Number}
     */
    #canvasWidth() {
        return typeof width === "number" && width > 0 ? width : 1440;
    }

    /**
     * @returns {Number}
     */
    #canvasHeight() {
        return typeof height === "number" && height > 0 ? height : 990;
    }

    /**
     * @param {Number} value
     * @param {Number} min
     * @param {Number} max
     * @returns {Number}
     */
    #clamp(value, min, max) {
        if (min > max) {
            return (min + max) / 2;
        }

        return Math.max(min, Math.min(max, value));
    }

    #graphPoints() {
        let points = [];
        let start = this.smoothedUnheldEndPosition;
        let end = this.smoothedHeldEndPosition;
        let liftHeight = this.wireLength * 0.28 * this.liftAmount;

        for (let i = 0; i <= this.segNum; ++i) {
            let t = i / this.segNum;
            let x = start.x + (end.x - start.x) * t;
            let shadowY = start.y + (end.y - start.y) * t;
            let y = shadowY - liftHeight * this.#mirroredSigmoid(t);

            points.push({ x, y });
        }

        return points;
    }

    #shadowPoints() {
        let points = [];
        let start = this.smoothedUnheldEndPosition;
        let end = this.smoothedHeldEndPosition;

        for (let i = 0; i <= this.segNum; ++i) {
            let t = i / this.segNum;
            points.push({
                x: start.x + (end.x - start.x) * t,
                y: start.y + (end.y - start.y) * t
            });
        }

        return points;
    }

    #mirroredSigmoid(t) {
        let steepness = 10;
        let min = this.#sigmoid(-steepness / 2);
        let max = this.#sigmoid(steepness / 2);
        return (this.#sigmoid((t - 0.5) * steepness) - min) / (max - min);
    }

    #sigmoid(value) {
        return 1 / (1 + Math.exp(-value));
    }

    #drawCurve(points) {
        beginShape();
        curveVertex(points[0].x, points[0].y);
        for (let point of points) {
            curveVertex(point.x, point.y);
        }
        let last = points[points.length - 1];
        curveVertex(last.x, last.y);
        endShape();
    }
}
