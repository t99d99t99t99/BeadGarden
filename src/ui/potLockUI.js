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

  draw() {
    if (!this.isVisible) return;

    // 배경 dim
    fill(0, 0, 0, 100); noStroke();
    rect(0, 0, width, height);

    // 팝업 박스
    let popW = 460, popH = 300;
    let popX = width  / 2 - popW / 2;
    let popY = height / 2 - popH / 2;
    fill(255); stroke(220); strokeWeight(1);
    rect(popX, popY, popW, popH, 14);

    // 자물쇠 이모지
    textSize(32); textAlign(CENTER);
    text('🔒', width / 2, popY + 52);

    // 타이틀
    fill(30); noStroke();
    textStyle(BOLD); textSize(18); textAlign(CENTER);
    text('화분을 잠글까요?', width / 2, popY + 90);

    // 경고 박스
    let warnX = popX + 20, warnY = popY + 106;
    let warnW = popW - 40, warnH = 64;
    fill(255, 235, 240); stroke(220, 180, 190); strokeWeight(1);
    rect(warnX, warnY, warnW, warnH, 8);
    fill(160, 60, 80); noStroke();
    textStyle(NORMAL); textSize(13); textAlign(CENTER, CENTER);
    text('잠금 후에는 모든 사람이 이 화분에 줄기를 추가하거나 꾸밀 수 없어요.',
      warnX + warnW / 2, warnY + warnH / 2);

    // 구분선
    stroke(220); strokeWeight(1);
    line(popX + 20, popY + 186, popX + popW - 20, popY + 186);

    // 잠금 확정 버튼
    let confirmX = popX + 20, confirmY = popY + 202;
    let confirmW = (popW - 56) / 2, confirmH = 52;
    fill(180, 40, 80); noStroke();
    rect(confirmX, confirmY, confirmW, confirmH, 26);
    fill(255); textSize(15); textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text('잠금 확정', confirmX + confirmW / 2, confirmY + confirmH / 2);

    if (isClicked(confirmX, confirmY, confirmW, confirmH)) {
      // 화분 잠금 처리
      if (this.pot) this.pot.locked = true;
      this.hide();
      // POT_DETAIL 다시 열기 (잠금 상태로)
      potDetailUI.show(this.pot);
      goTo(GARDEN);
    }

    // 취소 버튼
    let cancelX = confirmX + confirmW + 16;
    let cancelY = popY + 202;
    let cancelW = confirmW, cancelH = 52;
    fill(245); stroke(210); strokeWeight(1);
    rect(cancelX, cancelY, cancelW, cancelH, 26);
    fill(80); noStroke(); textSize(15); textStyle(NORMAL);
    textAlign(CENTER, CENTER);
    text('취소', cancelX + cancelW / 2, cancelY + cancelH / 2);

    if (isClicked(cancelX, cancelY, cancelW, cancelH)) {
      this.hide();
      potDetailUI.show(this.pot);
      goTo(GARDEN);
    }
  }
}