// @ts-nocheck
// 비드 조립 중 나타나는 철사를 담당하는 클래스
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
        this.segNum = _segNum;
        this.segLength = this.wireLength / this.segNum;
        this.thickness = _thickness;

        let segments = Matter.Composite.create();
        for (let i = 0; i < this.segNum; ++i) {
            Matter.Composite.add(
                segments,
                Matter.Bodies.rectangle(0, this.segLength * i, this.thickness, this.segLength));
        }

        this.body = Matter.Composites.chain(segments, 0, 0, 0, 0);
    }

    update() {
        // 중력에 따라 떨어지기, 물리 법칙에 따라 흔들리기
    }

    display() {
        // 선을 출력하기
    }

    toStem() {
        // 스스로를 Stem으로 변환
        let result = new Stem();
        return result;
    }
}