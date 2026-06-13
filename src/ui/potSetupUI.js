class PotSetupUI {
  constructor() {
    this.isVisible       = false;
    this.selectedConcept = 1; // 0: 식물, 1: 스타(기본), 2: 바다
    this.nameInput       = null;
    this.descInput       = null;

    this.concepts = [
      { label: '식물 에디션', theme: POT_THEMES.PLANT, imgPath: 'assets/concept_plant.png' },
      { label: '스타 에디션', theme: POT_THEMES.STAR,  imgPath: 'assets/concept_star.png'  },
      { label: '바다 에디션', theme: POT_THEMES.OCEAN, imgPath: 'assets/concept_ocean.png' },
    ];

    // 컨셉 프리뷰 이미지 로드
    this.conceptImgs = [null, null, null];
    this.concepts.forEach((c, i) => {
      loadImage(c.imgPath, img => { this.conceptImgs[i] = img; }, err => {
        console.warn('[PotSetupUI] 이미지 로드 실패:', c.imgPath, err);
      });
    });
  }

  show() {
    if (this.nameInput) { this.nameInput.remove(); this.nameInput = null; }
    if (this.descInput) { this.descInput.remove(); this.descInput = null; }
    this.isVisible       = true;
    this.selectedConcept = 1;

    let popW = 520, popH = 540;
    let popX = width  / 2 - popW / 2;
    let popY = height / 2 - popH / 2;

    // 화분 이름 input
    this.nameInput = createInput('');
    this.nameInput.attribute('placeholder', '예) 쑥쑥이');
    this.nameInput.attribute('maxlength',   '20');
    this.nameInput.style('position',      'absolute');
    this.nameInput.style('width',         '456px');
    this.nameInput.style('padding',       '10px 14px');
    this.nameInput.style('font-size',     '14px');
    this.nameInput.style('border',        '1px solid #ddd');
    this.nameInput.style('border-radius', '8px');
    this.nameInput.style('outline',       'none');
    this.nameInput.style('box-sizing',    'border-box');
    this.nameInput.style('background',    '#ffffff');
    this.nameInput.style('z-index',       '10');

    // 한 줄 설명 input
    this.descInput = createInput('');
    this.descInput.attribute('placeholder', '예) 오늘 처음 만들어본 화분');
    this.descInput.attribute('maxlength',   '40');
    this.descInput.style('position',      'absolute');
    this.descInput.style('width',         '456px');
    this.descInput.style('padding',       '10px 14px');
    this.descInput.style('font-size',     '14px');
    this.descInput.style('border',        '1px solid #ddd');
    this.descInput.style('border-radius', '8px');
    this.descInput.style('outline',       'none');
    this.descInput.style('box-sizing',    'border-box');
    this.descInput.style('background',    '#f9f9f9');
    this.descInput.style('z-index',       '10');

    this.updateInputLayout();
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
      theme:   this.concepts[this.selectedConcept].theme,
    };
  }

  onMousePressed() {
    if (!this.isVisible) return;

    let popW = 520, popH = 540;
    let popX = width  / 2 - popW / 2;
    let popY = height / 2 - popH / 2;

    // 컨셉 카드 클릭
    let cardW = 140, cardH = 110;
    let cardY = popY + 292;
    let startX = popX + 28;
    let cardGap = 16;
    for (let i = 0; i < 3; i++) {
      let cx = startX + i * (cardW + cardGap);
      if (mouseX > cx && mouseX < cx + cardW &&
          mouseY > cardY && mouseY < cardY + cardH) {
        this.selectedConcept = i;
        return;
      }
    }

    // 취소 버튼
    let cancelX = popX + 28, cancelY = popY + 464;
    if (mouseX > cancelX && mouseX < cancelX + 148 &&
        mouseY > cancelY && mouseY < cancelY + 48) {
      this.hide();
      goTo(GARDEN);
      return;
    }

    // 확정 버튼
    let data = this.getData();
    let confirmX = popX + 196, confirmY = popY + 464;
    if (data.name.length > 0 &&
        mouseX > confirmX && mouseX < confirmX + 296 &&
        mouseY > confirmY && mouseY < confirmY + 48) {
      // Firestore에 화분 생성 후 꾸미기 화면으로 이동
      let cardY = random(height * 0.15, height * 0.45);
      createPot({ name: data.name, desc: data.desc, concept: data.concept, theme: data.theme, cardY })
        .then(potId => {
          const newPot = {
            firestoreId: potId,
            createdBy:   myDeviceId,
            name:        data.name,
            desc:        data.desc,
            concept:     data.concept,
            theme:       data.theme,
            cardY,
            colorIndex:  0,
            bgIndex:     0,
            shapeIndex:  0,
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

  draw() {
    if (!this.isVisible) return;

    this.updateInputLayout();

    // 배경 dim
    fill(0, 0, 0, 120); noStroke();
    rect(0, 0, width, height);

    // 팝업 박스
    let popW = 520, popH = 540;
    let popX = width  / 2 - popW / 2;
    let popY = height / 2 - popH / 2;
    fill(255); stroke(220); strokeWeight(1);
    rect(popX, popY, popW, popH, 14);

    // 타이틀
    noStroke(); fill(30);
    textStyle(BOLD); textSize(20); textAlign(CENTER);
    text('새 화분 만들기', width / 2, popY + 44);

    // 서브타이틀
    fill(140); textStyle(NORMAL); textSize(13);
    text('나만의 화분 정보를 입력하여 새로운 화분을 만들어보세요.', width / 2, popY + 66);

    // 구분선
    stroke(220); strokeWeight(1);
    line(popX, popY + 80, popX + popW, popY + 80);

    // 화분 이름 라벨
    noStroke(); fill(255, 0, 255);
    textSize(13); textStyle(BOLD); textAlign(LEFT);
    text('화분의 이름*', popX + 28, popY + 100);

    // 글자 수 카운트
    let nameLen = this.nameInput ? this.nameInput.value().length : 0;
    fill(160); textStyle(NORMAL); textAlign(RIGHT);
    text(`${nameLen} / 20`, popX + popW - 28, popY + 100);

    // 한 줄 설명 라벨
    fill(255, 0, 255); textStyle(BOLD); textAlign(LEFT);
    text('한 줄 설명 (선택)', popX + 28, popY + 176);

    // 비즈 식물 컨셉 라벨
    fill(255, 0, 255); textStyle(BOLD);
    text('비즈 식물 컨셉', popX + 28, popY + 258);
    fill(120); textStyle(NORMAL); textSize(12);
    text('줄기에 꿰어질 비즈와 화분의 디자인을 결정해요.', popX + 28, popY + 276);

    // 컨셉 카드 3개
    let cardW = 140, cardH = 110;
    let cardY = popY + 292;
    let startX = popX + 28;
    let cardGap = 16;

    for (let i = 0; i < 3; i++) {
      let cx = startX + i * (cardW + cardGap);
      let isSelected = (this.selectedConcept === i);

      // 카드 테두리
      fill(245);
      stroke(isSelected ? color(255, 0, 255) : 210);
      strokeWeight(isSelected ? 2.5 : 1);
      rect(cx, cardY, cardW, cardH, 8);

      // 컨셉 이미지 (클리핑)
      const img = this.conceptImgs[i];
      if (img) {
        drawingContext.save();
        drawingContext.beginPath();
        drawingContext.roundRect(cx, cardY, cardW, cardH, 8);
        drawingContext.clip();
        imageMode(CORNER);
        image(img, cx, cardY, cardW, cardH);
        imageMode(CENTER);
        drawingContext.restore();
      }

      // 선택된 카드 반투명 오버레이
      if (isSelected) {
        fill(255, 0, 255, 25); noStroke();
        rect(cx, cardY, cardW, cardH, 8);
      }

      // 체크 표시
      if (isSelected) {
        fill(255, 0, 255); noStroke();
        rect(cx + cardW - 26, cardY + 8, 18, 18, 4);
        fill(255); textSize(11); textAlign(CENTER, CENTER);
        text('✓', cx + cardW - 17, cardY + 17);
      }

      // 카드 라벨
      noStroke();
      fill(isSelected ? color(255, 0, 255) : 100);
      textSize(12);
      textStyle(isSelected ? BOLD : NORMAL);
      textAlign(CENTER);
      text(this.concepts[i].label, cx + cardW / 2, cardY + cardH + 18);
    }

    // 안내 문구
    noStroke(); fill(150); textStyle(NORMAL); textSize(12); textAlign(CENTER);
    text('화분의 이름과 설명을 확정하면 다시 수정할 수 없어요.', width / 2, popY + 448);

    // 취소 버튼
    let cancelX = popX + 28, cancelY = popY + 464;
    let cancelHov = isHovered(cancelX, cancelY, 148, 48);
    fill(cancelHov ? 160 : 180); noStroke();
    rect(cancelX, cancelY, 148, 48, 24);
    fill(255); textSize(15); textStyle(NORMAL);
    textAlign(CENTER, CENTER);
    text('취소하기', cancelX + 74, cancelY + 24);

    // 확정 버튼
    let confirmX = popX + 196, confirmY = popY + 464;
    let canConfirm = this.nameInput && this.nameInput.value().trim().length > 0;
    let confirmHov = canConfirm && isHovered(confirmX, confirmY, 296, 48);
    fill(canConfirm ? (confirmHov ? color(180, 0, 180) : color(255, 0, 255)) : 160); noStroke();
    rect(confirmX, confirmY, 296, 48, 24);
    fill(255); textSize(15); textStyle(NORMAL);
    textAlign(CENTER, CENTER);
    text('이름 확정하고 화분 꾸미기 →', confirmX + 148, confirmY + 24);

    // 커서
    if (cancelHov || confirmHov) cursor(HAND); else cursor(ARROW);
  }

  updateInputLayout() {
    if (!this.nameInput || !this.descInput) return;

    const canvasElement = document.querySelector('canvas');
    if (!canvasElement) return;

    const canvasRect = canvasElement.getBoundingClientRect();
    const scale = canvasRect.width / width;
    const popX = width / 2 - 520 / 2;
    const popY = height / 2 - 540 / 2;

    this.positionInput(this.nameInput, popX + 28, popY + 108, canvasRect, scale);
    this.positionInput(this.descInput, popX + 28, popY + 184, canvasRect, scale);
  }

  positionInput(input, x, y, canvasRect, scale) {
    input.position(
      canvasRect.left + window.scrollX + x * scale,
      canvasRect.top + window.scrollY + y * scale
    );
    input.style('transform-origin', 'top left');
    input.style('transform', `scale(${scale})`);
  }
}
