// 게임 상태 정의
const GAME_STATE = Object.freeze({
  INTRO: 'intro',
  TUTORIAL: 'tutorial',
  GARDEN_LIST: 'garden-list',
  NEW_POT: 'new-pot',
  POT_PREVIEW: 'pot-preview',
  POT_DECORATE: 'pot-decorate',
  POT_LOCK: 'pot-lock',
  STEM_BEAD_CRAFT: 'stem-bead-craft',
  STEM_FINISH: 'stem-finish',
  DEBUG_MENU: 'debug-menu',
  DEBUG: 'debug',
});

// 각 상태별 UI 클래스의 인스턴스를 담을 변수 정의
let gameState = GAME_STATE.INTRO;
let prevState = GAME_STATE.INTRO; // 튜토리얼 진입 전 이전 상태 추적
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

let idleResetTimer;

/**
 * 
 * @param {string} state
 */
function goTo(state) {
  if (!Object.values(GAME_STATE).includes(state)) {
    throw new Error(`Unknown game state: ${state}`);
  }
  if (state === GAME_STATE.INTRO && introUI) introUI.enter();
  if (state === GAME_STATE.TUTORIAL && typeof tutorialUI !== 'undefined') tutorialUI.enter();
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
  goTo(GAME_STATE.STEM_BEAD_CRAFT);
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

  idleResetTimer = new IdleResetTimer();

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
  idleResetTimer.tryReset();

  switch (gameState) {
    case GAME_STATE.INTRO:
      introUI.draw();
      break;
    case GAME_STATE.TUTORIAL:
      tutorialUI.draw();
      break;
    case GAME_STATE.GARDEN_LIST:
      gardenUI.draw();
      gardenUI.drawDatabaseStatus();
      break;
    case GAME_STATE.NEW_POT:
      gardenUI.draw();
      gardenUI.drawDatabaseStatus();
      potSetupUI.draw();
      break;
    case GAME_STATE.POT_PREVIEW:
      gardenUI.draw();
      gardenUI.drawDatabaseStatus();
      potDetailUI.draw();
      break;
    case GAME_STATE.POT_DECORATE:
      gardenUI.draw();
      potDecorateUI.draw(); // 위에 팝업으로 표시
      break;
    case GAME_STATE.STEM_BEAD_CRAFT:
      stemBeadCraftUI.draw();
      break;
    case GAME_STATE.STEM_FINISH:
      stemBeadCraftUI.draw();
      stemFinishUI.draw();    // 위에 팝업으로 표시
      break;
    case GAME_STATE.POT_LOCK:
      gardenUI.draw();
      potLockUI.draw();
      break;
    case GAME_STATE.DEBUG_MENU:
      background(240);
      debugLandingSceneDraw();
      break;
    case GAME_STATE.DEBUG:
      background(240);
      debugInProgressSceneDraw();
      break;
  }
}

function keyPressed() {
  idleResetTimer.onInput();

  console.log(keyCode);
  if (keyCode == 220) { // 역슬래시 버튼으로 디버그 모드
    debugLandingSceneSetup();
  }
  if (key === 's' || key === 'S') { // S 키로 스크린샷
    if (gameState === GAME_STATE.STEM_BEAD_CRAFT && typeof stemBeadCraftUI !== 'undefined') {
      stemBeadCraftUI.takeScreenshot();
    } else {
      saveCanvas(`screenshot-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}`, 'png');
    }
  }
}

function mousePressed() {
  idleResetTimer.onInput();

  switch (gameState) {
    case GAME_STATE.TUTORIAL:
      tutorialUI.onMousePressed();
      break;
    case GAME_STATE.GARDEN_LIST:
      gardenUI.onMousePressed();
      break;
    case GAME_STATE.NEW_POT:
      potSetupUI.onMousePressed();
      break;
    case GAME_STATE.POT_PREVIEW:
      potDetailUI.onMousePressed();
      break;
    case GAME_STATE.POT_DECORATE:
      potDecorateUI.onMousePressed();
      break;
    case GAME_STATE.POT_LOCK:
      potLockUI.onMousePressed();
      break;
    case GAME_STATE.STEM_BEAD_CRAFT:
      stemBeadCraftUI.onMousePressed();
      break;
    case GAME_STATE.DEBUG_MENU:
      debugLandingSceneMousePressed();
      break;
    case GAME_STATE.DEBUG:
      debugInProgressSceneMousePressed();
      break;
  }
}

function mouseDragged() {
  idleResetTimer.onInput();

  switch (gameState) {
    case GAME_STATE.GARDEN_LIST:
      gardenUI.onMouseDragged();
      break;
    case GAME_STATE.POT_DECORATE:
      potDecorateUI.onMouseDragged();
      break;
    case GAME_STATE.DEBUG:
      debugInProgressSceneMouseDragged();
      break;
  }
}

function mouseReleased() {
  idleResetTimer.onInput();

  switch (gameState) {
    case GAME_STATE.GARDEN_LIST:
      gardenUI.onMouseReleased();
      break;
    case GAME_STATE.POT_DECORATE:
      potDecorateUI.onMouseReleased();
      break;
    case GAME_STATE.DEBUG:
      debugInProgressSceneMouseReleased();
      break;
  }
}

function mouseWheel(e) {
  idleResetTimer.onInput();

  switch (gameState) {
    case GAME_STATE.GARDEN_LIST:
      return gardenUI.onMouseWheel(e);
    case GAME_STATE.POT_DECORATE:
      potDecorateUI.onMouseWheel(e.delta);
      return false;
    case GAME_STATE.DEBUG:
      debugInProgressSceneMouseWheel(e.delta);
      return false;
  }
}
