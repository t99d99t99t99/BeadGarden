class StemBeadCraftUI {
  constructor() {
    this.paletteColors = []; // stemDetailUI에서 전달받음
    this.minBeads = 10;
  }

  // stemDetailUI에서 호출
  setPalette(colors) {
    this.paletteColors = colors;
    // beadGame에도 전달 (팀원 코드 연결 포인트)
    if (typeof beadGame !== 'undefined') {
      beadGame.setPalette(colors);
    }
  }

  // 꿰어진 비즈 수 읽기 (팀원 코드 연결 포인트)
  getBeadCount() {
    if (typeof beadGame !== 'undefined' && beadGame.beadCount !== undefined) {
      return beadGame.beadCount;
    }
    return 0; // 팀원 코드 붙기 전 임시값
  }

  // 핀치 상태 읽기
  isPinching() {
    if (typeof handDetector !== 'undefined') {
      return handDetector.pinching;
    }
    return false;
  }

  // ── 상단 안내 메시지 ──
  drawGuide() {
    let msg = this.isPinching()
      ? '👆 철사를 잡았어요! 비즈 구멍에 통과시켜 보세요.'
      : '👌 손가락을 모아 철사를 잡으세요.';

    fill(248); stroke(220); strokeWeight(1);
    rect(width / 2 - 220, 100, 440, 44, 22);
    fill(60); noStroke(); textSize(13); textStyle(NORMAL);
    textAlign(CENTER, CENTER);
    text(msg, width / 2, 122);
  }

  // ── 비즈 카운터 ──
  drawCounter() {
    let count   = this.getBeadCount();
    let isDone  = count >= this.minBeads;
    let display = `꿴 비즈: ${count} / ${this.minBeads}`;

    fill(30); noStroke(); textSize(14); textStyle(NORMAL);
    textAlign(CENTER);
    text(display, width / 2 - (isDone ? 16 : 0), 72);

    // 10개 이상 → 체크 표시
    if (isDone) {
      fill(60, 180, 80); noStroke();
      ellipse(width / 2 + 70, 68, 20);
      fill(255); textSize(12); textAlign(CENTER, CENTER);
      text('✓', width / 2 + 70, 68);
    }
  }

  // ── 완성하기 버튼 ──
  drawCompleteBtn() {
    let count    = this.getBeadCount();
    let canDone  = count >= this.minBeads;
    let isHover  = canDone &&
      mouseX > width / 2 - 230 && mouseX < width / 2 + 230 &&
      mouseY > height - 68    && mouseY < height - 20;

    let btnW = 460, btnH = 48;
    let btnX = width / 2 - btnW / 2;
    let btnY = height - 68;

    if (canDone) {
      fill(isHover ? 40 : 30); noStroke();
    } else {
      fill(180); noStroke();
    }
    rect(btnX, btnY, btnW, btnH, 24);

    fill(255); textSize(15);
    textStyle(canDone ? BOLD : NORMAL);
    textAlign(CENTER, CENTER);

    if (canDone) {
      text('완성하기', width / 2, btnY + btnH / 2);
    } else {
      let need = this.minBeads - count;
      text(`완성하기 (아직 비즈 ${need}개를 더 꿰어야 활성화돼요)`,
        width / 2, btnY + btnH / 2);
    }

    // 클릭 → STEM_FINISH
    if (canDone && !this.isPinching() && isClicked(btnX, btnY, btnW, btnH)) {
        stemFinishUI.show();
        goTo(STEM_FINISH);
    }
  }

  drawHandMarkers() {
    if (typeof handDetector === 'undefined') {
      return;
    }

    let thumbPosition = handDetector.thumbPosition();
    let gumjiPosition = handDetector.gumjiPosition();

    push();
    noStroke();

    if (gumjiPosition) {
      fill(255, 0, 0, 80);
      circle(gumjiPosition.x, gumjiPosition.y, 9);
    }

    if (thumbPosition) {
      fill(255, 0, 0);
      circle(thumbPosition.x, thumbPosition.y, 14);
      fill(255, 255, 255, 180);
      circle(thumbPosition.x, thumbPosition.y, 5);
    }

    pop();
  }

  draw() {
    background(255);

    // ── 상단 바 ──
    // 뒤로가기
    fill(248); stroke(210); strokeWeight(1);
    rect(20, 14, 80, 32, 6);
    fill(60); noStroke(); textSize(13); textStyle(NORMAL);
    textAlign(CENTER, CENTER);
    text('← 나가기', 60, 30);
    if (isClicked(20, 14, 80, 32)) goTo(STEM_DETAIL);

    // 페이지 타이틀
    fill(30); textStyle(BOLD); textSize(16); textAlign(CENTER);
    text('비즈 줄기 꿰기', width / 2, 30);

    // 튜토리얼 버튼
    fill(248); stroke(210); strokeWeight(1);
    rect(width - 100, 14, 80, 32, 6);
    fill(60); noStroke(); textSize(13); textStyle(NORMAL);
    textAlign(CENTER, CENTER);
    text('튜토리얼', width - 60, 30);
    if (isClicked(width - 100, 14, 80, 32)) goTo(TUTORIAL);

    // 카운터
    this.drawCounter();

    // 안내 메시지
    this.drawGuide();

    // ── 팀원 코드 호출 ──
    // beadGame: 비즈 배치, 철사, 손가락 표시기 전부 여기서 그려줌
    if (typeof beadGame !== 'undefined') {
      beadGame.update(handDetector);
      beadGame.draw();
      this.drawHandMarkers();
    } else {
      // 팀원 코드 붙기 전 임시 안내
      fill(200); textSize(14); textStyle(NORMAL); textAlign(CENTER);
      text('[ beadGame.js 연결 대기 중 ]', width / 2, height / 2);
    }

    // 완성하기 버튼
    this.drawCompleteBtn();
  }
}
