class PotSetupUI {
  constructor() {
    this.isVisible       = false;
    this.selectedConcept = 1; // 0: 식물, 1: 스타(기본), 2: 바다
    this.nameInput       = null;
    this.descInput       = null;

    this.concepts = [
      { label: '식물 에디션', color: color(220, 240, 215), accent: color(80, 160, 80)  },
      { label: '스타 에디션', color: color(250, 240, 210), accent: color(200, 160, 40) },
      { label: '바다 에디션', color: color(210, 232, 248), accent: color(60, 140, 200) },
    ];

    // 컨셉 프리뷰 이미지 (없으면 컬러 폴백)
    this.conceptImgs = [null, null, null];
    const paths = [
      'assets/concept_plant.png',
      'assets/concept_star.png',
      'assets/concept_ocean.png',
    ];
    for (let i = 0; i < 3; i++) {
      loadImage(paths[i], img => { this.conceptImgs[i] = img; }, () => {});
    }
  }

  // ── 팝업 기본 크기/위치 ─────────────────────────────────────────────────────
  _layout() {
    const popW = 540, popH = 570;
    return {
      popW, popH,
      popX: width  / 2 - popW / 2,
      popY: height / 2 - popH / 2,
    };
  }

  show() {
    const { popX, popY } = this._layout();
    if (this.nameInput) { this.nameInput.remove(); this.nameInput = null; }
    if (this.descInput) { this.descInput.remove(); this.descInput = null; }
    this.isVisible       = true;
    this.selectedConcept = 1;

    const inputStyle = (el, yOffset) => {
      el.style('position',      'absolute');
      el.style('width',         '480px');
      el.style('padding',       '11px 14px');
      el.style('font-size',     '14px');
      el.style('font-family',   'sans-serif');
      el.style('border',        '1px solid #ddd');
      el.style('border-radius', '8px');
      el.style('outline',       'none');
      el.style('box-sizing',    'border-box');
      el.style('background',    '#ffffff');
      el.style('color',         '#222');
      el.style('z-index',       '10');
      el.position(popX + 28, popY + yOffset);
    };

    // 화분 이름 input
    this.nameInput = createInput('');
    this.nameInput.attribute('placeholder', '예) 쑥쑥이');
    this.nameInput.attribute('maxlength',   '20');
    inputStyle(this.nameInput, 112);

    // 한 줄 설명 input
    this.descInput = createInput('');
    this.descInput.attribute('placeholder', '예) 오늘 처음 만들어준 화분');
    this.descInput.attribute('maxlength',   '40');
    inputStyle(this.descInput, 196);
    this.descInput.style('background', '#fafafa');
  }

  hide() {
    this.isVisible = false;
    if (this.nameInput) { this.nameInput.remove(); this.nameInput = null; }
    if (this.descInput) { this.descInput.remove(); this.descInput = null; }
  }

  getData() {
    return {
      name:    this.nameInput ? this.nameInput.value().trim() : '',
      desc:    this.descInput ? this.descInput.value().trim() : '',
      concept: this.concepts[this.selectedConcept].label,
    };
  }

