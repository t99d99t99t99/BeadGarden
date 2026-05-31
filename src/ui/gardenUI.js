class GardenUI {
  constructor() {
    this.pots        = []; // Pot 객체 배열 (Firebase에서 로드)
    this.scrollX     = 0;  // 현재 스크롤 위치
    this.targetScrollX = 0; // 부드러운 스크롤용
    this.cardW       = 220;
    this.cardGap     = 120; // 카드 간 x 간격
    this.hoveredPot  = null;
    this.isDragging  = false;
    this.dragStartX  = 0;
    this.dragScrollX = 0;

    // pots는 listenPots() 콜백에서 채워짐 (sketch.js setup 참고)
  }

  // 카드 X 위치 계산 — 최신이 오른쪽
  getCardX(index) {
    let totalW = this.pots.length * (this.cardW + this.cardGap);
    let startX = width - totalW + index * (this.cardW + this.cardGap) + 60;
    return startX - this.scrollX;
  }

  drawCard(pot, x) {
    let y      = pot.cardY;
    let w      = this.cardW;
    let h      = 360;
    let isHovered = (this.hoveredPot === pot);

    // 카드 배경
    fill(isHovered ? 240 : 248);
    stroke(isHovered ? 80 : 220);
    strokeWeight(isHovered ? 2 : 1);
    rect(x, y, w, h, 12);

    // 화분 + 줄기 그리기 (임시 — 나중에 Pot 클래스 draw()로 교체)
    this.drawPotPreview(x + w / 2, y + h * 0.55);

    // 화분 이름 + 잠금 아이콘
    noStroke();
    fill(40);
    textSize(15);
    textStyle(BOLD);
    textAlign(LEFT);
    text(pot.name + (pot.locked ? ' 🔒' : ''), x + 16, y + h * 0.72);

    // 줄기 개수
    fill(100);
    textStyle(NORMAL);
    textSize(13);
    text(`줄기 ${pot.stems ? pot.stems.length : 0}개`, x + 16, y + h * 0.78);

    // 클릭하여 열기
    fill(pot.locked ? 180 : 100);
    textSize(12);
    text('클릭하여 열기 →', x + 16, y + h * 0.85);
  }

  // 임시 화분 미리보기
  drawPotPreview(cx, cy) {
    // 줄기 + 비즈
    stroke(160);
    strokeWeight(1.5);
    let stems = [
      { angle: -0.3, len: 110 },
      { angle:  0.0, len: 130 },
      { angle:  0.25, len: 105 },
    ];
    for (let s of stems) {
      let tx = cx + sin(s.angle) * s.len;
      let ty = cy - cos(s.angle) * s.len;
      line(cx, cy - 30, tx, ty);
      // 비즈 4개
      noStroke();
      fill(190);
      for (let i = 1; i <= 4; i++) {
        let t  = i / 5;
        let bx = lerp(cx, tx, t);
        let by = lerp(cy - 30, ty, t);
        ellipse(bx, by, 14 - i);
      }
      stroke(160);
      strokeWeight(1.5);
    }
    // 화분 몸통
    noStroke();
    fill(200);
    rect(cx - 30, cy - 30, 60, 55, 4);
  }

  draw() {
    background(252);

    // ── 상단 타이틀 ──
    noStroke();
    fill(100);
    textSize(13);
    textAlign(CENTER);
    textStyle(NORMAL);
    text('BEAD GARDEN', width / 2, 38);

    fill(30);
    textSize(30);
    textStyle(BOLD);
    text('오늘은 어떤 비즈 식물을\n심어볼까요?', width / 2, 65);

    // ── 화분 카드들 ──
    this.hoveredPot = null;
    for (let i = 0; i < this.pots.length; i++) {
      let pot = this.pots[i];
      let x   = this.getCardX(i);

      // 화면 밖이면 스킵
      if (x + this.cardW < 0 || x > width) continue;

      this.drawCard(pot, x);

      // 호버 감지 (잠금 화분도 클릭 가능)
      if (mouseX > x && mouseX < x + this.cardW &&
          mouseY > pot.cardY && mouseY < pot.cardY + 360) {
        this.hoveredPot = pot;
        cursor(HAND);
      }
    }

    if (!this.hoveredPot && !potSetupUI.isVisible && !potDetailUI.isVisible) cursor(ARROW);

    // 부드러운 스크롤
    this.scrollX = lerp(this.scrollX, this.targetScrollX, 0.12);

    // ── 새 화분 만들기 버튼 ──
    let btnW = 300, btnH = 52;
    let btnX = width / 2 - btnW / 2;
    let btnY = height - 80;
    let btnHov = isHovered(btnX, btnY, btnW, btnH);
    fill(btnHov ? 55 : 30);
    noStroke();
    rect(btnX, btnY, btnW, btnH, 26);
    fill(255);
    textSize(16);
    textStyle(NORMAL);
    textAlign(CENTER, CENTER);
    text('+ 새 화분 만들기', btnX + btnW / 2, btnY + btnH / 2);
    if (btnHov) cursor(HAND);

  }

  // 마우스 드래그로 스크롤
  onMousePressed() {
      // 새 화분 만들기 버튼
    let btnW = 300, btnH = 52;
    let btnX = width / 2 - btnW / 2;
    let btnY = height - 80;
    if (mouseX > btnX && mouseX < btnX + btnW &&
      mouseY > btnY && mouseY < btnY + btnH) {
        potSetupUI.show();
        return;
      }
    if (potSetupUI.isVisible || potDetailUI.isVisible) return;
    this.isDragging  = true;
    this.dragStartX  = mouseX;
    this.dragScrollX = this.targetScrollX;
  }

  onMouseDragged() {
    if (this.isDragging) {
      this.targetScrollX = this.dragScrollX - (mouseX - this.dragStartX);
      // 스크롤 범위 제한
      let maxScroll = max(0, this.pots.length * (this.cardW + this.cardGap) - width + 100);
      this.targetScrollX = constrain(this.targetScrollX, 0, maxScroll);
    }
  }

  onMouseReleased() {
    if (potSetupUI.isVisible || potDetailUI.isVisible) {
      this.isDragging = false;
      return;
    }
    // 드래그가 아닌 클릭일 때만 카드 열기
    if (abs(mouseX - this.dragStartX) < 5) {
      for (let i = 0; i < this.pots.length; i++) {
        let pot = this.pots[i];
        let x   = this.getCardX(i);
        if (mouseX > x && mouseX < x + this.cardW &&
            mouseY > pot.cardY && mouseY < pot.cardY + 360) {
          potSetupUI.hide();
          potDetailUI.show(pot);
        }
      }
    }
    this.isDragging = false;
  }
}