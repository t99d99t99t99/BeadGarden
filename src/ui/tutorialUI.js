class TutorialUI {
  constructor() {
    this.currentStep = 0;
    this._arrowButtonW = 46;
    this._arrowButtonH = 100;
    this._arrowHitW = 160;
    this._arrowHitH = 220;
    this._arrowCenterXRatio = 0.044;
    this._arrowCenterYRatio = 0.551;
    this.leftButtonImg = null;
    this.rightButtonImg = null;

    this.steps = [
      {
        label: 'Step 1 화분 상세 팝업',
        desc: '화분을 클릭하여\n+ 새 비즈 줄기 만들기 를 클릭해 게임을 시작해요.',
        img: null,
      },
      {
        label: 'Step 2 철사 잡기',
        desc: '철사 앞 부분에 손을 뻗고\n엄지와 검지를 모으면👌\n철사를 잡을 수 있어요.',
        img: null,
      },
      {
        label: 'Step 3 비즈 꿰기',
        desc: '철사 끝을 비즈 중앙에 통과시켜\n비즈를 꿰어요.',
        img: null,
      },
      {
        label: 'Step 4 비즈 삭제',
        desc: '프리뷰에 있는 비즈를 클릭하여\n삭제할 수 있어요.',
        img: null,
      },
      {
        label: 'Step 5 비즈 완성',
        desc: '최소 10개 이상 비즈를 꿰고,\n완성하기 를 클릭해요.',
        img: null,
      },
    ];

    // 이미지 로드 (없으면 플레이스홀더)
    for (let i = 0; i < this.steps.length; i++) {
      const path = `assets/tutorial/tutorial_${i + 1}.png`;
      loadImage(path, img => {
        this.steps[i].img = img;
      }, () => { });
    }

    loadImage('assets/ui/tutorial/left_button.png', img => {
      this.leftButtonImg = img;
    }, () => { });
    loadImage('assets/ui/tutorial/right_button.png', img => {
      this.rightButtonImg = img;
    }, () => { });
  }

  enter() {
    this.currentStep = 0;
  }

  _prev() {
    if (this.currentStep > 0) this.currentStep--;
  }

  _next() {
    if (this.currentStep < this.steps.length - 1) this.currentStep++;
  }

  _exit() {
    if (prevState === GAME_STATE.STEM_BEAD_CRAFT) {
      goTo(GAME_STATE.STEM_BEAD_CRAFT);
    } else {
      goTo(GAME_STATE.GARDEN_LIST);
    }
  }

  onMousePressed() {
    if (gameState !== GAME_STATE.TUTORIAL) return;

    // 건너뛰기 / 가든 입장하기 버튼
    const isLastStep = this.currentStep === this.steps.length - 1;
    const skipBtnW = (prevState !== GAME_STATE.STEM_BEAD_CRAFT && isLastStep) ? 160 : 140;
    const skipX = width - 40 - skipBtnW, skipY = 32;
    if (isHovered(skipX, skipY, skipBtnW, 48)) { this._exit(); return; }

    // < > 버튼
    const leftArrow = this._arrowHitRect(-1);
    const rightArrow = this._arrowHitRect(1);
    if (this.currentStep > 0 && isHovered(leftArrow.x, leftArrow.y, leftArrow.w, leftArrow.h)) {
      this._prev();
      return;
    }
    if (this.currentStep < this.steps.length - 1 &&
      isHovered(rightArrow.x, rightArrow.y, rightArrow.w, rightArrow.h)) {
      this._next();
      return;
    }
  }

  draw() {
    background(237, 242, 226);

    const step = this.steps[this.currentStep];
    const pad = 40;

    // ── 타이틀 ──
    noStroke();
    fill(160, 80, 200);
    textStyle(NORMAL); textSize(22); textAlign(LEFT, CENTER);
    text('Tutorial', pad + 10, 70);

    // ── 건너뛰기 버튼 ──
    const skipX = width - pad - 140, skipY = 32;
    const skipHov = isHovered(skipX, skipY, 140, 48);
    const isLastStep = this.currentStep === this.steps.length - 1;
    let skipLabel, skipBtnW = 140;
    if (prevState === GAME_STATE.STEM_BEAD_CRAFT) {
      skipLabel = '돌아가기';
      fill(skipHov ? 100 : 130);
    } else if (isLastStep) {
      skipLabel = '가든 입장하기';
      skipBtnW = 160;
      fill(skipHov ? color(180, 0, 180) : color(255, 0, 255));
    } else {
      skipLabel = '건너뛰기';
      fill(skipHov ? 100 : 130);
    }
    noStroke();
    rect(skipX, skipY, skipBtnW, 48, 10);
    fill(255); textStyle(NORMAL); textSize(15); textAlign(CENTER, CENTER);
    text(skipLabel, skipX + skipBtnW / 2, skipY + 24);

    // ── Step 배지 ──
    const badgeY = 50;
    textSize(14); textStyle(NORMAL);
    const badgeW = textWidth(step.label) + 32;
    fill(255, 120, 210); noStroke();
    rect(width / 2 - badgeW / 2, badgeY, badgeW, 30, 15);
    fill(255); textAlign(CENTER, CENTER);
    text(step.label, width / 2, badgeY + 15);

    // ── 설명 텍스트 ──
    fill(40); textSize(22); textStyle(BOLD); textAlign(CENTER, TOP);
    text(step.desc, width / 2, badgeY + 46);

    // ── 이미지 영역 ──
    const imgY = 190;
    const imgW = min(width - 200, 900);
    const imgH = min(height - imgY - 56, imgW * 0.75);
    const imgX = width / 2 - imgW / 2;

    noFill(); noStroke();

    if (step.img) {
      push();
      drawingContext.save();
      drawingContext.beginPath();
      drawingContext.rect(imgX, imgY, imgW, imgH);
      drawingContext.clip();
      imageMode(CORNER);
      const imgRatio = step.img.width / step.img.height;
      const boxRatio = imgW / imgH;
      const drawW = imgRatio > boxRatio ? imgH * imgRatio : imgW;
      const drawH = imgRatio > boxRatio ? imgH : imgW / imgRatio;
      image(step.img, imgX + (imgW - drawW) / 2, imgY + (imgH - drawH) / 2, drawW, drawH);
      drawingContext.restore();
      pop();
    } else {
      fill(160); textSize(14); textStyle(NORMAL); textAlign(CENTER, CENTER);
      text(`assets/tutorial/tutorial_${this.currentStep + 1}.png`, width / 2, imgY + imgH / 2);
    }

    // ── < > 화살표 ──
    const leftArrow = this._arrowHitRect(-1);
    const rightArrow = this._arrowHitRect(1);
    const leftCenter = this._arrowCenter(-1);
    const rightCenter = this._arrowCenter(1);

    if (this.currentStep > 0) {
      const lHov = isHovered(leftArrow.x, leftArrow.y, leftArrow.w, leftArrow.h);
      this._drawArrowButton(this.leftButtonImg, '‹', leftCenter.x, leftCenter.y);
      if (lHov) cursor(HAND);
    }

    if (this.currentStep < this.steps.length - 1) {
      const rHov = isHovered(rightArrow.x, rightArrow.y, rightArrow.w, rightArrow.h);
      this._drawArrowButton(this.rightButtonImg, '›', rightCenter.x, rightCenter.y);
      if (rHov) cursor(HAND);
    }

    // ── 점 인디케이터 ──
    const dotY = height - 20;
    const dotSpacing = 16;
    const dotStartX = width / 2 - (this.steps.length * dotSpacing) / 2;
    for (let i = 0; i < this.steps.length; i++) {
      fill(i === this.currentStep ? color(220, 40, 180) : color(210, 180, 210));
      noStroke();
      ellipse(dotStartX + i * dotSpacing + 8, dotY, i === this.currentStep ? 10 : 7);
    }

    if (!isHovered(leftArrow.x, leftArrow.y, leftArrow.w, leftArrow.h) &&
      !isHovered(rightArrow.x, rightArrow.y, rightArrow.w, rightArrow.h) &&
      !skipHov) {
      cursor(ARROW);
    }
  }

  _arrowCenter(direction) {
    const x = width * this._arrowCenterXRatio;
    return {
      x: direction < 0 ? x : width - x,
      y: height * this._arrowCenterYRatio,
    };
  }

  _arrowHitRect(direction) {
    const center = this._arrowCenter(direction);
    return {
      x: center.x - this._arrowHitW / 2,
      y: center.y - this._arrowHitH / 2,
      w: this._arrowHitW,
      h: this._arrowHitH,
    };
  }

  _drawArrowButton(img, fallbackLabel, centerX, centerY) {
    if (img) {
      imageMode(CENTER);
      image(img, centerX, centerY, this._arrowButtonW, this._arrowButtonH);
      imageMode(CORNER);
      return;
    }

    fill(220, 40, 180); noStroke();
    textSize(100); textStyle(NORMAL); textAlign(CENTER, CENTER);
    text(fallbackLabel, centerX, centerY);
  }
}
