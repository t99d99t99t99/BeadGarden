// 색깔
const RED = 0;
const GREEN = 1;
let colors = [];
function color_setup() {
    colors.push(color(255, 0, 0)); // RED
    colors.push(color(0, 255, 0)); // GREEN
}

// 비즈 모양 (예시, 실제 목록은 변경될 것임)
const SQUARE_BID = 0;
const TRIANGLE = 1;

// 화분 재질 (예시, 실제 목록은 변경될 것임)
const CLAY = 0;
const GLASS = 1;

// 줄기 모양 (예시, 실제 목록은 변경될 것임)
const STRAIGHT = 0;
const WAVE = 1;
const CURVE_STEM = 2;
const MAX_PIERCED_BEAD_WIDTH = 600;

// 이 뒤에는 실제 게임 과정이 들어옴
class BeadGame {
    #matterEngine;
    #matterRunner;

    constructor() {
        // Matter.js 엔진 및 러너 생성 및 실행
        this.#matterEngine = Matter.Engine.create();
        this.#matterEngine.world.gravity.y = 1;
        this.#matterRunner = Matter.Runner.create();

        Matter.Runner.run(this.#matterRunner, this.#matterEngine);

        // 오브젝트 생성
        /** @type {Bead[]} */
        this.beads = [];
        /** @type {Wire[]} */
        this.wires = [];
        /** @type {Wire | null} */
        this.heldWire = null;
        this.wireGrabDistance = 40;
        this.paletteColors = [];
        this.theme = POT_THEMES.LEGACY;
        this.beadSpawnCount = 50;
        this.beadSpawnGap = 12;
        this.beadSpawnAttempts = 120;
        this.nextPierceOrder = 0;

    }

    /**
     * @param {Matter.Vector | HandDetector} [input]
     */
    update(input) {
        let heldPosition = this.#heldPositionFromInput(input);

        if (this.heldWire) {
            let pointer = heldPosition || { x: mouseX, y: mouseY };
            this.heldWire.setHeldEnd(pointer.x, pointer.y);
        }

        for (let wire of this.wires) {
            wire.update();
        }

        let wire = this.wires[0];
        for (let bead of this.beads) {
            let wasPierced = bead.isPierced;
            bead.update(wire, this.#canPierceBead(bead));
            if (!wasPierced && bead.isPierced) {
                bead.setPierceOrder(this.nextPierceOrder);
                this.nextPierceOrder += 1;
            }
        }

        this.#keepPiercedBeadsOrdered(wire);
    }


    display() {
        for (let wire of this.wires) {
            wire.display();
        }

        for (let bead of this.beads) {
            bead.displayBody();
        }

        for (let wire of this.wires) {
            wire.displayBlocker();
        }
    }

    draw() {
        this.display();
    }

    /**
     * @returns {Number}
     */
    get beadCount() {
        return this.beads.filter((bead) => bead.isPierced).length;
    }

    /**
     * @returns {boolean}
     */
    isWireFull() {
        let occupiedWidth = this.beads
            .filter((bead) => bead.isPierced)
            .reduce((total, bead) => total + bead.w, 0);
        let remainingWidth = MAX_PIERCED_BEAD_WIDTH - occupiedWidth;
        let unpiercedBeads = this.beads.filter((bead) => !bead.isPierced);

        return unpiercedBeads.length > 0
            && !unpiercedBeads.some((bead) => bead.w <= remainingWidth);
    }

    /**
     * @returns {boolean}
     */
    isHoldingWire() {
        return this.heldWire !== null;
    }

    /**
     * @returns {Matter.Vector | null}
     */
    getWireGrabPosition() {
        let wire = this.wires[0];
        let segment = wire ? this.#lastSegment(wire) : null;
        return segment ? { x: segment.position.x, y: segment.position.y } : null;
    }

    /**
     * @param {string[]} paletteColors
     * @returns {void}
     */
    setPalette(paletteColors) {
        this.paletteColors = paletteColors || [];
        this.theme = POT_THEMES.LEGACY;
        this.setupCraftObjects();
    }

    /**
     * @param {string} theme
     * @returns {void}
     */
    setTheme(theme) {
        this.theme = normalizePotTheme(theme);
        this.paletteColors = [];
        this.setupCraftObjects();
    }

    getBeadColors() {
        return this.beads
            .filter((bead) => bead.isPierced)
            .sort((a, b) => (b.pierceOrder ?? 0) - (a.pierceOrder ?? 0))
            .map((bead) => bead.color);
    }

    getPiercedBeadPreviewItems() {
        return this.beads
            .filter((bead) => bead.isPierced)
            .sort((a, b) => (b.pierceOrder ?? 0) - (a.pierceOrder ?? 0))
            .map((bead) => ({
                assetId: bead.assetId,
                color: bead.color,
                w: bead.w,
                h: bead.h
            }));
    }

    /**
     * Deletes a pierced bead using the same order shown in the craft preview.
     * @param {Number} previewIndex
     * @returns {boolean}
     */
    deletePiercedBeadAtPreviewIndex(previewIndex) {
        let piercedBeads = this.beads
            .filter((bead) => bead.isPierced)
            .sort((a, b) => (b.pierceOrder ?? 0) - (a.pierceOrder ?? 0));
        let bead = piercedBeads[previewIndex];

        if (!bead) {
            return false;
        }

        Matter.Composite.remove(this.#matterEngine.world, bead.body);
        this.beads = this.beads.filter((item) => item !== bead);
        this.#keepPiercedBeadsOrdered(this.wires[0]);
        return true;
    }

    getPiercedBeadData() {
        return this.beads
            .filter((bead) => bead.isPierced)
            .sort((a, b) => (a.pierceOrder ?? 0) - (b.pierceOrder ?? 0))
            .map((bead) => ({
                assetId: bead.assetId,
                color: bead.assetId ? null : bead.color?.toString?.() ?? null,
                w: bead.w,
                h: bead.h,
            }));
    }

    setupCraftObjects() {
        this.#clearObjects();
        this.spawnWire();
        this.spawnBeads();
    }

    setupDebugObjects() {
        this.#clearObjects();
        this.theme = POT_THEMES.PLANT;
        this.spawnWire();
        this.spawnBeads();
    }

    /**
     * @returns {Wire}
     */
    spawnWire() {
        let wire = new Wire(760, 32, width * 0.5, height * 0.5, 3, this.#matterEngine);
        this.wires.push(wire);
        return wire;
    }

    /**
     * @param {Number} [count]
     * @returns {void}
     */
    spawnBeads(count = this.beadSpawnCount) {
        let wire = this.wires[0] || this.spawnWire();

        for (let i = 0; i < count; ++i) {
            let beadAsset = this.#randomBeadAsset();
            if (beadAsset) {
                getBeadAtlasSprite(beadAsset);
            }
            let beadWidth = beadAsset?.gameplayWidth ?? 12;
            let beadHeight = beadAsset?.gameplayHeight ?? 12;
            let beadColor = beadAsset ? null : this.#randomBeadColor();
            let horizontalMargin = wire.safeMargin + 40 + beadWidth / 2;
            let verticalMargin = wire.safeMargin + 40 + beadHeight / 2;
            let maxY = Math.max(verticalMargin, wire.reachableHeldEndMaxY());
            let position = this.#separatedSpawnPosition(
                horizontalMargin,
                width - horizontalMargin,
                verticalMargin,
                maxY,
                beadWidth,
                beadHeight
            );

            this.beads.push(new Bead(
                position.x,
                position.y,
                beadWidth,
                beadHeight,
                beadColor,
                this.#matterEngine,
                beadAsset
            ));
        }
    }

    /**
     * @param {Number} [count]
     * @returns {void}
     */
    regenerateUnpiercedBeads(count = this.beadSpawnCount) {
        this.#removeUnpiercedBeads();
        this.spawnBeads(count);
    }

    tryHoldWire() {
        this.tryHoldWireAt({ x: mouseX, y: mouseY });
    }

    /**
     * @param {Matter.Vector | null} position
     */
    tryHoldWireAt(position) {
        if (gameState !== GAME_STATE.DEBUG && gameState !== GAME_STATE.STEM_BEAD_CRAFT) {
            return;
        }

        if (!position) {
            return;
        }

        let wire = this.#wireNearPosition(position);
        if (!wire) {
            return;
        }

        this.heldWire = wire;
        this.heldWire.setHeldEnd(position.x, position.y);
        this.heldWire.update();
    }

    releaseWire() {
        if (!this.heldWire) {
            return;
        }

        this.heldWire.release();
        this.heldWire.update();
        this.heldWire = null;
    }

    destroy() {
        // Matter.js 엔진 및 러너 정지
        if (this.#matterRunner) {
            Matter.Runner.stop(this.#matterRunner);
        }
        if (this.#matterEngine) {
            Matter.World.clear(this.#matterEngine.world, false);
            Matter.Engine.clear(this.#matterEngine);
        }
    }

    #wireNearMouse() {
        return this.#wireNearPosition({ x: mouseX, y: mouseY });
    }

    /**
     * @param {Matter.Vector | HandDetector} [input]
     * @returns {Matter.Vector | null}
     */
    #heldPositionFromInput(input) {
        if (input && typeof input.thumbPosition === "function" && typeof input.pinched === "function") {
            let position = input.thumbPosition();
            if (input.pinched()) {
                if (!this.heldWire) {
                    this.tryHoldWireAt(position);
                }
                return position;
            }

            if (this.heldWire) {
                this.releaseWire();
            }
            return null;
        }

        return input || null;
    }

    #clearObjects() {
        for (let bead of this.beads) {
            Matter.Composite.remove(this.#matterEngine.world, bead.body);
        }

        for (let wire of this.wires) {
            Matter.Composite.remove(this.#matterEngine.world, wire.body);
        }

        this.beads = [];
        this.wires = [];
        this.heldWire = null;
        this.nextPierceOrder = 0;
    }

    #removeUnpiercedBeads() {
        let keptBeads = [];

        for (let bead of this.beads) {
            if (bead.isPierced) {
                keptBeads.push(bead);
                continue;
            }

            Matter.Composite.remove(this.#matterEngine.world, bead.body);
        }

        this.beads = keptBeads;
    }

    /**
     * @param {Wire | undefined} wire
     * @returns {void}
     */
    #keepPiercedBeadsOrdered(wire) {
        if (!wire) {
            return;
        }

        let piercedBeads = this.beads
            .filter((bead) => bead.isPierced)
            .sort((a, b) => (a.pierceOrder ?? 0) - (b.pierceOrder ?? 0));

        if (piercedBeads.length === 0) {
            return;
        }

        let firstBeadWidth = piercedBeads[0].collisionWidth ?? piercedBeads[0].w;
        let blockerClearance = (wire.blockerRadius ?? 0) + firstBeadWidth / 2 + 0.5;
        let minT = Math.max(0.001, blockerClearance / wire.wireLength);
        let maxT = 0.999;
        let pairSpacing = [];
        for (let i = 1; i < piercedBeads.length; ++i) {
            pairSpacing.push(
                this.#beadPairSpacingT(wire, piercedBeads[i - 1], piercedBeads[i])
            );
        }

        let spacingBefore = [0];
        for (let spacing of pairSpacing) {
            spacingBefore.push(spacingBefore[spacingBefore.length - 1] + spacing);
        }

        let spacingAfter = new Array(piercedBeads.length).fill(0);
        for (let i = piercedBeads.length - 2; i >= 0; --i) {
            spacingAfter[i] = spacingAfter[i + 1] + pairSpacing[i];
        }

        for (let i = 0; i < piercedBeads.length; ++i) {
            let bead = piercedBeads[i];
            let slotMin = minT + spacingBefore[i];
            let slotMax = maxT - spacingAfter[i];

            bead.setWireTRange(slotMin, slotMax);
            bead.wireT = this.#clamp(bead.wireT, slotMin, slotMax);
        }

        for (let i = 1; i < piercedBeads.length; ++i) {
            piercedBeads[i].wireT = Math.max(
                piercedBeads[i].wireT,
                piercedBeads[i - 1].wireT + pairSpacing[i - 1]
            );
        }

        for (let i = piercedBeads.length - 2; i >= 0; --i) {
            piercedBeads[i].wireT = Math.min(
                piercedBeads[i].wireT,
                piercedBeads[i + 1].wireT - pairSpacing[i]
            );
        }

        for (let bead of piercedBeads) {
            bead.wireT = this.#clamp(bead.wireT, bead.wireTRange.min, bead.wireTRange.max);
            bead.snapToWireT(wire);
        }
    }

    /**
     * @param {Wire} wire
     * @param {Bead} first
     * @param {Bead} second
     * @returns {Number}
     */
    #beadPairSpacingT(wire, first, second) {
        let wireLength = typeof wire.wireLength === "number" && wire.wireLength > 0 ? wire.wireLength : 760;
        let firstWidth = first.collisionWidth ?? first.w;
        let secondWidth = second.collisionWidth ?? second.w;
        let requiredDistance = (firstWidth + secondWidth) / 2 + 0.5;
        return Math.min(0.08, requiredDistance / wireLength);
    }

    /**
     * @param {Bead} candidate
     * @returns {boolean}
     */
    #canPierceBead(candidate) {
        if (candidate.isPierced) {
            return true;
        }

        let occupiedWidth = this.beads
            .filter((bead) => bead.isPierced)
            .reduce((total, bead) => total + bead.w, candidate.w);
        return occupiedWidth <= MAX_PIERCED_BEAD_WIDTH;
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

    #randomBeadColor() {
        if (this.paletteColors.length > 0) {
            return color(random(this.paletteColors));
        }

        return color(random(50, 255), random(50, 255), random(50, 255));
    }

    #randomBeadAsset() {
        if (this.theme === POT_THEMES.LEGACY) {
            return null;
        }

        let pool = getBeadAtlasPool(this.theme);
        return pool.length > 0 ? random(pool) : null;
    }

    /**
     * @param {Number} minX
     * @param {Number} maxX
     * @param {Number} minY
     * @param {Number} maxY
     * @param {Number} beadWidth
     * @param {Number} beadHeight
     * @returns {Matter.Vector}
     */
    #separatedSpawnPosition(minX, maxX, minY, maxY, beadWidth, beadHeight) {
        let bestPosition = null;
        let bestClearance = -Infinity;

        for (let attempt = 0; attempt < this.beadSpawnAttempts; ++attempt) {
            let candidate = {
                x: random(minX, maxX),
                y: random(minY, maxY)
            };
            if (this.#overlapsPreview(candidate, beadWidth, beadHeight)) {
                continue;
            }

            let clearance = this.#spawnClearance(candidate, beadWidth, beadHeight);
            if (clearance >= this.beadSpawnGap) {
                return candidate;
            }
            if (clearance > bestClearance) {
                bestClearance = clearance;
                bestPosition = candidate;
            }
        }

        if (bestPosition) {
            return bestPosition;
        }

        let previewBottom = 116 + 64;
        return {
            x: this.#clamp(width / 2, minX, maxX),
            y: this.#clamp(
                previewBottom + this.beadSpawnGap + beadHeight / 2,
                minY,
                maxY
            )
        };
    }

    /**
     * @param {Matter.Vector} candidate
     * @param {Number} beadWidth
     * @param {Number} beadHeight
     * @returns {boolean}
     */
    #overlapsPreview(candidate, beadWidth, beadHeight) {
        let preview = {
            x: width / 2 - 470 / 2,
            y: 116,
            w: 470,
            h: 64
        };
        let padding = this.beadSpawnGap;
        let beadLeft = candidate.x - beadWidth / 2;
        let beadRight = candidate.x + beadWidth / 2;
        let beadTop = candidate.y - beadHeight / 2;
        let beadBottom = candidate.y + beadHeight / 2;

        return beadRight >= preview.x - padding &&
            beadLeft <= preview.x + preview.w + padding &&
            beadBottom >= preview.y - padding &&
            beadTop <= preview.y + preview.h + padding;
    }

    /**
     * @param {Matter.Vector} candidate
     * @param {Number} beadWidth
     * @param {Number} beadHeight
     * @returns {Number}
     */
    #spawnClearance(candidate, beadWidth, beadHeight) {
        if (this.beads.length === 0) {
            return Infinity;
        }

        let minimumClearance = Infinity;
        for (let bead of this.beads) {
            let horizontalGap = Math.abs(candidate.x - bead.body.position.x)
                - (beadWidth + bead.w) / 2;
            let verticalGap = Math.abs(candidate.y - bead.body.position.y)
                - (beadHeight + bead.h) / 2;

            // Rectangles are separated when either axis has enough clearance.
            minimumClearance = Math.min(
                minimumClearance,
                Math.max(horizontalGap, verticalGap)
            );
        }
        return minimumClearance;
    }

    /**
     * @param {Matter.Vector} position
     * @returns {Wire | null}
     */
    #wireNearPosition(position) {
        for (let wire of this.wires) {
            let segment = this.#lastSegment(wire);
            if (segment &&
                position.x - segment.position.x >= -40 &&
                position.x - segment.position.x <= 100 &&
                abs(position.y - segment.position.y) <= 40) {
                return wire;
            }
        }

        return null;
    }

    #lastSegment(wire) {
        if (!wire.segments || wire.segments.length === 0) {
            return null;
        }

        return wire.segments[wire.segments.length - 1];
    }

    #distance(a, b) {
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}
