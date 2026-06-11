class Bead {
    /**
     * 
     * @param {Number} _x 
     * @param {Number} _y 
     * @param {Number} _w 
     * @param {Number} _h 
     * @param {import("p5").Color | null} _color
     * @param {Matter.Engine} engine 
     * @param {object | null} [asset]
     */
    constructor(_x, _y, _w, _h, _color, engine, asset = null) {
        /** @type {import("p5").Color | null} */
        this.color = _color;
        /** @type {object | null} */
        this.asset = asset;
        /** @type {string | null} */
        this.assetId = asset?.id ?? null;

        /** @type {Number} */
        this.w = asset?.gameplayWidth ?? _w;
        /** @type {Number} */
        this.h = asset?.gameplayHeight ?? _h;
        /** @type {Number} */
        this.holeH = 10;
        /** @type {Number} */
        this.partH = (this.h - this.holeH) / 2;
        /** @type {Number} */
        this.partOffset = (this.partH + this.holeH) / 2;
        /** @type {Wire | null} */
        this.currentWire = null;
        /** @type {Number} */
        this.wireCheckTolerance = Math.max(this.holeH, this.w) / 2;
        /** @type {boolean} */
        this.isPierced = false;
        /** @type {Number} */
        this.wireT = 1;
        /** @type {Matter.Vector | null} */
        this.previousHeldEndPosition = null;
        /** @type {boolean} */
        this.enteredHoleFromRight = false;
        /** @type {Number} */
        this.safeAreaInset = 40;
        /** @type {Number | null} */
        this.pierceOrder = null;
        /** @type {{min: Number, max: Number}} */
        this.wireTRange = { min: 0.001, max: 0.999 };

        let collisionWidth = asset?.collisionWidth ?? this.w;
        let collisionHeight = asset?.collisionHeight ?? this.h;
        /** @type {Number} */
        this.collisionWidth = collisionWidth;
        /** @type {Number} */
        this.collisionHeight = collisionHeight;
        this.holeH = 10;
        this.partH = Math.max(1, (collisionHeight - this.holeH) / 2);
        this.partOffset = (this.partH + this.holeH) / 2;

        let part1 = Matter.Bodies.rectangle(
            _x,
            _y - this.partOffset,
            collisionWidth,
            this.partH
        );
        let part2 = Matter.Bodies.rectangle(
            _x,
            _y + this.partOffset,
            collisionWidth,
            this.partH
        );
        this.body = Matter.Body.create({ parts: [part1, part2] });

        this.body.friction = 0.001;
        this.#clampUnpiercedPosition();

        Matter.Composite.add(engine.world, this.body);
        this.#setIntangible(true);
    }

    /**
     * 
     * @param {Wire} [wire]
     * @param {boolean} [allowPiercing]
     * @returns {void}
     */
    update(wire, allowPiercing = true) {
        let targetWire = wire || this.currentWire;
        if (!targetWire) {
            if (!this.isPierced) {
                this.#clampUnpiercedPosition();
            }
            this.#setIntangible(!this.isPierced);
            Matter.Body.setStatic(this.body, !this.isPierced);
            return;
        }

        if (!this.isPierced && allowPiercing) {
            this.#tryPierce(targetWire);
        } else if (!this.isPierced) {
            this.previousHeldEndPosition = null;
            this.enteredHoleFromRight = false;
        }

        if (!this.isPierced) {
            this.#clampUnpiercedPosition(targetWire);
            this.#setIntangible(true);
            Matter.Body.setStatic(this.body, true);
            return;
        }

        this.currentWire = targetWire;
        this.#setIntangible(false);
        Matter.Body.setStatic(this.body, false);
        this.#clampToWire(targetWire);
    }

    /**
     * @returns {void}
     */
    displayBody() {
        if (this.asset) {
            drawBeadAtlas(
                this.asset,
                this.body.position.x,
                this.body.position.y,
                this.w,
                this.h,
                this.body.angle,
                this.asset.renderOffsetX,
                this.asset.renderOffsetY
            );
            return;
        }

        push();
        translate(this.body.position.x, this.body.position.y);
        rotate(this.body.angle);
        noStroke();
        rectMode(CENTER);
        fill(this.color);
        rect(0, 0, this.w, this.h);
        pop();
    }

    /**
     * @returns {void}
     */
    display() {
        this.displayBody();
    }

    /**
     * 
     * @param {Wire} [wire] 
     * @returns {boolean}
     */
    onWire(wire) {
        // 와이어에 꽂혀 있는지 확인
        if (this.isPierced && wire === this.currentWire) {
            return true;
        }

        if (!wire || !wire.segments || wire.segments.length === 0) {
            if (this.currentWire === wire) {
                this.currentWire = null;
            }
            return false;
        }

        let beadPosition = this.body.position;
        let closestDistance = Infinity;

        for (let segment of wire.segments) {
            let endpoints = this.#segmentEndpoints(segment, wire.segLength);
            let distance = this.#distanceToSegment(beadPosition, endpoints.start, endpoints.end);
            closestDistance = Math.min(closestDistance, distance);
        }

        let isOnWire = closestDistance <= this.wireCheckTolerance;
        if (this.isPierced) {
            this.currentWire = wire;
        } else {
            this.currentWire = isOnWire ? wire : null;
        }
        return isOnWire;
    }

    /**
     * @param {Wire} wire
     * @returns {void}
     */
    #tryPierce(wire) {
        let heldEnd = this.#heldEndPosition(wire);
        if (!heldEnd) {
            this.previousHeldEndPosition = null;
            this.enteredHoleFromRight = false;
            return;
        }

        let previous = this.previousHeldEndPosition;
        this.previousHeldEndPosition = { ...heldEnd };

        if (!wire.isHeld() || !previous) {
            if (!wire.isHeld()) {
                this.enteredHoleFromRight = false;
            }
            return;
        }

        let previousLocal = this.#worldPointToLocal(previous);
        let currentLocal = this.#worldPointToLocal(heldEnd);
        let rightEdge = this.w / 2;
        let leftEdge = -this.w / 2;
        let almostThroughX = leftEdge + this.w * 0.08;
        let holeTolerance = Math.max(this.holeH, this.h * 0.35);
        let movingLeft = currentLocal.x < previousLocal.x;
        let wasOnRight = previousLocal.x >= rightEdge || currentLocal.x >= rightEdge;
        if (wasOnRight && movingLeft && Math.abs(currentLocal.y) <= holeTolerance) {
            this.enteredHoleFromRight = true;
        } else if (Math.abs(currentLocal.y) > holeTolerance || currentLocal.x > rightEdge) {
            this.enteredHoleFromRight = false;
        }

        let almostCompletelyThrough = currentLocal.x <= almostThroughX;
        let throughHole = this.#sweptSegmentIntersectsHole(previousLocal, currentLocal, leftEdge, rightEdge, holeTolerance);

        if (!(this.enteredHoleFromRight && movingLeft && almostCompletelyThrough && throughHole)) {
            return;
        }

        this.isPierced = true;
        this.currentWire = wire;
        this.wireT = this.wireTRange.max;
    }

    /**
     * @param {Number} order
     * @returns {void}
     */
    setPierceOrder(order) {
        if (this.pierceOrder === null) {
            this.pierceOrder = order;
        }
    }

    /**
     * @param {Number} minT
     * @param {Number} maxT
     * @returns {void}
     */
    setWireTRange(minT, maxT) {
        minT = Math.max(0.001, Math.min(0.999, minT));
        maxT = Math.max(0.001, Math.min(0.999, maxT));

        if (minT > maxT) {
            let middle = (minT + maxT) / 2;
            minT = middle;
            maxT = middle;
        }

        this.wireTRange = { min: minT, max: maxT };
    }

    /**
     * @param {Wire} wire
     * @returns {void}
     */
    correctWirePosition(wire) {
        this.#clampToWire(wire);
    }

    /**
     * @param {Wire} wire
     * @returns {void}
     */
    snapToWireT(wire) {
        this.wireT = this.#clamp(this.wireT, this.wireTRange.min, this.wireTRange.max);
        let point = this.#pointOnWire(wire, this.wireT);
        if (!point) {
            return;
        }

        Matter.Body.setPosition(this.body, point);
        this.#projectVelocityToWire(wire, this.wireT);
    }

    /**
     * @param {Matter.Vector} start
     * @param {Matter.Vector} end
     * @param {Number} leftEdge
     * @param {Number} rightEdge
     * @param {Number} holeTolerance
     * @returns {boolean}
     */
    #sweptSegmentIntersectsHole(start, end, leftEdge, rightEdge, holeTolerance) {
        let dx = end.x - start.x;
        let sampleCount = Math.max(6, Math.ceil(Math.abs(dx) / Math.max(1, this.holeH)));

        for (let i = 0; i <= sampleCount; ++i) {
            let t = i / sampleCount;
            let x = start.x + dx * t;
            let y = start.y + (end.y - start.y) * t;

            if (x >= leftEdge && x <= rightEdge && Math.abs(y) <= holeTolerance) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param {Wire} wire
     * @returns {void}
     */
    #clampToWire(wire) {
        let projection = this.#closestPointOnWire(wire, this.body.position);
        if (!projection) {
            return;
        }

        this.wireT = this.#clamp(projection.t, this.wireTRange.min, this.wireTRange.max);
        let point = this.#pointOnWire(wire, this.wireT);
        if (!point) {
            return;
        }

        Matter.Body.setPosition(this.body, point);
        this.#projectVelocityToWire(wire, this.wireT);
    }

    /**
     * @param {Wire} wire
     * @returns {boolean}
     */
    #reachedWireBottom(wire) {
        let lastSegment = wire.segments[wire.segments.length - 1];
        let bottom = this.#localPointToWorld(lastSegment, { x: 0, y: wire.segLength / 2 });
        return this.#distance(this.body.position, bottom) <= this.wireCheckTolerance;
    }

    /**
     * @param {Wire} wire
     * @returns {Matter.Vector | null}
     */
    #heldEndPosition(wire) {
        if (!wire.graphPoints || wire.graphPoints.length === 0) {
            return null;
        }

        return wire.graphPoints[wire.graphPoints.length - 1];
    }

    /**
     * @param {Wire} wire
     * @param {Matter.Vector} point
     * @returns {{point: Matter.Vector, t: Number, distance: Number} | null}
     */
    #closestPointOnWire(wire, point) {
        if (!wire.graphPoints || wire.graphPoints.length < 2) {
            return null;
        }

        let result = null;
        for (let i = 0; i < wire.graphPoints.length - 1; ++i) {
            let start = wire.graphPoints[i];
            let end = wire.graphPoints[i + 1];
            let projection = this.#projectToSegment(point, start, end);
            let t = (i + projection.t) / (wire.graphPoints.length - 1);

            if (!result || projection.distance < result.distance) {
                result = {
                    point: projection.point,
                    t,
                    distance: projection.distance
                };
            }
        }

        return result;
    }

    /**
     * @param {Wire} wire
     * @param {Number} t
     * @returns {Matter.Vector | null}
     */
    #pointOnWire(wire, t) {
        if (!wire.graphPoints || wire.graphPoints.length < 2) {
            return null;
        }

        let scaled = Math.max(0, Math.min(1, t)) * (wire.graphPoints.length - 1);
        let index = Math.min(Math.floor(scaled), wire.graphPoints.length - 2);
        let localT = scaled - index;
        let start = wire.graphPoints[index];
        let end = wire.graphPoints[index + 1];

        return {
            x: start.x + (end.x - start.x) * localT,
            y: start.y + (end.y - start.y) * localT
        };
    }

    /**
     * @param {Wire} wire
     * @param {Number} t
     * @returns {Matter.Vector | null}
     */
    #tangentOnWire(wire, t) {
        if (!wire.graphPoints || wire.graphPoints.length < 2) {
            return null;
        }

        let scaled = Math.max(0, Math.min(1, t)) * (wire.graphPoints.length - 1);
        let index = Math.min(Math.floor(scaled), wire.graphPoints.length - 2);
        let start = wire.graphPoints[index];
        let end = wire.graphPoints[index + 1];
        let dx = end.x - start.x;
        let dy = end.y - start.y;
        let length = Math.sqrt(dx * dx + dy * dy);

        if (length === 0) {
            return { x: 1, y: 0 };
        }

        return {
            x: dx / length,
            y: dy / length
        };
    }

    /**
     * @param {Wire} wire
     * @param {Number} t
     * @returns {void}
     */
    #projectVelocityToWire(wire, t) {
        let tangent = this.#tangentOnWire(wire, t);
        if (!tangent) {
            return;
        }

        let velocity = this.body.velocity;
        let speed = velocity.x * tangent.x + velocity.y * tangent.y;
        Matter.Body.setVelocity(this.body, {
            x: tangent.x * speed,
            y: tangent.y * speed
        });
    }

    /**
     * @param {Matter.Vector} point
     * @param {Matter.Vector} start
     * @param {Matter.Vector} end
     * @returns {{point: Matter.Vector, t: Number, distance: Number}}
     */
    #projectToSegment(point, start, end) {
        let dx = end.x - start.x;
        let dy = end.y - start.y;
        let lengthSquared = dx * dx + dy * dy;
        let t = lengthSquared === 0 ? 0 : ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared;
        t = Math.max(0, Math.min(1, t));
        let projected = {
            x: start.x + t * dx,
            y: start.y + t * dy
        };

        return {
            point: projected,
            t,
            distance: this.#distance(point, projected)
        };
    }

    /**
     * @param {Matter.Body} segment
     * @param {Number} segmentLength
     * @returns {{start: Matter.Vector, end: Matter.Vector}}
     */
    #segmentEndpoints(segment, segmentLength) {
        return {
            start: this.#localPointToWorld(segment, { x: 0, y: -segmentLength / 2 }),
            end: this.#localPointToWorld(segment, { x: 0, y: segmentLength / 2 })
        };
    }

    /**
     * @param {Matter.Body} body
     * @param {Matter.Vector} point
     * @returns {Matter.Vector}
     */
    #localPointToWorld(body, point) {
        let cosAngle = Math.cos(body.angle);
        let sinAngle = Math.sin(body.angle);

        return {
            x: body.position.x + point.x * cosAngle - point.y * sinAngle,
            y: body.position.y + point.x * sinAngle + point.y * cosAngle
        };
    }

    /**
     * @param {Matter.Vector} point
     * @returns {Matter.Vector}
     */
    #worldPointToLocal(point) {
        let dx = point.x - this.body.position.x;
        let dy = point.y - this.body.position.y;
        let cosAngle = Math.cos(-this.body.angle);
        let sinAngle = Math.sin(-this.body.angle);

        return {
            x: dx * cosAngle - dy * sinAngle,
            y: dx * sinAngle + dy * cosAngle
        };
    }

    /**
     * @param {Matter.Vector} point
     * @param {Matter.Vector} start
     * @param {Matter.Vector} end
     * @returns {Number}
     */
    #distanceToSegment(point, start, end) {
        let dx = end.x - start.x;
        let dy = end.y - start.y;
        let lengthSquared = dx * dx + dy * dy;

        if (lengthSquared === 0) {
            return this.#distance(point, start);
        }

        let t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared;
        t = Math.max(0, Math.min(1, t));

        return this.#distance(point, {
            x: start.x + t * dx,
            y: start.y + t * dy
        });
    }

    /**
     * @param {Matter.Vector} a
     * @param {Matter.Vector} b
     * @returns {Number}
     */
    #distance(a, b) {
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * @param {boolean} intangible
     * @returns {void}
     */
    #setIntangible(intangible) {
        this.body.isSensor = intangible;
        for (let part of this.body.parts) {
            part.isSensor = intangible;
        }
    }

    /**
     * @param {Wire} [wire]
     * @returns {void}
     */
    #clampUnpiercedPosition(wire) {
        let position = this.#clampedUnpiercedPosition(this.body.position, wire);
        Matter.Body.setPosition(this.body, position);
        Matter.Body.setVelocity(this.body, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(this.body, 0);
    }

    /**
     * @param {Matter.Vector} position
     * @param {Wire} [wire]
     * @returns {Matter.Vector}
     */
    #clampedUnpiercedPosition(position, wire) {
        let wireMargin = wire && typeof wire.safeMargin === "number" ? wire.safeMargin : 120;
        let horizontalMargin = wireMargin + this.safeAreaInset + this.w / 2;
        let verticalMargin = wireMargin + this.safeAreaInset + this.h / 2;
        let maxY = this.#canvasHeight() - verticalMargin;

        if (wire && typeof wire.reachableHeldEndMaxY === "function") {
            maxY = Math.min(maxY, wire.reachableHeldEndMaxY());
        }

        return {
            x: this.#clamp(position.x, horizontalMargin, this.#canvasWidth() - horizontalMargin),
            y: this.#clamp(position.y, verticalMargin, maxY)
        };
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
}
