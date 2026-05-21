// 비드 조립이 끝난 후의 줄기 정보를 담당하는 클래스
// 아마 wire.js로 다시 합치면서 없앨 예정
class Stem {
    constructor(_bendPoints, _beads) {
        this.bendPoints = _bendPoints;
        this.beads = _beads;
    }

    update() {
        // 살짝 흔들리기?
    }

    display() {
        // 출력하기
    }

    toWire() {
        // 와이어로 되돌려놓기
    }
}