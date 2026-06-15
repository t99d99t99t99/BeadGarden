class StemFinishUI {
  constructor() {
    this.isVisible = false;
    this.beadCount = 0;
    this.beads = [];
    this.currentPot = null;
    this.stemData = null;
    this.stemIndex = 0;
    this.savePromise = Promise.resolve();
    this.isLeaving = false;
  }

  show() {
    if (this.isVisible) return;
    this.isVisible = true;
    this.isLeaving = false;

    if (typeof beadGame !== 'undefined') {
      this.beadCount = beadGame.beadCount ?? 0;
      this.beads = beadGame.getPiercedBeadData?.() ?? [];
    }

    const pot = stemBeadCraftUI.currentPot
      ?? (typeof potDetailUI !== 'undefined' ? potDetailUI.pot : null);
    const stemIndex = pot?.stems?.length ?? 0;

    const rawAngle = Math.floor(Math.random() * 90) - 45;
    const savedAngle = potDecorateUI.stemAngle ?? (rawAngle < 0 ? rawAngle + 360 : rawAngle);

    const existingOffsets = (pot?.stems ?? []).map(s => s.baseOffset ?? 0);
    let savedOffset = 0;
    const MIN_GAP = 25;
    for (let attempt = 0; attempt < 30; attempt++) {
      const candidate = Math.floor(Math.random() * 121) - 60;
      if (existingOffsets.every(o => Math.abs(o - candidate) >= MIN_GAP)) {
        savedOffset = candidate;
        break;
      }
    }

    const stemData = {
      beadCount: this.beadCount,
      beads: this.beads,
      theme: normalizePotTheme(potDetailUI?.pot),
      beadAtlasVersion: BEAD_ATLAS_VERSION,
      paletteColors: stemBeadCraftUI.paletteColors ?? [],
      stemColor: potDecorateUI.selectedStemColor ?? 0,
      stemShape: potDecorateUI.selectedStemShape ?? 0,
      angle: savedAngle,
      baseOffset: savedOffset,
    };
    this.currentPot = pot;
    this.stemData = stemData;
    this.stemIndex = stemIndex;

    if (pot?.firestoreId) {
      this.savePromise = addStemToPot(pot.firestoreId, stemData)
        .then(() => console.log('[Firestore] 줄기 저장 완료:', stemIndex + 1, '번째 줄기'))
        .catch(err => console.error('[Firestore] 줄기 저장 오류:', err));
    } else {
      this.savePromise = Promise.resolve();
    }
  }

  hide() {
    this.isVisible = false;
  }

  // 화분 + 이전 줄기(실루엣) + 새 줄기(컬러) 미리보기
  drawPreview(x, y, w, h) {
    const pot = this.currentPot;
    const newStemData = this.stemData;
    const prevStems = pot?.stems ?? [];

    // 배경
    fill(BG_COLORS[pot?.bgIndex ?? 0]); noStroke();
    rect(x, y, w, h, 8);

    const layout = createPotRenderLayout(
      { ...pot, stems: [...prevStems, newStemData].filter(Boolean) },
      x, y, w, h
    );

    // 이전 줄기 — 회색 실루엣
    const prevRendered = buildPotRenderStems({ ...pot, stems: prevStems }, layout);
    for (const stem of prevRendered) {
      // 줄기 선
      stroke(195); strokeWeight(3); noFill();
      drawPotRenderPath(stem.displayPoints);
      // 비즈 실루엣 (회색 원)
      const beads = stem.data.beads ?? [];
      const count = beads.length || stem.data.beadCount || 0;
      for (let i = 0; i < count; i++) {
        const p = stem.beadPlacements[i];
        if (!p) continue;
        fill(195, 195, 195, 180); noStroke();
        ellipse(p.x, p.y, p.height * 1.1);
      }
    }

    // 화분 에셋
    if (!drawPotAsset(
      layout.asset,
      layout.asset?.theme,
      layout.potDrawX,
      layout.potTopY + layout.potSize.height / 2,
      layout.potMaxWidth,
      layout.potMaxHeight,
      pot?.colorIndex ?? 0,
      layout.preserveAtlasScale
    )) {
      fill(POT_COLORS[pot?.colorIndex ?? 0]); noStroke();
      drawPotShapeAt(layout.potDrawX, layout.potTopY, pot?.shapeIndex ?? 0, w / 400);
    }

    // 새 줄기 — 컬러 + 비즈
    if (newStemData) {
      const allRendered = buildPotRenderStems(
        { ...pot, stems: [...prevStems, newStemData] },
        layout
      );
      const newStem = allRendered[prevStems.length];
      if (newStem) {
        stroke(getStemColor(pot, newStemData.stemColor ?? 0));
        strokeWeight(2); noFill();
        drawPotRenderPath(newStem.displayPoints);
        drawPotRenderBeads(newStem);
      }
    }
  }

  draw() {
    if (!this.isVisible) return;

    // 배경 dim
    fill(0, 0, 0, 140); noStroke();
    rect(0, 0, width, height);

    // 팝업 박스
    let popW = 450, popH = 510;
    let popX = width / 2 - popW / 2;
    let popY = height / 2 - popH / 2;
    fill(255); stroke(220); strokeWeight(1);
    rect(popX, popY, popW, popH, 14);

    // 타이틀
    fill(30); noStroke();
    textStyle(BOLD); textSize(22); textAlign(CENTER);
    text('줄기 완성!', width / 2, popY + 46);

    // 서브타이틀
    fill(100); textStyle(NORMAL); textSize(13);
    text(`비즈 ${this.beadCount}개짜리 줄기가 완성되어 화분에 꽂혔어요.`,
      width / 2, popY + 70);

    // 화분 미리보기
    let preX = popX + 20, preY = popY + 88;
    let preW = popW - 40, preH = 310;
    this.drawPreview(preX, preY, preW, preH);

    // 돌아가기 버튼 (좌측)
    let btn1X = popX + 20, btn1Y = popY + 416;
    let btn1W = 138, btn1H = 52;
    let btn1Hov = isHovered(btn1X, btn1Y, btn1W, btn1H);
    fill(btn1Hov ? 155 : 175); noStroke();
    rect(btn1X, btn1Y, btn1W, btn1H, 26);
    fill(255); textSize(14); textStyle(NORMAL);
    textAlign(CENTER, CENTER);
    text('← 돌아가기', btn1X + btn1W / 2, btn1Y + btn1H / 2);
    if (!this.isLeaving && isClicked(btn1X, btn1Y, btn1W, btn1H)) {
      this.hide();
      goTo(GAME_STATE.STEM_BEAD_CRAFT);
    }

    // 줄기 조정하기 버튼 (우측)
    let btn2X = popX + 172, btn2Y = popY + 416;
    let btn2W = 258, btn2H = 52;
    let btn2Hov = isHovered(btn2X, btn2Y, btn2W, btn2H);
    fill(btn2Hov ? color(180, 0, 180) : color(255, 0, 255)); noStroke();
    rect(btn2X, btn2Y, btn2W, btn2H, 26);
    fill(255); textSize(14); textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text('줄기 조정하기', btn2X + btn2W / 2, btn2Y + btn2H / 2);
    if (!this.isLeaving && isClicked(btn2X, btn2Y, btn2W, btn2H)) {
      this.#goToDecorate();
    }

    if (btn1Hov || btn2Hov) cursor(HAND); else cursor(ARROW);
  }

  async #goToDecorate() {
    this.isLeaving = true;
    await this.savePromise;
    this.#applyStemToCurrentPot();
    this.hide();
    potDecorateUI.show('edit', this.currentPot);
    potDecorateUI.selectStem(this.stemIndex);
    goTo(GAME_STATE.POT_DECORATE);
  }

  #applyStemToCurrentPot() {
    if (!this.currentPot || !this.stemData) return;
    let stems = this.currentPot.stems ?? [];
    if (stems.length === this.stemIndex) {
      this.currentPot.stems = [...stems, this.stemData];
    }
  }
}
