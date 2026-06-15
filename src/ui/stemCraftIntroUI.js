class StemCraftIntroUI {
  constructor() {
    this.isVisible = false;
  }

  show() {
    this.isVisible = true;
  }

  hide() {
    this.isVisible = false;
  }

  onMousePressed() {
    if (!this.isVisible) return;

    let popW = 600, popH = 460;
    let popX = width / 2 - popW / 2;
    let popY = height / 2 - popH / 2;

    // 시작하기 버튼
    let btnW = 350, btnH = 52;
    let btnX = width / 2 - btnW / 2;
    let btnY = popY + popH - 92;
    if (mouseX > btnX && mouseX < btnX + btnW &&
      mouseY > btnY && mouseY < btnY + btnH) {
      this.hide();
      goTo(GAME_STATE.STEM_BEAD_CRAFT);
    }
  }

  draw() {
    if (!this.isVisible) return;

    // 배경 dim
    fill(0, 0, 0, 120); noStroke();
    rect(0, 0, width, height);

    // 팝업 박스
    let popW = 600, popH = 460;
    let popX = width / 2 - popW / 2;
    let popY = height / 2 - popH / 2;
    fill(255); stroke(230); strokeWeight(1);
    rect(popX, popY, popW, popH, 16);

    // 타이틀 — 도트 매트릭스 스타일
    noStroke(); fill(220, 40, 180);
    textStyle(NORMAL); textSize(28); textAlign(CENTER);
    text('BEAD  CRAFT  GAME', width / 2, popY + 72);

    // 메인 설명
    fill(30); textStyle(BOLD); textSize(17); textAlign(CENTER);
    text('비즈를 꿰어 화분에 꽂을 비즈 줄기를 만들어보세요.', width / 2, popY + 128);

    // 카메라 안내
    fill(40); textStyle(NORMAL); textSize(15); textAlign(CENTER);
    text('이제부터 웹 카메라가 당신의 손을 인식합니다.', width / 2, popY + 172);
    text('손동작으로 철사를 잡고🤌 비즈를 꿰어보세요. ✂️', width / 2, popY + 196);

    // Tip 박스들
    let tipY = popY + 248;
    this.#drawTip('카메라에서 40cm정도 거리에 있는 측면 손이 인식이 잘 됩니다.', tipY);
    this.#drawTip('한 번 철사에 꿰워진 비즈는 빠지지 않아요.', tipY + 30);

    // 시작하기 버튼
    let btnW = 350, btnH = 52;
    let btnX = width / 2 - btnW / 2;
    let btnY = popY + popH - 92;
    let btnHov = isHovered(btnX, btnY, btnW, btnH);
    fill(btnHov ? color(180, 0, 180) : color(220, 30, 220)); noStroke();
    rect(btnX, btnY, btnW, btnH, 26);
    fill(255); textSize(16); textStyle(BOLD); textAlign(CENTER, CENTER);
    text('시작하기', btnX + btnW / 2, btnY + btnH / 2);

    if (btnHov) cursor(HAND); else cursor(ARROW);
  }

  #drawTip(msg, y) {
    // Tip 레이블
    let tipLabelW = 28, tipLabelH = 18;
    let tipX = width / 2 - 250;
    fill(220, 200, 240); noStroke();
    rect(tipX, y - 13, tipLabelW, tipLabelH, 4);
    fill(120, 80, 180); textSize(11); textStyle(BOLD); textAlign(LEFT, CENTER);
    text('Tip', tipX + 5, y - 4);

    // Tip 내용
    fill(100); textSize(12); textStyle(NORMAL); textAlign(LEFT);
    text(msg, tipX + tipLabelW + 6, y - 4);
  }
}
