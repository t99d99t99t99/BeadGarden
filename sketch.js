// 게임 상태
const INTRO = 0; // 게임 전반 설명 화면
const TUTORIAL = 1; // CRAFT 화면 내 인터랙션 설명 영상 및 GARDEN 화면과의 연결고리 역할
const GARDEN = 2;  // 이미 만들어진 화분 보여주기
const POT_SETUP = 3; // 새 화분 이름, 설명 입력 (팝업)
const POT_DETAIL = 4; // 만들어진 화분 모양 보여주면서 줄기 만들기, 화분 꾸미기, 이미지 저장, 화분 잠금으로 접근 가능한 화면 (팝업)
const STEM_DETAIL = 5; // 줄기 특성(색상 팔레트) 설정하기
const POT_DECORATE = 6; // 화분 꾸미기: 색상, 모양 선택 + 줄기 선택시 각 줄기별 특성(색상, 형태, 기울기) 설정하기 (팝업)
const MOBILE_IMAGE_SAVE = 7; // QR코드 스캔시 모바일에 나타날 화면: 이미지 저장
const POT_LOCK = 8; // 화분 잠금 여부 결정하기 (팝업)
const STEM_BEAD_CRAFT = 9; // 비즈를 꽂으며 화분 조립하기
const STEM_FINISH = 10; // 저장 및 데이터베이스 업로드 (팝업)

let gameState = INTRO;
let backgroundNum = 0;
let introUI;
let tutorialUI;

function goTo(state) {
  gameState = state;
}

function setup() {
  createCanvas(1440, 990);
  introUI = new IntroUI();
  tutorialUI = new TutorialUI();

}

function draw() {
  switch (gameState) {
    case INTRO:
      introUI.draw();
      break;
    case TUTORIAL:
      tutorialUI.draw();
      break;
  }


}

function keyPressed() {

}
