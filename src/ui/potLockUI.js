class PotLockUI {
  constructor() {
    this.isVisible = false;
    this.pot       = null;
  }

  show(pot) {
    if (!pot) return;
    this.isVisible = true;
    this.pot = pot;
  }

  hide() {
    this.isVisible = false;
    this.pot = null;
  }

  #layout() {
    const popW = 406;
    const popH = 249;
    const popX = width / 2 - popW / 2;
    const popY = height / 2 - popH / 2;

    const warnX = popX + 28;
    const warnY = popY + 88;
    const warnW = popW - 56;
    const warnH = 66;

    const btnGap = 10;
    const btnY = popY + popH - 67;
    const btnH = 44;
    const btnW = (popW - 56 - btnGap) / 2;
    const confirmX = popX + 28;
    const cancelX = confirmX + btnW + btnGap;

    return {
      popW,
      popH,
      popX,
      popY,
      warnX,
      warnY,
      warnW,
      warnH,
      dividerY: warnY + warnH + 16,
      btnY,
      btnH,
      btnW,
      confirmX,
      cancelX,
    };
  }

  #drawLockIcon(cx, topY) {
    stroke(145);
    strokeWeight(2);
    noFill();
    arc(cx, topY + 13, 16, 20, PI, TWO_PI);

    noStroke();
    fill(188, 173, 84);
    rect(cx - 9, topY + 11, 18, 15, 2);
    fill(120);
    rect(cx - 1, topY + 17, 2, 5, 1);
  }

  #drawWarningText(x, y, w, h) {
    const normalText = '잠금 후에는 모든 사람이 이 화분에 줄기를 추가하거나 ';
    const dangerText = '꾸밀 수 없어요.';
    let size = 10;

    textStyle(NORMAL);
    do {
      textSize(size);
      size -= 0.5;
    } while (textWidth(normalText) + textWidth(dangerText) > w - 28 && size >= 8);

    const normalW = textWidth(normalText);
    const dangerW = textWidth(dangerText);
    const startX = x + w / 2 - (normalW + dangerW) / 2;
    const textY = y + h / 2;

    textAlign(LEFT, CENTER);
    noStroke();
    fill(70);
    text(normalText, startX, textY);
    fill(255, 84, 94);
    text(dangerText, startX + normalW, textY);
  }

  onMousePressed() {
    if (!this.isVisible) return;
    const { btnY, btnH, btnW, confirmX, cancelX } = this.#layout();

    // 잠금 확정
    if (mouseX > confirmX && mouseX < confirmX + btnW &&
        mouseY > btnY && mouseY < btnY + btnH) {
      const pot = this.pot;
      if (pot) {
        pot.locked = true;
        if (pot.firestoreId) {
          lockPot(pot.firestoreId)
            .catch(err => console.error('[Firestore] 잠금 저장 오류:', err));
        }
      }
      this.hide();
      potDetailUI.show(pot);
      goTo(GAME_STATE.POT_PREVIEW);
      return;
    }

    // 취소 — hide() 전에 pot 저장
    if (mouseX > cancelX && mouseX < cancelX + btnW &&
        mouseY > btnY && mouseY < btnY + btnH) {
      const pot = this.pot;
      this.hide();
      potDetailUI.show(pot);
      goTo(GAME_STATE.POT_PREVIEW);
    }
  }

  draw() {
    if (!this.isVisible) return;

    // 배경 dim
    fill(0, 0, 0, 100); noStroke();
    rect(0, 0, width, height);

    // 팝업 박스
    const {
      popW,
      popH,
      popX,
      popY,
      warnX,
      warnY,
      warnW,
      warnH,
      dividerY,
      btnY,
      btnH,
      btnW,
      confirmX,
      cancelX,
    } = this.#layout();

    drawingContext.save();
    drawingContext.shadowBlur  = 12;
    drawingContext.shadowColor = 'rgba(0,0,0,0.08)';
    fill(255); noStroke();
    rect(popX, popY, popW, popH, 8);
    drawingContext.restore();

    // 자물쇠 아이콘
    this.#drawLockIcon(width / 2, popY + 25);

    // 타이틀
    fill(22);
    textStyle(BOLD); textSize(16);
    textAlign(CENTER, CENTER);
    text('화분을 잠글까요?', width / 2, popY + 70);

    // 안내 문구 박스
    fill(248); noStroke();
    rect(warnX, warnY, warnW, warnH, 4);
    this.#drawWarningText(warnX, warnY, warnW, warnH);

    // 구분선
    stroke(210); strokeWeight(1);
    line(popX + 28, dividerY, popX + popW - 28, dividerY);

    // 잠금 확정 버튼
    let confirmHov = isHovered(confirmX, btnY, btnW, btnH);
    fill(confirmHov ? color(226, 64, 72) : color(255, 88, 96)); noStroke();
    rect(confirmX, btnY, btnW, btnH, 6);
    fill(255); textSize(13); textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text('잠금 확정', confirmX + btnW / 2, btnY + btnH / 2);

    // 취소 버튼
    let cancelHov = isHovered(cancelX, btnY, btnW, btnH);
    fill(cancelHov ? color(142) : color(160)); noStroke();
    rect(cancelX, btnY, btnW, btnH, 6);
    fill(255); textSize(13); textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text('취소', cancelX + btnW / 2, btnY + btnH / 2);

    if (confirmHov || cancelHov) cursor(HAND); else cursor(ARROW);
  }
}
