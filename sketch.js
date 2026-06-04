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
const DEBUG = 99;

let gameState = INTRO;
let prevState  = INTRO; // 튜토리얼 진입 전 이전 상태 추적
let backgroundNum = 0;
let introUI;
let tutorialUI;
let gardenUI;
let potSetupUI;
let potDecorateUI;
let potDetailUI;
let stemDetailUI;
let stemBeadCraftUI;
let stemFinishUI;
let potLockUI;
let beadGame;

/**
 * 
 * @param {number} state 
 */
function goTo(state) {
  gameState = state;
}

function isClicked(x, y, w, h) {
  return mouseIsPressed &&
    mouseX > x && mouseX < x + w &&
    mouseY > y && mouseY < y + h;
}

function setup() {
  createCanvas(1440, 990);
  introUI = new IntroUI();
  tutorialUI = new TutorialUI();
  gardenUI = new GardenUI();
  potSetupUI = new PotSetupUI();
  potDecorateUI = new PotDecorateUI();
  potDetailUI = new PotDetailUI();
  stemDetailUI = new StemDetailUI();
  potLockUI = new PotLockUI();
  stemBeadCraftUI = new StemBeadCraftUI();
  stemFinishUI = new StemFinishUI();
  beadGame = new BeadGame();

  // Firestore 실시간 구독 — 전체 화분 목록을 gardenUI에 반영
  listenPots(pots => {
    gardenUI.pots = pots;
  });
}

function draw() {
  switch (gameState) {
    case INTRO:
      introUI.draw();
      break;
    case TUTORIAL:
      tutorialUI.draw();
      break;
    case GARDEN:
      gardenUI.draw();
      potSetupUI.draw(); // 위에 팝업으로 표시
      potDetailUI.draw(); // 위에 팝업으로 표시
      potLockUI.draw(); // 위에 팝업으로 표시
      break;
    case POT_DECORATE:
      gardenUI.draw();
      potDecorateUI.draw(); // 위에 팝업으로 표시
      break;
    case STEM_BEAD_CRAFT:
      stemBeadCraftUI.draw();
      break;
    case STEM_FINISH:
      stemBeadCraftUI.draw();
      stemFinishUI.draw();    // 위에 팝업으로 표시
      break;
    case STEM_DETAIL:
      stemDetailUI.draw();
      break;
    case POT_LOCK:
      gardenUI.draw();
      potLockUI.draw();
      break;
    case DEBUG:
      background(240);
      debugSceneDraw();
      break;
  }


  switch (gameState) {
  }
}

function keyPressed() {
  console.log(keyCode);
  if (keyCode == 220) { // 역슬래시 버튼으로 디버그 모드
    debugSceneSetup();
  }
}

function mousePressed() {
  switch (gameState) {
    case GARDEN:
      gardenUI.onMousePressed();
      potDetailUI.onMousePressed();
      potSetupUI.onMousePressed();
      break;
    case POT_DECORATE:
      potDecorateUI.onMousePressed();
      break;
    case STEM_DETAIL:
      stemDetailUI.onMousePressed();
      break;
    case DEBUG:
      debugSceneMousePressed();
      break;
  }
}

function mouseDragged() {
  switch (gameState) {
    case GARDEN:
      gardenUI.onMouseDragged();
      break;
    case POT_DECORATE:
      potDecorateUI.onMouseDragged();
      break;
    case DEBUG:
      debugSceneMouseDragged();
      break;
  }
}

function mouseReleased() {
  switch (gameState) {
    case GARDEN:
      gardenUI.onMouseReleased();
      break;
    case POT_DECORATE:
      potDecorateUI.onMouseReleased();
      break;
    case DEBUG:
      debugSceneMouseReleased();
      break;
  }
}

function mouseWheel(e) {
  switch (gameState) {
    case POT_DECORATE:
      potDecorateUI.onMouseWheel(e.delta);
      return false;
    case DEBUG:
      debugSceneMouseWheel(e.delta);
      return false;
  }
}
