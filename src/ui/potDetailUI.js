class PotDetailUI {
  constructor() {
    this.isVisible = false;
    this.pot       = null;
  }

  show(pot) {
    this.isVisible = true;
    this.pot = pot ?? {
      name:       '내 첫 번째 화분',
      desc:       '화분의 한 줄 설명이 적힙니다.',
      createdAt:  '2025.05.15',
      stems:      [],
      locked:     false,
      colorIndex: 0,
      bgIndex:    0,
      shapeIndex: 0,
    };
  }

  hide() {
    this.isVisible = false;
    this.pot = null;
  }

  drawPotPreview(x, y, w, h) {
    let bgCol  = BG_COLORS[this.pot.bgIndex    ?? 0];
    let potCol = POT_COLORS[this.pot.colorIndex ?? 0];

    fill(bgCol); noStroke();
    rect(x, y, w, h, 8);

    let cx      = x + w / 2;
    let baseY   = y + h * 0.72;
    let hasStem = this.pot.stems && this.pot.stems.length > 0;

    if (!hasStem) {
      fill(180); textSize(13); textStyle(NORMAL); textAlign(CENTER);
      text('아직 비즈 식물의 줄기가 없어요.\n새로운 비즈 줄기를 만들어서 식물을 심어주세요.',
        cx, y + h * 0.44);
    } else {
      let angles = [-0.4, -0.15, 0.1, 0.35, 0.55];
      let lens   = [150, 170, 160, 145, 130];
      for (let i = 0; i < this.pot.stems.length; i++) {
        let stem  = this.pot.stems[i];
        let angle = angles[i % angles.length];
        let len   = lens[i % lens.length];
        let tx    = cx + sin(angle) * len;
        let ty    = baseY - cos(angle) * len;
        let col   = (stem.stemColor !== undefined)
                    ? STEM_COLORS[stem.stemColor] : '#AAAAAA';
        stroke(col); strokeWeight(2);
        line(cx, baseY, tx, ty);
        let beads = stem.beads ?? [];
        let beadCount = beads.length || 5;
        for (let j = 0; j < beadCount; j++) {
          let t = (j + 1) / (beadCount + 1);
          let bx = lerp(cx, tx, t);
          let by = lerp(baseY, ty, t);
          let bead = beads[j];
          if (bead?.assetId) {
            let asset = getBeadAtlasEntry(bead.assetId);
            if (asset) {
              let previewH = 14;
              drawBeadAtlasLayer(asset, 'hole', bx, by, previewH * asset.source.w / asset.source.h, previewH);
              drawBeadAtlasLayer(asset, 'body', bx, by, previewH * asset.source.w / asset.source.h, previewH);
              continue;
            }
          }
          noStroke();
          fill(bead?.color ?? 200);
          ellipse(bx, by, 14 - Math.min(j, 4) * 1.5);
        }
      }
    }

    fill(potCol); noStroke();
    drawPotShapeAt(cx, baseY - 10, this.pot.shapeIndex ?? 0, 1.0);
  }

  onMousePressed() {
    if (!this.isVisible || !this.pot) return;

    let popW     = 600;
    let hasStem  = this.pot.stems && this.pot.stems.length > 0;
    let isLocked = this.pot.locked;
    let canEdit  = (this.pot.createdBy === myDeviceId) && !isLocked;
    let popH     = canEdit ? (hasStem ? 660 : 560) : 560;
    let popX     = width  / 2 - popW / 2;
    let popY     = height / 2 - popH / 2;
    let imgX     = popX + 18, imgY = popY + 100;
    let imgW     = popW - 36, imgH = 340;
    let btnY     = imgY + imgH + 16;

    // X 버튼
    if (mouseX > popX + popW - 40 && mouseX < popX + popW - 10 &&
        mouseY > popY + 8 && mouseY < popY + 38) {
      this.hide();
      goTo(GARDEN);
      return;
    }

    if (canEdit) {
      // 화분 꾸미기 버튼
      let decorW = 110, decorH = 36;
      let decorX = imgX + imgW - decorW - 8;
      let decorBtnY = imgY + 12;
      if (mouseX > decorX && mouseX < decorX + decorW &&
          mouseY > decorBtnY && mouseY < decorBtnY + decorH) {
        this.hide();
        potDecorateUI.show('edit', this.pot);
        goTo(POT_DECORATE);
        return;
      }

      // 새 비즈 줄기 만들기 버튼
      if (mouseX > popX + 18 && mouseX < popX + 18 + popW - 36 &&
          mouseY > btnY && mouseY < btnY + 48) {
        let pot = this.pot;
        this.hide();
        startStemCraftForPot(pot);
        return;
      }

      // 화분 잠그기 버튼 (줄기 있을 때만)
      if (hasStem) {
        let lockY    = btnY + 64;
        let lockBtnW = 110, lockBtnH = 36;
        let lockBtnX = popX + popW - lockBtnW - 18;
        if (mouseX > lockBtnX && mouseX < lockBtnX + lockBtnW &&
            mouseY > lockY && mouseY < lockY + lockBtnH) {
          this.hide();
          potLockUI.show(this.pot);
          goTo(POT_LOCK);
          return;
        }
      }
    }
  }

  draw() {
    if (!this.isVisible || !this.pot) return;

    let popW     = 600;
    let hasStem  = this.pot.stems && this.pot.stems.length > 0;
    let isLocked = this.pot.locked;
    let canEdit  = (this.pot.createdBy === myDeviceId) && !isLocked;
    let popH     = canEdit ? (hasStem ? 660 : 560) : 560;
    let popX     = width  / 2 - popW / 2;
    let popY     = height / 2 - popH / 2;

    // 배경 dim
    fill(0, 0, 0, 100); noStroke();
    rect(0, 0, width, height);

    // 팝업 박스
    fill(255); stroke(220); strokeWeight(1);
    rect(popX, popY, popW, popH, 14);

    // X 버튼
    let xBtnX = popX + popW - 40, xBtnY = popY + 8, xBtnSize = 28;
    let xHovDraw = isHovered(xBtnX, xBtnY, xBtnSize, xBtnSize);
    fill(xHovDraw ? 210 : 235); noStroke();
    ellipse(xBtnX + xBtnSize / 2, xBtnY + xBtnSize / 2, xBtnSize);
    fill(80); textSize(16); textAlign(CENTER, CENTER);
    text('×', xBtnX + xBtnSize / 2, xBtnY + xBtnSize / 2);

    // 타이틀
    fill(30); noStroke();
    textStyle(BOLD); textSize(20); textAlign(CENTER);
    text(this.pot.name, width / 2, popY + 42);

    // 날짜
    fill(140); textStyle(NORMAL); textSize(12);
    text(`${isLocked ? '심은' : '만든'} 날짜: ${formatDate(this.pot.createdAt)}`,
      width / 2, popY + 62);

    // 설명
    fill(100); textSize(13);
    text(this.pot.desc, width / 2, popY + 82);

    // 화분 이미지 박스
    let imgX = popX + 18, imgY = popY + 100;
    let imgW = popW - 36, imgH = 340;
    this.drawPotPreview(imgX, imgY, imgW, imgH);

    // QR 코드 (줄기 있거나 잠금됐을 때)
    if (hasStem || isLocked) {
      fill(30); noStroke();
      let qx = imgX + 14, qy = imgY + 12, qs = 8;
      let qr = [
        [1,1,1,0,1,1,1],
        [1,0,1,0,1,0,1],
        [1,1,1,0,1,1,1],
        [0,0,0,0,0,0,0],
        [1,1,1,0,1,0,1],
        [1,0,0,0,1,1,1],
        [1,0,1,0,0,0,1],
      ];
      for (let r = 0; r < qr.length; r++) {
        for (let c = 0; c < qr[r].length; c++) {
          if (qr[r][c]) rect(qx + c * qs, qy + r * qs, qs - 1, qs - 1);
        }
      }
      fill(60); textSize(12); textAlign(LEFT); textStyle(NORMAL);
      text('QR 코드를 스캔하여', qx + 68, qy + 18);
      text('비즈 화분 이미지를 저장하세요.', qx + 68, qy + 34);
    }

    let btnY = imgY + imgH + 16;

    let _hoveredBtn = false;

    if (canEdit) {
      // 화분 꾸미기 버튼
      let decorW = 110, decorH = 36;
      let decorX = imgX + imgW - decorW - 8;
      let decorBtnY = imgY + 12;
      let decorHov = isHovered(decorX, decorBtnY, decorW, decorH);
      fill(decorHov ? 230 : 255); stroke(200); strokeWeight(1);
      rect(decorX, decorBtnY, decorW, decorH, 18);
      fill(40); noStroke(); textSize(13); textStyle(NORMAL);
      textAlign(CENTER, CENTER);
      text('화분 꾸미기', decorX + decorW / 2, decorBtnY + decorH / 2);
      if (decorHov) _hoveredBtn = true;

      // 새 비즈 줄기 만들기 버튼
      let stemBtnHov = isHovered(popX + 18, btnY, popW - 36, 48);
      fill(stemBtnHov ? 55 : 30); noStroke();
      rect(popX + 18, btnY, popW - 36, 48, 24);
      fill(255); textSize(15); textStyle(BOLD);
      textAlign(CENTER, CENTER);
      text('+ 새 비즈 줄기 만들기', width / 2, btnY + 24);
      if (stemBtnHov) _hoveredBtn = true;

      // 화분 잠금 영역 (줄기 있을 때만)
      if (hasStem) {
        let lockY = btnY + 64;
        fill(40); textSize(14); textStyle(NORMAL); textAlign(LEFT);
        text('화분 잠금', popX + 18, lockY + 12);
        fill(140); textSize(12);
        text('잠금 시 화분에 더 이상 줄기를 추가하거나 꾸밀 수 없어요.',
          popX + 18, lockY + 30);

        let lockBtnW = 110, lockBtnH = 36;
        let lockBtnX = popX + popW - lockBtnW - 18;
        let lockHov = isHovered(lockBtnX, lockY, lockBtnW, lockBtnH);
        fill(lockHov ? 230 : 255); stroke(200); strokeWeight(1);
        rect(lockBtnX, lockY, lockBtnW, lockBtnH, 18);
        fill(40); noStroke(); textSize(13); textStyle(NORMAL);
        textAlign(CENTER, CENTER);
        text('화분 잠그기', lockBtnX + lockBtnW / 2, lockY + lockBtnH / 2);
        if (lockHov) _hoveredBtn = true;
      }

    } else {
      // 잠금됨 표시
      let lockY    = btnY + 8;
      let lockBtnW = 110, lockBtnH = 36;
      let lockBtnX = popX + popW - lockBtnW - 18;
      fill(40); textSize(14); textStyle(NORMAL); textAlign(LEFT);
      text('화분 잠금', popX + 18, lockY + 12);
      fill(248); stroke(200); strokeWeight(1);
      rect(lockBtnX, lockY, lockBtnW, lockBtnH, 18);
      fill(100); noStroke(); textSize(13);
      textAlign(CENTER, CENTER);
      text('🔒 잠금됨', lockBtnX + lockBtnW / 2, lockY + lockBtnH / 2);
    }

    if (xHovDraw) _hoveredBtn = true;

    if (_hoveredBtn) cursor(HAND); else cursor(ARROW);
  }
}
