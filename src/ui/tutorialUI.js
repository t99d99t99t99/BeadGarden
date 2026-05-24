class TutorialUI {
  constructor() {
    this.videoEnded = false;
    // 나중에 실제 영상 넣을 때: this.video = createVideo('assets/tutorial.mp4');
  }

  draw() {
    background(255);

    let pad = 50; // 전체 여백

    // ── 상단 헤더 ──
    // 타이틀
    fill(40);
    noStroke();
    textStyle(BOLD);
    textSize(24);
    textAlign(CENTER);
    text('Tutorial', width / 2, pad + 40);

    // 건너뛰기 버튼
    let btnW = 120, btnH = 48;
    let btnX = width - pad - btnW - 20;
    let btnY = pad + 15;
    let skipHov = isHovered(btnX, btnY, btnW, btnH);
    fill(skipHov ? 140 : 160); noStroke();
    rect(btnX, btnY, btnW, btnH, 10);
    fill(255);
    textStyle(NORMAL);
    textSize(15);
    textAlign(CENTER, CENTER);
    text('건너뛰기', btnX + btnW / 2, btnY + btnH / 2);
    if (skipHov) cursor(HAND); else cursor(ARROW);

    // 건너뛰기 클릭 판정
    if (isClicked(btnX, btnY, btnW, btnH)) {
      goTo(GARDEN);
    }

    // ── 영상 플레이스홀더 ──
    let vidX = pad;
    let vidY = pad + 110;
    let vidW = width - pad * 2;
    let vidH = height - vidY - pad;

    fill(210);
    noStroke();
    rect(vidX, vidY, vidW, vidH, 8);

    // 안내 텍스트 (나중에 삭제)
    fill(100, 100, 200);
    textSize(14);
    textAlign(CENTER, CENTER);
    text(
      '(게임 진행 튜토리얼 영상\n: 직접 우리가 해보는 영상 녹화하고 텍스트 입혀서 영상 제작)',
      width / 2, vidY + vidH * 0.3
    );

    // 일시정지 아이콘
    fill(150);
    noStroke();
    rect(width / 2 - 18, vidY + vidH * 0.55, 14, 44, 3);
    rect(width / 2 + 4, vidY + vidH * 0.55, 14, 44, 3);

    // 영상 끝나면 자동 전환 (지금은 임시로 수동 처리)
    if (this.videoEnded) {
      goTo(GARDEN);
    }
  }

  // 나중에 실제 영상 연결할 때 호출
  onVideoEnd() {
    this.videoEnded = true;
  }
}