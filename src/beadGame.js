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

    }

    update() {
        if (this.heldWire) {
            this.heldWire.setHeldEnd(mouseX, mouseY);
        }

        for (let wire of this.wires) {
            wire.update();
        }

        let wire = this.wires[0];
        for (let bead of this.beads) {
            bead.update(wire);
        }
    }


    display() {
        for (let bead of this.beads) {
            bead.display();
        }

        for (let wire of this.wires) {
            wire.display();
        }
    }

    setupDebugObjects() {
        this.wires.push(new Wire(760, 32, width * 0.5, 120, 3, this.#matterEngine));

        for (let i = 0; i < 20; ++i) {
            let beadWidth = random(28, 60);
            let beadHeight = random(34, 72);
            let beadColor = color(random(50, 255), random(50, 255), random(50, 255));
            let x = random(120, width - 120);
            let y = random(120, height - 120);

            this.beads.push(new Bead(x, y, beadWidth, beadHeight, beadColor, this.#matterEngine));
        }
    }

    tryHoldWire() {
        if (gameState !== DEBUG) {
            return;
        }

        let wire = this.#wireNearMouse();
        if (!wire) {
            return;
        }

        this.heldWire = wire;
        this.heldWire.setHeldEnd(mouseX, mouseY);
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
        let mousePosition = { x: mouseX, y: mouseY };

        for (let wire of this.wires) {
            let segment = this.#lastSegment(wire);
            if (segment && this.#distance(mousePosition, segment.position) <= this.wireGrabDistance) {
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
