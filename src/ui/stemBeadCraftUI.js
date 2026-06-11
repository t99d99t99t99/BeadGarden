class StemBeadCraftUI {
  constructor() {
    this.paletteColors = [];
    this.currentPot = null;
    this.minBeads = 10;
    this.newBeadButtonWasPressed = false;

    // 테마별 배경 이미지 로드
    this.bgImgs = {};
    loadImage('assets/stemBeadCraft_plant_bg.png', img => { this.bgImgs[POT_THEMES.PLANT] = img; }, () => {});
    loadImage('assets/stemBeadCraft_star_bg.png',  img => { this.bgImgs[POT_THEMES.STAR]  = img; }, () => {});
    loadImage('assets/stemBeadCraft_ocean_bg.png', img => { this.bgImgs[POT_THEMES.OCEAN] = img; }, () => {});
  }

  setPalette(colors) {
    this.paletteColors = colors;
    // beadGame에도 전달 (팀원 코드 연결 포인트)
    if (typeof beadGame !== 'undefined') {
      beadGame.setPalette(colors);
    }
  }

  setPot(pot) {
    this.currentPot = pot;
  }

  startThemedCraft() {
    if (typeof beadGame !== 'undefined') {
      beadGame.setTheme(normalizePotTheme(this.currentPot));
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
    if (typeof handDetector !== 'undefined' && typeof handDetector.pinched === 'function') {
      return handDetector.pinched();
    }
    return false;
  }

  // 철사 잡기 상태 읽기
  isHoldingWire() {
    if (typeof beadGame !== 'undefined' && typeof beadGame.isHoldingWire === 'function') {
      return beadGame.isHoldingWire();
    }
    return false;
  }

  // ── 상단 안내 메시지 ──
  drawGuide() {
    let isPinching = this.isPinching();
    let isHoldingWire = this.isHoldingWire();
    let msg = '👌 손가락을 모아 철사를 잡으세요.';

    if (isPinching && !isHoldingWire) {
      msg = '👌 철사를 잡지 못했어요! 손가락을 뗀 뒤 다시 철사를 잡아 보세요.';
    } else if (isHoldingWire) {
      msg = '👆 철사를 잡았어요! 비즈 구멍에 통과시켜 보세요.';
    }

    let guideW = 470;
    let guideH = 48;
    let guideX = width / 2 - guideW / 2;
    let guideY = height - 160;

    fill(239, 238, 255); noStroke();
    rect(guideX, guideY, guideW, guideH, 6);
    fill(120); noStroke(); textSize(13); textStyle(NORMAL);
    textAlign(CENTER, CENTER);
    text(msg, width / 2, guideY + guideH / 2);
  }

  // ── 비즈 카운터 ──
  drawCounter() {
    let count = this.getBeadCount();
    let isDone = count >= this.minBeads;
    let display = `꿴 비즈: ${count} / ${this.minBeads}`;

    fill(30); noStroke(); textSize(13); textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text(display, width / 2 - (isDone ? 16 : 0), 88);

    // 10개 이상 → 체크 표시
    if (isDone) {
      fill(60, 180, 80); noStroke();
      ellipse(width / 2 + 70, 88, 20);
      fill(255); textSize(12); textAlign(CENTER, CENTER);
      text('✓', width / 2 + 70, 88);
    }
  }

  // ── 완성 줄기 프리뷰 자리 ──
  drawPreviewPlaceholder() {
    let previewW = 470;
    let previewH = 46;
    let previewX = width / 2 - previewW / 2;
    let previewY = 116;

    fill(239, 238, 255);
    stroke(150);
    strokeWeight(1);
    rect(previewX, previewY, previewW, previewH, 6);

    fill(120);
    noStroke();
    textSize(12);
    textStyle(NORMAL);
    textAlign(LEFT, CENTER);
    text('프리뷰', previewX + 22, previewY + previewH / 2);

    let beads = [];
    if (typeof beadGame !== 'undefined' && typeof beadGame.getPiercedBeadPreviewItems === 'function') {
      beads = beadGame.getPiercedBeadPreviewItems();
    }

    if (beads.length === 0) {
      return;
    }

    let beadDisplayHeight = 28;
    let beadGap = 3;
    let labelReserve = 90;
    let rowW = this.#previewRowWidth(beads, beadDisplayHeight, beadGap);
    let availableW = previewW - labelReserve - 24;
    if (rowW > availableW) {
      beadDisplayHeight = Math.max(8, beadDisplayHeight * availableW / rowW);
      rowW = this.#previewRowWidth(beads, beadDisplayHeight, beadGap);
    }

    let rowX = previewX + labelReserve + (availableW - rowW) / 2;
    let rowY = previewY + previewH / 2;

    let x = rowX;
    for (let bead of beads) {
      let scale = beadDisplayHeight / bead.h;
      let beadDisplayWidth = bead.w * scale;
      this.#drawPreviewBead(bead, x + beadDisplayWidth / 2, rowY, scale);
      x += beadDisplayWidth + beadGap;
    }
  }

  /**
   * @param {{w: Number, h: Number}[]} beads
   * @param {Number} displayHeight
   * @param {Number} gap
   * @returns {Number}
   */
  #previewRowWidth(beads, displayHeight, gap) {
    let rowW = Math.max(0, beads.length - 1) * gap;
    for (let bead of beads) {
      rowW += bead.w * displayHeight / bead.h;
    }

    return rowW;
  }

  /**
   * @param {{assetId: string | null, color: import("p5").Color, w: Number, h: Number}} bead
   * @param {Number} x
   * @param {Number} y
   * @param {Number} scale
   * @returns {void}
   */
  #drawPreviewBead(bead, x, y, scale) {
    if (bead.assetId) {
      drawBeadAtlas(bead.assetId, x, y, bead.w * scale, bead.h * scale);
      return;
    }

    push();
    translate(x, y);
    rectMode(CENTER);
    noStroke();

    fill(bead.color);
    rect(0, 0, bead.w * scale, bead.h * scale);

    pop();
  }

  // ── 새 비즈 생성 버튼 ──
  drawNewBeadBtn() {
    let btnW = 220;
    let btnH = 56;
    let btnX = width / 2 - 360;
    let btnY = height - 64;
    let isHover = isHovered(btnX, btnY, btnW, btnH);

    if (isHover) {
      fill(232, 231, 252);
    } else {
      fill(239, 238, 255);
    }
    stroke(150);
    strokeWeight(1);
    rect(btnX, btnY, btnW, btnH, 4);

    fill(100);
    noStroke();
    textSize(13);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text('새로운 비즈 생성하기', btnX + btnW / 2, btnY + btnH / 2);

    let isButtonPressed = isClicked(btnX, btnY, btnW, btnH);
    if (isButtonPressed && !this.newBeadButtonWasPressed &&
      typeof beadGame !== 'undefined' && typeof beadGame.regenerateUnpiercedBeads === 'function') {
      beadGame.regenerateUnpiercedBeads();
    }
    this.newBeadButtonWasPressed = isButtonPressed;
  }

  // ── 완성하기 버튼 ──
  drawCompleteBtn() {
    let count = this.getBeadCount();
    let canDone = count >= this.minBeads;
    let btnW = 500, btnH = 56;
    let btnX = width / 2 - 115;
    let btnY = height - 64;
    let isHover = canDone &&
      mouseX > btnX && mouseX < btnX + btnW &&
      mouseY > btnY && mouseY < btnY + btnH;

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
      text('완성하기', btnX + btnW / 2, btnY + btnH / 2);
    } else {
      text('완성하기', btnX + btnW / 2, btnY + btnH / 2);
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

    let pointerColor = color(255, 0, 0, 80);
    if (handDetector.pinched()) {
      pointerColor = color(0, 0, 255, 80);
    }

    if (gumjiPosition) {
      fill(pointerColor);
      circle(gumjiPosition.x, gumjiPosition.y, 9);
    }

    if (thumbPosition) {
      fill(red(pointerColor), green(pointerColor), blue(pointerColor), 255);
      circle(thumbPosition.x, thumbPosition.y, 14);
      fill(255, 255, 255, 180);
      circle(thumbPosition.x, thumbPosition.y, 5);
    }

    pop();
  }

  draw() {
    const theme = normalizePotTheme(this.currentPot);
    const bgImg = this.bgImgs[theme];
    if (bgImg) {
      imageMode(CORNER);
      image(bgImg, 0, 0, width, height);
    } else {
      background(255);
    }

    // beadGame: 비즈 배치, 철사, 손가락 표시기 전부 여기서 그려줌
    if (typeof beadGame !== 'undefined') {
      beadGame.update(handDetector);
      beadGame.draw();
      this.drawHandMarkers();
    } else {
      fill(200); textSize(14); textStyle(NORMAL); textAlign(CENTER);
      text('[ beadGame.js 연결 대기 중 ]', width / 2, height / 2);
    }

    // ── 상단 바 ──
    stroke(160);
    strokeWeight(1);
    line(0, 56, width, 56);

    // 뒤로가기
    fill(248); stroke(210); strokeWeight(1);
    rect(24, 14, 86, 28, 4);
    fill(60); noStroke(); textSize(13); textStyle(NORMAL);
    textAlign(CENTER, CENTER);
    text('← 나가기', 67, 28);
    if (isClicked(24, 14, 86, 28)) {
      potDetailUI.show(this.currentPot);
      goTo(GARDEN);
    }

    // 페이지 타이틀
    fill(30); textStyle(BOLD); textSize(15); textAlign(CENTER, CENTER);
    text('비즈 줄기 꿰기', width / 2, 28);

    // 튜토리얼 버튼
    let tutHov = isHovered(width - 108, 14, 84, 28);
    fill(tutHov ? 235 : 248); stroke(210); strokeWeight(1);
    rect(width - 108, 14, 84, 28, 4);
    fill(150); noStroke(); textSize(13); textStyle(NORMAL);
    textAlign(CENTER, CENTER);
    text('튜토리얼', width - 66, 28);
    if (isClicked(width - 108, 14, 84, 28)) {
      prevState = STEM_BEAD_CRAFT;
      goTo(TUTORIAL);
    }

    // 카운터
    this.drawCounter();

    // 프리뷰 자리
    this.drawPreviewPlaceholder();

    // 안내 메시지
    this.drawGuide();

    // 새 비즈 생성 버튼
    this.drawNewBeadBtn();

    // 완성하기 버튼
    this.drawCompleteBtn();
  }
}
