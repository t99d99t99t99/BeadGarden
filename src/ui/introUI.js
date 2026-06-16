class IntroUI {
  constructor() {
    this.startTime = millis();
    this.duration = 3000; // 3초 후 자동 전환
    this.bgImg = null;
    loadImage('assets/backgrounds/intro_bg.png',
      img => { this.bgImg = img; },
      () => { console.warn('[IntroUI] intro_bg.png 로드 실패'); }
    );
  }

  enter() {
    this.startTime = millis();
  }

  drawLoadingBar() {
    const elapsed = millis() - this.startTime;
    const progress = constrain(elapsed / this.duration, 0, 1);
    const barW = Math.max(160, Math.min(width * 0.18, 260));
    const barH = Math.max(5, Math.min(height * 0.008, 8));
    const barX = width / 2 - barW / 2;
    const barY = height * 0.8;
    const radius = barH / 2;

    noStroke();
    fill(226, 226, 226);
    rect(barX, barY, barW, barH, radius);

    if (progress > 0) {
      fill(208, 40, 220);
      rect(barX, barY, Math.max(barH, barW * progress), barH, radius);
    }
  }

  draw() {
    // 이미지 로드 전 fallback
    if (!this.bgImg) {
      background(237, 242, 226);
      noStroke(); fill(160, 150, 140);
      textSize(18); textAlign(CENTER, CENTER); textStyle(NORMAL);
      text('BEAD GARDEN', width / 2, height / 2);
    } else {
      // 캔버스 전체에 맞게 이미지 표시
      background(237, 242, 226);
      imageMode(CORNER);
      image(this.bgImg, 0, 0, width, height);
    }

    this.drawLoadingBar();

    // 3초 후 자동 전환
    if (millis() - this.startTime > this.duration) {
      goTo(GAME_STATE.TUTORIAL);
    }
  }
}