  onMousePressed() {
    if (!this.isVisible) return;
    const { popW, popH, popX, popY } = this._layout();

    // 컨셉 카드 클릭
    const { cardW, cardH, cardY, startX, cardGap } = this._cardLayout(popX, popY, popW);
    for (let i = 0; i < 3; i++) {
      const cx = startX + i * (cardW + cardGap);
      if (mouseX > cx && mouseX < cx + cardW &&
          mouseY > cardY && mouseY < cardY + cardH) {
        this.selectedConcept = i;
        return;
      }
    }

    // 취소 버튼
    const cancelX = popX + 28, cancelY = popY + popH - 70;
    if (mouseX > cancelX && mouseX < cancelX + 148 &&
        mouseY > cancelY && mouseY < cancelY + 48) {
      this.hide();
      goTo(GARDEN);
      return;
    }

    // 확정 버튼
    const data = this.getData();
    const confirmX = popX + 196, confirmY = popY + popH - 70;
    if (data.name.length > 0 &&
        mouseX > confirmX && mouseX < confirmX + 316 &&
        mouseY > confirmY && mouseY < confirmY + 48) {
      const cardY = random(height * 0.15, height * 0.45);
      createPot({ name: data.name, desc: data.desc, concept: data.concept, cardY })
        .then(potId => {
          const newPot = {
            firestoreId: potId,
            createdBy:   myDeviceId,
            name:        data.name,
            desc:        data.desc,
            concept:     data.concept,
            cardY,
            bgIndex:     0,
            locked:      false,
            stems:       [],
          };
          this.hide();
          potDecorateUI.show('new', newPot);
          goTo(POT_DECORATE);
        })
        .catch(err => console.error('[Firestore] 화분 생성 오류:', err));
      return;
    }
  }

  // 카드 레이아웃 계산
  _cardLayout(popX, popY, popW) {
    const cardGap = 14;
    const cardW   = Math.floor((popW - 56 - cardGap * 2) / 3); // ~154px
    const cardH   = 138;
    const cardY   = popY + 304;
    const startX  = popX + 28;
    return { cardW, cardH, cardY, startX, cardGap };
  }

