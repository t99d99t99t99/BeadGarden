class TutorialUI {
  constructor() {
    this.video       = null;
    this.hasWatched  = false; // 1회 이상 재생 완료 여부
    this.isPlaying   = false;
    this._videoReady = false;

    // 영상 파일이 존재하면 자동으로 연결
    // → assets/tutorial.mp4 를 넣으면 바로 동작
    try {
      this.video = createVideo('assets/tutorial.mp4', () => {
        this._videoReady = true;
      });
      this.video.hide();          // HTML 엘리먼트 숨김 (p5 캔버스 위에 수동 렌더)
      this.video.volume(1);
      this.video.elt.onended = () => {
        this.isPlaying  = false;
        this.hasWatched = true;
      };
    } catch (e) {
      // 파일이 없으면 플레이스홀더 모드로 동작
      this.video = null;
    }
  }

  // 외부에서 화면 진입 시 호출 (sketch.js goTo(TUTORIAL) 전에)
  enter() {
    this.isPlaying = false;
    if (this.video) {
      this.video.stop();
      this.video.time(0);
    }
  }

  _togglePlay() {
    if (!this.video || !this._videoReady) return;
    if (this.isPlaying) {
      this.video.pause();
      this.isPlaying = false;
    } else {
      this.video.play();
      this.isPlaying = true;
    }
  }

  _currentTime() {
    if (this.video && this._videoReady) return this.video.time();
    return 0;
  }

  _duration() {
    if (this.video && this._videoReady) {
      let d = this.video.duration();
      return (isFinite(d) && d > 0) ? d : 1;
    }
    return 1;
  }

  _seekTo(ratio) {
    if (!this.video || !this._videoReady) return;
    this.video.time(ratio * this._duration());
  }

  onMousePressed() {
    if (gameState !== TUTORIAL) return;

    let pad  = 40;
    let vidX = pad;
    let vidY = 120;
    let vidW = width  - pad * 2;
    let vidH = height - vidY - pad;

    let barH     = 6;
    let barY     = vidY + vidH - 48;
    let barX     = vidX + 52;
    let barW     = vidW - 104;

    // 진행 바 클릭 → seek
    if (mouseX >= barX && mouseX <= barX + barW &&
        mouseY >= barY - 6 && mouseY <= barY + barH + 6) {
      this._seekTo((mouseX - barX) / barW);
      return;
    }

    // 하단 재생 버튼
    let playBtnX = vidX + 14;
    let playBtnY = barY - 14;
    if (mouseX >= playBtnX && mouseX <= playBtnX + 32 &&
        mouseY >= playBtnY && mouseY <= playBtnY + 32) {
      this._togglePlay();
      return;
    }

    // 중앙 재생 버튼 (정지 상태일 때만)
    if (!this.isPlaying) {
      let cx = width / 2, cy = vidY + vidH * 0.5;
      if (dist(mouseX, mouseY, cx, cy) < 36) {
        this._togglePlay();
        return;
      }
    }

    // 우상단 버튼
    let skipX = width - pad - 140, skipY = 32;
    if (mouseX >= skipX && mouseX <= skipX + 140 &&
        mouseY >= skipY && mouseY <= skipY + 48) {
      this._handleSkipOrGarden();
    }
  }

  _handleSkipOrGarden() {
    if (this.video) { this.video.pause(); this.isPlaying = false; }
    if (prevState === STEM_BEAD_CRAFT) {
      goTo(STEM_BEAD_CRAFT);
    } else {
      goTo(GARDEN);
    }
  }

  draw() {
    background(237, 242, 226); // intro와 동일한 연초록

    let pad  = 40;
    let vidX = pad;
    let vidY = 120;
    let vidW = width  - pad * 2;
    let vidH = height - vidY - pad;

    // ── 타이틀 ──
    noStroke();
    fill(160, 80, 200);
    textFont('monospace');
    textStyle(BOLD);
    textSize(22);
    textAlign(LEFT, CENTER);
    text('Tutorial', vidX + 10, 70);

    // ── 우상단 버튼 ──
    let skipX    = width - pad - 140;
    let skipY    = 32;
    let skipHov  = isHovered(skipX, skipY, 140, 48);
    let skipLabel = this.hasWatched
      ? (prevState === STEM_BEAD_CRAFT ? '돌아가기' : '가든으로 가기')
      : (prevState === STEM_BEAD_CRAFT ? '돌아가기' : '건너뛰기');
    fill(skipHov ? 100 : 130); noStroke();
    rect(skipX, skipY, 140, 48, 10);
    fill(255); textFont('sans-serif'); textStyle(NORMAL);
    textSize(15); textAlign(CENTER, CENTER);
    text(skipLabel, skipX + 70, skipY + 24);

    // ── 영상 영역 ──
    fill(220); noStroke();
    rect(vidX, vidY, vidW, vidH, 10);

    // 영상 프레임 렌더 (파일이 있을 때)
    if (this.video && this._videoReady) {
      image(this.video, vidX, vidY, vidW, vidH);
    } else {
      // 플레이스홀더 안내
      fill(160); noStroke();
      textFont('sans-serif'); textSize(14); textAlign(CENTER, CENTER); textStyle(NORMAL);
      text('assets/tutorial.mp4 를 추가하면\n영상이 여기에 재생됩니다.', width / 2, vidY + vidH * 0.4);
    }

    // ── 중앙 재생 버튼 (정지 상태) ──
    if (!this.isPlaying) {
      let cx = width / 2, cy = vidY + vidH * 0.5;
      fill(140, 195, 120, 220); noStroke();
      triangle(cx - 18, cy - 22, cx - 18, cy + 22, cx + 24, cy);
    }

    // ── 하단 컨트롤 바 ──
    let barH  = 6;
    let barY  = vidY + vidH - 46;
    let barX  = vidX + 52;
    let barW  = vidW - 104;

    // 재생 버튼 (왼쪽)
    let pBX = vidX + 14, pBY = barY - 12;
    if (this.isPlaying) {
      fill(140, 195, 120); noStroke();
      rect(pBX,      pBY, 9, 28, 2);
      rect(pBX + 14, pBY, 9, 28, 2);
    } else {
      fill(140, 195, 120); noStroke();
      triangle(pBX, pBY, pBX, pBY + 28, pBX + 24, pBY + 14);
    }

    // 진행 바 배경
    fill(210); noStroke();
    rect(barX, barY, barW, barH, 3);

    // 진행 바 채움
    let progress = this._currentTime() / this._duration();
    fill(140, 195, 120); noStroke();
    rect(barX, barY, barW * progress, barH, 3);

    // ── 커서 ──
    let anyHov = skipHov
      || isHovered(vidX + 14, barY - 14, 32, 32)
      || isHovered(barX, barY - 6, barW, barH + 12)
      || (!this.isPlaying && dist(mouseX, mouseY, width / 2, vidY + vidH * 0.5) < 36);
    if (anyHov) cursor(HAND); else cursor(ARROW);
  }
}
