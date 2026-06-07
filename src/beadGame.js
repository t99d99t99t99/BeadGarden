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
            bead.update(wire);
            if (!wasPierced && bead.isPierced) {
                bead.setPierceOrder(this.nextPierceOrder);
                this.nextPierceOrder += 1;
            }
        }

        this.#keepPiercedBeadsOrdered(wire);
    }


    display() {
        for (let bead of this.beads) {
            bead.displayHole();
        }

        for (let wire of this.wires) {
            wire.display();
        }

        for (let bead of this.beads) {
            bead.displayBody();
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
    isHoldingWire() {
        return this.heldWire !== null;
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
                h: bead.h,
                holeH: bead.holeH,
                partH: bead.partH,
                partOffset: bead.partOffset
            }));
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
            let beadWidth = beadAsset?.gameplayWidth ?? 12;
            let beadHeight = beadAsset?.gameplayHeight ?? 12;
            let beadColor = beadAsset ? null : this.#randomBeadColor();
            let horizontalMargin = wire.safeMargin + 40 + beadWidth / 2;
            let verticalMargin = wire.safeMargin + 40 + beadHeight / 2;
            let maxY = Math.max(verticalMargin, wire.reachableHeldEndMaxY());
            let x = random(horizontalMargin, width - horizontalMargin);
            let y = random(verticalMargin, maxY);

            this.beads.push(new Bead(
                x,
                y,
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
        if (gameState !== DEBUG && gameState !== STEM_BEAD_CRAFT) {
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

        let minSpacingT = this.#beadSpacingT(wire, piercedBeads);
        let minT = 0.001;
        let maxT = 0.999;

        for (let i = 0; i < piercedBeads.length; ++i) {
            let bead = piercedBeads[i];
            let slotMin = minT + minSpacingT * i;
            let slotMax = maxT - minSpacingT * (piercedBeads.length - 1 - i);

            bead.setWireTRange(slotMin, slotMax);
            bead.wireT = this.#clamp(bead.wireT, slotMin, slotMax);
        }

        for (let i = 1; i < piercedBeads.length; ++i) {
            piercedBeads[i].wireT = Math.max(
                piercedBeads[i].wireT,
                piercedBeads[i - 1].wireT + minSpacingT
            );
        }

        for (let i = piercedBeads.length - 2; i >= 0; --i) {
            piercedBeads[i].wireT = Math.min(
                piercedBeads[i].wireT,
                piercedBeads[i + 1].wireT - minSpacingT
            );
        }

        for (let bead of piercedBeads) {
            bead.wireT = this.#clamp(bead.wireT, bead.wireTRange.min, bead.wireTRange.max);
            bead.snapToWireT(wire);
        }
    }

    /**
     * @param {Wire} wire
     * @param {Bead[]} beads
     * @returns {Number}
     */
    #beadSpacingT(wire, beads) {
        let maxBeadSize = 1;
        for (let bead of beads) {
            maxBeadSize = Math.max(maxBeadSize, bead.w, bead.h);
        }

        let wireLength = typeof wire.wireLength === "number" && wire.wireLength > 0 ? wire.wireLength : 760;
        return Math.min(0.08, maxBeadSize * 1.15 / wireLength);
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
