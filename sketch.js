// 게임 상태
const INTRO = 0; // 게임 전반 설명 화면
const TUTORIAL = 1; // CRAFT 화면 내 인터랙션 설명 영상 및 GARDEN 화면과의 연결고리 역할
const GARDEN = 2;  // 이미 만들어진 화분 보여주기
const POT_SETUP = 3; // 새 화분 이름, 설명 입력 (팝업)
const POT_DETAIL = 4; // 만들어진 화분 모양 보여주면서 줄기 만들기, 화분 꾸미기, 이미지 저장, 화분 잠금으로 접근 가능한 화면 (팝업)
const POT_DECORATE = 6; // 화분 꾸미기: 색상, 모양 선택 + 줄기 선택시 각 줄기별 특성(색상, 형태, 기울기) 설정하기 (팝업)
const MOBILE_IMAGE_SAVE = 7; // QR코드 스캔시 모바일에 나타날 화면: 이미지 저장
const POT_LOCK = 8; // 화분 잠금 여부 결정하기 (팝업)
const STEM_BEAD_CRAFT = 9; // 비즈를 꽂으며 화분 조립하기
const STEM_FINISH = 10; // 저장 및 데이터베이스 업로드 (팝업)
const DEBUG_MENU = 98;
const DEBUG = 99;

let gameState = INTRO;
let prevState = INTRO; // 튜토리얼 진입 전 이전 상태 추적
let backgroundNum = 0;
let introUI;
let tutorialUI;
let gardenUI;
let potSetupUI;
let potDecorateUI;
let potDetailUI;
let stemBeadCraftUI;
let stemFinishUI;
let potLockUI;
let beadGame;

/**
 * 
 * @param {number} state 
 */
function goTo(state) {
  if (state === TUTORIAL && typeof tutorialUI !== 'undefined') tutorialUI.enter();
  gameState = state;
}

function isClicked(x, y, w, h) {
  return mouseIsPressed &&
    mouseX > x && mouseX < x + w &&
    mouseY > y && mouseY < y + h;
}

function preload() {
  preloadBeadSpriteSheets();
  preloadPotImages();
  preloadWireAssets();
}

function startStemCraftForPot(pot) {
  if (!pot) return;
  pot.theme = normalizePotTheme(pot);
  potDetailUI.pot = pot;
  potDetailUI.hide(); // 가든으로 돌아올 때 팝업이 남지 않도록
  stemBeadCraftUI.setPot(pot);
  stemBeadCraftUI.startThemedCraft();
  goTo(STEM_BEAD_CRAFT);
}

function setup() {
  createCanvas(1440, 810);
  // 전역 폰트: DungGeunMo (CDN 로드, 한글 픽셀 폰트)
  textFont('DungGeunMo');
  initializeBeadAtlasSprites();
  initializePotAtlasSprites();
  loadBeadCatalog()
    .then(() => preloadBeadImages())
    .catch(err => console.error('[Firestore] 비즈 카탈로그 로드 오류:', err));

  introUI = new IntroUI();
  tutorialUI = new TutorialUI();
  gardenUI = new GardenUI();
  potSetupUI = new PotSetupUI();
  potDecorateUI = new PotDecorateUI();
  potDetailUI = new PotDetailUI();
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
      gardenUI.drawDatabaseStatus();
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
    case POT_LOCK:
      gardenUI.draw();
      potLockUI.draw();
      break;
    case DEBUG_MENU:
      background(240);
      debugLandingSceneDraw();
      break;
    case DEBUG:
      background(240);
      debugInProgressSceneDraw();
      break;
  }


  switch (gameState) {
  }
}

function keyPressed() {
  console.log(keyCode);
  if (keyCode == 220) { // 역슬래시 버튼으로 디버그 모드
    debugLandingSceneSetup();
  }
  if (key === 's' || key === 'S') { // S 키로 스크린샷
    if (gameState === STEM_BEAD_CRAFT && typeof stemBeadCraftUI !== 'undefined') {
      stemBeadCraftUI.takeScreenshot();
    } else {
      saveCanvas(`screenshot-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}`, 'png');
    }
  }
}

function mousePressed() {
  switch (gameState) {
    case TUTORIAL:
      tutorialUI.onMousePressed();
      break;
    case GARDEN:
      gardenUI.onMousePressed();
      potDetailUI.onMousePressed();
      potSetupUI.onMousePressed();
      break;
    case POT_DECORATE:
      potDecorateUI.onMousePressed();
      break;
    case POT_LOCK:
      potLockUI.onMousePressed();
      break;
    case STEM_BEAD_CRAFT:
      stemBeadCraftUI.onMousePressed();
      break;
    case DEBUG_MENU:
      debugLandingSceneMousePressed();
      break;
    case DEBUG:
      debugInProgressSceneMousePressed();
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
      debugInProgressSceneMouseDragged();
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
      debugInProgressSceneMouseReleased();
      break;
  }
}

function mouseWheel(e) {
  switch (gameState) {
    case GARDEN:
      return gardenUI.onMouseWheel(e);
    case POT_DECORATE:
      potDecorateUI.onMouseWheel(e.delta);
      return false;
    case DEBUG:
      debugInProgressSceneMouseWheel(e.delta);
      return false;
  }
}
