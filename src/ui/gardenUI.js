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
    this._potCardY     = new Map();

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

    // 배경 이미지
    this.bgImg = null;
    loadImage('assets/garden_bg.png', img => { this.bgImg = img; }, () => {});

  }

  // 카드 x 위치
  _cardX(index) {
    return 60 + index * (this.cardW + this.cardGap) - this.scrollX;
  }

  // 카드 y 위치 — 한 번 정해지면 고정
  _cardY(pot) {
    const id = pot.firestoreId ?? pot.localId;
    if (!this._potCardY.has(id)) {
      const minY = height * 0.38;
      const maxY = height * 0.62;
      this._potCardY.set(id, minY + Math.random() * (maxY - minY));
    }
    return this._potCardY.get(id);
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
    const potBaseY = this._cardY(pot);
    const cx       = x + this.cardW / 2;
    const isHov    = (this.hoveredPot === pot);

    // 화분 이미지 실제 높이 계산
    const potW    = this.cardW * 0.5;
    const asset   = getPotAssetForPot(pot);
    const potSize = getPotAssetDrawSize(asset, potW, potW, true);

    drawPotComposition(pot, x, potBaseY - 180, this.cardW, 280, {
      background: false,
      potMaxWidth: potW,
      potMaxHeight: potW,
      bottomMargin: 0,
      beadHeight: 14,
      stemWeight: 1.5,
    });
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
  _stemPoints(bx, baseY, tx, ty, shapeIdx, stemData = {}) {
    switch (shapeIdx) {
      case 1: { // 곡선
        const pts = [];
        const dx = tx - bx, dy = ty - baseY;
        const len = Math.sqrt(dx*dx + dy*dy);
        if (len === 0) return [{ x: bx, y: baseY }];

        const tangent = { x: dx / len, y: dy / len };
        const normal = { x: -tangent.y, y: tangent.x };
        const depth = constrain(stemData.curveDepth ?? 45, -100, 100) / 100;
        const sharpness = constrain(stemData.curveSharpness ?? 45, 0, 100) / 100;
        const midpoint = {
          x: (bx + tx) / 2 + normal.x * len * depth * 0.5,
          y: (baseY + ty) / 2 + normal.y * len * depth * 0.5,
        };
        const handle = len * 0.24;
        const smoothIn = {
          x: midpoint.x - tangent.x * handle,
          y: midpoint.y - tangent.y * handle,
        };
        const smoothOut = {
          x: midpoint.x + tangent.x * handle,
          y: midpoint.y + tangent.y * handle,
        };
        const controlIn = {
          x: lerp(smoothIn.x, lerp(bx, midpoint.x, 0.55), sharpness),
          y: lerp(smoothIn.y, lerp(baseY, midpoint.y, 0.55), sharpness),
        };
        const controlOut = {
          x: lerp(smoothOut.x, lerp(midpoint.x, tx, 0.45), sharpness),
          y: lerp(smoothOut.y, lerp(midpoint.y, ty, 0.45), sharpness),
        };
        const quadratic = (start, control, end, t) => {
          const u = 1 - t;
          return {
            x: u*u*start.x + 2*u*t*control.x + t*t*end.x,
            y: u*u*start.y + 2*u*t*control.y + t*t*end.y,
          };
        };
        const start = { x: bx, y: baseY };
        const end = { x: tx, y: ty };
        for (let k = 0; k <= 14; k++) {
          pts.push(quadratic(start, controlIn, midpoint, k / 14));
        }
        for (let k = 1; k <= 14; k++) {
          pts.push(quadratic(midpoint, controlOut, end, k / 14));
        }
        return pts;
      }
      case 2: { // 지그재그
        const pts = [], samples = 5 * 12;
        const dx = tx - bx, dy = ty - baseY;
        const len = Math.sqrt(dx*dx + dy*dy) || 1;
        const nx = -dy/len, ny = dx/len;
        const amplitude = stemData.waveWidth ?? 13;
        for (let k = 0; k <= samples; k++) {
          const t = k / samples;
          const wave = (2 / Math.PI) * Math.asin(Math.sin(t * 5 * TWO_PI));
          pts.push({ x: lerp(bx,tx,t) + nx*amplitude*wave, y: lerp(baseY,ty,t) + ny*amplitude*wave });
        }
        return pts;
      }
      case 3: { // 물결
        const pts = [], samples = 3 * 12;
        const dx = tx - bx, dy = ty - baseY;
        const len = Math.sqrt(dx*dx + dy*dy) || 1;
        const nx = -dy/len, ny = dx/len;
        const amplitude = stemData.waveWidth ?? 12;
        for (let k = 0; k <= samples; k++) {
          const t = k / samples;
          pts.push({ x: lerp(bx,tx,t) + nx*amplitude*Math.sin(t*3*TWO_PI), y: lerp(baseY,ty,t) + ny*amplitude*Math.sin(t*3*TWO_PI) });
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
      const col       = getStemColor(pot, stem.stemColor);
      const fitted    = fitStemPathLength(
        bx,
        baseY,
        angleRad,
        stemLen,
        (geometry) => this._stemPoints(
          geometry.baseX,
          geometry.baseY,
          geometry.tipX,
          geometry.tipY,
          shapeIdx,
          stem
        )
      );
      const pts       = fitted.points;

      // 줄기 선 그리기
      stroke(col); strokeWeight(1.5); noFill();
      beginShape();
      for (const p of pts) vertex(p.x, p.y);
      endShape();

      // 비즈 그리기
      const beads = stem.beads ?? [];
      const count = beads.length > 0 ? beads.length : 4;
      const placements = beadPathPlacements(pts, beads, count, 14);
      for (let j = 0; j < count; j++) {
        const placement = placements[j];
        const bead  = beads[j];
        const asset = bead?.assetId ? getBeadAtlasEntry(bead.assetId) : null;
        const img   = bead?.beadId  ? beadImages[bead.beadId] : null;
        if (asset) {
          drawBeadAtlas(
            asset,
            placement.x,
            placement.y,
            placement.width,
            placement.height,
            placement.angle
          );
        } else if (img) {
          push();
          translate(placement.x, placement.y);
          rotate(placement.angle);
          imageMode(CENTER);
          image(img, 0, 0, placement.width, placement.height);
          pop();
        } else {
          noStroke(); fill(bead?.color ?? color(190, 185, 200));
          ellipse(placement.x, placement.y, placement.height);
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
    // ── 배경 이미지 ──
    if (this.bgImg) {
      imageMode(CORNER);
      image(this.bgImg, 0, 0, width, height);
    } else {
      background(220, 232, 210);
    }

    // ── 헤더 ──
    // BEAD GARDEN — Dot Matrix 폰트
    textFont('Dot Matrix');
    fill(220, 40, 180);
    textStyle(NORMAL); textSize(22); textAlign(CENTER);
    text('BEAD  GARDEN', width / 2, 46);
    textFont('DungGeunMo');

    fill(220, 40, 180);
    textSize(24); textStyle(BOLD); textAlign(CENTER);
    text('오늘은 어떤 비즈 식물을 심어볼까요?', width / 2, 82);

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
      const potBaseY = this._cardY(pot);

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

  drawDatabaseStatus() {
    const isOnline = typeof getDatabaseMode === 'function' &&
      getDatabaseMode() === DATABASE_SERVER;
    const label = isOnline ? '온라인' : '오프라인';
    const markerX = 16;
    const markerY = 16;
    const markerW = 78;
    const markerH = 28;

    push();
    fill(255, 255, 255, 220);
    stroke(isOnline ? color(70, 165, 95) : color(145));
    strokeWeight(1);
    rect(markerX, markerY, markerW, markerH, 14);

    noStroke();
    fill(isOnline ? color(70, 165, 95) : color(145));
    circle(markerX + 15, markerY + markerH / 2, 8);

    fill(70);
    textSize(12);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text(label, markerX + 48, markerY + markerH / 2);
    pop();
  }

  onMousePressed() {
    const btnW = 320, btnH = 52;
    const btnX = width / 2 - btnW / 2;
    const btnY = height - 72;
    if (mouseX > btnX && mouseX < btnX + btnW &&
        mouseY > btnY && mouseY < btnY + btnH) {
      potSetupUI.show();
      goTo(GAME_STATE.NEW_POT);
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

  onMouseWheel(e) {
    if (potSetupUI.isVisible || potDetailUI.isVisible) return;
    const dx = e.deltaX ?? 0;
    const dy = e.delta ?? e.deltaY ?? 0;
    const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
    const maxScroll = max(0, this.pots.length * (this.cardW + this.cardGap) - width + 120);
    this.targetScrollX = constrain(this.targetScrollX + delta * 0.8, 0, maxScroll);
    return false;
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
        const potBaseY = this._cardY(pot);
        if (mouseX > cx - 70 && mouseX < cx + 70 &&
            mouseY > potBaseY - 160 && mouseY < potBaseY + 130) {
          potSetupUI.hide();
          potDetailUI.show(pot);
          goTo(GAME_STATE.POT_PREVIEW);
          break;
        }
      }
    }
    this.isDragging = false;
  }
}
