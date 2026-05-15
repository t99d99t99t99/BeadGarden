class Bead {
    /**
     * 
     * @param {Number} _x 
     * @param {Number} _y 
     * @param {Number} _w 
     * @param {Number} _h 
     * @param {p5.Color} _color 
     * @param {Matter.Engine} engine 
     */
    constructor(_x, _y, _w, _h, _color, engine) {
        this.color = _color;

        this.w = _w;
        this.h = _h;
        this.holeH = 10;
        this.partH = (this.h - this.holeH) / 2;

        let part1 = Matter.Bodies.rectangle(_x, _y, this.w, this.partH);
        let part2 = Matter.Bodies.rectangle(_x, _y + this.partH + this.holeH, this.w, this.partH);

        this.body = Matter.Body.create({
            parts: [part1, part2]
        });

        Matter.Composite.add(engine.world, this.body);
    }

    update() {
        //중력 영향 받고 아래로 떨어지기
        //근데 이거 생각해보니까 일단은 matter.js가 알아서 해줄 듯
    }

    display() {
        // 좌표축을 비즈의 위치 및 각도에 맞게 이동하기
        push();
        translate(this.body.position.x, this.body.position.y);
        rotate(this.body.angle);

        // 비즈의 몸체 부분 출력하기
        noStroke();
        fill(this.color);
        rect(0, 0, this.w, this.partH);
        rect(0, this.partH + this.holeH, this.w, this.partH);

        // 비즈의 구멍 부분 출력하기
        let c = color(this.color);
        c.setAlpha(200);
        fill(c);
        rect(0, this.partH, this.w, this.holeH);

        pop();
    }

    onWire() {
        // 와이어에 꽂혀 있는지 확인
    }
}