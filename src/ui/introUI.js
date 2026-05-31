// introUI.js

class IntroUI {
  constructor() {
    this.startTime = millis();
    this.duration  = 2000; // 2초 후 자동 전환
    this.plants    = this.generatePlants(); // 장식용 비즈 식물 데이터
  }

  // 좌우 장식 식물 데이터 생성
  generatePlants() {
    let plants = [];

    // 왼쪽 식물들
    plants.push({ x: 160, stems: [
      { angle: -0.3, len: 420, beadCount: 8, beadSize: 28 },
      { angle: -0.05, len: 480, beadCount: 9, beadSize: 32 },
      { angle:  0.2, len: 300, beadCount: 4, beadSize: 22 },
      { angle:  0.35, len: 260, beadCount: 3, beadSize: 20 },
    ]});

    // 오른쪽 식물들
    plants.push({ x: 1100, stems: [
      { angle: -0.1, len: 500, beadCount: 7, beadSize: 30 },
      { angle:  0.1, len: 460, beadCount: 8, beadSize: 26 },
      { angle:  0.3, len: 380, beadCount: 5, beadSize: 24 },
      { angle:  0.5, len: 300, beadCount: 4, beadSize: 22 },
    ]});

    return plants;
  }

  drawPlant(plant) {
    for (let stem of plant.stems) {
      let baseX = plant.x;
      let baseY = height; // 화면 아래서 시작
      let tipX  = baseX + sin(stem.angle) * stem.len;
      let tipY  = baseY - cos(stem.angle) * stem.len;

      // 줄기 선
      stroke(180);
      strokeWeight(2);
      line(baseX, baseY, tipX, tipY);

      // 비즈들 — 줄기 위에 균등 배치
      noStroke();
      fill(200);
      for (let i = 0; i < stem.beadCount; i++) {
        let t  = (i + 1) / (stem.beadCount + 1);
        // 위쪽 비즈일수록 조금 작게
        let sz = map(t, 0, 1, stem.beadSize * 0.6, stem.beadSize);
        let bx = lerp(tipX, baseX, t);
        let by = lerp(tipY, baseY, t);
        ellipse(bx, by, sz);
      }
    }
  }

  draw() {
    background(255);

    // 좌우 장식 식물
    for (let plant of this.plants) {
      this.drawPlant(plant);
    }

    // 타이틀
    fill(40);
    noStroke();
    textFont('sans-serif');
    textStyle(BOLD);
    textSize(42);
    textAlign(LEFT);
    text('BEAD GARDEN', width * 0.4, height * 0.31);

    // 서브텍스트
    fill(120);
    textStyle(NORMAL);
    textSize(16);
    text('손끝으로 만들어낸 비즈 식물들의 정원', width * 0.4, height * 0.37);

    // (비즈 가든 이미지) 플레이스홀더 — 나중에 실제 이미지로 교체
    fill(100, 100, 220);
    textSize(14);
    textAlign(CENTER);
    text('(비즈 가든 이미지)', width * 0.48, height * 0.73);

    // 3초 타이머 → 자동 전환
    if (millis() - this.startTime > this.duration) {
      goTo(TUTORIAL);
    }
  }
}