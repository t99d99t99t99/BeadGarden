class GardenUI {
  constructor() {
    this.pots          = [];
    this.scrollX       = 0;
    this.targetScrollX = 0;
    this.cardW         = 200;
    this.cardGap       = 80;
    this.hoveredPot    = null;
    this.isDragging    = false;
    this.dragStartX    = 0;
    this.dragScrollX   = 0;

    // 데코 이미지
    this.decoImgs = {};
    const decoList = {
      starPink:   'assets/star/star-1.png',
      starLine:   'assets/star/starLine.png',
      leaf:       'assets/plant/leafbottom.png',
      leafTop:    'assets/plant/leaftop.png',
    };
    for (const [key, path] of Object.entries(decoList)) {
      loadImage(path, img => { this.decoImgs[key] = img; }, () => {});
    }
  }

  // 카드 x 위치
  _cardX(index) {
    return 60 + index * (this.cardW + this.cardGap) - this.scrollX;
  }

  _editionLabel(pot) {
    const c = pot.concept ?? '';
    if (c.includes('식물')) return '식물 에디션';
    if (c.includes('스타')) return '스타 에디션';
    if (c.includes('바다')) return '바다 에디션';
    return c;
  }

  // ── 화분 카드 (박스 없이 떠 있는 형태) ──────────────────────────────────────
  drawCard(pot, x) {
    const potBaseY = pot.cardY ?? height * 0.55;
    const cx       = x + this.cardW / 2;
    const isHov    = (this.hoveredPot === pot);

    // 줄기 + 화분 그리기
    this._drawStems(cx, potBaseY, pot);
    this._drawPotImage(cx, potBaseY, pot);

    // 화분 이미지 실제 높이 계산
    const potW    = this.cardW * 0.5;
    const asset   = getPotAssetForPot(pot);
    const potSize = getPotAssetDrawSize(asset, potW, potW);
    const potBottom = potBaseY + potSize.height + 10; // 화분 하단 + 여백

    // 호버 시 글로우 효과
    if (isHov) {
      noFill(); stroke(180, 80, 200, 40); strokeWeight(30);
      ellipse(cx, potBaseY + potSize.height / 2, 80, 30);
      noStroke();
    }

    // 화분 이름 (화분 아래)
    noStroke();
    fill(isHov ? color(60, 60, 200) : color(50));
    textSize(13); textStyle(BOLD); textAlign(CENTER);
    text(pot.name + (pot.locked ? ' 🔒' : ''), cx, potBottom + 14);

    // 줄기 수 + 에디션
    fill(130); textStyle(NORMAL); textSize(11);
    text(`줄기 ${(pot.stems ?? []).length}개 (${this._editionLabel(pot)})`, cx, potBottom + 30);

    // 호버 시 "클릭하여 열기 →"
    if (isHov) {
      fill(150, 80, 200); textSize(11);
      text('클릭하여 열기 →', cx, potBottom + 46);
    }
  }

  // ── 줄기 경로 포인트 계산 (potDecorateUI와 동일한 로직) ─────────────────────
  _stemPoints(bx, baseY, tx, ty, shapeIdx) {
    switch (shapeIdx) {
      case 1: { // 곡선
        const pts = [];
        const ctrl = { x: bx, y: baseY - dist(bx, baseY, tx, ty) * 0.55 };
        for (let k = 0; k <= 28; k++) {
          const t = k / 28, u = 1 - t;
          pts.push({
            x: u*u*bx + 2*u*t*ctrl.x + t*t*tx,
            y: u*u*baseY + 2*u*t*ctrl.y + t*t*ty,
          });
        }
        return pts;
      }
      case 2: { // 지그재그
        const pts = [], samples = 5 * 12;
        const dx = tx - bx, dy = ty - baseY;
        const len = Math.sqrt(dx*dx + dy*dy) || 1;
        const nx = -dy/len, ny = dx/len;
        for (let k = 0; k <= samples; k++) {
          const t = k / samples;
          const phase = t * 5 - Math.floor(t * 5);
          const wave  = 1 - 4 * Math.abs(phase - 0.5);
          pts.push({ x: lerp(bx,tx,t) + nx*13*wave, y: lerp(baseY,ty,t) + ny*13*wave });
        }
        return pts;
      }
      case 3: { // 물결
        const pts = [], samples = 3 * 12;
        const dx = tx - bx, dy = ty - baseY;
        const len = Math.sqrt(dx*dx + dy*dy) || 1;
        const nx = -dy/len, ny = dx/len;
        for (let k = 0; k <= samples; k++) {
          const t = k / samples;
          pts.push({ x: lerp(bx,tx,t) + nx*12*Math.sin(t*3*TWO_PI), y: lerp(baseY,ty,t) + ny*12*Math.sin(t*3*TWO_PI) });
        }
        return pts;
      }
      default: // 직선
        return [{ x: bx, y: baseY }, { x: tx, y: ty }];
    }
  }

  // ── 줄기 렌더링 ──────────────────────────────────────────────────────────────
  _drawStems(cx, baseY, pot) {
    if (!pot.stems || pot.stems.length === 0) return;

    const defaultAngles  = [340, 0, 20, -20, 350];
    const defaultOffsets = [-20, 0, 20, -10, 10];
    const stemLen        = 130;

    for (let i = 0; i < pot.stems.length; i++) {
      const stem      = pot.stems[i];
      const angleDeg  = stem.angle ?? stem.stemAngle ?? defaultAngles[i % defaultAngles.length];
      const offset    = stem.baseOffset ?? defaultOffsets[i % defaultOffsets.length];
      const shapeIdx  = stem.stemShape ?? 0;
      const bx        = cx + offset * 0.6;
      const angleRad  = radians(angleDeg);
      const tx        = bx + sin(angleRad) * stemLen;
      const ty        = baseY - cos(angleRad) * stemLen;
      const col       = (stem.stemColor !== undefined) ? STEM_COLORS[stem.stemColor] : '#AAAAAA';
      const pts       = this._stemPoints(bx, baseY, tx, ty, shapeIdx);

      // 줄기 선 그리기
      stroke(col); strokeWeight(1.5); noFill();
      beginShape();
      for (const p of pts) vertex(p.x, p.y);
      endShape();

      // 비즈 그리기
      const beads = stem.beads ?? [];
      const count = beads.length > 0 ? beads.length : 4;
      for (let j = 0; j < count; j++) {
        const t   = (j + 1) / (count + 1);
        const idx = constrain(floor(t * (pts.length - 1)), 0, pts.length - 2);
        const bpx = lerp(pts[idx].x, pts[idx+1].x, t * (pts.length-1) - idx);
        const bpy = lerp(pts[idx].y, pts[idx+1].y, t * (pts.length-1) - idx);
        const tangentAngle = atan2(pts[idx+1].y - pts[idx].y, pts[idx+1].x - pts[idx].x);

        const bead  = beads[j];
        const asset = bead?.assetId ? getBeadAtlasEntry(bead.assetId) : null;
        const img   = bead?.beadId  ? beadImages[bead.beadId] : null;
        if (asset) {
          const beadH = 14, beadW = beadH * asset.source.w / asset.source.h;
          drawBeadAtlasLayer(asset, 'hole', bpx, bpy, beadW, beadH, tangentAngle);
          drawBeadAtlasLayer(asset, 'body', bpx, bpy, beadW, beadH, tangentAngle);
        } else if (img) {
          imageMode(CENTER); image(img, bpx, bpy, 14, 14); imageMode(CORNER);
        } else {
          noStroke(); fill(bead?.color ?? color(190, 185, 200));
          ellipse(bpx, bpy, 13 - j * 1.5);
        }
      }
    }
  }

  // ── 화분 이미지 렌더링 ────────────────────────────────────────────────────────
  _drawPotImage(cx, baseY, pot) {
    const potW  = this.cardW * 0.5;
    const potH  = potW;
    const asset = getPotAssetForPot(pot);
    const potSize = getPotAssetDrawSize(asset, potW, potH);

    if (drawPotAsset(asset, asset?.theme, cx, baseY + potSize.height / 2, potW, potH, pot.colorIndex ?? 0)) return;

    fill(POT_COLORS[pot.colorIndex ?? 0]); noStroke();
    drawPotShapeAt(cx, baseY, pot.shapeIndex ?? 0, 0.7);
  }

  // ── 데코 이미지 그리기 헬퍼 ──────────────────────────────────────────────────
  _drawDeco(key, x, y, w, h, rot = 0) {
    const img = this.decoImgs[key];
    if (!img) return;
    push();
    translate(x, y); rotate(rot);
    imageMode(CENTER);
    image(img, 0, 0, w, h);
    pop();
  }

  // ── 전체 draw ─────────────────────────────────────────────────────────────────
  draw() {
    // ── 배경: 초록 그라데이션 (밝은 중앙 → 살짝 어두운 가장자리) ──
    background(220, 232, 210);
    noStroke();
    for (let i = 12; i >= 1; i--) {
      let alpha = map(i, 12, 1, 3, 28);
      fill(240, 248, 230, alpha);
      ellipse(width / 2, height * 0.46, width * 0.9 * (i / 12), height * 0.9 * (i / 12));
    }

    // ── 헤더 ──
    fill(220, 40, 180);
    textStyle(BOLD); textSize(12); textAlign(CENTER);
    text('BEAD  GARDEN', width / 2, 42);

    fill(220, 40, 180);
    textSize(24); textStyle(BOLD); textAlign(CENTER);
    text('오늘은 어떤 비즈 식물을 심어볼까요?', width / 2, 80);

    // ── 우상단 데코 (별) ──
    this._drawDeco('starPink', width - 80,  68, 28, 28,  0.15);
    this._drawDeco('starLine', width - 50,  92, 20, 20, -0.1);

    // ── 좌하단 데코 (잎/꽃) ──
    this._drawDeco('leaf',    62,  height - 175, 22, 22, -0.3);
    this._drawDeco('leafTop', 104, height - 152, 18, 18,  0.2);
    this._drawDeco('leaf',    140, height - 128, 20, 20, -0.1);

    // ── 화분 카드 (박스 없이 떠있는 형태) ──
    this.hoveredPot = null;
    for (let i = 0; i < this.pots.length; i++) {
      const pot      = this.pots[i];
      const x        = this._cardX(i);
      const potBaseY = pot.cardY ?? height * 0.55;

      if (x + this.cardW < 40 || x > width - 40) continue;

      this.drawCard(pot, x);

      // 호버 감지: 줄기 위 ~ 텍스트 아래
      const cx = x + this.cardW / 2;
      if (mouseX > cx - 70 && mouseX < cx + 70 &&
          mouseY > potBaseY - 160 && mouseY < potBaseY + 130) {
        this.hoveredPot = pot;
        cursor(HAND);
      }
    }

    if (!this.hoveredPot && !potSetupUI.isVisible && !potDetailUI.isVisible) cursor(ARROW);

    // 부드러운 스크롤
    this.scrollX = lerp(this.scrollX, this.targetScrollX, 0.12);

    // ── 좌우 스크롤 화살표 ──
    const maxScroll = max(0, this.pots.length * (this.cardW + this.cardGap) - width + 120);
    const arrowY = height / 2 - 26;
    const arrowW = 44, arrowH = 52;

    if (this.targetScrollX > 0) {
      const lx = 48;
      const lHov = isHovered(lx, arrowY, arrowW, arrowH);
      fill(lHov ? color(255,255,255,220) : color(255,255,255,140)); noStroke();
      rect(lx, arrowY, arrowW, arrowH, 8);
      fill(80); textSize(22); textAlign(CENTER, CENTER); textStyle(NORMAL);
      text('‹', lx + arrowW / 2, arrowY + arrowH / 2);
      if (lHov) cursor(HAND);
    }

    if (this.targetScrollX < maxScroll) {
      const rx = width - 92;
      const rHov = isHovered(rx, arrowY, arrowW, arrowH);
      fill(rHov ? color(255,255,255,220) : color(255,255,255,140)); noStroke();
      rect(rx, arrowY, arrowW, arrowH, 8);
      fill(80); textSize(22); textAlign(CENTER, CENTER); textStyle(NORMAL);
      text('›', rx + arrowW / 2, arrowY + arrowH / 2);
      if (rHov) cursor(HAND);
    }

    // 스크롤 점 인디케이터
    if (maxScroll > 0) {
      const dotCount = min(this.pots.length, 12);
      const dotSpacing = 14;
      const dotStartX = width / 2 - (dotCount * dotSpacing) / 2;
      const dotY = height - 108;
      for (let i = 0; i < dotCount; i++) {
        const dotRatio    = i / max(1, dotCount - 1);
        const scrollRatio = this.scrollX / max(1, maxScroll);
        const isActive    = abs(dotRatio - scrollRatio) < (1 / max(1, dotCount - 1)) * 0.6;
        fill(isActive ? color(200, 40, 180) : color(200, 180, 210)); noStroke();
        ellipse(dotStartX + i * dotSpacing, dotY, isActive ? 8 : 6);
      }
    }

    // ── 새 화분 만들기 버튼 ──
    const btnW = 320, btnH = 52;
    const btnX = width / 2 - btnW / 2;
    const btnY = height - 72;
    const btnHov = isHovered(btnX, btnY, btnW, btnH);
    fill(btnHov ? color(200, 0, 200) : color(220, 30, 220)); noStroke();
    rect(btnX, btnY, btnW, btnH, 26);
    fill(255); textSize(16); textStyle(BOLD); textAlign(CENTER, CENTER);
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

    // 화살표 버튼
    const maxScroll  = max(0, this.pots.length * (this.cardW + this.cardGap) - width + 120);
    const arrowY     = height / 2 - 26;
    const arrowW     = 44, arrowH = 52;
    const scrollStep = this.cardW + this.cardGap;

    if (mouseX > 48 && mouseX < 48 + arrowW && mouseY > arrowY && mouseY < arrowY + arrowH) {
      this.targetScrollX = constrain(this.targetScrollX - scrollStep, 0, maxScroll);
      return;
    }
    const rx = width - 92;
    if (mouseX > rx && mouseX < rx + arrowW && mouseY > arrowY && mouseY < arrowY + arrowH) {
      this.targetScrollX = constrain(this.targetScrollX + scrollStep, 0, maxScroll);
      return;
    }

    this.isDragging  = true;
    this.dragStartX  = mouseX;
    this.dragScrollX = this.targetScrollX;
  }

  onMouseDragged() {
    if (!this.isDragging) return;
    const maxScroll = max(0, this.pots.length * (this.cardW + this.cardGap) - width + 120);
    this.targetScrollX = constrain(this.dragScrollX - (mouseX - this.dragStartX), 0, maxScroll);
  }

  onMouseReleased() {
    if (potSetupUI.isVisible || potDetailUI.isVisible) {
      this.isDragging = false; return;
    }
    if (abs(mouseX - this.dragStartX) < 5) {
      for (let i = 0; i < this.pots.length; i++) {
        const pot      = this.pots[i];
        const x        = this._cardX(i);
        const cx       = x + this.cardW / 2;
        const potBaseY = pot.cardY ?? height * 0.55;
        if (mouseX > cx - 70 && mouseX < cx + 70 &&
            mouseY > potBaseY - 160 && mouseY < potBaseY + 130) {
          potSetupUI.hide();
          potDetailUI.show(pot);
        }
      }
    }
    this.isDragging = false;
  }
}
