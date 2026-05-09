// 비드 조립 중 나타나는 철사를 담당하는 클래스
class Wire {
    constructor(_wireLength) {
        this.wireLength = _wireLength; // 줄의 길이
        this.bends = []; // 줄이 구부러지는 지점
    }

    update() {
        // 중력에 따라 떨어지기, 물리 법칙에 따라 흔들리기
    }

    display() {
        // 선을 출력하기
    }

    toStem() {
        // 스스로를 Stem으로 변환
        result = new Stem(어쩌고저쩌고);
        return Stem;
    }
}