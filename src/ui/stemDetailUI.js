class StemDetailUI {
  constructor() {
    this.selectedPalettes = []; // 최대 3개 인덱스
    this.currentPot = null; // potDetailUI에서 전달받은 화분 참조

    // 9개 팔레트 데이터
    this.palettes = [
      {
        name: '모노크롬',
        colors: ['#FFFFFF', '#BBBBBB', '#888888', '#555555', '#111111']
      },
      {
        name: '코튼 캔디',
        colors: ['#F9B8C8', '#D4B8F9', '#B8E8F9', '#F9F0B8', '#B8D4F9']
      },
      {
        name: '미스티 로즈',
        colors: ['#C9A89A', '#B89AC9', '#9AAEC9', '#9AC9A8', '#C9BBA8']
      },
      {
        name: '레트로 팝',
        colors: ['#F07060', '#F0C840', '#40C8C0', '#4090C8', '#80B890']
      },
      {
        name: '재패니즈 포스터',
        colors: ['#CC1111', '#FFFFFF', '#1144BB', '#DD8800', '#111111']
      },
      {
        name: '플랜트',
        colors: ['#1A5C2A', '#2A8C3A', '#50B860', '#90D890', '#C0F0A0']
      },
      {
        name: '시트러스',
        colors: ['#FF4422', '#FF8822', '#FFCC22', '#44CC22', '#2244FF']
      },
      {
        name: '비비드',
        colors: ['#FF2288', '#22AAFF', '#FFAA00', '#00CC88', '#FF6600']
      },
      {
        name: '네온',
        colors: ['#FF22AA', '#44FF22', '#FFEE00', '#FF6600', '#00EEFF']
      },
    ];
  }

  // 팔레트 선택/해제 토글
  togglePalette(idx) {
    let pos = this.selectedPalettes.indexOf(idx);
    if (pos !== -1) {
      // 이미 선택됨 → 해제
      this.selectedPalettes.splice(pos, 1);
    } else {
      // 새로 선택 — 최대 3개
      if (this.selectedPalettes.length < 3) {
        this.selectedPalettes.push(idx);
      }
    }
  }

  // 선택된 팔레트의 전체 색상 배열 반환
  getSelectedColors() {
    let colors = [];
    for (let idx of this.selectedPalettes) {
      colors = colors.concat(this.palettes[idx].colors);
    }
    return colors;
  }

  // 팔레트 카드 1개 그리기
  drawPaletteCard(p, x, y, w, h, isSelected) {
    // 카드 배경
    fill(isSelected ? 248 : 252);
    stroke(isSelected ? 40 : 210);
    strokeWeight(isSelected ? 2 : 1);
    rect(x, y, w, h, 8);

    // 체크 표시
    if (isSelected) {
      fill(30); noStroke();
      rect(x + w - 26, y + 8, 18, 18, 4);
      fill(255); textSize(11); textAlign(CENTER, CENTER);
      text('✓', x + w - 17, y + 17);
    }

    // 색상 원들
    let dotSize = 32;
    let dotGap = 8;
    let totalW = p.colors.length * (dotSize + dotGap) - dotGap;
    let startX = x + (w - totalW) / 2;
    for (let i = 0; i < p.colors.length; i++) {
      fill(p.colors[i]);
      stroke(200); strokeWeight(0.5);
      ellipse(startX + i * (dotSize + dotGap) + dotSize / 2, y + h * 0.48, dotSize);
    }

    // 팔레트 이름
    noStroke(); fill(isSelected ? 30 : 120);
    textSize(12);
    textStyle(isSelected ? BOLD : NORMAL);
    textAlign(LEFT);
    text(p.name, x + 12, y + h - 12);

    // 클릭 판정
  }

  onMousePressed() {
    let backX = 20, backY = 14, backW = 80, backH = 32;
    if (mouseX > backX && mouseX < backX + backW &&
      mouseY > backY && mouseY < backY + backH) {
      goTo(GARDEN);
      potDetailUI.show(this.currentPot);
      return;
    }

    let cardW = 220, cardH = 80;
    let colGap = 24, rowGap = 16;
    let gridW = cardW * 3 + colGap * 2;
    let gridX = width / 2 - gridW / 2;
    let gridY = height * 0.29;

    for (let i = 0; i < 9; i++) {
      let col = i % 3;
      let row = floor(i / 3);
      let cx = gridX + col * (cardW + colGap);
      let cy = gridY + row * (cardH + rowGap);
      if (mouseX > cx && mouseX < cx + cardW &&
        mouseY > cy && mouseY < cy + cardH) {
        this.togglePalette(i);
        return;
      }
    }

    let btnW = 400, btnH = 52;
    let btnX = width / 2 - btnW / 2;
    let btnY = height - 80;
    let canStart = this.selectedPalettes.length > 0;
    if (canStart &&
      mouseX > btnX && mouseX < btnX + btnW &&
      mouseY > btnY && mouseY < btnY + btnH) {
      stemBeadCraftUI.setPalette(this.getSelectedColors());
      stemBeadCraftUI.currentPot = this.currentPot; // pot 참조 전달
      goTo(STEM_BEAD_CRAFT);
    }
  }

  draw() {
    background(255);

    // ── 상단 ──
    // 뒤로가기 버튼
    let backHov = isHovered(20, 14, 80, 32);
    fill(backHov ? 235 : 248); stroke(210); strokeWeight(1);
    rect(20, 14, 80, 32, 6);
    fill(60); noStroke(); textSize(13); textStyle(NORMAL); textAlign(CENTER, CENTER);
    text('← 나가기', 60, 30);

    // 페이지 타이틀
    fill(30); textStyle(BOLD); textSize(16); textAlign(CENTER);
    text('비즈 색상 팔레트 선택', width / 2, 30);

    // 안내 텍스트 — LEFT 정렬로 각 토막 이어 붙이기
    textSize(14); noStroke(); fill(30);
    textStyle(NORMAL);
    let prefixW = textWidth('최대 ');
    textStyle(BOLD);
    let boldW = textWidth('3가지');
    textStyle(NORMAL);
    let suffixW = textWidth('의 비즈 색상 팔레트를 선택하세요');
    let lineX = width / 2 - (prefixW + boldW + suffixW) / 2;
    let lineY = height * 0.25;
    textAlign(LEFT);
    textStyle(NORMAL); text('최대 ', lineX, lineY);
    textStyle(BOLD); text('3가지', lineX + prefixW, lineY);
    textStyle(NORMAL); text('의 비즈 색상 팔레트를 선택하세요', lineX + prefixW + boldW, lineY);

    // ── 팔레트 카드 3×3 그리드 ──
    let cardW = 220, cardH = 80;
    let colGap = 24, rowGap = 16;
    let gridW = cardW * 3 + colGap * 2;
    let gridX = width / 2 - gridW / 2;
    let gridY = height * 0.29;

    for (let i = 0; i < 9; i++) {
      let col = i % 3;
      let row = floor(i / 3);
      let cx = gridX + col * (cardW + colGap);
      let cy = gridY + row * (cardH + rowGap);
      this.drawPaletteCard(
        this.palettes[i], cx, cy, cardW, cardH,
        this.selectedPalettes.includes(i)
      );
    }

    // ── 하단 선택 미리보기 ──
    let previewY = height * 0.76;

    // 구분선
    stroke(220); strokeWeight(1);
    line(width / 2 - 200, previewY, width / 2 + 200, previewY);

    // 선택 레이블
    noStroke(); fill(60); textSize(13); textStyle(NORMAL); textAlign(CENTER);
    if (this.selectedPalettes.length === 0) {
      text('선택된 팔레트가 없어요.', width / 2, previewY + 20);
    } else {
      let names = this.selectedPalettes.map(i => this.palettes[i].name).join(', ');
      text(`선택: ${names}`, width / 2, previewY + 20);
    }

    // 색상 미리보기 박스들
    let allColors = this.getSelectedColors();
    if (allColors.length > 0) {
      let dotW = 36, dotH = 36, gap = 4;
      let totalW = allColors.length * (dotW + gap) - gap;

      // 그룹별로 박스 묶어서 표시
      let bx = width / 2 - totalW / 2;
      let by = previewY + 34;
      let ci = 0;
      for (let pi of this.selectedPalettes) {
        let pal = this.palettes[pi];
        // 그룹 배경
        fill(245); stroke(200); strokeWeight(1);
        rect(bx, by - 4, pal.colors.length * (dotW + gap) - gap + 12, dotH + 8, 6);
        // 색상 원
        for (let c of pal.colors) {
          fill(c); stroke(200); strokeWeight(0.5);
          rect(bx + 6, by, dotW, dotH, 4);
          bx += dotW + gap;
          ci++;
        }
        bx += 12; // 그룹 간격
      }
    }

    // ── 줄기 만들기 시작 버튼 ──
    let btnW = 400, btnH = 52;
    let btnX = width / 2 - btnW / 2;
    let btnY = height - 80;
    let canStart = this.selectedPalettes.length > 0;
    let startHov = canStart && isHovered(btnX, btnY, btnW, btnH);

    fill(canStart ? (startHov ? 55 : 30) : 160); noStroke();
    rect(btnX, btnY, btnW, btnH, 26);
    fill(255); textSize(15); textStyle(BOLD); textAlign(CENTER, CENTER);
    text('줄기 만들기 시작 →', btnX + btnW / 2, btnY + btnH / 2);

    if (backHov || startHov) cursor(HAND); else cursor(ARROW);
  }
}
