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
    // 배경색
    const bgColors = ['#EDE8F5','#D6EAF8','#D5F5E3','#FEF9E7','#F9E4F0','#F5F5F5','#CCCCCC','#111111'];
    const bgHex = bgColors[this.pot.bgIndex ?? 0] ?? '#F5F5F5';
    fill(bgHex); noStroke();
    rect(x, y, w, h, 8);

    const cx    = x + w / 2;
    const baseY = y + h * 0.72;
    const hasStem = this.pot.stems && this.pot.stems.length > 0;

    if (!hasStem) {
      fill(160); textSize(13); textStyle(NORMAL); textAlign(CENTER, CENTER);
      text('아직 비즈 식물의 줄기가 없어요.\n새로운 비즈 줄기를 만들어서 식물을 심어주세요.',
        cx, y + h * 0.42);
    } else {
      const STEM_COLORS = ['#222222','#FFFFFF','#1A7A1A','#66FF44'];
      const defaultAngles  = [340, 0, 20, -20, 350];
      const defaultOffsets = [-20, 0, 20, -10, 10];
      const stemLen = min(w, h) * 0.52;

      for (let i = 0; i < this.pot.stems.length; i++) {
        const stem     = this.pot.stems[i];
        const angleDeg = stem.angle ?? defaultAngles[i % defaultAngles.length];
        const offset   = stem.baseOffset ?? defaultOffsets[i % defaultOffsets.length];
        const bx       = cx + offset * 0.6;
        const angle    = radians(angleDeg);
        const tx       = bx + sin(angle) * stemLen;
        const ty       = baseY - cos(angle) * stemLen;
        const col      = STEM_COLORS[stem.stemColor] ?? '#AAAAAA';

        stroke(col); strokeWeight(1.5);
        line(bx, baseY, tx, ty);

        // 비즈 — beadColors 배열 있으면 색상 사용, 없으면 회색
        const beadColors = stem.beadColors ?? [];
        const count      = max(beadColors.length, 5);
        noStroke();
        for (let j = 0; j < count; j++) {
          const t   = (j + 1) / (count + 1);
          const bpx = lerp(bx, tx, t);
          const bpy = lerp(baseY, ty, t);
          const sz  = 13 - j * 1.2;
          fill(beadColors[j] ?? '#C8C4CC');
          ellipse(bpx, bpy, max(sz, 6));
        }
      }
    }

    // 화분 이미지
    const assetName = this.pot.potAssetName;
    const img = assetName ? potAssetImages[assetName] : null;
    if (img) {
      imageMode(CENTER);
      image(img, cx, baseY + 20, w * 0.38, w * 0.38);
      imageMode(CORNER);
    } else {
      // 폴백: 단순 사각형
      fill(200, 195, 210); noStroke();
      rect(cx - 32, baseY, 64, 52, 4);
    }
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
        // stemDetailUI 없이 바로 비즈 게임 진입 — 에디션별 팔레트 자동 적용
        const concept      = this.pot.concept ?? '스타 에디션';
        const palette      = CONCEPT_PALETTES[concept] ?? CONCEPT_PALETTES['스타 에디션'];
        stemBeadCraftUI.currentPot = this.pot;
        stemBeadCraftUI.setPalette(palette);
        this.hide();
        goTo(STEM_BEAD_CRAFT);
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

  // gardenUI.pots에서 최신 pot 데이터를 찾아 반환 (없으면 로컬 캐시 사용)
  _freshPot() {
    if (!this.pot) return null;
    const id = this.pot.firestoreId;
    if (id && typeof gardenUI !== 'undefined' && gardenUI.pots) {
      const found = gardenUI.pots.find(p => p.firestoreId === id);
      if (found) return found;
    }
    return this.pot;
  }

  draw() {
    if (!this.isVisible || !this.pot) return;

    // 항상 Firestore 최신 데이터 사용 (꾸미기 저장 직후 바로 반영)
    const livePot = this._freshPot();
    if (livePot !== this.pot) this.pot = livePot; // 참조 갱신

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