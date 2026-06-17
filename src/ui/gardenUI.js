class GardenUI {
  constructor() {
    this.pots = [];
    this.scrollX = 0;
    this.targetScrollX = 0;
    this.cardW = 200;
    this.cardGap = 80;
    this.hoveredPot = null;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragScrollX = 0;
    this._potCardY = new Map();
    this.sortMode = 'recent';
    this.sortDropdownOpen = false;
    this.resetSortOnNextGardenEntry = false;
    this.suppressNextReleaseClick = false;
    this.focusPotId = null;
    this.arrowButtonW = 46;
    this.arrowButtonH = 100;
    this.arrowHitW = 120;
    this.arrowHitH = 160;
    this.arrowCenterXRatio = 0.044;
    this.arrowCenterYRatio = 0.551;
    this.leftButtonImg = null;
    this.rightButtonImg = null;
    this.sortOptions = [
      { key: 'recent', label: '최신순' },
      { key: 'likes', label: '좋아요순' },
      { key: 'stems', label: '줄기 많은 순' },
    ];

    // 데코 이미지
    this.decoImgs = {};
    const decoList = {
      starPink: 'assets/beads/star/star-1.png',
      starLine: 'assets/beads/star/starLine.png',
      leaf: 'assets/beads/plant/leafbottom.png',
      leafTop: 'assets/beads/plant/leaftop.png',
    };
    for (const [key, path] of Object.entries(decoList)) {
      loadImage(path, img => { this.decoImgs[key] = img; }, () => { });
    }

    // 배경 이미지
    this.bgImg = null;
    loadImage('assets/backgrounds/garden_bg.png', img => { this.bgImg = img; }, () => { });
    loadImage('assets/ui/tutorial/left_button.png', img => { this.leftButtonImg = img; }, () => { });
    loadImage('assets/ui/tutorial/right_button.png', img => { this.rightButtonImg = img; }, () => { });

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

  // 최신 순(createdAt 내림차순)으로 정렬된 화분 목록
  _sortedPots() {
    return [...this.pots].sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? new Date(a.createdAt ?? 0).getTime();
      const tb = b.createdAt?.toMillis?.() ?? new Date(b.createdAt ?? 0).getTime();
      if (this.sortMode === 'likes') {
        const likes = this._likeCount(b) - this._likeCount(a);
        if (likes !== 0) return likes;
      } else if (this.sortMode === 'stems') {
        const stems = (b.stems ?? []).length - (a.stems ?? []).length;
        if (stems !== 0) return stems;
      }
      return tb - ta;
    });
  }

  resetSort() {
    this.sortMode = 'recent';
    this.sortDropdownOpen = false;
    this.resetSortOnNextGardenEntry = false;
    this.targetScrollX = 0;
    this.scrollX = 0;
  }

  resetSortWhenGardenReopens() {
    this.resetSortOnNextGardenEntry = true;
  }

  focusPot(pot) {
    const id = this._potId(pot);
    if (!id) return false;

    this.focusPotId = id;
    return this._applyFocusedPotScroll();
  }

  enterFromStemFinish(pot) {
    this.resetSort();
    this.focusPot(pot);
  }

  enterFromState(previousState) {
    if (previousState === GAME_STATE.TUTORIAL ||
      previousState === GAME_STATE.STEM_FINISH ||
      this.resetSortOnNextGardenEntry) {
      this.resetSort();
    } else {
      this.sortDropdownOpen = false;
    }
  }

  _potId(pot) {
    return pot?.firestoreId ?? pot?.localId ?? pot?.id ?? null;
  }

  _maxScrollForPotCount(count = this._sortedPots().length) {
    return max(0, count * (this.cardW + this.cardGap) - width + 120);
  }

  _applyFocusedPotScroll() {
    if (!this.focusPotId) return false;

    const sortedPots = this._sortedPots();
    const index = sortedPots.findIndex(pot => this._potId(pot) === this.focusPotId);
    if (index < 0) return false;

    const cardCenterAtZeroScroll = 60 + index * (this.cardW + this.cardGap) + this.cardW / 2;
    const target = constrain(
      cardCenterAtZeroScroll - width / 2,
      0,
      this._maxScrollForPotCount(sortedPots.length)
    );
    this.targetScrollX = target;
    this.scrollX = target;
    this.focusPotId = null;
    return true;
  }

  _editionLabel(pot) {
    const c = pot.concept ?? '';
    if (c.includes('식물')) return '식물 에디션';
    if (c.includes('스타')) return '스타 에디션';
    if (c.includes('바다')) return '바다 에디션';
    return c;
  }

  _likeCount(pot) {
    return typeof getPotLikeCount === 'function'
      ? getPotLikeCount(pot)
      : Math.max(0, Number(pot?.likeCount ?? 0) || 0);
  }

  _drawLikeCount(cx, y, pot) {
    noStroke();
    fill(255, 98, 110);
    textStyle(BOLD);
    textSize(12);
    textAlign(CENTER, CENTER);
    text(`♥  ${this._likeCount(pot)}`, cx, y);
  }

  // ── 화분 카드 (박스 없이 떠 있는 형태) ──────────────────────────────────────
  drawCard(pot, x) {
    const potBaseY = this._cardY(pot);
    const cx = x + this.cardW / 2;
    const isHov = (this.hoveredPot === pot) && (gameState === GAME_STATE.GARDEN_LIST);

    const potW = this.cardW * 0.5;
    const asset = getPotAssetForPot(pot);
    const potSize = getPotAssetDrawSize(asset, potW, potW, true);
    const compY = potBaseY - 180, compH = 280;

    drawPotComposition(pot, x, compY, this.cardW, compH, {
      background: false,
      potMaxWidth: potW,
      potMaxHeight: potW,
      bottomMargin: 0,
      beadHeight: 14,
      stemWeight: 1.5,
    });
    // 텍스트는 항상 composition 박스 아래에 배치 (화분 모양에 무관하게 겹치지 않음)
    const potBottom = compY + compH + 14;

    // 호버 시 글로우 효과
    /*
    if (isHov) {
      noFill(); stroke(180, 80, 200, 40); strokeWeight(30);
      ellipse(cx, potBaseY + potSize.height / 2, 80, 30);
      noStroke();
    }
      */

    // 화분 이름 (화분 아래)
    noStroke();
    fill(isHov ? color(60, 60, 200) : color(50));
    textSize(13); textStyle(BOLD); textAlign(CENTER, BASELINE);
    text(pot.name + (pot.locked ? ' 🔒' : ''), cx, potBottom + 14);

    // 좋아요 수
    this._drawLikeCount(cx, potBottom + 32, pot);

    // 줄기 수 + 에디션
    fill(130); textStyle(NORMAL); textSize(11);
    textAlign(CENTER, BASELINE);
    text(`줄기 ${(pot.stems ?? []).length}개 (${this._editionLabel(pot)})`, cx, potBottom + 52);

    // 호버 시 "클릭하여 열기→"
    if (isHov) {
      textSize(11);
      const openY = potBottom + 68;
      const openLabel = '클릭하여 열기→';
      textAlign(CENTER, BASELINE);
      text(openLabel, cx, openY);
      const underlineW = textWidth(openLabel);
      stroke(130); strokeWeight(2);
      line(cx - underlineW / 2, openY + 6, cx + underlineW / 2, openY + 6);
    }
  }

  // ── 줄기 경로 포인트 계산 (potDecorateUI와 동일한 로직) ─────────────────────
  _stemPoints(bx, baseY, tx, ty, shapeIdx, stemData = {}) {
    switch (shapeIdx) {
      case 1: { // 곡선
        const pts = [];
        const dx = tx - bx, dy = ty - baseY;
        const len = Math.sqrt(dx * dx + dy * dy);
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
            x: u * u * start.x + 2 * u * t * control.x + t * t * end.x,
            y: u * u * start.y + 2 * u * t * control.y + t * t * end.y,
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
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / len, ny = dx / len;
        const amplitude = stemData.waveWidth ?? 13;
        for (let k = 0; k <= samples; k++) {
          const t = k / samples;
          const wave = (2 / Math.PI) * Math.asin(Math.sin(t * 5 * TWO_PI));
          pts.push({ x: lerp(bx, tx, t) + nx * amplitude * wave, y: lerp(baseY, ty, t) + ny * amplitude * wave });
        }
        return pts;
      }
      case 3: { // 물결
        const pts = [], samples = 3 * 12;
        const dx = tx - bx, dy = ty - baseY;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / len, ny = dx / len;
        const amplitude = stemData.waveWidth ?? 12;
        for (let k = 0; k <= samples; k++) {
          const t = k / samples;
          pts.push({ x: lerp(bx, tx, t) + nx * amplitude * Math.sin(t * 3 * TWO_PI), y: lerp(baseY, ty, t) + ny * amplitude * Math.sin(t * 3 * TWO_PI) });
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

    const defaultAngles = [340, 0, 20, -20, 350];
    const defaultOffsets = [-20, 0, 20, -10, 10];
    const stemLen = 130;

    for (let i = 0; i < pot.stems.length; i++) {
      const stem = pot.stems[i];
      const angleDeg = stem.angle ?? stem.stemAngle ?? defaultAngles[i % defaultAngles.length];
      const offset = stem.baseOffset ?? defaultOffsets[i % defaultOffsets.length];
      const shapeIdx = stem.stemShape ?? 0;
      const bx = cx + offset * 0.6;
      const angleRad = radians(angleDeg);
      const col = getStemColor(pot, stem.stemColor);
      const fitted = fitStemPathLength(
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
      const pts = fitted.points;

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
        const bead = beads[j];
        const asset = bead?.assetId ? getBeadAtlasEntry(bead.assetId) : null;
        const img = bead?.beadId ? beadImages[bead.beadId] : null;
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
    const potW = this.cardW * 0.5;
    const potH = potW;
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

  _scrollArrowCenter(direction) {
    const x = width * this.arrowCenterXRatio;
    return {
      x: direction < 0 ? x : width - x,
      y: height * this.arrowCenterYRatio,
    };
  }

  _scrollArrowHitRect(direction) {
    const center = this._scrollArrowCenter(direction);
    return {
      x: center.x - this.arrowHitW / 2,
      y: center.y - this.arrowHitH / 2,
      w: this.arrowHitW,
      h: this.arrowHitH,
    };
  }

  _drawScrollArrow(img, fallbackLabel, centerX, centerY) {
    if (img) {
      imageMode(CENTER);
      image(img, centerX, centerY, this.arrowButtonW, this.arrowButtonH);
      imageMode(CORNER);
      return;
    }

    fill(220, 40, 180); noStroke();
    textSize(80); textAlign(CENTER, CENTER); textStyle(NORMAL);
    text(fallbackLabel, centerX, centerY);
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
    fill(220, 40, 180);
    textStyle(NORMAL); textSize(22); textAlign(CENTER);
    text('BEAD  GARDEN', width / 2, 46);

    fill(220, 40, 180);
    textSize(24); textStyle(BOLD); textAlign(CENTER);
    text('오늘은 어떤 비즈 식물을 심어볼까요?', width / 2, 82);

    // ── 우상단 데코 (별) ──
    this._drawDeco('starPink', width - 80, 68, 28, 28, 0.15);
    this._drawDeco('starLine', width - 50, 92, 20, 20, -0.1);

    // ── 좌하단 데코 (잎/꽃) ──
    this._drawDeco('leaf', 62, height - 175, 22, 22, -0.3);
    this._drawDeco('leafTop', 104, height - 152, 18, 18, 0.2);
    this._drawDeco('leaf', 140, height - 128, 20, 20, -0.1);

    // ── 화분 카드 (박스 없이 떠있는 형태) ──
    this.hoveredPot = null;
    const sortedPots = this._sortedPots();
    this._applyFocusedPotScroll();
    for (let i = 0; i < sortedPots.length; i++) {
      const pot = sortedPots[i];
      const x = this._cardX(i);
      const potBaseY = this._cardY(pot);

      if (x + this.cardW < 40 || x > width - 40) continue;

      // 호버 감지: 줄기 위 ~ 텍스트 아래
      const cx = x + this.cardW / 2;
      if (mouseX > cx - 70 && mouseX < cx + 70 &&
        mouseY > potBaseY - 160 && mouseY < potBaseY + 152) {
        this.hoveredPot = pot;
        cursor(HAND);
      }

      this.drawCard(pot, x);
    }

    if (!this.hoveredPot && !potSetupUI.isVisible && !potDetailUI.isVisible) cursor(ARROW);

    // 부드러운 스크롤
    this.scrollX = lerp(this.scrollX, this.targetScrollX, 0.12);

    // ── 좌우 스크롤 화살표 ──
    const maxScroll = max(0, this.pots.length * (this.cardW + this.cardGap) - width + 120);
    const leftArrow = this._scrollArrowHitRect(-1);
    const rightArrow = this._scrollArrowHitRect(1);
    const leftCenter = this._scrollArrowCenter(-1);
    const rightCenter = this._scrollArrowCenter(1);

    if (this.targetScrollX > 0) {
      const lHov = isHovered(leftArrow.x, leftArrow.y, leftArrow.w, leftArrow.h);
      this._drawScrollArrow(this.leftButtonImg, '‹', leftCenter.x, leftCenter.y);
      if (lHov) cursor(HAND);
    }

    if (this.targetScrollX < maxScroll) {
      const rHov = isHovered(rightArrow.x, rightArrow.y, rightArrow.w, rightArrow.h);
      this._drawScrollArrow(this.rightButtonImg, '›', rightCenter.x, rightCenter.y);
      if (rHov) cursor(HAND);
    }

    // "스크롤하여 다른 화분을 둘러보세요!" 텍스트
    textAlign(CENTER, BASELINE); noStroke(); fill(166, 170, 162); textSize(12);
    text("화면을 스크롤하여 비즈 가든을 둘러보세요.", width / 2, height - 120);

    // 스크롤 점 인디케이터
    if (maxScroll > 0) {
      const dotCount = min(this.pots.length, 12);
      const dotSpacing = 14;
      const dotStartX = width / 2 - (dotCount * dotSpacing) / 2;
      const dotY = height - 108;
      for (let i = 0; i < dotCount; i++) {
        const dotRatio = i / max(1, dotCount - 1);
        const scrollRatio = this.scrollX / max(1, maxScroll);
        const isActive = abs(dotRatio - scrollRatio) < (1 / max(1, dotCount - 1)) * 0.6;
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
    const marker = this._databaseStatusRect();

    push();
    fill(255, 255, 255, 220);
    stroke(isOnline ? color(70, 165, 95) : color(145));
    strokeWeight(1);
    rect(marker.x, marker.y, marker.w, marker.h, 14);

    noStroke();
    fill(isOnline ? color(70, 165, 95) : color(145));
    circle(marker.x + 15, marker.y + marker.h / 2, 8);

    fill(70);
    textSize(12);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text(label, marker.x + 48, marker.y + marker.h / 2);

    this._drawTutorialButton();
    this._drawSortDropdown();
    pop();
  }

  _databaseStatusRect() {
    return { x: 16, y: 16, w: 78, h: 28 };
  }

  _tutorialButtonRect() {
    return { x: 16, y: 52, w: this._topControlWidth(), h: 30 };
  }

  _sortButtonRect() {
    return { x: 16, y: 90, w: this._topControlWidth(), h: 30 };
  }

  _topControlWidth() {
    return 126;
  }

  _sortOptionRect(index) {
    const button = this._sortButtonRect();
    return {
      x: button.x,
      y: button.y + button.h + index * 28,
      w: button.w,
      h: 28,
    };
  }

  _selectedSortLabel() {
    return this.sortOptions.find(option => option.key === this.sortMode)?.label ?? '최신순';
  }

  _drawTutorialButton() {
    const button = this._tutorialButtonRect();
    const hovering = isHovered(button.x, button.y, button.w, button.h);

    fill(hovering ? 235 : 248);
    stroke(210);
    strokeWeight(1);
    rect(button.x, button.y, button.w, button.h, 5);

    fill(85);
    noStroke();
    textSize(13);
    textStyle(NORMAL);
    textAlign(CENTER, CENTER);
    text('튜토리얼', button.x + button.w / 2, button.y + button.h / 2);

    if (hovering && this._controlsCanHover()) cursor(HAND);
  }

  _drawSortDropdown() {
    const button = this._sortButtonRect();
    const hovering = isHovered(button.x, button.y, button.w, button.h);

    fill(hovering || this.sortDropdownOpen ? 235 : 248);
    stroke(210);
    strokeWeight(1);
    rect(button.x, button.y, button.w, button.h, 5);

    fill(85);
    noStroke();
    textSize(12);
    textStyle(NORMAL);
    textAlign(CENTER, CENTER);
    text(`${this._selectedSortLabel()} ▾`, button.x + button.w / 2, button.y + button.h / 2);

    if (hovering && this._controlsCanHover()) cursor(HAND);

    if (!this.sortDropdownOpen) return;

    for (let i = 0; i < this.sortOptions.length; i++) {
      const option = this.sortOptions[i];
      const rectValue = this._sortOptionRect(i);
      const optionHover = isHovered(rectValue.x, rectValue.y, rectValue.w, rectValue.h);
      const selected = option.key === this.sortMode;

      fill(selected ? color(255, 232, 255) : optionHover ? 245 : 255);
      stroke(selected ? color(220, 40, 180) : 220);
      strokeWeight(1);
      rect(rectValue.x, rectValue.y, rectValue.w, rectValue.h, i === this.sortOptions.length - 1 ? 5 : 0);

      fill(selected ? color(220, 40, 180) : 70);
      noStroke();
      textSize(12);
      textStyle(selected ? BOLD : NORMAL);
      textAlign(CENTER, CENTER);
      text(option.label, rectValue.x + rectValue.w / 2, rectValue.y + rectValue.h / 2);

      if (optionHover && this._controlsCanHover()) cursor(HAND);
    }
  }

  _controlsCanHover() {
    return !potSetupUI.isVisible && !potDetailUI.isVisible;
  }

  _pointInRect(rectValue) {
    return mouseX >= rectValue.x && mouseX <= rectValue.x + rectValue.w &&
      mouseY >= rectValue.y && mouseY <= rectValue.y + rectValue.h;
  }

  isTopControlPoint(x, y) {
    if (potSetupUI.isVisible || potDetailUI.isVisible) return false;
    const contains = rectValue =>
      x >= rectValue.x && x <= rectValue.x + rectValue.w &&
      y >= rectValue.y && y <= rectValue.y + rectValue.h;

    if (contains(this._tutorialButtonRect()) || contains(this._sortButtonRect())) {
      return true;
    }
    if (!this.sortDropdownOpen) return false;

    return this.sortOptions.some((_, index) => contains(this._sortOptionRect(index)));
  }

  _handleTopControlClick() {
    if (potSetupUI.isVisible || potDetailUI.isVisible) return false;

    const tutorialButton = this._tutorialButtonRect();
    if (this._pointInRect(tutorialButton)) {
      this.sortDropdownOpen = false;
      prevState = GAME_STATE.GARDEN_LIST;
      goTo(GAME_STATE.TUTORIAL);
      return true;
    }

    const sortButton = this._sortButtonRect();
    if (this._pointInRect(sortButton)) {
      this.sortDropdownOpen = !this.sortDropdownOpen;
      this.suppressNextReleaseClick = true;
      return true;
    }

    if (!this.sortDropdownOpen) return false;

    for (let i = 0; i < this.sortOptions.length; i++) {
      const option = this.sortOptions[i];
      if (!this._pointInRect(this._sortOptionRect(i))) continue;
      this.sortMode = option.key;
      this.sortDropdownOpen = false;
      this.targetScrollX = 0;
      this.scrollX = 0;
      this.suppressNextReleaseClick = true;
      return true;
    }

    this.sortDropdownOpen = false;
    this.suppressNextReleaseClick = true;
    return true;
  }

  onMousePressed() {
    if (this._handleTopControlClick()) {
      this.isDragging = false;
      return;
    }

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
    const maxScroll = max(0, this._sortedPots().length * (this.cardW + this.cardGap) - width + 120);
    const scrollStep = width - 120; // 페이지 단위 이동
    const leftArrow = this._scrollArrowHitRect(-1);
    const rightArrow = this._scrollArrowHitRect(1);

    if (this.targetScrollX > 0 &&
      mouseX > leftArrow.x && mouseX < leftArrow.x + leftArrow.w &&
      mouseY > leftArrow.y && mouseY < leftArrow.y + leftArrow.h) {
      this.targetScrollX = constrain(this.targetScrollX - scrollStep, 0, maxScroll);
      return;
    }
    if (this.targetScrollX < maxScroll &&
      mouseX > rightArrow.x && mouseX < rightArrow.x + rightArrow.w &&
      mouseY > rightArrow.y && mouseY < rightArrow.y + rightArrow.h) {
      this.targetScrollX = constrain(this.targetScrollX + scrollStep, 0, maxScroll);
      return;
    }

    this.isDragging = true;
    this.dragStartX = mouseX;
    this.dragScrollX = this.targetScrollX;
  }

  onMouseDragged() {
    if (!this.isDragging) return;
    const maxScroll = max(0, this._sortedPots().length * (this.cardW + this.cardGap) - width + 120);
    this.targetScrollX = constrain(this.dragScrollX - (mouseX - this.dragStartX), 0, maxScroll);
  }

  onMouseWheel(e) {
    if (potSetupUI.isVisible || potDetailUI.isVisible) return;
    const dx = e.deltaX ?? 0;
    const dy = e.delta ?? e.deltaY ?? 0;
    const delta = dx + dy; // 가로·세로 스크롤 모두 가로 이동에 반영
    const maxScroll = max(0, this._sortedPots().length * (this.cardW + this.cardGap) - width + 120);
    this.targetScrollX = constrain(this.targetScrollX + delta * 0.8, 0, maxScroll);
    return false;
  }

  onMouseReleased() {
    if (potSetupUI.isVisible || potDetailUI.isVisible) {
      this.isDragging = false; return;
    }
    if (this.suppressNextReleaseClick) {
      this.suppressNextReleaseClick = false;
      this.isDragging = false;
      return;
    }
    if (abs(mouseX - this.dragStartX) < 5) {
      const sortedPots = this._sortedPots();
      for (let i = 0; i < sortedPots.length; i++) {
        const pot = sortedPots[i];
        const x = this._cardX(i);
        const cx = x + this.cardW / 2;
        const potBaseY = this._cardY(pot);
        if (mouseX > cx - 70 && mouseX < cx + 70 &&
          mouseY > potBaseY - 160 && mouseY < potBaseY + 152) {
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
