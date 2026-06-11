class TutorialUI {
  constructor() {
    this.currentStep = 0;

    this.steps = [
      {
        label: 'Step 1 화분 상세 팝업',
        desc:  '화분을 클릭하여\n+ 새 비즈 줄기 만들기 를 클릭해 게임을 시작해요.',
        img:   null,
      },
      {
        label: 'Step 2 철사 잡기',
        desc:  '철사 앞 부분에 손을 뻗고\n엄지와 검지를 모으면👌\n철사를 잡을 수 있어요.',
        img:   null,
      },
      {
        label: 'Step 3 비즈 꿰기',
        desc:  '철사 끝을 비즈 중앙에 통과시켜\n비즈를 꿰어요.',
        img:   null,
      },
      {
        label: 'Step 4 비즈 삭제',
        desc:  '프리뷰에 있는 비즈를 클릭하여\n삭제할 수 있어요.',
        img:   null,
      },
      {
        label: 'Step 5 비즈 완성',
        desc:  '최소 10개 이상 비즈를 꿰고,\n완성하기 를 클릭해요.',
        img:   null,
      },
    ];

    // 이미지 로드 (없으면 플레이스홀더)
    for (let i = 0; i < this.steps.length; i++) {
      const path = `assets/tutorial_${i + 1}.png`;
      loadImage(path, img => {
        this.steps[i].img = img;
      }, () => {});
    }
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
    if (prevState === STEM_BEAD_CRAFT) {
      goTo(STEM_BEAD_CRAFT);
    } else {
      goTo(GARDEN);
    }
  }

  onMousePressed() {
    if (gameState !== TUTORIAL) return;

    // 건너뛰기 버튼
    const skipX = width - 40 - 140, skipY = 32;
    if (isHovered(skipX, skipY, 140, 48)) { this._exit(); return; }

    // < 버튼
    const arrowY = height / 2 - 30, arrowW = 52, arrowH = 60;
    if (isHovered(20, arrowY, arrowW, arrowH)) { this._prev(); return; }

    // > 버튼
    if (isHovered(width - 72, arrowY, arrowW, arrowH)) { this._next(); return; }
  }

  draw() {
    background(237, 242, 226);

    const step = this.steps[this.currentStep];
    const pad  = 40;

    // ── 타이틀 ──
    noStroke();
    fill(160, 80, 200);
    textFont('Dot Matrix');
    textStyle(NORMAL); textSize(22); textAlign(LEFT, CENTER);
    text('Tutorial', pad + 10, 70);
    textFont('DungGeunMo');

    // ── 건너뛰기 버튼 ──
    const skipX   = width - pad - 140, skipY = 32;
    const skipHov = isHovered(skipX, skipY, 140, 48);
    fill(skipHov ? 100 : 130); noStroke();
    rect(skipX, skipY, 140, 48, 10);
    fill(255); textStyle(NORMAL); textSize(15); textAlign(CENTER, CENTER);
    const skipLabel = prevState === STEM_BEAD_CRAFT ? '돌아가기' : '건너뛰기';
    text(skipLabel, skipX + 70, skipY + 24);

    // ── Step 배지 ──
    const badgeY = 138;
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
    const imgY = badgeY + 46 + 22 * (step.desc.split('\n').length) + 24;
    const imgW = width - 200;
    const imgH = height - imgY - 40;
    const imgX = width / 2 - imgW / 2;

    fill(220); noStroke();
    rect(imgX, imgY, imgW, imgH, 10);

    if (step.img) {
      imageMode(CORNER);
      image(step.img, imgX, imgY, imgW, imgH);
    } else {
      fill(160); textSize(14); textStyle(NORMAL); textAlign(CENTER, CENTER);
      text(`assets/tutorial_${this.currentStep + 1}.png`, width / 2, imgY + imgH / 2);
    }

    // ── < > 화살표 ──
    const arrowY = imgY + imgH / 2 - 30;
    const arrowW = 52, arrowH = 60;

    if (this.currentStep > 0) {
      const lHov = isHovered(20, arrowY, arrowW, arrowH);
      fill(220, 40, 180); noStroke();
      textSize(36); textStyle(NORMAL); textAlign(CENTER, CENTER);
      text('‹', 20 + arrowW / 2, arrowY + arrowH / 2);
      if (lHov) cursor(HAND);
    }

    if (this.currentStep < this.steps.length - 1) {
      const rHov = isHovered(width - 72, arrowY, arrowW, arrowH);
      fill(220, 40, 180); noStroke();
      textSize(36); textStyle(NORMAL); textAlign(CENTER, CENTER);
      text('›', width - 72 + arrowW / 2, arrowY + arrowH / 2);
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

    if (!isHovered(20, arrowY, arrowW, arrowH) &&
        !isHovered(width - 72, arrowY, arrowW, arrowH) &&
        !skipHov) {
      cursor(ARROW);
    }
  }
}
