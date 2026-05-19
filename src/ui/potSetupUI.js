class PotSetupUI {
  constructor() {
    this.nameInput = null;
    this.descInput = null;
    this.isVisible = false;
  }

  show() {
    this.isVisible = true;

    // 화분 이름 input
    this.nameInput = createInput('');
    this.nameInput.attribute('placeholder', '예) 나의 첫 번째 화분');
    this.nameInput.attribute('maxlength', '20');
    this.nameInput.style('width', '460px');
    this.nameInput.style('padding', '12px 16px');
    this.nameInput.style('font-size', '15px');
    this.nameInput.style('border', '1px solid #ddd');
    this.nameInput.style('border-radius', '8px');
    this.nameInput.style('outline', 'none');
    this.nameInput.position(width / 2 - 240, height / 2 - 80);

    // 한 줄 설명 input
    this.descInput = createInput('');
    this.descInput.attribute('placeholder', '예) 오늘 처음 만들어본 화분');
    this.descInput.attribute('maxlength', '40');
    this.descInput.style('width', '460px');
    this.descInput.style('padding', '12px 16px');
    this.descInput.style('font-size', '15px');
    this.descInput.style('border', '1px solid #ddd');
    this.descInput.style('border-radius', '8px');
    this.descInput.style('background', '#f9f9f9');
    this.descInput.style('outline', 'none');
    this.descInput.position(width / 2 - 240, height / 2 + 10);
  }

  hide() {
    this.isVisible = false;
    if (this.nameInput) { this.nameInput.remove(); this.nameInput = null; }
    if (this.descInput) { this.descInput.remove(); this.descInput = null; }
  }

  getData() {
    return {
      name: this.nameInput ? this.nameInput.value() : '',
      desc: this.descInput ? this.descInput.value() : '',
    };
  }

  draw() {
    if (!this.isVisible) return;

    // ── 배경 dim ──
    fill(0, 0, 0, 120);
    noStroke();
    rect(0, 0, width, height);

    // ── 팝업 박스 ──
    let popW = 520, popH = 460;
    let popX = width / 2 - popW / 2;
    let popY = height / 2 - popH / 2;
    fill(255);
    stroke(220);
    strokeWeight(1);
    rect(popX, popY, popW, popH, 14);

    // ── 타이틀 ──
    noStroke();
    fill(30);
    textStyle(BOLD);
    textSize(20);
    textAlign(CENTER);
    text('새 화분 만들기', width / 2, popY + 48);

    fill(120);
    textStyle(NORMAL);
    textSize(13);
    text('나만의 화분 정보를 입력하여 새로운 화분을 만들어보세요.', width / 2, popY + 72);

    // ── 구분선 ──
    stroke(220);
    strokeWeight(1);
    line(popX, popY + 85, popX + popW, popY + 85);

    // ── 라벨 ──
    noStroke();
    fill(40);
    textSize(13);
    textStyle(BOLD);
    textAlign(LEFT);
    text('화분의 이름*', popX + 30, popY + 115);

    // 글자 수 카운트
    let nameLen = this.nameInput ? this.nameInput.value().length : 0;
    fill(150);
    textStyle(NORMAL);
    textAlign(RIGHT);
    text(`${nameLen} / 20`, popX + popW - 30, popY + 115);

    fill(40);
    textStyle(BOLD);
    textAlign(LEFT);
    text('한 줄 설명 (선택)', popX + 30, popY + 195);

    // ── 안내 문구 ──
    fill(150);
    textStyle(NORMAL);
    textSize(12);
    textAlign(CENTER);
    text('화분의 이름과 설명을 확정하면 다시 수정할 수 없어요.', width / 2, popY + 370);

    // ── 취소 버튼 ──
    let cancelX = popX + 30, cancelY = popY + 390;
    let cancelW = 150, cancelH = 48;
    fill(180);
    noStroke();
    rect(cancelX, cancelY, cancelW, cancelH, 24);
    fill(255);
    textSize(15);
    textStyle(NORMAL);
    textAlign(CENTER, CENTER);
    text('취소하기', cancelX + cancelW / 2, cancelY + cancelH / 2);

    if (isClicked(cancelX, cancelY, cancelW, cancelH)) {
      this.hide();
      goTo(GARDEN);
    }

    // ── 확정 버튼 ──
    let confirmX = popX + 200, confirmY = popY + 390;
    let confirmW = 290, confirmH = 48;
    let data = this.getData();
    let canConfirm = data.name.length > 0;

    fill(canConfirm ? 30 : 160); // 이름 없으면 비활성화
    noStroke();
    rect(confirmX, confirmY, confirmW, confirmH, 24);
    fill(255);
    textSize(15);
    textAlign(CENTER, CENTER);
    text('이름 확정하고 화분 꾸미기 →', confirmX + confirmW / 2, confirmY + confirmH / 2);

    if (canConfirm && isClicked(confirmX, confirmY, confirmW, confirmH)) {
      this.hide();
      goTo(POT_DETAIL);
    }
  }
}