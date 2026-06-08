class IntroUI {
  constructor() {
    this.startTime = millis();
    this.duration  = 3000; // 3초 후 자동 전환
    this.bgImg     = null;
    loadImage('assets/intro_bg.png',
      img => { this.bgImg = img; },
      ()  => { console.warn('[IntroUI] intro_bg.png 로드 실패'); }
    );
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

    // 3초 후 자동 전환
    if (millis() - this.startTime > this.duration) {
      goTo(TUTORIAL);
    }
  }
}
