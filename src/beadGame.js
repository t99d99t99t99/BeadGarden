// 색깔
const RED = 0;
const GREEN = 1;
let colors = [];
function color_setup() {
    colors.push(color(255, 0, 0)); // RED
    colors.push(color(0, 255, 0)); // GREEN
}

// 비즈 모양
const SQUARE = 0;
const TRIANGLE = 1;

// 화분재질
const CLAY = 0;
const GLASS = 1;

// 줄기 모양
const STRAIGHT = 0;
const WAVE = 1;
const CURVE = 2;

// 이 뒤에는 실제 게임 과정이 들어옴
// 손모양 인식, 와이어 및 비즈 물리연산 등등