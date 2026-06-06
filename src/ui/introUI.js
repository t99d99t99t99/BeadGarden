class IntroUI {
  constructor() {
    this.startTime = millis();
    this.duration  = 3000;

    // 비즈 글자 폰트 경로 (pearl 비즈로 글자를 점묘화)
    this.beadFont = null;

    // 주변에 흩뿌릴 비즈 이미지 목록
    this.scatterBeads = [
      { path: 'assets/ocean/circleLPearl.png',   x: 0.59, y: 0.23, w: 22, h: 22, rot: 0 },
      { path: 'assets/star/circleLGlossy-1.png',  x: 0.72, y: 0.27, w: 42, h: 42, rot: 0 },
      { path: 'assets/star/circleSGlossy-3.png',  x: 0.70, y: 0.30, w: 30, h: 30, rot: 0 },
      { path: 'assets/plant/apple-1.png',          x: 0.16, y: 0.64, w: 48, h: 48, rot: -0.3 },
      { path: 'assets/ocean/seashell.png',         x: 0.24, y: 0.61, w: 36, h: 36, rot: 0.2 },
      { path: 'assets/star/rectShortGlossy-2.png', x: 0.66, y: 0.45, w: 20, h: 20, rot: 0.4 },
      { path: 'assets/plant/butterfly.png',        x: 0.27, y: 0.73, w: 32, h: 32, rot: -0.1 },
    ];
    this.scatterImgs = [];

    // "BEADS GARDEN" 비즈 글자 — 각 글자를 비즈 점으로 구성
    this._letterPaths = this._buildLetterPaths();

    // 산란 비즈 preload
    for (let b of this.scatterBeads) {
      this.scatterImgs.push(loadImage(b.path));
    }

    // 비즈 글자에 쓸 pearl 이미지
    this.pearlImg = loadImage('assets/ocean/circleLPearl.png');
  }

  // ── 글자 비즈 좌표 정의 (격자 기반 픽셀 폰트) ─────────────────────────────
  _buildLetterPaths() {
    // 각 글자 = 0/1 격자 (6열×7행)
    const glyphs = {
      B: [
        [1,1,1,0,0,0],
        [1,0,0,1,0,0],
        [1,0,0,1,0,0],
        [1,1,1,0,0,0],
        [1,0,0,0,1,0],
        [1,0,0,0,1,0],
        [1,1,1,1,0,0],
      ],
      E: [
        [1,1,1,1,1,0],
        [1,0,0,0,0,0],
        [1,0,0,0,0,0],
        [1,1,1,1,0,0],
        [1,0,0,0,0,0],
        [1,0,0,0,0,0],
        [1,1,1,1,1,0],
      ],
      A: [
        [0,0,1,1,0,0],
        [0,1,0,0,1,0],
        [1,0,0,0,0,1],
        [1,1,1,1,1,1],
        [1,0,0,0,0,1],
        [1,0,0,0,0,1],
        [1,0,0,0,0,1],
      ],
      D: [
        [1,1,1,1,0,0],
        [1,0,0,0,1,0],
        [1,0,0,0,0,1],
        [1,0,0,0,0,1],
        [1,0,0,0,0,1],
        [1,0,0,0,1,0],
        [1,1,1,1,0,0],
      ],
      S: [
        [0,1,1,1,1,0],
        [1,0,0,0,0,0],
        [1,0,0,0,0,0],
        [0,1,1,1,0,0],
        [0,0,0,0,1,0],
        [0,0,0,0,1,0],
        [1,1,1,1,0,0],
      ],
      G: [
        [0,1,1,1,1,0],
        [1,0,0,0,0,0],
        [1,0,0,0,0,0],
        [1,0,0,1,1,1],
        [1,0,0,0,0,1],
        [1,0,0,0,0,1],
        [0,1,1,1,1,0],
      ],
      R: [
        [1,1,1,1,0,0],
        [1,0,0,0,1,0],
        [1,0,0,0,1,0],
        [1,1,1,1,0,0],
        [1,0,1,0,0,0],
        [1,0,0,1,0,0],
        [1,0,0,0,1,0],
      ],
      N: [
        [1,0,0,0,0,1],
        [1,1,0,0,0,1],
        [1,0,1,0,0,1],
        [1,0,0,1,0,1],
        [1,0,0,0,1,1],
        [1,0,0,0,0,1],
        [1,0,0,0,0,1],
      ],
    };

    const rows = 7, cols = 6;
    const bead = 13;   // 비즈 간격(px)
    const gap  = 18;   // 글자 간격

    const line1 = ['B','E','A','D','S'];
    const line2 = ['G','A','R','D','E','N'];

    const totalW1 = line1.length * (cols * bead + gap) - gap;
    const totalW2 = line2.length * (cols * bead + gap) - gap;

    let result = { line1: [], line2: [] };

    for (let li = 0; li < line1.length; li++) {
      const ch = line1[li];
      const g  = glyphs[ch];
      const ox = -totalW1 / 2 + li * (cols * bead + gap);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (g[r][c]) result.line1.push({ dx: ox + c * bead, dy: r * bead });
        }
      }
    }

    for (let li = 0; li < line2.length; li++) {
      const ch = line2[li];
      const g  = glyphs[ch];
      const ox = -totalW2 / 2 + li * (cols * bead + gap);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (g[r][c]) result.line2.push({ dx: ox + c * bead, dy: r * bead });
        }
      }
    }

    return result;
  }

  _drawBeadText(cx, cy) {
    const bSize = 11;
    const rowH  = 13 * 7 + 24; // 한 줄 높이 + 줄 간격
    const img   = this.pearlImg;

    for (let p of this._letterPaths.line1) {
      let x = cx + p.dx;
      let y = cy + p.dy;
      if (img) {
        imageMode(CENTER);
        image(img, x, y, bSize, bSize);
      } else {
        noStroke(); fill(220, 218, 222);
        ellipse(x, y, bSize);
      }
    }

    for (let p of this._letterPaths.line2) {
      let x = cx + p.dx;
      let y = cy + rowH + p.dy;
      if (img) {
        imageMode(CENTER);
        image(img, x, y, bSize, bSize);
      } else {
        noStroke(); fill(220, 218, 222);
        ellipse(x, y, bSize);
      }
    }
    imageMode(CORNER);
  }

  draw() {
    // 연초록 배경
    background(237, 242, 226);

    // 중앙 흐릿한 발광 타원
    noStroke();
    for (let i = 10; i >= 1; i--) {
      let alpha = map(i, 10, 1, 4, 22);
      fill(210, 228, 200, alpha);
      ellipse(width / 2, height / 2, width * 0.62 * (i / 10), height * 0.72 * (i / 10));
    }

    // 흩뿌려진 비즈 이미지
    for (let i = 0; i < this.scatterBeads.length; i++) {
      let b   = this.scatterBeads[i];
      let img = this.scatterImgs[i];
      if (!img) continue;
      let x = b.x * width;
      let y = b.y * height;
      push();
      translate(x, y);
      rotate(b.rot);
      imageMode(CENTER);
      image(img, 0, 0, b.w, b.h);
      pop();
    }
    imageMode(CORNER);

    // "CREATE YOUR BEADS GARDEN" 서브타이틀
    noStroke();
    fill(140, 150, 130);
    textFont('sans-serif');
    textStyle(NORMAL);
    textSize(13);
    textAlign(CENTER, CENTER);
    text('CREATE YOUR BEADS GARDEN', width / 2, height * 0.295);

    // 비즈로 만든 "BEADS GARDEN" 타이틀
    this._drawBeadText(width / 2, height * 0.345);

    // 자동 전환
    if (millis() - this.startTime > this.duration) {
      goTo(TUTORIAL);
    }
  }
}
