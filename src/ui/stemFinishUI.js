class StemFinishUI {
  constructor() {
    this.isVisible  = false;
    this.beadCount  = 0;
    this.stemColors = []; // 완성된 줄기 색상 (미리보기용)
  }

  show() {
    this.isVisible = true;

    // beadGame에서 완성된 줄기 데이터 읽기
    if (typeof beadGame !== 'undefined') {
      this.beadCount  = beadGame.beadCount ?? 0;
      this.stemColors = beadGame.getBeadColors?.() ?? [];
    }

    // pot 참조: stemBeadCraftUI.currentPot 우선 (potDetailUI.pot 폴백)
    const pot = stemBeadCraftUI.currentPot
      ?? (typeof potDetailUI !== 'undefined' ? potDetailUI.pot : null);

    // 완성된 줄기 데이터 구성
    const stemData = {
      beadCount:    this.beadCount,
      beadColors:   this.stemColors,        // 꿴 비즈 색상 배열
      paletteColors: stemBeadCraftUI.paletteColors ?? [],
      stemColor:    potDecorateUI.selectedStemColor ?? 0,
      stemShape:    potDecorateUI.selectedStemShape ?? 0,
      angle:        potDecorateUI.stemAngle         ?? 0,
      baseOffset:   0,
    };

    // 로컬 pot 객체에 반영
    if (pot) {
      pot.stems = pot.stems ?? [];
      pot.stems.push(stemData);

      // Firestore에 줄기 추가
      if (pot.firestoreId) {
        addStemToPot(pot.firestoreId, stemData)
          .then(() => console.log('[Firestore] 줄기 저장 완료'))
          .catch(err => console.error('[Firestore] 줄기 저장 오류:', err));
      } else {
        console.warn('[stemFinishUI] firestoreId 없음 — Firestore 저장 생략');
      }
    } else {
      console.warn('[stemFinishUI] pot 참조를 찾을 수 없음');
    }
  }

  hide() {
    this.isVisible = false;
  }

  // 완성된 줄기 미리보기
  drawStemPreview(x, y, w, h) {
    fill(248); stroke(220); strokeWeight(1);
    rect(x, y, w, h, 8);

    // 철사 (대각선)
    let sx = x + w * 0.3, sy = y + h * 0.25;
    let ex = x + w * 0.85, ey = y + h * 0.88;
    stroke(100); strokeWeight(2);
    line(sx, sy, ex, ey);

    // 비즈들 (팔레트 색상 or 임시 회색)
    let count = max(this.beadCount, 8); // 최소 8개 표시
    noStroke();
    for (let i = 0; i < count; i++) {
      let t  = i / (count - 1);
      let bx = lerp(sx, ex, t);
      let by = lerp(sy, ey, t);
      let sz = map(t, 0, 1, 18, 10); // 위쪽 비즈가 더 큼
      let c  = this.stemColors.length > 0
        ? this.stemColors[i % this.stemColors.length]
        : lerpColor(color(80), color(200), t);
      fill(c);
      ellipse(bx, by, sz);
    }

    // 플레이스홀더 텍스트
    fill(100, 100, 200);
    textSize(12); textStyle(NORMAL); textAlign(CENTER, CENTER);
    text('(완성된 줄기 미리보기)', x + w / 2, y + h * 0.88);
  }

  draw() {
    if (!this.isVisible) return;

    // 배경 dim
    fill(0, 0, 0, 140); noStroke();
    rect(0, 0, width, height);

    // 팝업 박스
    let popW = 490, popH = 460;
    let popX = width  / 2 - popW / 2;
    let popY = height / 2 - popH / 2;
    fill(255); stroke(220); strokeWeight(1);
    rect(popX, popY, popW, popH, 14);

    // ── 돌아가기 버튼 (좌측 상단) ──
    fill(248); stroke(210); strokeWeight(1);
    rect(popX + 16, popY + 16, 90, 32, 6);
    fill(60); noStroke(); textSize(13); textStyle(NORMAL);
    textAlign(CENTER, CENTER);
    text('← 돌아가기', popX + 61, popY + 32);
    if (isClicked(popX + 16, popY + 16, 90, 32)) {
      this.hide();
      goTo(STEM_BEAD_CRAFT); // 게임 재개
    }

    // ── 타이틀 ──
    fill(30); noStroke();
    textStyle(BOLD); textSize(22); textAlign(CENTER);
    text('줄기 완성!', width / 2, popY + 76);

    // 서브타이틀
    fill(100); textStyle(NORMAL); textSize(13);
    text(`비즈 ${this.beadCount}개짜리 줄기가 완성되어 화분에 꽂혔어요.`,
      width / 2, popY + 100);

    // ── 줄기 미리보기 ──
    let preX = popX + 20, preY = popY + 118;
    let preW = popW - 40, preH = 140;
    this.drawStemPreview(preX, preY, preW, preH);

    // ── 내 화분에서 새로운 줄기 만들기 버튼 ──
    let btn1X = popX + 20, btn1Y = popY + 278;
    let btn1W = popW - 40, btn1H = 52;
    fill(30); noStroke();
    rect(btn1X, btn1Y, btn1W, btn1H, 26);
    fill(255); textSize(15); textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text('내 화분에서 새로운 줄기 만들기', btn1X + btn1W / 2, btn1Y + btn1H / 2);
    if (isClicked(btn1X, btn1Y, btn1W, btn1H)) {
      this.hide();
      stemDetailUI.selectedPalettes = []; // 팔레트 초기화
      goTo(STEM_DETAIL); // POT_DETAIL 거쳐서 새 줄기
    }

    // ── 비즈 가든으로 가기 버튼 ──
    let btn2X = popX + 20, btn2Y = popY + 342;
    let btn2W = popW - 40, btn2H = 52;
    fill(100); noStroke();
    rect(btn2X, btn2Y, btn2W, btn2H, 26);
    fill(255); textSize(15); textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text('비즈 가든으로 가기', btn2X + btn2W / 2, btn2Y + btn2H / 2);
    if (isClicked(btn2X, btn2Y, btn2W, btn2H)) {
      this.hide();
      goTo(GARDEN);
    }
  }
}