  draw() {
    if (!this.isVisible) return;
    const { popW, popH, popX, popY } = this._layout();

    // 배경 딤
    fill(0, 0, 0, 120); noStroke();
    rect(0, 0, width, height);

    // 팝업 박스 (흰 배경, 부드러운 그림자)
    drawingContext.save();
    drawingContext.shadowBlur   = 32;
    drawingContext.shadowColor  = 'rgba(0,0,0,0.18)';
    fill(255); stroke(220); strokeWeight(1);
    rect(popX, popY, popW, popH, 16);
    drawingContext.restore();

    // ── 타이틀 ─────────────────────────────────────────────────────────────────
    noStroke();
    fill(22);
    textFont('sans-serif');
    textStyle(BOLD);
    textSize(20);
    textAlign(CENTER, BASELINE);
    text('새 화분 만들기', width / 2, popY + 46);

    // 서브타이틀
    fill(140);
    textStyle(NORMAL);
    textSize(13);
    text('나만의 화분 정보를 입력하여 새로운 화분을 만들어보세요.', width / 2, popY + 68);

    // 구분선
    stroke(230); strokeWeight(1);
    line(popX + 1, popY + 82, popX + popW - 1, popY + 82);

    // ── 화분 이름 라벨 ─────────────────────────────────────────────────────────
    noStroke();
    fill(70, 90, 210);
    textSize(13); textStyle(BOLD); textAlign(LEFT, BASELINE);
    text('화분의 이름*', popX + 28, popY + 102);

    // 글자 수
    const nameLen = this.nameInput ? this.nameInput.value().length : 0;
    fill(170); textStyle(NORMAL); textAlign(RIGHT, BASELINE);
    text(`${nameLen} / 20`, popX + popW - 28, popY + 102);

    // ── 한 줄 설명 라벨 ───────────────────────────────────────────────────────
    fill(70, 90, 210); textStyle(BOLD); textAlign(LEFT, BASELINE);
    text('한 줄 설명 (선택)', popX + 28, popY + 186);

    // ── 비즈 식물 컨셉 라벨 ──────────────────────────────────────────────────
    fill(70, 90, 210); textStyle(BOLD); textSize(13);
    text('비즈 식물 컨셉', popX + 28, popY + 272);

    fill(130); textStyle(NORMAL); textSize(12);
    text('줄기에 꿰어질 비즈와 화분의 디자인을 결정해요.', popX + 28, popY + 290);

    // ── 컨셉 카드 3개 ─────────────────────────────────────────────────────────
    const { cardW, cardH, cardY, startX, cardGap } = this._cardLayout(popX, popY, popW);

    for (let i = 0; i < 3; i++) {
      const cx        = startX + i * (cardW + cardGap);
      const isSelected = (this.selectedConcept === i);
      const concept   = this.concepts[i];
      const img       = this.conceptImgs[i];

      // 카드 배경
      fill(isSelected ? color(230, 232, 255) : concept.color);
      stroke(isSelected ? color(80, 80, 220) : 210);
      strokeWeight(isSelected ? 2.5 : 1);
      rect(cx, cardY, cardW, cardH, 10);

      // 컨셉 이미지 (있을 때)
      if (img) {
        // 이미지를 카드 상단 영역에 클리핑
        drawingContext.save();
        drawingContext.beginPath();
        drawingContext.roundRect(cx + 1, cardY + 1, cardW - 2, cardH - 2, 9);
        drawingContext.clip();
        imageMode(CORNER);
        image(img, cx + 1, cardY + 1, cardW - 2, cardH - 2);
        // 하단 그라디언트 오버레이
        const grad = drawingContext.createLinearGradient(cx, cardY + cardH - 40, cx, cardY + cardH);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(1, 'rgba(255,255,255,0.85)');
        drawingContext.fillStyle = grad;
        drawingContext.fillRect(cx, cardY, cardW, cardH);
        drawingContext.restore();
      } else {
        // 폴백: 컬러 타원 장식
        noStroke(); fill(concept.color);
        rect(cx, cardY, cardW, cardH, 10);
        fill(concept.accent); noStroke();
        ellipse(cx + cardW * 0.5, cardY + cardH * 0.4, cardW * 0.5, cardH * 0.45);
      }

      // 선택 체크 배지
      if (isSelected) {
        fill(80, 80, 220); noStroke();
        rect(cx + cardW - 28, cardY + 8, 20, 20, 5);
        fill(255); textFont('sans-serif'); textStyle(BOLD);
        textSize(11); textAlign(CENTER, CENTER);
        text('✓', cx + cardW - 18, cardY + 18);
      }

      // 카드 라벨 (카드 바깥 아래)
      noStroke();
      fill(isSelected ? color(60, 60, 210) : 90);
      textSize(12);
      textStyle(isSelected ? BOLD : NORMAL);
      textAlign(CENTER, BASELINE);
      text(concept.label, cx + cardW / 2, cardY + cardH + 20);
    }

    // ── 안내 문구 ──────────────────────────────────────────────────────────────
    noStroke(); fill(160); textStyle(NORMAL); textSize(12); textAlign(CENTER, BASELINE);
    text('화분의 이름과 설명을 확정하면 다시 수정할 수 없어요.', width / 2, popY + popH - 82);

    // ── 버튼 ──────────────────────────────────────────────────────────────────
    const cancelX  = popX + 28,  cancelY  = popY + popH - 70;
    const confirmX = popX + 192, confirmY = popY + popH - 70;
    const confirmW = popW - 192 - 28;

    // 취소
    const cancelHov = isHovered(cancelX, cancelY, 148, 48);
    fill(cancelHov ? 155 : 175); noStroke();
    rect(cancelX, cancelY, 148, 48, 24);
    fill(255); textFont('sans-serif'); textSize(15); textStyle(NORMAL);
    textAlign(CENTER, CENTER);
    text('취소하기', cancelX + 74, cancelY + 24);

    // 확정
    const canConfirm  = this.nameInput && this.nameInput.value().trim().length > 0;
    const confirmHov  = canConfirm && isHovered(confirmX, confirmY, confirmW, 48);
    fill(canConfirm ? (confirmHov ? color(140, 0, 160) : color(180, 30, 200)) : 190);
    noStroke();
    rect(confirmX, confirmY, confirmW, 48, 24);
    fill(255); textSize(15); textStyle(NORMAL);
    textAlign(CENTER, CENTER);
    text('이름 확정하고 화분 꾸미기 →', confirmX + confirmW / 2, confirmY + 24);

    // 커서
    if (cancelHov || confirmHov) cursor(HAND); else cursor(ARROW);
  }
}
