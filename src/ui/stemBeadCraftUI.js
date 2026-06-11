class StemBeadCraftUI {
  constructor() {
    this.paletteColors = [];
    this.currentPot = null;
    this.minBeads = 10;
    this.newBeadButtonWasPressed = false;
    this.previewBeadHitAreas = [];
    this.hoveredPreviewBeadIndex = null;
    this.playGraphics = {};

    // 테마별 배경 이미지 로드
    this.bgImgs = {};
    loadImage('assets/stemBeadCraft_plant_bg.png', img => { this.bgImgs[POT_THEMES.PLANT] = img; }, () => { });
    loadImage('assets/stemBeadCraft_star_bg.png', img => { this.bgImgs[POT_THEMES.STAR] = img; }, () => { });
    loadImage('assets/stemBeadCraft_ocean_bg.png', img => { this.bgImgs[POT_THEMES.OCEAN] = img; }, () => { });

    const graphicPath = 'assets/stem_bead_play/';
    const graphicFiles = {
      boxMessage: 'box_message.png',
      boxPreview: 'box_preview.png',
      buttonComplete: 'button_complete.png',
      buttonCompletePressed: 'button_complete_pressed.png',
      buttonNewBead: 'button_new_bead.png',
      buttonNewBeadPressed: 'button_new_bead_pressed.png',
      markerFingerGreen: 'marker_finger_green.png',
      markerFingerPink: 'marker_finger_pink.png',
      markerFingertipGreen: 'marker_fingertip_green.png',
      markerFingertipPink: 'marker_fingertip_pink.png',
      markerWireEnd: 'marker_wire_end.png',
    };
    for (const [key, filename] of Object.entries(graphicFiles)) {
      loadImage(graphicPath + filename, img => { this.playGraphics[key] = img; }, () => { });
    }
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

  isWireFull() {
    return typeof beadGame !== 'undefined' &&
      typeof beadGame.isWireFull === 'function' &&
      beadGame.isWireFull();
  }

  // ── 상단 안내 메시지 ──
  drawGuide() {
    let isPinching = this.isPinching();
    let isHoldingWire = this.isHoldingWire();
    let isWireFull = this.isWireFull();
    let msg = '👌손가락을 모아 O 부분의 철사를 잡으세요.';

    if (isWireFull) {
      msg = '비즈가 너무 많아요! 철사가 가득 찼어요.';
    } else if (isPinching && !isHoldingWire) {
      msg = '👌 철사를 잡지 못했어요! 손가락을 뗀 뒤 다시 철사를 잡아 보세요.';
    } else if (isHoldingWire) {
      msg = '👆 철사를 잡았어요! 비즈 구멍에 통과시켜 보세요.';
    }

    let guideW = 440;
    let guideH = 44;
    let guideX = width / 2 - guideW / 2;
    let guideY = height - 160;

    this.#drawGraphicBox(this.playGraphics.boxMessage, guideX, guideY, guideW, guideH);
    noStroke(); textSize(13); textStyle(NORMAL);

    if (!isWireFull && !isPinching && !isHoldingWire) {
      this.#drawIdleGuideMessage(width / 2, guideY + guideH / 2);
    } else {
      fill(isWireFull ? color(220, 60, 60) : 120);
      textAlign(CENTER, CENTER);
      text(msg, width / 2, guideY + guideH / 2);
    }
  }

  #drawIdleGuideMessage(centerX, centerY) {
    let beforeMarker = '👌손가락을 모아 ';
    let marker = '◯';
    let afterMarker = ' 부분의 철사를 잡으세요.';
    let totalWidth = textWidth(beforeMarker) + textWidth(marker) + textWidth(afterMarker);
    let x = centerX - totalWidth / 2;

    textAlign(LEFT, CENTER);
    fill(120);
    text(beforeMarker, x, centerY);
    x += textWidth(beforeMarker);

    fill(255, 70, 70);
    textStyle(BOLD);
    text(marker, x, centerY);
    x += textWidth(marker);

    fill(120);
    textStyle(NORMAL);
    text(afterMarker, x, centerY);
  }

  drawHoldPointHighlight() {
    if (this.isHoldingWire() ||
      typeof beadGame === 'undefined' ||
      typeof beadGame.getWireGrabPosition !== 'function') {
      return;
    }

    let position = beadGame.getWireGrabPosition();
    if (!position) {
      return;
    }

    let diameter = 168;

    push();
    imageMode(CENTER);
    if (this.playGraphics.markerWireEnd) {
      image(this.playGraphics.markerWireEnd, position.x, position.y, diameter, diameter);
    } else {
      noFill();
      stroke(235, 0, 255, 25);
      strokeWeight(12);
      circle(position.x, position.y, diameter);
    }

    noStroke();
    fill(255, 70, 70);
    textSize(13);
    textStyle(BOLD);
    textAlign(CENTER, BOTTOM);
    text('여기를 잡으세요', position.x, position.y - diameter / 2 - 10);
    pop();
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
    let previewW = 440;
    let previewH = 44;
    let previewX = width / 2 - previewW / 2;
    let previewY = 116;

    this.#drawGraphicBox(this.playGraphics.boxPreview, previewX, previewY, previewW, previewH);

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
      this.previewBeadHitAreas = [];
      this.hoveredPreviewBeadIndex = null;
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

    this.previewBeadHitAreas = [];
    let x = rowX;
    for (let i = 0; i < beads.length; i++) {
      let bead = beads[i];
      let scale = beadDisplayHeight / bead.h;
      let beadDisplayWidth = bead.w * scale;
      this.previewBeadHitAreas.push({
        x,
        y: rowY - beadDisplayHeight / 2,
        w: beadDisplayWidth,
        h: beadDisplayHeight,
      });
      x += beadDisplayWidth + beadGap;
    }

    this.#updatePreviewHover();

    for (let i = 0; i < beads.length; i++) {
      let bead = beads[i];
      let area = this.previewBeadHitAreas[i];
      let scale = area.h / bead.h;
      let isHovered = i === this.hoveredPreviewBeadIndex;
      this.#drawPreviewBeadHighlight(bead, area, scale, isHovered);
      this.#drawPreviewBead(bead, area.x + area.w / 2, rowY, scale);
    }

    if (this.hoveredPreviewBeadIndex !== null) {
      this.#drawPreviewDeleteButton(
        this.#previewDeleteButtonRect(this.previewBeadHitAreas[this.hoveredPreviewBeadIndex])
      );
    }
  }

  onMousePressed() {
    if (this.hoveredPreviewBeadIndex === null) {
      return;
    }

    let area = this.previewBeadHitAreas[this.hoveredPreviewBeadIndex];
    let deleteButton = this.#previewDeleteButtonRect(area);
    if (!this.#pointInRect(mouseX, mouseY, deleteButton)) {
      return;
    }

    if (typeof beadGame !== 'undefined' &&
      typeof beadGame.deletePiercedBeadAtPreviewIndex === 'function') {
      beadGame.deletePiercedBeadAtPreviewIndex(this.hoveredPreviewBeadIndex);
    }
    this.hoveredPreviewBeadIndex = null;
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

  #updatePreviewHover() {
    let hoveredIndex = this.previewBeadHitAreas.findIndex(area =>
      this.#pointInRect(mouseX, mouseY, area)
    );

    if (hoveredIndex < 0 && this.hoveredPreviewBeadIndex !== null) {
      let previousArea = this.previewBeadHitAreas[this.hoveredPreviewBeadIndex];
      if (previousArea &&
        this.#pointInRect(mouseX, mouseY, this.#previewDeleteButtonRect(previousArea))) {
        hoveredIndex = this.hoveredPreviewBeadIndex;
      }
    }

    this.hoveredPreviewBeadIndex = hoveredIndex >= 0 ? hoveredIndex : null;
  }

  #drawPreviewBeadHighlight(bead, area, scale, isHovered) {
    if (!isHovered) {
      return;
    }

    push();
    translate(area.x + area.w / 2, area.y + area.h / 2);
    noStroke();
    fill(145, 145, 145, 150);

    if (bead.assetId) {
      drawingContext.shadowColor = 'rgba(90, 90, 90, 0.55)';
      drawingContext.shadowBlur = 8;
      tint(145, 145, 145, 190);
      drawBeadAtlas(
        bead.assetId,
        0,
        0,
        bead.w * scale + 8,
        bead.h * scale + 8
      );
      noTint();
    } else {
      rectMode(CENTER);
      rect(0, 0, area.w + 8, area.h + 8);
    }
    pop();
  }

  #drawPreviewDeleteButton(button) {
    push();
    noStroke();
    fill(255, 0, 0);
    circle(button.x + button.w / 2, button.y + button.h / 2, button.w);

    stroke(255);
    strokeWeight(3);
    strokeCap(ROUND);
    let inset = 7;
    line(
      button.x + inset,
      button.y + inset,
      button.x + button.w - inset,
      button.y + button.h - inset
    );
    line(
      button.x + button.w - inset,
      button.y + inset,
      button.x + inset,
      button.y + button.h - inset
    );
    pop();
  }

  #previewDeleteButtonRect(area) {
    let size = 28;
    return {
      x: area.x + area.w - size / 2,
      y: area.y - size / 2,
      w: size,
      h: size,
    };
  }

  #pointInRect(x, y, rect) {
    return x >= rect.x &&
      x <= rect.x + rect.w &&
      y >= rect.y &&
      y <= rect.y + rect.h;
  }

  #drawGraphicBox(graphic, x, y, w, h) {
    if (graphic) {
      push();
      imageMode(CORNER);
      image(graphic, x, y, w, h);
      pop();
      return;
    }

    fill(239, 238, 255);
    noStroke();
    rect(x, y, w, h, 6);
  }

  // ── 새 비즈 생성 버튼 ──
  drawNewBeadBtn() {
    let btnW = 204;
    let btnH = 52;
    let btnX = width / 2 - 348;
    let btnY = height - 64;
    let isButtonPressed = isClicked(btnX, btnY, btnW, btnH);
    let graphic = isButtonPressed
      ? this.playGraphics.buttonNewBeadPressed
      : this.playGraphics.buttonNewBead;
    this.#drawGraphicButton(graphic, btnX, btnY, btnW, btnH);

    fill(100);
    noStroke();
    textSize(13);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text('새로운 비즈 생성하기', btnX + btnW / 2, btnY + btnH / 2);

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
    let btnW = 467, btnH = 52;
    let btnX = width / 2 - 119;
    let btnY = height - 64;
    let isPressed = canDone && isClicked(btnX, btnY, btnW, btnH);
    let graphic = isPressed
      ? this.playGraphics.buttonCompletePressed
      : this.playGraphics.buttonComplete;
    this.#drawGraphicButton(graphic, btnX, btnY, btnW, btnH, !canDone);

    // 클릭 → STEM_FINISH
    if (canDone && !this.isPinching() && isPressed) {
      stemFinishUI.show();
      goTo(STEM_FINISH);
    }
  }

  #drawGraphicButton(graphic, x, y, w, h, disabled = false) {
    push();
    if (disabled) tint(255, 110);
    if (graphic) {
      imageMode(CORNER);
      image(graphic, x, y, w, h);
    } else {
      fill(disabled ? 180 : 30);
      noStroke();
      rect(x, y, w, h, 24);
    }
    noTint();
    pop();
  }

  drawHandMarkers() {
    if (typeof handDetector === 'undefined') {
      return;
    }

    let thumbPosition = handDetector.thumbPosition();
    let gumjiPosition = handDetector.gumjiPosition();
    let fingerPath = typeof handDetector.thumbToIndexPath === 'function'
      ? handDetector.thumbToIndexPath()
      : [];
    if (fingerPath.length > 0 && thumbPosition) {
      fingerPath[0] = thumbPosition;
    }
    if (fingerPath.length > 1 && gumjiPosition) {
      fingerPath[fingerPath.length - 1] = gumjiPosition;
    }
    let theme = normalizePotTheme(this.currentPot);
    if (theme === POT_THEMES.LEGACY) {
      theme = themeForConcept(this.currentPot?.concept);
    }
    let isPlant = theme === POT_THEMES.PLANT;
    let lineGraphic = isPlant
      ? this.playGraphics.markerFingerGreen
      : this.playGraphics.markerFingerPink;
    let tipGraphic = isPlant
      ? this.playGraphics.markerFingertipGreen
      : this.playGraphics.markerFingertipPink;

    push();
    for (let i = 1; i < fingerPath.length; i++) {
      this.#drawFingerSegment(fingerPath[i - 1], fingerPath[i], lineGraphic, isPlant);
    }
    this.#drawFingertipMarker(thumbPosition, tipGraphic, isPlant);
    this.#drawFingertipMarker(gumjiPosition, tipGraphic, isPlant);

    pop();
  }

  #drawFingerSegment(joint, tip, graphic, isPlant) {
    if (!joint || !tip) return;

    let dx = tip.x - joint.x;
    let dy = tip.y - joint.y;
    let targetLength = Math.sqrt(dx * dx + dy * dy);
    if (targetLength <= 0) return;

    let lineThickness = 4;
    if (!graphic) {
      stroke(isPlant ? color(127, 215, 140) : color(248, 140, 205));
      strokeWeight(lineThickness);
      line(joint.x, joint.y, tip.x, tip.y);
      return;
    }

    // The painted stroke occupies about 3px of the 24px-tall source image.
    // Fit the painted diagonal, rather than the bitmap rectangle, to the joints.
    let renderedHeight = graphic.height * lineThickness / 3;
    let paintedDy = renderedHeight * 20 / graphic.height;
    if (targetLength <= Math.abs(paintedDy)) {
      stroke(isPlant ? color(127, 215, 140) : color(248, 140, 205));
      strokeWeight(lineThickness);
      line(joint.x, joint.y, tip.x, tip.y);
      return;
    }

    let paintedDx = Math.sqrt(targetLength * targetLength - paintedDy * paintedDy);
    let renderedWidth = paintedDx * graphic.width / 151;
    let graphicAngle = Math.atan2(paintedDy, paintedDx);
    let sourceMidpointOffset = {
      x: -renderedWidth / graphic.width,
      y: -renderedHeight / graphic.height,
    };
    let rotation = Math.atan2(dy, dx) - graphicAngle;
    let rotatedOffset = {
      x: sourceMidpointOffset.x * Math.cos(rotation) -
        sourceMidpointOffset.y * Math.sin(rotation),
      y: sourceMidpointOffset.x * Math.sin(rotation) +
        sourceMidpointOffset.y * Math.cos(rotation),
    };

    push();
    translate(
      (joint.x + tip.x) / 2 - rotatedOffset.x,
      (joint.y + tip.y) / 2 - rotatedOffset.y
    );
    rotate(rotation);
    imageMode(CENTER);
    image(graphic, 0, 0, renderedWidth, renderedHeight);
    pop();
  }

  #drawFingertipMarker(position, graphic, isPlant) {
    if (!position) return;

    if (graphic) {
      imageMode(CENTER);
      image(graphic, position.x, position.y, 13, 13);
      return;
    }

    noStroke();
    fill(isPlant ? color(80, 190, 100) : color(235, 90, 160));
    circle(position.x, position.y, 13);
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
      this.drawHoldPointHighlight();
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
