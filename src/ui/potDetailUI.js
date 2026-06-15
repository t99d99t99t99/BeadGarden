class PotDetailUI {
  constructor() {
    this.isVisible = false;
    this.pot = null;
  }

  show(pot) {
    this.isVisible = true;
    this.pot = pot ?? {
      name: '내 첫 번째 화분',
      desc: '',
      createdAt: '2025.05.15',
      stems: [],
      locked: false,
      colorIndex: 0,
      bgIndex: 0,
      shapeIndex: 0,
    };
  }

  hide() {
    this.isVisible = false;
    this.pot = null;
  }

  drawPotPreview(x, y, w, h) {
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.roundRect(x, y, w, h, 10);
    drawingContext.clip();

    drawPotComposition(this.pot, x, y, w, h, { bottomMargin: 20 });

    if (!(this.pot.stems && this.pot.stems.length > 0)) {
      fill(180); textSize(13); textStyle(NORMAL); textAlign(CENTER);
      text('아직 줄기가 없어요.\n새 비즈 줄기를 만들어 심어주세요.', x + w / 2, y + h * 0.5);
    }

    drawingContext.restore();
  }

  #layout() {
    const popW = 780, popH = 560;
    const popX = width / 2 - popW / 2;
    const popY = height / 2 - popH / 2;
    const preX = popX + 16, preY = popY + 16;
    const preW = 368, preH = popH - 32;
    const panX = popX + 400, panY = popY + 16;
    const panW = popW - 400 - 16; // 364
    return { popW, popH, popX, popY, preX, preY, preW, preH, panX, panY, panW };
  }

  onMousePressed() {
    if (!this.isVisible || !this.pot) return;

    const { popW, popH, popX, popY, preX, preY, preW, preH, panX, panY, panW } = this.#layout();
    const hasStem = (this.pot.stems ?? []).length > 0;
    const canEdit = !this.pot.locked;

    if (mouseX < popX || mouseX > popX + popW ||
      mouseY < popY || mouseY > popY + popH) {
      this.hide();
      goTo(GAME_STATE.GARDEN_LIST);
      return;
    }

    // X 버튼
    if (mouseX > popX + popW - 38 && mouseX < popX + popW - 12 &&
      mouseY > popY + 10 && mouseY < popY + 36) {
      this.hide();
      goTo(GAME_STATE.GARDEN_LIST);
      return;
    }

    if (!canEdit) return;

    // 새 비즈 줄기 만들기 버튼
    const btn1Y = panY + 290;
    if (mouseX > panX && mouseX < panX + panW &&
      mouseY > btn1Y && mouseY < btn1Y + 48) {
      const pot = this.pot;
      this.hide();
      startStemCraftForPot(pot);
      return;
    }

    // 화분·줄기 꾸미기 버튼
    const btn2Y = panY + 350;
    if (mouseX > panX && mouseX < panX + panW &&
      mouseY > btn2Y && mouseY < btn2Y + 48) {
      const pot = this.pot;
      this.hide();
      potDecorateUI.show('edit', pot);
      goTo(GAME_STATE.POT_DECORATE);
      return;
    }

    // 화분 잠그기 버튼
    if (hasStem) {
      const lockBtnW = 100, lockBtnH = 36;
      const lockBtnX = panX + panW - lockBtnW;
      const lockBtnY = panY + 430;
      if (mouseX > lockBtnX && mouseX < lockBtnX + lockBtnW &&
        mouseY > lockBtnY && mouseY < lockBtnY + lockBtnH) {
        const pot = this.pot;
        this.hide();
        potLockUI.show(pot);
        goTo(GAME_STATE.POT_LOCK);
        return;
      }
    }
  }

  draw() {
    if (!this.isVisible || !this.pot) return;

    const { popW, popH, popX, popY, preX, preY, preW, preH, panX, panY, panW } = this.#layout();
    const hasStem = (this.pot.stems ?? []).length > 0;
    const isLocked = this.pot.locked;
    const canEdit = !isLocked;

    // 배경 dim
    fill(0, 0, 0, 100); noStroke();
    rect(0, 0, width, height);

    // 팝업 박스
    fill(255); stroke(220); strokeWeight(1);
    rect(popX, popY, popW, popH, 14);

    // X 버튼
    const xBtnX = popX + popW - 38, xBtnY = popY + 10, xBtnSize = 26;
    const xHov = isHovered(xBtnX, xBtnY, xBtnSize, xBtnSize);
    fill(xHov ? 210 : 235); noStroke();
    ellipse(xBtnX + xBtnSize / 2, xBtnY + xBtnSize / 2, xBtnSize);
    fill(80); textSize(15); textAlign(CENTER, CENTER);
    text('×', xBtnX + xBtnSize / 2, xBtnY + xBtnSize / 2);

    // ── 왼쪽: 화분 미리보기 ──
    this.drawPotPreview(preX, preY, preW, preH);

    // 세로 구분선
    stroke(220); strokeWeight(1);
    line(popX + 392, popY + 16, popX + 392, popY + popH - 16);

    // ── 오른쪽: 정보 패널 ──

    // 화분 이름
    noStroke(); fill(30);
    textStyle(BOLD); textSize(17); textAlign(LEFT);
    text(this.pot.name, panX, panY + 28);

    // 구분선
    stroke(220); strokeWeight(1);
    line(panX, panY + 42, panX + panW, panY + 42);

    // 정보 테이블
    const infoY = panY + 66;
    const labelX = panX;
    const valueX = panX + 72;

    // 왼쪽 열: 심은날짜 / 줄기 / 디자인
    noStroke();
    fill(140); textSize(12); textStyle(NORMAL); textAlign(LEFT);
    text('심은 날짜', labelX, infoY);
    text('줄기', labelX, infoY + 26);
    text('디자인', labelX, infoY + 52);

    fill(40); textSize(12);
    text(formatDate(this.pot.createdAt ?? ''), valueX, infoY);
    text(`${(this.pot.stems ?? []).length}개`, valueX, infoY + 26);
    text(this.pot.concept ?? '식물 에디션', valueX, infoY + 52);

    // 오른쪽 열: 화분 이미지 다운로드 + 회색 QR 박스
    const qrSize = 78;
    const qrX = panX + panW - qrSize - 5, qrY = infoY - 10;
    fill(140); textSize(11); textAlign(CENTER);
    text('화분 이미지 다운로드', qrX + qrSize / 2, qrY - 6);
    fill(210); noStroke();
    rect(qrX, qrY, qrSize, qrSize, 6);

    // ── 버튼 영역 ──
    if (canEdit) {
      // 새 비즈 줄기 만들기
      const btn1Y = panY + 290;
      const btn1Hov = isHovered(panX, btn1Y, panW, 48);
      fill(btn1Hov ? color(180, 0, 180) : color(255, 0, 255)); noStroke();
      rect(panX, btn1Y, panW, 48, 24);
      fill(255); textSize(14); textStyle(BOLD);
      textAlign(CENTER, CENTER);
      text('+ 새 비즈 줄기 만들기', panX + panW / 2, btn1Y + 24);

      // 화분·줄기 꾸미기
      const btn2Y = panY + 350;
      const btn2Hov = isHovered(panX, btn2Y, panW, 48);
      fill(btn2Hov ? 185 : 200); noStroke();
      rect(panX, btn2Y, panW, 48, 24);
      fill(255); textSize(14); textStyle(NORMAL);
      textAlign(CENTER, CENTER);
      text('화분·줄기 꾸미기', panX + panW / 2, btn2Y + 24);

      // 화분 잠금 섹션
      const lockSectionY = panY + 420;
      stroke(220); strokeWeight(1);
      line(panX, lockSectionY - 8, panX + panW, lockSectionY - 8);
      noStroke(); fill(40); textSize(13); textStyle(BOLD); textAlign(LEFT);
      text('화분 잠금', panX, lockSectionY + 12);
      fill(140); textSize(11); textStyle(NORMAL);
      text('잠금 시 화분에 더 이상 줄기를 추가하거나', panX, lockSectionY + 30);
      text('꾸밀 수 없어요.', panX, lockSectionY + 46);

      const lockBtnW = 100, lockBtnH = 36;
      const lockBtnX = panX + panW - lockBtnW;
      const lockBtnY = lockSectionY + 14;
      const lockHov = hasStem && isHovered(lockBtnX, lockBtnY, lockBtnW, lockBtnH);
      fill(hasStem ? (lockHov ? 40 : 20) : 185); noStroke();
      rect(lockBtnX, lockBtnY, lockBtnW, lockBtnH, 18);
      fill(255); textSize(12); textStyle(NORMAL);
      textAlign(CENTER, CENTER);
      text('화분 잠그기', lockBtnX + lockBtnW / 2, lockBtnY + lockBtnH / 2);

      // 커서
      const anyHov = btn1Hov || btn2Hov || xHov ||
        (hasStem && isHovered(lockBtnX, lockBtnY, lockBtnW, lockBtnH));
      if (anyHov) cursor(HAND); else cursor(ARROW);
    } else {
      // 잠금됨 표시
      const lockSectionY = panY + 420;
      stroke(220); strokeWeight(1);
      line(panX, lockSectionY - 8, panX + panW, lockSectionY - 8);
      noStroke(); fill(40); textSize(13); textStyle(BOLD); textAlign(LEFT);
      text('화분 잠금', panX, lockSectionY + 12);

      const lockBtnW = 100, lockBtnH = 36;
      const lockBtnX = panX + panW - lockBtnW;
      fill(245); stroke(210); strokeWeight(1);
      rect(lockBtnX, lockSectionY + 4, lockBtnW, lockBtnH, 18);
      fill(130); noStroke(); textSize(12);
      textAlign(CENTER, CENTER);
      text('🔒 잠금됨', lockBtnX + lockBtnW / 2, lockSectionY + 4 + lockBtnH / 2);

      if (xHov) cursor(HAND); else cursor(ARROW);
    }
  }
}
