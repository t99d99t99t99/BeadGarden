class TutorialUI {
  constructor() {
    this.currentStep = 0;
    this.enteredFromState = GAME_STATE.INTRO;
    this._arrowButtonW = 37; // 46 * 0.8
    this._arrowButtonH = 80; // 100 * 0.8
    this._arrowHitW = 128; // 160 * 0.8
    this._arrowHitH = 176; // 220 * 0.8
    this._arrowCenterXRatio = 0.044;
    this._arrowCenterYRatio = 0.551;
    this.leftButtonImg = null;
    this.rightButtonImg = null;
    this.starBgImg = null;
    this.mouseImg = null;

    this.steps = [
      {
        marker: '비즈가든',
        lines: [
          [{ text: '비즈 가든에는' }],
          [{ text: '모두가 만든 비즈 식물들이 심어져 있어요.' }],
        ],
        tip: '마우스로 스크롤하여 다양한 화분을 살펴봐요.',
      },
      {
        marker: '비즈가든',
        lines: [
          [
            { text: '새 화분 만들기', pill: 'pink' },
            { text: ' 버튼을 클릭하여' },
          ],
          [{ text: '새로운 화분을 만들 수 있어요.' }],
        ],
        imagePath: 'assets/tutorial/tutorial_1.png',
        mouseOverlay: {
          targetXRatio: 0.5,
          targetYRatio: 0.925,
          heightRatio: 0.16,
        },
      },
      {
        marker: '비즈가든',
        lines: [
          [{ text: '나 또는 다른 사람의 식물을 클릭하여' }],
          [{ text: '비즈 식물을 구경할 수 있어요.' }],
        ],
        imagePath: 'assets/tutorial/tutorial_1.png',
        mouseOverlay: {
          targetXRatio: 0.5,
          targetYRatio: 0.62,
          heightRatio: 0.15,
        },
      },
      {
        marker: '비즈가든',
        lines: [
          [
            { text: '새 비즈 줄기 만들기', pill: 'pink' },
            { text: ' 버튼을 눌러' },
          ],
          [{ text: '비즈를 꿰어 줄기를 만드는 게임을 시작해요.' }],
        ],
        imagePath: 'assets/tutorial/tutorial_4.png',
        tip: '다른 사람의 화분에도 줄기를 만들 수 있어요!',
      },
      {
        marker: '비즈 게임: 철사 잡기',
        useStarBackground: true,
        lines: [
          [{ text: '웹 카메라가 당신의 손을 인식해요.', underline: true }],
          [
            { text: '손을 움직여, 철사 앞부분에서 ' },
            { text: '엄지와 검지를 모아👌', underline: true },
            { text: ' 철사를 잡아보세요.' },
          ],
        ],
        imagePath: 'assets/tutorial/tutorial_5.png',
        videoPath: 'assets/tutorial/tutorial_5_video.mp4',
        tip: '카메라에서 조금 40cm정도 떨어진 측면 손이 인식이 잘 돼요!',
      },
      {
        marker: '비즈 게임: 비즈 꿰기',
        useStarBackground: true,
        lines: [
          [{ text: '철사를 잡고 왼쪽으로 움직여' }],
          [
            { text: '비즈 중앙의 구멍', underline: true },
            { text: '을 통과시키세요.' },
          ],
        ],
        imagePath: 'assets/tutorial/tutorial_6.png',
        videoPath: 'assets/tutorial/tutorial_6_video.mp4',
        tip: '한 번 철사에 끼워진 비즈는 빠지지 않아요.',
      },
      {
        marker: '비즈 게임: 추가 기능',
        useStarBackground: true,
        lines: [
          [{ text: '프리뷰에 있는 비즈를 클릭하여 삭제할 수 있어요.' }],
          [
            { text: '비즈 다시 뿌리기', pill: 'gray' },
            { text: ' 버튼을 누르면 화면에 새로운 비즈가 세팅돼요.' },
          ],
        ],
        imagePath: 'assets/tutorial/tutorial_7.png',
        mouseOverlay: [
          {
            targetXRatio: 0.632,
            targetYRatio: 0.156,
            heightRatio: 0.13,
          },
          {
            targetXRatio: 0.326,
            targetYRatio: 0.953,
            heightRatio: 0.14,
          },
        ],
      },
      {
        marker: '비즈 게임: 줄기 완성하기',
        useStarBackground: true,
        lines: [
          [{ text: '비즈를 최소 10개 이상 꿴 뒤' }],
          [
            { text: '완성하기', pill: 'black' },
            { text: ' 버튼을 클릭하세요.' },
          ],
        ],
        imagePath: 'assets/tutorial/tutorial_8.png',
        mouseOverlay: {
          targetXRatio: 0.62,
          targetYRatio: 0.955,
          heightRatio: 0.14,
        },
      },
      {
        marker: '비즈 게임: 줄기 꾸미기',
        useStarBackground: true,
        lines: [
          [{ text: '내가 만든 줄기를 원하는 위치와 형태로 변경하여' }],
          [{ text: '화분을 꾸며보세요.' }],
        ],
      },
      {
        marker: '비즈가든',
        lines: [
          [
            { text: '여러 개의 줄기를', underline: true },
            { text: ' 만들어 풍성한 비즈 식물을 완성해보세요.' },
          ],
          [{ text: '다른 사람의 식물도 가꿀 수 있어요.' }],
        ],
      },
      {
        marker: '비즈가든',
        lines: [
          [{ text: '식물을 다시 꾸미거나' }],
          [{ text: '이후에 수정을 못하도록 잠글 수 있어요.' }],
        ],
        finalPanel: true,
      },
    ];

    this._loadStepImages();
    this._loadStepVideos();

    loadImage('assets/backgrounds/stemBeadCraft_star_bg.png', img => {
      this.starBgImg = img;
    }, () => { });
    loadImage('assets/tutorial/mouse.png', img => {
      this.mouseImg = img;
    }, () => { });
    loadImage('assets/ui/tutorial/left_button.png', img => {
      this.leftButtonImg = img;
    }, () => { });
    loadImage('assets/ui/tutorial/right_button.png', img => {
      this.rightButtonImg = img;
    }, () => { });
  }

  _loadStepImages() {
    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];
      step.imagePath = step.imagePath || `assets/tutorial/tutorial_${i + 1}.png`;
      loadImage(step.imagePath, img => {
        step.img = img;
      }, () => { });
    }
  }

  _loadStepVideos() {
    for (const step of this.steps) {
      if (!step.videoPath) continue;

      const video = createVideo([step.videoPath], () => {
        step.videoReady = true;
        this._syncStepVideos();
      });
      video.hide();
      video.volume(0);
      if (video.elt) {
        video.elt.muted = true;
        video.elt.loop = true;
        video.elt.playsInline = true;
        video.elt.setAttribute('playsinline', '');
        video.elt.addEventListener('loadedmetadata', () => {
          step.videoAspect = video.elt.videoWidth / video.elt.videoHeight;
        });
      }
      step.video = video;
    }
  }

  _syncStepVideos(tutorialActive = gameState === GAME_STATE.TUTORIAL) {
    const activeStep = tutorialActive ? this.steps[this.currentStep] : null;
    for (const step of this.steps) {
      if (!step.video) continue;

      if (step === activeStep && step.videoReady) {
        if (step.video.elt?.paused) {
          const playResult = step.video.elt.play();
          if (playResult?.catch) playResult.catch(() => { });
        }
      } else if (!step.video.elt?.paused) {
        step.video.pause();
      }
    }
  }

  _pauseStepVideos() {
    for (const step of this.steps) {
      if (step.video) step.video.pause();
    }
  }

  enter() {
    this.currentStep = 0;
    this.enteredFromState = gameState;
    this._syncStepVideos(true);
  }

  _prev() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this._syncStepVideos();
    }
  }

  _next() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this._syncStepVideos();
    }
  }

  _sourceState() {
    return this.enteredFromState || prevState || GAME_STATE.INTRO;
  }

  _isIntroFinalStep() {
    return this._sourceState() === GAME_STATE.INTRO &&
      this.currentStep === this.steps.length - 1;
  }

  _exit() {
    this._pauseStepVideos();
    if (this._sourceState() === GAME_STATE.STEM_BEAD_CRAFT) {
      goTo(GAME_STATE.STEM_BEAD_CRAFT);
    } else {
      goTo(GAME_STATE.GARDEN_LIST);
    }
  }

  onMousePressed() {
    if (gameState !== GAME_STATE.TUTORIAL) return;

    const skipButton = this._skipButtonRect();
    if (skipButton && isHovered(skipButton.x, skipButton.y, skipButton.w, skipButton.h)) {
      this._exit();
      return;
    }

    const ctaButton = this._finalCtaRect();
    if (ctaButton && isHovered(ctaButton.x, ctaButton.y, ctaButton.w, ctaButton.h)) {
      this._exit();
      return;
    }

    const leftArrow = this._arrowHitRect(-1);
    const rightArrow = this._arrowHitRect(1);
    if (this.currentStep > 0 && isHovered(leftArrow.x, leftArrow.y, leftArrow.w, leftArrow.h)) {
      this._prev();
      return;
    }
    if (this.currentStep < this.steps.length - 1 &&
      isHovered(rightArrow.x, rightArrow.y, rightArrow.w, rightArrow.h)) {
      this._next();
    }
  }

  draw() {
    const step = this.steps[this.currentStep];
    this._syncStepVideos(true);
    this._drawBackground(step);

    this._drawTopTitle();
    const skipHov = this._drawSkipButton();
    this._drawMarkerAndMessage(step);

    if (step.finalPanel) {
      this._drawFinalPanel();
    } else {
      this._drawRegularImageStep(step);
    }

    this._drawArrows(skipHov);
  }

  _drawBackground(step) {
    if (step.useStarBackground && this.starBgImg) {
      this._drawImageCover(this.starBgImg, 0, 0, width, height);
      return;
    }
    background(237, 242, 226);
  }

  _drawTopTitle() {
    noStroke();
    fill(220, 0, 235);
    textStyle(NORMAL);
    textSize(this._responsiveSize(31, 22, 42));
    textAlign(CENTER, CENTER);
    text('Tutorial', width / 2, height * 0.05);
  }

  _drawSkipButton() {
    const rectValue = this._skipButtonRect();
    if (!rectValue) return false;

    const skipHov = isHovered(rectValue.x, rectValue.y, rectValue.w, rectValue.h);
    noStroke();
    fill(skipHov ? 160 : 188);
    rect(rectValue.x, rectValue.y, rectValue.w, rectValue.h, rectValue.h * 0.12);

    fill(255);
    textStyle(BOLD);
    textSize(this._responsiveSize(19, 13, 24));
    textAlign(CENTER, CENTER);
    text(this._skipButtonLabel(), rectValue.x + rectValue.w / 2, rectValue.y + rectValue.h / 2);
    return skipHov;
  }

  _skipButtonRect() {
    if (this._isIntroFinalStep()) return null;
    const label = this._skipButtonLabel();
    textStyle(BOLD);
    textSize(this._responsiveSize(19, 13, 24));
    const buttonW = Math.max(width * 0.1, textWidth(label) + width * 0.05);
    const buttonH = Math.max(48, height * 0.052);
    return {
      x: width - width * 0.052 - buttonW,
      y: height * 0.052,
      w: buttonW,
      h: buttonH,
    };
  }

  _skipButtonLabel() {
    if (this._sourceState() === GAME_STATE.STEM_BEAD_CRAFT) return '돌아가기';
    return '건너뛰기';
  }

  _drawMarkerAndMessage(step) {
    const markerY = height * 0.1;
    const lineSize = this._responsiveSize(24, 18, 30);
    const lineGap = lineSize * 1.45;
    const messageY = markerY + height * 0.052;

    this._drawMarker(step.marker, markerY, step.useStarBackground);
    this._drawRichLines(step.lines, width / 2, messageY, lineSize, lineGap);

    return {
      markerY,
      messageY,
      contentTop: messageY + step.lines.length * lineGap + height * 0.035,
    };
  }

  _drawMarker(label, centerY, useStarBackground) {
    textStyle(BOLD);
    textSize(this._responsiveSize(14, 12, 18));
    const markerW = textWidth(label) + width * 0.037;
    const markerH = Math.max(28, height * 0.032);
    noStroke();
    fill(useStarBackground ? color(255, 255, 255, 238) : color(246, 203, 250));
    rect(width / 2 - markerW / 2, centerY - markerH / 2, markerW, markerH, markerH / 2);
    fill(220, 0, 235);
    textAlign(CENTER, CENTER);
    text(label, width / 2, centerY);
  }

  _drawRichLines(lines, centerX, startY, size, lineGap) {
    for (let i = 0; i < lines.length; i++) {
      this._drawRichLine(lines[i], centerX, startY + i * lineGap, size);
    }
  }

  _drawRichLine(spans, centerX, centerY, size) {
    const metrics = spans.map(span => this._spanMetrics(span, size));
    const totalW = metrics.reduce((sum, metric) => sum + metric.w, 0);
    let x = centerX - totalW / 2;

    for (let i = 0; i < spans.length; i++) {
      const span = spans[i];
      const metric = metrics[i];
      const pillPadX = metric.pillPadX;

      if (span.pill) {
        noStroke();
        fill(this._pillFill(span.pill));
        rect(x, centerY - metric.h / 2, metric.w, metric.h, metric.h * 0.24);
      }

      fill(this._spanTextFill(span));
      noStroke();
      textStyle(BOLD);
      textSize(size);
      textAlign(LEFT, CENTER);
      text(span.text, x + pillPadX, centerY);

      if (span.underline) {
        stroke(20);
        strokeWeight(Math.max(2, size * 0.07));
        const y = centerY + size * 0.45;
        line(x + pillPadX, y, x + pillPadX + metric.textW, y);
        noStroke();
      }

      x += metric.w;
    }
  }

  _spanMetrics(span, size) {
    textStyle(BOLD);
    textSize(size);
    const textW = textWidth(span.text);
    const pillPadX = span.pill ? size * 0.55 : 0;
    const h = span.pill ? size * 1.32 : size;
    return {
      textW,
      pillPadX,
      w: textW + pillPadX * 2,
      h,
    };
  }

  _pillFill(kind) {
    if (kind === 'gray') return color(207, 207, 207);
    if (kind === 'black') return color(0);
    return color(230, 0, 235);
  }

  _spanTextFill(span) {
    if (span.pill === 'pink' || span.pill === 'black') return color(255);
    return color(20);
  }

  _drawRegularImageStep(step) {
    const imageRect = this._tutorialImageRect(null, this._stepImageRatio(step));
    let visibleImageRect = imageRect;
    if (step.videoReady && step.video) {
      visibleImageRect = this._drawMediaContain(step.video, imageRect, this._stepImageRatio(step));
    } else if (step.img) {
      visibleImageRect = this._drawImageContain(step.img, imageRect);
    } else {
      this._drawImageFallback(step, imageRect);
    }

    if (step.mouseOverlay) {
      this._drawMouseOverlay(visibleImageRect, step.mouseOverlay);
    }

    if (step.tip) {
      this._drawTipAtTop(step.tip, this._finalCtaTop());
    }
  }

  _tutorialImageRect(x = null, imageRatio = this._fallbackImageRatio()) {
    const size = this._tutorialPhotoSize(imageRatio);
    return {
      x: x ?? width / 2 - size.w / 2,
      y: this._tutorialImageTop(),
      w: size.w,
      h: size.h,
      r: Math.max(10, Math.min(width, height) * 0.017),
    };
  }

  _tutorialPhotoSize(imageRatio = this._fallbackImageRatio()) {
    const targetH = this._tutorialImageHeight();
    return {
      w: targetH * imageRatio,
      h: targetH,
    };
  }

  _tutorialImageTop() {
    const maxLineCount = this.steps.reduce((maxLines, step) => {
      return Math.max(maxLines, step.lines?.length || 0);
    }, 0);
    const lineSize = this._responsiveSize(24, 18, 30);
    const lineGap = lineSize * 1.45;
    const markerY = height * 0.1;
    const messageY = markerY + height * 0.052;
    const messageBottom = messageY + Math.max(0, maxLineCount - 1) * lineGap + lineSize * 0.68;
    return messageBottom + height * 0.025;
  }

  _tutorialImageHeight() {
    const imageTop = this._tutorialImageTop();
    const imageBottom = this._finalCtaTop() - height * 0.025;
    return Math.max(height * 0.3, imageBottom - imageTop);
  }

  _stepImageRatio(step) {
    if (step?.videoAspect) {
      return step.videoAspect;
    }
    if (step?.video?.elt?.videoWidth && step?.video?.elt?.videoHeight) {
      return step.video.elt.videoWidth / step.video.elt.videoHeight;
    }
    if (step?.img?.width && step?.img?.height) {
      return step.img.width / step.img.height;
    }
    return this._fallbackImageRatio();
  }

  _fallbackImageRatio() {
    return 1.37;
  }

  _drawFinalPanel() {
    const step = this.steps[this.currentStep];
    const panelRect = this._tutorialImageRect(null, 16 / 9);
    const panelW = panelRect.w;
    const panelH = panelRect.h;
    const panelX = panelRect.x;
    const panelY = panelRect.y;
    const innerGap = panelW * 0.018;
    const panelRadius = Math.max(12, Math.min(width, height) * 0.018);

    noStroke();
    fill(255);
    rect(panelX, panelY, panelW, panelH, panelRadius);

    const imageRect = {
      x: panelX + innerGap,
      y: panelY + innerGap,
      w: panelW * 0.7,
      h: panelH - innerGap * 2,
      r: Math.max(10, panelRadius * 0.8),
    };
    let visibleImageRect = imageRect;
    if (step.img) {
      visibleImageRect = this._drawImageContain(step.img, imageRect);
    } else {
      this._drawImageFallback(step, imageRect);
    }

    const textX = imageRect.x + imageRect.w + panelW * 0.03;
    const textMaxW = panelX + panelW - textX - innerGap;
    const topTextY = visibleImageRect.y + visibleImageRect.h * 0.76;
    const lowerTextY = visibleImageRect.y + visibleImageRect.h * 0.88;
    const labelSize = this._responsiveSize(16, 11, 20);
    const arrowStartX = textX - panelW * 0.012;
    this._drawFinalPanelArrow(
      arrowStartX,
      topTextY + labelSize * 0.65,
      visibleImageRect.x + visibleImageRect.w * 0.75,
      visibleImageRect.y + visibleImageRect.h * 0.8
    );
    this._drawFinalPanelArrow(
      arrowStartX,
      lowerTextY + labelSize * 0.9,
      visibleImageRect.x + visibleImageRect.w * 0.925,
      visibleImageRect.y + visibleImageRect.h * 0.94
    );

    fill(220, 0, 235);
    textStyle(BOLD);
    textSize(labelSize);
    textAlign(LEFT, TOP);
    text('줄기 및 화분을 꾸미는 기능', textX, topTextY, textMaxW, panelH * 0.18);

    text('새로운 줄기 생성과 꾸미기를\n제한하는 잠금 기능', textX, lowerTextY, textMaxW, panelH * 0.16);
    this._drawFinalPanelTip('한번 잠그면 수정은 불가해요.', textX, lowerTextY + panelH * 0.085, textMaxW);

    const cta = this._finalCtaRect();
    if (cta) {
      const ctaHov = isHovered(cta.x, cta.y, cta.w, cta.h);
      noStroke();
      fill(ctaHov ? color(190, 0, 205) : color(230, 0, 235));
      rect(cta.x, cta.y, cta.w, cta.h, cta.h * 0.12);
      fill(255);
      textStyle(BOLD);
      textSize(this._responsiveSize(25, 19, 34));
      textAlign(CENTER, CENTER);
      text('비즈 가든 입장하기', cta.x + cta.w / 2, cta.y + cta.h / 2);
    }
  }

  _finalCtaRect() {
    if (!this._isIntroFinalStep()) return null;
    const w = width * 0.36;
    const h = Math.max(54, height * 0.063);
    return {
      x: width / 2 - w / 2,
      y: this._finalCtaTop(),
      w,
      h,
    };
  }

  _finalCtaTop() {
    return height * 0.875;
  }

  _drawTip(message, x, y, alignMode = CENTER) {
    const size = this._responsiveSize(17, 12, 23);
    const badge = 'Tip';
    textStyle(BOLD);
    textSize(size);
    const badgeW = textWidth(badge) + size * 1.05;
    const badgeH = size * 1.5;
    const gap = size * 0.65;
    const messageW = textWidth(message);
    const totalW = badgeW + gap + messageW;
    const startX = alignMode === LEFT ? x : width / 2 - totalW / 2;

    noStroke();
    fill(225);
    rect(startX, y - badgeH / 2, badgeW, badgeH, badgeH * 0.22);
    fill(220, 0, 235);
    textAlign(CENTER, CENTER);
    text(badge, startX + badgeW / 2, y);
    textAlign(LEFT, CENTER);
    text(message, startX + badgeW + gap, y);
  }

  _drawTipAtTop(message, top, alignMode = CENTER) {
    this._drawTip(message, width / 2, top + this._tipBadgeHeight() / 2, alignMode);
  }

  _tipBadgeHeight() {
    return this._responsiveSize(17, 12, 23) * 1.5;
  }

  _drawFinalPanelTip(message, x, y, maxW) {
    const size = this._responsiveSize(12, 9, 14);
    const badge = 'Tip';
    textStyle(BOLD);
    textSize(size);
    const badgeW = textWidth(badge) + size * 1.05;
    const badgeH = size * 1.5;
    const gap = size * 0.65;
    const textMaxW = Math.max(20, maxW - badgeW - gap);
    const top = y - badgeH / 2;

    noStroke();
    fill(225);
    rect(x, top, badgeW, badgeH, badgeH * 0.22);
    fill(220, 0, 235);
    textAlign(CENTER, CENTER);
    text(badge, x + badgeW / 2, y);
    textAlign(LEFT, TOP);
    text(message, x + badgeW + gap, top, textMaxW, badgeH);
  }

  _drawFinalPanelArrow(startX, startY, endX, endY) {
    const angle = Math.atan2(endY - startY, endX - startX);
    const headLen = Math.max(8, height * 0.013);
    const headW = headLen * 0.72;
    const baseX = endX - Math.cos(angle) * headLen;
    const baseY = endY - Math.sin(angle) * headLen;
    const perpX = Math.cos(angle + HALF_PI) * headW;
    const perpY = Math.sin(angle + HALF_PI) * headW;

    stroke(220, 0, 235);
    strokeWeight(Math.max(2, height * 0.003));
    strokeCap(ROUND);
    line(startX, startY, endX, endY);
    noStroke();
    fill(220, 0, 235);
    triangle(endX, endY, baseX + perpX, baseY + perpY, baseX - perpX, baseY - perpY);
  }

  _drawMouseOverlay(imageRect, overlay = true) {
    if (!this.mouseImg) return;
    if (Array.isArray(overlay)) {
      for (const item of overlay) {
        this._drawMouseOverlay(imageRect, item);
      }
      return;
    }

    const config = overlay === true ? {} : overlay;
    const mouseH = imageRect.h * (config.heightRatio ?? 0.19);
    const mouseW = mouseH * (this.mouseImg.width / this.mouseImg.height);
    let x;
    let y;

    if (typeof config.targetXRatio === 'number' && typeof config.targetYRatio === 'number') {
      const anchorXRatio = config.anchorXRatio ?? 0.36;
      const anchorYRatio = config.anchorYRatio ?? 0.37;
      x = imageRect.x + imageRect.w * config.targetXRatio - mouseW * anchorXRatio;
      y = imageRect.y + imageRect.h * config.targetYRatio - mouseH * anchorYRatio;
    } else {
      x = imageRect.x + imageRect.w * (config.xRatio ?? 0.66);
      y = imageRect.y + imageRect.h - mouseH * (config.bottomOverlapRatio ?? 0.34);
    }

    imageMode(CORNER);
    image(this.mouseImg, x, y, mouseW, mouseH);
  }

  _drawImageFallback(step, imageRect) {
    fill(160);
    noStroke();
    textSize(14);
    textStyle(NORMAL);
    textAlign(CENTER, CENTER);
    text(step.imagePath, imageRect.x + imageRect.w / 2, imageRect.y + imageRect.h / 2);
  }

  _drawMediaContain(media, imageRect, aspectRatio = null) {
    if (!media) return imageRect;

    const mediaAspect = aspectRatio || this._mediaAspect(media);
    if (!mediaAspect) return imageRect;

    const drawH = Math.min(imageRect.h, imageRect.w / mediaAspect);
    const drawW = drawH * mediaAspect;
    const drawX = imageRect.x + (imageRect.w - drawW) / 2;
    const drawY = imageRect.y + (imageRect.h - drawH) / 2;
    imageMode(CORNER);
    image(media, drawX, drawY, drawW, drawH);

    return {
      x: drawX,
      y: drawY,
      w: drawW,
      h: drawH,
      r: imageRect.r,
    };
  }

  _mediaAspect(media) {
    if (media?.elt?.videoWidth && media?.elt?.videoHeight) {
      return media.elt.videoWidth / media.elt.videoHeight;
    }
    if (media?.width && media?.height) {
      return media.width / media.height;
    }
    return null;
  }

  _drawImageContain(img, imageRect) {
    if (!img || !img.width || !img.height) return imageRect;

    const scale = Math.min(imageRect.w / img.width, imageRect.h / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const drawX = imageRect.x + (imageRect.w - drawW) / 2;
    const drawY = imageRect.y + (imageRect.h - drawH) / 2;
    imageMode(CORNER);
    image(img, drawX, drawY, drawW, drawH);

    return {
      x: drawX,
      y: drawY,
      w: drawW,
      h: drawH,
      r: imageRect.r,
    };
  }

  _drawImageCover(img, x, y, w, h) {
    if (!img || !img.width || !img.height) return;
    const scale = Math.max(w / img.width, h / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    imageMode(CORNER);
    image(img, x + (w - drawW) / 2, y + (h - drawH) / 2, drawW, drawH);
  }

  _drawArrows(skipHov) {
    const leftArrow = this._arrowHitRect(-1);
    const rightArrow = this._arrowHitRect(1);
    const leftCenter = this._arrowCenter(-1);
    const rightCenter = this._arrowCenter(1);
    let hoverHandled = skipHov;

    if (this.currentStep > 0) {
      const lHov = isHovered(leftArrow.x, leftArrow.y, leftArrow.w, leftArrow.h);
      this._drawArrowButton(this.leftButtonImg, '‹', leftCenter.x, leftCenter.y);
      hoverHandled = hoverHandled || lHov;
    }

    if (this.currentStep < this.steps.length - 1) {
      const rHov = isHovered(rightArrow.x, rightArrow.y, rightArrow.w, rightArrow.h);
      this._drawArrowButton(this.rightButtonImg, '›', rightCenter.x, rightCenter.y);
      hoverHandled = hoverHandled || rHov;
    }

    const cta = this._finalCtaRect();
    if (cta) hoverHandled = hoverHandled || isHovered(cta.x, cta.y, cta.w, cta.h);

    cursor(hoverHandled ? HAND : ARROW);
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

    fill(220, 40, 180);
    noStroke();
    textSize(100);
    textStyle(NORMAL);
    textAlign(CENTER, CENTER);
    text(fallbackLabel, centerX, centerY);
  }

  _responsiveSize(base, minSize, maxSize) {
    return Math.max(minSize, Math.min(maxSize, base * (height / 900)));
  }
}
