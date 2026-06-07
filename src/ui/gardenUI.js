class GardenUI {
  constructor() {
    this.pots         = []; // Firestore listenPots() 콜백에서 채워짐
    this.scrollX      = 0;
    this.targetScrollX = 0;
    this.cardW        = 200;
    this.cardGap      = 80;
    this.hoveredPot   = null;
    this.isDragging   = false;
    this.dragStartX   = 0;
    this.dragScrollX  = 0;
  }

  // 카드 x 위치 — 왼→오른쪽 순서, 스크롤 반영
  _cardX(index) {
    return 60 + index * (this.cardW + this.cardGap) - this.scrollX;
  }

  // 에디션 라벨 (pot.concept 값 기반)
  _editionLabel(pot) {
    const c = pot.concept ?? '';
    if (c.includes('식물')) return '식물 에디션';
    if (c.includes('스타')) return '스타 에디션';
    if (c.includes('바다')) return '바다 에디션';
    return c;
  }

  // 에디션별 카드 배경색
  _cardBg(pot) {
    const c = pot.concept ?? '';
    if (c.includes('식물')) return color(225, 240, 220);
    if (c.includes('스타')) return color(250, 240, 210);
    if (c.includes('바다')) return color(215, 235, 248);
    return color(245, 245, 245);
  }

  // ── 화분 카드 그리기 ────────────────────────────────────────────────────────
  drawCard(pot, x) {
    const y     = pot.cardY ?? height * 0.25;
    const w     = this.cardW;
    const imgH  = 200;  // 이미지/줄기 영역
    const infoH = 76;   // 텍스트 영역
    const h     = imgH + infoH;
    const isHov = (this.hoveredPot === pot);
    const cx    = x + w / 2;

    // ── 카드 외곽 (에디션 컬러 테두리) ──
    fill(this._cardBg(pot));
    stroke(isHov ? color(60, 60, 220) : color(200));
    strokeWeight(isHov ? 2 : 1);
    rect(x, y, w, h, 12);

    // ── 이미지 영역 배경 (저장된 bgIndex 색상) ──
    const bgColors = ['#EDE8F5','#D6EAF8','#D5F5E3','#FEF9E7','#F9E4F0','#F5F5F5','#CCCCCC','#111111'];
    const imgBg = bgColors[pot.bgIndex ?? 0] ?? '#F5F5F5';
    noStroke(); fill(imgBg);
    rect(x + 1, y + 1, w - 2, imgH - 2, 11, 11, 0, 0);

    // ── 줄기 (이미지 영역 안에서만 그리기) ──
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(x + 1, y + 1, w - 2, imgH - 1);
    drawingContext.clip();
    const stemBase = y + imgH - 20;
    this._drawPotImage(cx, stemBase, pot, w);
    this._drawStems(cx, stemBase, pot);
    drawingContext.restore();

    // ── 텍스트 영역 (흰 반투명 배경) ──
    noStroke();
    fill(255, 255, 255, 200);
    rect(x, y + imgH, w, infoH, 0, 0, 12, 12);

    // 구분선
    stroke(200); strokeWeight(1);
    line(x + 14, y + imgH, x + w - 14, y + imgH);

    // 화분 이름 + 잠금
    noStroke();
    fill(40);
    textFont('sans-serif');
    textSize(13);
    textStyle(BOLD);
    textAlign(LEFT);
    text(pot.name + (pot.locked ? ' 🔒' : ''), x + 14, y + imgH + 20);

    // 줄기 개수 + 에디션
    fill(120);
    textStyle(NORMAL);
    textSize(11);
    const stemCount = pot.stems ? pot.stems.length : 0;
    text(`줄기 ${stemCount}개 (${this._editionLabel(pot)})`, x + 14, y + imgH + 38);

    // 클릭하여 열기
    fill(isHov ? color(60, 60, 200) : 150);
    textSize(11);
    text('클릭하여 열기 →', x + 14, y + imgH + 56);
  }

  // ── 줄기 렌더링 (저장된 stem 데이터 기반) ───────────────────────────────────
  _drawStems(cx, baseY, pot) {
    if (!pot.stems || pot.stems.length === 0) return;

    // 저장된 stemAngles 또는 기본 배치
    const defaultAngles = [340, 0, 20, -20, 350];
    const defaultOffsets = [-20, 0, 20, -10, 10];
    const stemLen = 120;

    for (let i = 0; i < pot.stems.length; i++) {
      const stem    = pot.stems[i];
      // stemAngle(구버전) 또는 angle(신버전), 둘 다 없으면 인덱스별 기본값
      const angleDeg = stem.angle ?? stem.stemAngle ?? defaultAngles[i % defaultAngles.length];
      const offset   = stem.baseOffset ?? defaultOffsets[i % defaultOffsets.length];
      const bx      = cx + offset * 0.6;
      const angle   = radians(angleDeg);
      const tx      = bx + sin(angle) * stemLen;
      const ty      = baseY - cos(angle) * stemLen;
      const col     = (stem.stemColor !== undefined) ? STEM_COLORS[stem.stemColor] : '#AAAAAA';

      // 줄기 선
      stroke(col); strokeWeight(1.5);
      line(bx, baseY, tx, ty);

      // 비즈 (저장된 beadId 있으면 이미지, 없으면 원형 fallback)
      const beads = stem.beads ?? [];
      const count = beads.length > 0 ? beads.length : 4;
      for (let j = 0; j < count; j++) {
        const t   = (j + 1) / (count + 1);
        const bpx = lerp(bx, tx, t);
        const bpy = lerp(baseY, ty, t);
        const bead = beads[j];
        const asset = bead?.assetId ? getBeadAtlasEntry(bead.assetId) : null;
        const img = bead?.beadId ? beadImages[bead.beadId] : null;
        if (asset) {
          const beadH = 14;
          const beadW = beadH * asset.source.w / asset.source.h;
          drawBeadAtlasLayer(asset, 'hole', bpx, bpy, beadW, beadH, angle);
          drawBeadAtlasLayer(asset, 'body', bpx, bpy, beadW, beadH, angle);
        } else if (img) {
          imageMode(CENTER);
          image(img, bpx, bpy, 14, 14);
          imageMode(CORNER);
        } else {
          noStroke();
          fill(bead?.color ?? color(190, 185, 200));
          ellipse(bpx, bpy, 13 - j * 1.5);
        }
      }
    }
  }

  // ── 화분 이미지 렌더링 ────────────────────────────────────────────────────
  _drawPotImage(cx, baseY, pot, cardW) {
    const potW = cardW * 0.5;
    const potH = potW;
    const asset = getPotAssetForPot(pot);
    const potSize = getPotAssetDrawSize(asset, potW, potH);

    if (drawPotAsset(
      asset,
      asset?.theme,
      cx,
      baseY + potSize.height / 2,
      potW,
      potH,
      pot.colorIndex ?? 0
    )) {
      return;
    }

    fill(POT_COLORS[pot.colorIndex ?? 0]); noStroke();
    drawPotShapeAt(cx, baseY, pot.shapeIndex ?? 0, 0.7);
  }

  // ── 전체 draw ─────────────────────────────────────────────────────────────
  draw() {
    background(237, 242, 226); // 연초록

    // 배경 영역
    noStroke();
    fill(235, 240, 228);
    rect(40, 70, width - 80, height - 150, 16);

    // 타이틀
    noStroke();
    fill(180, 80, 200);
    textFont('monospace');
    textStyle(BOLD);
    textSize(13);
    textAlign(LEFT);
    text('BEAD  GARDEN', 60, 52);

    fill(60, 60, 60);
    textFont('sans-serif');
    textSize(22);
    textStyle(BOLD);
    textAlign(LEFT);
    text('오늘은 어떤 비즈 식물을 심어볼까요?', 60, 82);

    // 화분 카드들
    this.hoveredPot = null;
    for (let i = 0; i < this.pots.length; i++) {
      const pot = this.pots[i];
      const x   = this._cardX(i);
      const y   = pot.cardY ?? height * 0.25;
      const h   = 260;

      if (x + this.cardW < 40 || x > width - 40) continue;

      this.drawCard(pot, x);

      if (mouseX > x && mouseX < x + this.cardW &&
          mouseY > y && mouseY < y + 276) {
        this.hoveredPot = pot;
        cursor(HAND);
      }
    }

    if (!this.hoveredPot && !potSetupUI.isVisible && !potDetailUI.isVisible) cursor(ARROW);

    // 부드러운 스크롤
    this.scrollX = lerp(this.scrollX, this.targetScrollX, 0.12);

    // 새 화분 만들기 버튼
    const btnW = 320, btnH = 52;
    const btnX = width / 2 - btnW / 2;
    const btnY = height - 72;
    const btnHov = isHovered(btnX, btnY, btnW, btnH);
    fill(btnHov ? color(200, 0, 200) : color(220, 30, 220));
    noStroke();
    rect(btnX, btnY, btnW, btnH, 26);
    fill(255);
    textFont('sans-serif');
    textSize(16);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text('+ 새 화분 만들기', btnX + btnW / 2, btnY + btnH / 2);
    if (btnHov) cursor(HAND);
  }

  onMousePressed() {
    const btnW = 320, btnH = 52;
    const btnX = width / 2 - btnW / 2;
    const btnY = height - 72;
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
    if (!this.isDragging) return;
    this.targetScrollX = this.dragScrollX - (mouseX - this.dragStartX);
    const maxScroll = max(0, this.pots.length * (this.cardW + this.cardGap) - width + 120);
    this.targetScrollX = constrain(this.targetScrollX, 0, maxScroll);
  }

  onMouseReleased() {
    if (potSetupUI.isVisible || potDetailUI.isVisible) {
      this.isDragging = false;
      return;
    }
    if (abs(mouseX - this.dragStartX) < 5) {
      for (let i = 0; i < this.pots.length; i++) {
        const pot = this.pots[i];
        const x   = this._cardX(i);
        const y   = pot.cardY ?? height * 0.25;
        if (mouseX > x && mouseX < x + this.cardW &&
            mouseY > y && mouseY < y + 276) {
          potSetupUI.hide();
          potDetailUI.show(pot);
        }
      }
    }
    this.isDragging = false;
  }
}
