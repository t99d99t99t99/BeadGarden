class PotLockUI {
  constructor() {
    this.isVisible = false;
    this.pot       = null;
  }

  show(pot) {
    this.isVisible = true;
    this.pot = pot;
  }

  hide() {
    this.isVisible = false;
    this.pot = null;
  }

  onMousePressed() {
    if (!this.isVisible) return;
    let popW = 420, popH = 320;
    let popX = width / 2 - popW / 2;
    let popY = height / 2 - popH / 2;
    let btnY    = popY + popH - 68;
    let btnH    = 48;
    let confirmW = (popW - 56) / 2;
    let confirmX = popX + 20;
    let cancelX  = confirmX + confirmW + 16;
    let cancelW  = confirmW;

    // 잠금 확정
    if (mouseX > confirmX && mouseX < confirmX + confirmW &&
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
      goTo(GARDEN);
      return;
    }

    // 취소 — hide() 전에 pot 저장
    if (mouseX > cancelX && mouseX < cancelX + cancelW &&
        mouseY > btnY && mouseY < btnY + btnH) {
      const pot = this.pot;
      this.hide();
      potDetailUI.show(pot);
      goTo(GARDEN);
    }
  }

  draw() {
    if (!this.isVisible) return;

    // 배경 dim
    fill(0, 0, 0, 110); noStroke();
    rect(0, 0, width, height);

    // 팝업 박스
    let popW = 420, popH = 320;
    let popX = width  / 2 - popW / 2;
    let popY = height / 2 - popH / 2;

    drawingContext.save();
    drawingContext.shadowBlur  = 28;
    drawingContext.shadowColor = 'rgba(0,0,0,0.15)';
    fill(255); noStroke();
    rect(popX, popY, popW, popH, 16);
    drawingContext.restore();

    // 자물쇠 이모지
    textSize(28); textAlign(CENTER, BASELINE); noStroke();
    text('🔒', width / 2, popY + 52);

    // 타이틀
    fill(22);
    textStyle(BOLD); textSize(17);
    text('화분을 잠글까요?', width / 2, popY + 86);

    // 안내 문구 박스 (높이 넉넉하게)
    let warnX = popX + 20, warnY = popY + 102;
    let warnW = popW - 40, warnH = 72;
    fill(255, 242, 245); noStroke();
    rect(warnX, warnY, warnW, warnH, 8);
    fill(150, 50, 75);
    textStyle(NORMAL); textSize(12); textAlign(CENTER, CENTER);
    text('잠금 후에는 모든 사람이\n이 화분에 줄기를 추가하거나 꾸밀 수 없어요.',
      warnX + warnW / 2, warnY + warnH / 2);

    // 구분선
    stroke(235); strokeWeight(1);
    line(popX + 20, popY + popH - 80, popX + popW - 20, popY + popH - 80);

    // 버튼
    let btnY    = popY + popH - 68;
    let btnH    = 48;
    let confirmW = (popW - 56) / 2;
    let confirmX = popX + 20;
    let cancelX  = confirmX + confirmW + 16;
    let cancelW  = confirmW;

    // 잠금 확정 버튼
    let confirmHov = isHovered(confirmX, btnY, confirmW, btnH);
    fill(confirmHov ? color(155, 20, 60) : color(185, 40, 80)); noStroke();
    rect(confirmX, btnY, confirmW, btnH, 24);
    fill(255); textSize(14); textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text('잠금 확정', confirmX + confirmW / 2, btnY + btnH / 2);

    // 취소 버튼
    let cancelHov = isHovered(cancelX, btnY, cancelW, btnH);
    fill(cancelHov ? color(228, 228, 228) : color(244, 244, 244)); noStroke();
    rect(cancelX, btnY, cancelW, btnH, 24);
    fill(70); textSize(14); textStyle(NORMAL);
    textAlign(CENTER, CENTER);
    text('취소', cancelX + cancelW / 2, btnY + btnH / 2);

    if (confirmHov || cancelHov) cursor(HAND); else cursor(ARROW);
  }
}