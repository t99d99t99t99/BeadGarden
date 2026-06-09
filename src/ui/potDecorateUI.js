class PotDecorateUI {
  constructor() {
    this.isVisible = false;
    this.mode = 'new'; // 'new' | 'edit'
    this.scrollY = 0;
    this.targetScrollY = 0;
    this.maxScrollY = 0;
    this.pendingOptionClick = null;

    // 화분 설정
    this.potColors = POT_COLORS;
    this.bgColors  = ['#EDE8F5','#D6EAF8','#D5F5E3','#FEF9E7','#F9E4F0','#F5F5F5','#CCCCCC','#111111'];
    this.availablePots   = [];
    this.selectedPotAsset = 0;
    this.selectedPotColor = 0;
    this.selectedBgColor  = 0;

    // 줄기 세부 설정
    this.selectedStemIndex = -1; // -1 = 선택 안 됨
    this.stemColors = ['#222222', '#FFFFFF', '#1A7A1A', '#66FF44', '#AAAAAA'];
    this.stemShapes = ['직선형', '곡선형', '지그재그형', '물결형'];
    this.selectedStemColor = 0;
    this.selectedStemShape = 0;
    this.stemAngle = 0;
    this.workingStems = [];

    // 드래그용
    this.isDraggingAngle = false;
    this.isDraggingStem = false;
    this.draggingStemIndex = -1;
    // 임시 저장 (건너뛰기용)
    this._savedState = null;
    this.currentPot = null;
  }

  show(mode = 'new', pot = null) {
    this.isVisible = true;
    this.mode = mode;
    this.currentPot = pot;
    this.scrollY = 0;
    this.targetScrollY = 0;
    this.maxScrollY = 0;
    this.pendingOptionClick = null;
    this.selectedStemIndex = -1;
    this.isDraggingAngle = false;
    this.isDraggingStem = false;
    this.draggingStemIndex = -1;
    this.workingStems = (pot?.stems ?? []).map((stem, index) => this.#normalizeStem(stem, index));

    // 컨셉에 따라 사용 가능한 화분 에셋 목록 결정
    let theme = normalizePotTheme(pot);
    if (theme === POT_THEMES.LEGACY) {
      theme = themeForConcept(pot?.concept);
    }
    this.availablePots = getPotAssetsForTheme(theme).map((asset) => asset.id);

    // 테마별 줄기 색상 팔레트
    if (theme === POT_THEMES.OCEAN) {
      this.stemColors = ['#222222', '#FFFFFF', '#1B3FA0', '#7BE8F5', '#AAAAAA'];
    } else if (theme === POT_THEMES.STAR) {
      this.stemColors = ['#222222', '#FFFFFF', '#CC00CC', '#00CCBB', '#AAAAAA'];
    } else {
      // PLANT (기본)
      this.stemColors = ['#222222', '#FFFFFF', '#1A7A1A', '#66FF44', '#AAAAAA'];
    }

    if (mode === 'new') {
      this.selectedPotAsset = 0;
      this.selectedPotColor = 0;
      this.selectedBgColor  = floor(random(this.bgColors.length));
    } else {
      let savedAssetIndex = this.availablePots.indexOf(pot?.potAssetName);
      this.selectedPotAsset = savedAssetIndex >= 0 ? savedAssetIndex : pot?.potAssetIndex ?? 0;
      this.selectedPotAsset = constrain(this.selectedPotAsset, 0, Math.max(0, this.availablePots.length - 1));
      this.selectedPotColor = pot?.colorIndex ?? 0;
      this.selectedBgColor  = pot?.bgIndex ?? 0;
    }

    this._savedState = {
      potAsset: this.selectedPotAsset,
      potColor: this.selectedPotColor,
      bgColor:  this.selectedBgColor,
      stems:    this.workingStems.map((stem) => this.#cloneStem(stem)),
    };
  }

  hide() {
    this.isVisible = false;
  }

  getData() {
    return {
      potAssetIndex: this.selectedPotAsset,
      potAssetName:  this.availablePots?.[this.selectedPotAsset] ?? '',
      colorIndex:    this.selectedPotColor,
      bgIndex:       this.selectedBgColor,
      bgColor:       this.bgColors[this.selectedBgColor],
      stems:         this.workingStems.map((stem) => this.#cloneStem(stem)),
    };
  }

  // ── 화분 미리보기 그리기 ──
  drawPreview(x, y, w, h) {
    fill(this.bgColors[this.selectedBgColor]);
    noStroke();
    rect(x, y, w, h, 8);

    let layout = this.#previewLayout(x, y, w, h);
    let stems = this._previewStems(layout.cx, layout.baseY, 1.2);

    // Draw the pot first so stems remain visible all the way to their pivot.
    if (!drawPotAsset(
      layout.asset,
      layout.asset?.theme,
      layout.cx,
      layout.baseY + layout.potSize.height / 2,
      layout.potMaxWidth,
      layout.potMaxHeight,
      this.selectedPotColor
    )) {
      fill(200); noStroke();
      rect(layout.cx - 55, layout.baseY, 110, 96, 4);
    }

    for (let stem of stems) {
      if (stem.isSelected) {
        stroke(100, 100, 220, 80); strokeWeight(14); this._drawStemPath(stem.points);
      } else if (stem.isHovered) {
        stroke(180, 180, 220, 60); strokeWeight(10); this._drawStemPath(stem.points);
      }
      this.#drawStemBeads(stem, 'hole');
    }

    for (let stem of stems) {
      stroke(this.stemColors[stem.data.stemColor] ?? '#AAAAAA');
      strokeWeight(2);
      this._drawStemPath(stem.points);
    }

    for (let stem of stems) {
      this.#drawStemBeads(stem, 'body');
    }

    fill(100, 100, 200); noStroke();
    textSize(12); textAlign(CENTER); textStyle(NORMAL);
    text('(화분 미리보기)', layout.cx, y + h * 0.95);
  }

  _previewStems(cx, baseY, lengthScale = 1) {
    return this.workingStems.map((data, i) => {
      let baseX = cx + data.baseOffset;
      let angle = radians(data.stemAngle);
      let stemLength = data.stemLength * lengthScale;
      let stem = {
        data,
        baseX,
        baseY,
        tipX: baseX + sin(angle) * stemLength,
        tipY: baseY - cos(angle) * stemLength,
      };
      stem.points = this._stemPathPoints(stem, data.stemShape);
      stem.isSelected = this.selectedStemIndex === i;
      stem.isHovered = this._distToPath(mouseX, mouseY, stem.points) < 15;
      return stem;
    });
  }

  _stemPathPoints(stem, shapeIdx) {
    switch (shapeIdx) {
      case 1:
        return this._curvedStemPoints(stem);
      case 2:
        return this._waveStemPoints(stem, 5, 13, true);
      case 3:
        return this._waveStemPoints(stem, 3, 12, false);
      default:
        return [
          { x: stem.baseX, y: stem.baseY },
          { x: stem.tipX, y: stem.tipY }
        ];
    }
  }

  _curvedStemPoints(stem) {
    let points = [];
    let start = { x: stem.baseX, y: stem.baseY };
    let end = { x: stem.tipX, y: stem.tipY };
    let control = {
      x: start.x,
      y: start.y - this._distance(start, end) * 0.55
    };

    for (let i = 0; i <= 28; i++) {
      let t = i / 28;
      points.push(this._quadraticPoint(start, control, end, t));
    }

    return points;
  }

  _waveStemPoints(stem, cycles, amplitude, triangular) {
    let points = [];
    let dx = stem.tipX - stem.baseX;
    let dy = stem.tipY - stem.baseY;
    let length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) {
      return [{ x: stem.baseX, y: stem.baseY }];
    }

    let normalX = -dy / length;
    let normalY = dx / length;
    let samples = cycles * 12;

    for (let i = 0; i <= samples; i++) {
      let t = i / samples;
      let centerX = lerp(stem.baseX, stem.tipX, t);
      let centerY = lerp(stem.baseY, stem.tipY, t);
      let wave = triangular ? this._triangleWave(t * cycles) : sin(t * cycles * TWO_PI);
      points.push({
        x: centerX + normalX * amplitude * wave,
        y: centerY + normalY * amplitude * wave
      });
    }

    return points;
  }

  _drawStemPath(points) {
    if (points.length < 2) {
      return;
    }

    noFill();
    beginShape();
    for (let point of points) {
      vertex(point.x, point.y);
    }
    endShape();
  }

  _pointOnStemPath(points, t) {
    if (points.length === 0) {
      return { x: 0, y: 0 };
    }

    if (points.length === 1) {
      return points[0];
    }

    let scaled = constrain(t, 0, 1) * (points.length - 1);
    let index = min(floor(scaled), points.length - 2);
    let localT = scaled - index;
    return {
      x: lerp(points[index].x, points[index + 1].x, localT),
      y: lerp(points[index].y, points[index + 1].y, localT)
    };
  }

  _cubicPoint(p0, p1, p2, p3, t) {
    let u = 1 - t;
    return {
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y
    };
  }

  _quadraticPoint(p0, p1, p2, t) {
    let u = 1 - t;
    return {
      x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
      y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y
    };
  }

  _triangleWave(value) {
    let phase = value - floor(value);
    return 1 - 4 * abs(phase - 0.5);
  }

  _distance(a, b) {
    let dx = a.x - b.x;
    let dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  _drawPotShape(cx, baseY, shapeIdx) {
    switch (shapeIdx) {
      case 0: rect(cx - 45, baseY - 10, 90, 80, 4); break; // 사각형
      case 1: triangle(cx, baseY - 10, cx - 50, baseY + 70, cx + 50, baseY + 70); break; // 삼각형
      case 2: ellipse(cx, baseY + 35, 90, 90); break; // 원형
      case 3: // 지그재그형
        beginShape();
        vertex(cx - 40, baseY);
        vertex(cx - 20, baseY + 25);
        vertex(cx - 40, baseY + 50);
        vertex(cx + 40, baseY + 50);
        vertex(cx + 20, baseY + 25);
        vertex(cx + 40, baseY);
        endShape(CLOSE);
        break;
      case 4: // 비정형
        beginShape();
        vertex(cx - 30, baseY);
        vertex(cx - 50, baseY + 30);
        vertex(cx - 30, baseY + 70);
        vertex(cx + 40, baseY + 65);
        vertex(cx + 45, baseY + 30);
        vertex(cx + 25, baseY);
        endShape(CLOSE);
        break;
    }
  }

  _drawPotShapeButton(shapeIdx, x, y, w, h) {
    push();
    fill(this.potColors[this.selectedPotColor]);
    noStroke();
    let scale = 0.42;
    drawPotShapeAt(x + w / 2, y + h / 2 - 40 * scale, shapeIdx, scale);
    pop();
  }

  _drawStemShapeButton(shapeIdx, x, y, w, h) {
    let left = x + 14;
    let right = x + w - 14;
    let midY = y + h / 2;

    push();
    noFill();
    stroke(20);
    strokeWeight(2);
    strokeCap(ROUND);
    strokeJoin(ROUND);

    switch (shapeIdx) {
      case 0:
        line(left, midY, right, midY);
        break;
      case 1:
        beginShape();
        for (let i = 0; i <= 24; i++) {
          let t = i / 24;
          let px = lerp(left, right, t);
          let py = midY - sin(t * PI) * 18;
          vertex(px, py);
        }
        endShape();
        break;
      case 2:
        beginShape();
        vertex(left, midY + 12);
        vertex(left + (right - left) * 0.34, midY - 12);
        vertex(left + (right - left) * 0.62, midY + 12);
        vertex(right, midY - 12);
        endShape();
        break;
      case 3:
        beginShape();
        for (let i = 0; i <= 32; i++) {
          let t = i / 32;
          let px = lerp(left, right, t);
          let py = midY + sin(t * TWO_PI) * 12;
          vertex(px, py);
        }
        endShape();
        break;
    }

    pop();
  }

  _isStemHovered(x1, y1, x2, y2, idx) {
    // 마우스가 줄기 선 근처(15px)에 있는지 판단
    let d = this._distToSegment(mouseX, mouseY, x1, y1, x2, y2);
    return d < 15;
  }

  _distToSegment(px, py, x1, y1, x2, y2) {
    let dx = x2 - x1, dy = y2 - y1;
    let t = max(0, min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
    return dist(px, py, x1 + t * dx, y1 + t * dy);
  }

  _distToPath(px, py, points) {
    let closest = Infinity;
    for (let i = 0; i < points.length - 1; i++) {
      closest = min(
        closest,
        this._distToSegment(
          px,
          py,
          points[i].x,
          points[i].y,
          points[i + 1].x,
          points[i + 1].y
        )
      );
    }
    return closest;
  }

  // ── 색상 팔레트 그리기 ──
  _drawColorPalette(label, colors, selected, x, y, onSelect) {
    fill(30); noStroke();
    textSize(13); textStyle(NORMAL); textAlign(LEFT);
    text(label, x, y);

    for (let i = 0; i < colors.length; i++) {
      let cx = x + i * 58;
      let cy = y + 12;
      fill(colors[i]);
      if (i === selected) {
        stroke(47, 134, 255); strokeWeight(2.5);
      } else {
        stroke(200); strokeWeight(1);
      }
      ellipse(cx + 22, cy + 22, 40);
    }
    for (let i = 0; i < colors.length; i++) {
      let cx = x + i * 58;
      let cy = y + 12;
      if (this.#consumeOptionClick(cx + 2, cy + 2, 40, 40)) onSelect(i);
    }
  }

  // ── 각도 다이얼 그리기 ──
  _drawAngleDial(x, y, r) {
    // 배경 원
    fill(220); noStroke();
    ellipse(x, y, r * 2);

    // 선택 부채꼴
    fill(180); noStroke();
    arc(x, y, r * 2, r * 2, -HALF_PI, -HALF_PI + radians(this.stemAngle), PIE);

    // 바늘
    let nx = x + cos(radians(this.stemAngle) - HALF_PI) * (r - 10);
    let ny = y + sin(radians(this.stemAngle) - HALF_PI) * (r - 10);
    stroke(50); strokeWeight(3);
    line(x, y, nx, ny);

    // 드래그로 각도 조절
    if (this.isDraggingAngle) {
      let a = degrees(atan2(mouseY - y, mouseX - x)) + 90;
      this.stemAngle = (floor(a) + 360) % 360;
      if (this.selectedStemIndex >= 0) {
        this.workingStems[this.selectedStemIndex].stemAngle = this.stemAngle;
        this.workingStems[this.selectedStemIndex].angle = this.stemAngle;
      }
    }
    if (this.#consumeOptionClick(x - r, y - r, r * 2, r * 2)) {
      this.isDraggingAngle = true;
    }
  }

  draw() {
    if (!this.isVisible) return;

    // 부드러운 스크롤
    this.targetScrollY = constrain(this.targetScrollY, 0, this.maxScrollY);
    this.scrollY = lerp(this.scrollY, this.targetScrollY, 0.15);

    // 배경 dim
    fill(0, 0, 0, 100);
    noStroke();
    rect(0, 0, width, height);

    // 팝업 박스
    let popW = 1060, popH = 700;
    let popX = width / 2 - popW / 2;
    let popY = height / 2 - popH / 2;
    fill(255); stroke(220); strokeWeight(1);
    rect(popX, popY, popW, popH, 12);

    // X 버튼
    let xBtnX = popX + popW - 40, xBtnY = popY + 8, xBtnSize = 28;
    let xHov = isHovered(xBtnX, xBtnY, xBtnSize, xBtnSize);
    fill(xHov ? 210 : 235); noStroke();
    ellipse(xBtnX + xBtnSize / 2, xBtnY + xBtnSize / 2, xBtnSize);
    fill(80); textSize(16); textAlign(CENTER, CENTER);
    text('×', xBtnX + xBtnSize / 2, xBtnY + xBtnSize / 2);

    // 타이틀
    noStroke(); fill(30);
    textStyle(BOLD); textSize(18); textAlign(CENTER);
    text(`${this.currentPot?.name ?? '화분'} 꾸미기`, width / 2, popY + 38);

    // 구분선
    stroke(220); strokeWeight(1);
    line(popX + 20, popY + 52, popX + popW - 20, popY + 52);

    // ── 왼쪽: 미리보기 ──
    let prevX = popX + 20, prevY = popY + 62;
    let prevW = 400, prevH = 520;
    this.drawPreview(prevX, prevY, prevW, prevH);

    // ── 오른쪽: 설정 패널 (스크롤 적용) ──
    let panX = popX + 440;
    let panY = popY + 62 - this.scrollY;

    // 세로 구분선
    stroke(220); strokeWeight(1);
    line(popX + 430, popY + 52, popX + 430, popY + popH - 70);
    noStroke();

    // 오른쪽 패널 클리핑 — 팝업 경계 밖으로 콘텐츠가 삐져나오지 않도록
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(popX + 431, popY + 53, popW - 431, popH - 123);
    drawingContext.clip();

    // 화분 선택 타이틀
    fill(30); textStyle(BOLD); textSize(14); textAlign(LEFT);
    text('화분 선택', panX, panY + 20);

    // 화분 이미지 그리드 (3열)
    const pots = this.availablePots ?? [];
    const cellW = 90, cellH = 90, colGap = 14, rowGap = 18;
    const cols  = 4;
    for (let i = 0; i < pots.length; i++) {
      let col = i % cols;
      let row = Math.floor(i / cols);
      let sx  = panX + col * (cellW + colGap);
      let sy  = panY + 34 + row * (cellH + rowGap + 16);
      let isSel = (this.selectedPotAsset === i);

      // 셀 배경
      fill(isSel ? color(230, 232, 255) : 248);
      stroke(isSel ? color(60, 60, 220) : 210);
      strokeWeight(isSel ? 2 : 1);
      rect(sx, sy, cellW, cellH, 8);

      // 화분 이미지
      const asset = this.#potAssetAt(i);
      drawPotAsset(asset, asset?.theme, sx + cellW / 2, sy + cellH / 2, cellW - 16, cellH - 16, this.selectedPotColor);

      // 선택 체크
      if (isSel) {
        fill(60, 60, 220); noStroke();
        rect(sx + cellW - 20, sy + 4, 16, 16, 3);
        fill(255); textSize(10); textAlign(CENTER, CENTER);
        text('✓', sx + cellW - 12, sy + 12);
      }

      // 라벨
      noStroke(); fill(isSel ? color(60, 60, 200) : 120);
      textSize(10); textStyle(NORMAL); textAlign(CENTER);
      text(pots[i], sx + cellW / 2, sy + cellH + 12);

      if (this.#consumeOptionClick(sx, sy, cellW, cellH)) this.selectedPotAsset = i;
    }

    const potGridRows = Math.ceil(pots.length / cols);
    const potGridBottom = panY + 34 + potGridRows * (cellH + rowGap + 16);
    let nextOptionY = potGridBottom + 16;

    // 배경 색상
    this._drawColorPalette(
      '배경 색상', this.bgColors, this.selectedBgColor,
      panX, nextOptionY,
      (i) => { this.selectedBgColor = i; }
    );

    // 줄기 세부 설정
    let stemSecY = nextOptionY + 100;
    fill(30); noStroke(); textStyle(BOLD); textSize(14); textAlign(LEFT);
    text('줄기 세부 설정', panX, stemSecY);

    if (this.selectedStemIndex === -1) {
      fill(160); textStyle(NORMAL); textSize(12);
      text(
        this.workingStems.length > 0
          ? '미리보기 속 줄기를 선택하면 세부 설정이 열려요.'
          : '아직 꾸밀 수 있는 줄기가 없어요.',
        panX,
        stemSecY + 20
      );
    } else {
      // 줄기 색상
      this._drawColorPalette(
        '줄기 색상', this.stemColors, this.selectedStemColor,
        panX, stemSecY + 28,
        (i) => {
          this.selectedStemColor = i;
          this.workingStems[this.selectedStemIndex].stemColor = i;
        }
      );

      // 줄기 형태
      fill(30); textStyle(NORMAL); textSize(13); textAlign(LEFT);
      text('줄기 형태', panX, stemSecY + 116);
      for (let i = 0; i < this.stemShapes.length; i++) {
        let sx = panX + i * 98;
        let sy = stemSecY + 132;
        let isSelected = (this.selectedStemShape === i);
        fill(isSelected ? 240 : 248);
        stroke(isSelected ? 60 : 210);
        strokeWeight(isSelected ? 2 : 1);
        rect(sx, sy, 82, 52, 6);
        this._drawStemShapeButton(i, sx, sy, 82, 52);
        noStroke(); fill(100);
        textSize(11); textAlign(CENTER);
        text(this.stemShapes[i], sx + 41, sy + 64);
        if (this.#consumeOptionClick(sx, sy, 82, 52)) {
          this.selectedStemShape = i;
          this.workingStems[this.selectedStemIndex].stemShape = i;
        }
      }

      // 각도 다이얼
      fill(30); noStroke(); textStyle(BOLD); textSize(14); textAlign(LEFT);
      text('줄기 기울기', panX, stemSecY + 236);
      fill(150); textStyle(NORMAL); textSize(14);
      text(`${this.stemAngle}°`, panX + 92, stemSecY + 236);
      this._drawAngleDial(panX + 70, stemSecY + 320, 64);


      fill(30); noStroke(); textStyle(BOLD); textSize(14); textAlign(LEFT);
      text('줄기 위치', panX, stemSecY + 440);
      fill(180); textStyle(NORMAL); textSize(12);
      text('미리보기 속 줄기를 좌우로 드래그하여 줄기의 배치를 바꾸세요.', panX + 70, stemSecY + 440);
    }

    let contentBottomOffset = (this.selectedStemIndex === -1 ? 510 : 920);
    let visibleContentH = popH - 132;
    this.maxScrollY = max(0, contentBottomOffset - visibleContentH);
    this.targetScrollY = constrain(this.targetScrollY, 0, this.maxScrollY);

    drawingContext.restore();
    this.pendingOptionClick = null;

    // ── 하단 버튼 ──
    // 건너뛰기
    let skipX = popX + 28, skipY = popY + popH - 62;
    let skipHov = isHovered(skipX, skipY, 140, 44);
    fill(skipHov ? 160 : 180); noStroke();
    rect(skipX, skipY, 140, 44, 22);
    fill(255); textSize(14); textStyle(NORMAL); textAlign(CENTER, CENTER);
    text('건너뛰기', skipX + 70, skipY + 22);

    // 저장하기
    let saveX = popX + popW - 168, saveY = popY + popH - 62;
    let saveHov = isHovered(saveX, saveY, 140, 44);
    fill(saveHov ? 55 : 30); noStroke();
    rect(saveX, saveY, 140, 44, 22);
    fill(255); textSize(14); textAlign(CENTER, CENTER);
    text('저장하기', saveX + 70, saveY + 22);

    if (xHov || skipHov || saveHov) cursor(HAND); else cursor(ARROW);
  }

  // 마우스 클릭으로 줄기 선택
  onMousePressed() {
    if (!this.isVisible) return;

    let popW = 1060, popH = 700;
    let popX = width / 2 - popW / 2;
    let popY = height / 2 - popH / 2;

    // X 버튼
    if (mouseX > popX + popW - 40 && mouseX < popX + popW - 12 &&
      mouseY > popY + 8 && mouseY < popY + 36) {
      this.hide();
      goTo(GARDEN);
      return;
    }

    let skipX = popX + 28, skipY = popY + popH - 62;
    if (mouseX > skipX && mouseX < skipX + 140 &&
      mouseY > skipY && mouseY < skipY + 44) {
      this.#restoreSavedState();
      this.#returnToPotDetail();
      return;
    }

    let saveX = popX + popW - 168, saveY = popY + popH - 62;
    if (mouseX > saveX && mouseX < saveX + 140 &&
      mouseY > saveY && mouseY < saveY + 44) {
      this.#saveAndReturn();
      return;
    }

    let layout = this.#previewLayout(popX + 20, popY + 62, 400, 520);
    let stems = this._previewStems(layout.cx, layout.baseY, 1.2);

    for (let i = 0; i < stems.length; i++) {
      let s = stems[i];
      let d = this._distToPath(mouseX, mouseY, s.points);
      if (d < 15) {
        this.selectedStemIndex = i;
        this.#loadSelectedStemControls();
        this.isDraggingStem = true;
        this.draggingStemIndex = i;
        return;
      }
    }

    this.pendingOptionClick = { x: mouseX, y: mouseY };
  }

  onMouseDragged() {
    if (!this.isVisible || !this.isDraggingStem || this.draggingStemIndex < 0) {
      return;
    }

    let popW = 1060;
    let popX = width / 2 - popW / 2;
    let previewCenterX = popX + 20 + 200;
    this.workingStems[this.draggingStemIndex].baseOffset =
      constrain(mouseX - previewCenterX, -120, 120);
  }

  onMouseReleased() {
    this.isDraggingAngle = false;
    this.isDraggingStem = false;
    this.draggingStemIndex = -1;
  }

  onMouseWheel(delta) {
    if (!this.isVisible) return;
    this.targetScrollY = constrain(this.targetScrollY + delta, 0, this.maxScrollY);
  }

  #consumeOptionClick(x, y, w, h) {
    if (!this.pendingOptionClick) {
      return false;
    }

    let click = this.pendingOptionClick;
    let inside = click.x >= x && click.x <= x + w && click.y >= y && click.y <= y + h;
    if (inside) {
      this.pendingOptionClick = null;
    }

    return inside;
  }

  #restoreSavedState() {
    if (!this._savedState) return;
    this.selectedPotAsset = this._savedState.potAsset;
    this.selectedPotColor = this._savedState.potColor;
    this.selectedBgColor  = this._savedState.bgColor;
    this.workingStems = this._savedState.stems.map((stem) => this.#cloneStem(stem));
  }

  #applyCurrentData() {
    if (!this.currentPot) {
      this.currentPot = { name: '내 첫 번째 화분', desc: '', stems: [], locked: false };
    }

    let data = this.getData();
    this.currentPot.potAssetIndex = data.potAssetIndex;
    this.currentPot.potAssetName  = data.potAssetName;
    this.currentPot.colorIndex    = data.colorIndex;
    this.currentPot.bgIndex       = data.bgIndex;
    this.currentPot.stems         = data.stems;

    return this.currentPot.firestoreId
      ? updatePotDecor(this.currentPot.firestoreId, data)
      : Promise.resolve();
  }

  async #saveAndReturn() {
    try {
      await this.#applyCurrentData();
      this.#returnToPotDetail();
    } catch (err) {
      console.error('[Firestore] 꾸미기 저장 오류:', err);
    }
  }

  #returnToPotDetail() {
    this.hide();
    potDetailUI.show(this.currentPot);
    goTo(GARDEN);
  }

  #potTheme() {
    let theme = normalizePotTheme(this.currentPot);
    return theme === POT_THEMES.LEGACY ? themeForConcept(this.currentPot?.concept) : theme;
  }

  #potAssetAt(index) {
    return getPotAsset(this.availablePots?.[index], this.#potTheme());
  }

  #selectedPotAsset() {
    return this.#potAssetAt(this.selectedPotAsset);
  }

  #previewLayout(x, y, w, h) {
    const asset = this.#selectedPotAsset();
    const potMaxWidth = 220;
    const potMaxHeight = 190;
    const potSize = getPotAssetDrawSize(asset, potMaxWidth, potMaxHeight);
    const bottomMargin = 45;
    return {
      asset,
      potMaxWidth,
      potMaxHeight,
      potSize,
      cx: x + w / 2,
      baseY: y + h - bottomMargin - potSize.height,
    };
  }

  #normalizeStem(stem, index) {
    const defaultAngles = [340, 0, 20, 330, 30];
    const defaultOffsets = [-48, 0, 48, -24, 24];
    return {
      ...this.#cloneStem(stem),
      stemColor: stem?.stemColor ?? 0,
      stemShape: stem?.stemShape ?? 0,
      stemAngle: stem?.stemAngle ?? stem?.angle ?? defaultAngles[index % defaultAngles.length],
      angle: stem?.stemAngle ?? stem?.angle ?? defaultAngles[index % defaultAngles.length],
      baseOffset: stem?.baseOffset ?? defaultOffsets[index % defaultOffsets.length],
      stemLength: stem?.stemLength ?? 210,
      beads: (stem?.beads ?? []).map((bead) => ({ ...bead })),
    };
  }

  #cloneStem(stem) {
    return JSON.parse(JSON.stringify(stem ?? {}));
  }

  #loadSelectedStemControls() {
    let stem = this.workingStems[this.selectedStemIndex];
    if (!stem) return;

    this.selectedStemColor = stem.stemColor;
    this.selectedStemShape = stem.stemShape;
    this.stemAngle = stem.stemAngle;
  }

  #drawStemBeads(stem, layer) {
    let beads = stem.data.beads ?? [];
    let count = beads.length || stem.data.beadCount || 0;

    for (let i = 0; i < count; i++) {
      let t = (i + 1) / (count + 1);
      let point = this._pointOnStemPath(stem.points, t);
      let tangent = this.#stemTangentAt(stem.points, t);
      let bead = beads[i];
      let asset = bead?.assetId ? getBeadAtlasEntry(bead.assetId) : null;
      let imageAsset = bead?.beadId ? beadImages[bead.beadId] : null;

      if (asset) {
        let beadHeight = 18;
        let beadWidth = beadHeight * asset.source.w / asset.source.h;
        drawBeadAtlasLayer(
          asset,
          layer,
          point.x,
          point.y,
          beadWidth,
          beadHeight,
          atan2(tangent.y, tangent.x)
        );
      } else if (imageAsset && layer === 'body') {
        push();
        translate(point.x, point.y);
        rotate(atan2(tangent.y, tangent.x));
        imageMode(CENTER);
        image(imageAsset, 0, 0, 18, 18);
        pop();
      } else if (layer === 'body') {
        noStroke();
        fill(bead?.color ?? 200);
        ellipse(point.x, point.y, 14);
      }
    }
  }

  #stemTangentAt(points, t) {
    if (points.length < 2) return { x: 0, y: -1 };

    let scaled = constrain(t, 0, 1) * (points.length - 1);
    let index = min(floor(scaled), points.length - 2);
    return {
      x: points[index + 1].x - points[index].x,
      y: points[index + 1].y - points[index].y,
    };
  }
}
