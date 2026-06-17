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
    this.bgColors = BG_COLORS;
    this.availablePots = [];
    this.selectedPotAsset = 0;
    this.selectedPotColor = 0;
    this.selectedBgType = 'color';
    this.selectedBgColor = 0;
    this.selectedBgImagePath = '';

    // 줄기 세부 설정
    this.selectedStemIndex = -1; // -1 = 선택 안 됨
    this.stemColors = ['#222222', '#FFFFFF', '#1A7A1A', '#66FF44', '#AAAAAA'];
    this.stemShapes = ['직선형', '곡선형', '지그재그형', '물결형'];
    this.selectedStemColor = 0;
    this.selectedStemShape = 0;
    this.stemAngle = 0;
    this.workingStems = [];
    this.activeSlider = null;
    this.sliderHitAreas = [];
    this.deleteStemButtonRect = null;
    this.pendingStemDeletion = false;
    this.hoveredStemButtonIndex = -1;

    // 드래그용
    this.isDraggingAngle = false;
    this.isDraggingStem = false;
    this.draggingStemIndex = -1;
    // 임시 저장 (건너뛰기용)
    this._savedState = null;
    this.currentPot = null;
    this.entrySource = null;
    this.isSaving = false;
    this.optionsScrollBarAlpha = 0;
    this.optionsScrollBarHoldFrames = 0;
    this.optionsContentHeight = null;
    this.optionsVisibleHeight = null;
  }

  show(mode = 'new', pot = null, options = {}) {
    this.isVisible = true;
    this.mode = mode;
    this.currentPot = pot;
    this.entrySource = options.entrySource ?? null;
    this.isSaving = false;
    this.optionsScrollBarAlpha = 0;
    this.optionsScrollBarHoldFrames = 0;
    this.optionsContentHeight = null;
    this.optionsVisibleHeight = null;
    this.scrollY = 0;
    this.targetScrollY = 0;
    this.maxScrollY = 0;
    this.pendingOptionClick = null;
    this.selectedStemIndex = -1;
    this.isDraggingAngle = false;
    this.isDraggingStem = false;
    this.draggingStemIndex = -1;
    this.activeSlider = null;
    this.sliderHitAreas = [];
    this.deleteStemButtonRect = null;
    this.pendingStemDeletion = false;
    this.hoveredStemButtonIndex = -1;
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
      this.selectedBgType = 'color';
      this.selectedBgColor = floor(random(this.bgColors.length));
      this.selectedBgImagePath = '';
    } else {
      let savedAssetIndex = this.availablePots.indexOf(pot?.potAssetName);
      this.selectedPotAsset = savedAssetIndex >= 0 ? savedAssetIndex : pot?.potAssetIndex ?? 0;
      this.selectedPotAsset = constrain(this.selectedPotAsset, 0, Math.max(0, this.availablePots.length - 1));
      this.selectedPotColor = pot?.colorIndex ?? 0;
      this.selectedBgColor = constrain(pot?.bgIndex ?? 0, 0, this.bgColors.length - 1);
      const savedBgImagePath = pot?.bgImagePath ?? '';
      const savedBgImageAllowed = getPotBackgroundOptions(theme)
        .some(option => option.path === savedBgImagePath);
      this.selectedBgType = (pot?.bgType === 'image' || savedBgImagePath) && savedBgImageAllowed
        ? 'image'
        : 'color';
      this.selectedBgImagePath = this.selectedBgType === 'image' ? savedBgImagePath : '';
    }

    this._savedState = {
      potAsset: this.selectedPotAsset,
      potColor: this.selectedPotColor,
      bgType: this.selectedBgType,
      bgColor: this.selectedBgColor,
      bgImagePath: this.selectedBgImagePath,
      stems: this.workingStems.map((stem) => this.#cloneStem(stem)),
    };
  }

  hide() {
    this.isVisible = false;
  }

  // 외부에서 특정 줄기를 선택 상태로 설정
  selectStem(index) {
    this.selectedStemIndex = index;
    const stem = this.workingStems[index];
    if (!stem) return;
    this.selectedStemColor = stem.stemColor;
    this.selectedStemShape = stem.stemShape;
    this.stemAngle = stem.stemAngle ?? stem.angle ?? 0;
  }

  getData() {
    return {
      potAssetIndex: this.selectedPotAsset,
      potAssetName: this.availablePots?.[this.selectedPotAsset] ?? '',
      colorIndex: this.selectedPotColor,
      bgType: this.selectedBgType,
      bgIndex: this.selectedBgColor,
      bgColor: this.bgColors[this.selectedBgColor],
      bgImagePath: this.selectedBgType === 'image' ? this.selectedBgImagePath : '',
      stems: this.workingStems.map((stem) => this.#cloneStem(stem)),
    };
  }

  // ── 화분 미리보기 그리기 ──
  drawPreview(x, y, w, h) {
    drawPotComposition({
      ...this.currentPot,
      potAssetName: this.availablePots?.[this.selectedPotAsset],
      potAssetIndex: this.selectedPotAsset,
      colorIndex: this.selectedPotColor,
      bgType: this.selectedBgType,
      bgIndex: this.selectedBgColor,
      bgImagePath: this.selectedBgImagePath,
      stems: this.workingStems,
    }, x, y, w, h, {
      selectedStemIndex: this.selectedStemIndex,
      hoveredStemIndex: this.hoveredStemButtonIndex,
      highlightHover: true,
    });
  }

  _previewStems(layout, lengthScale = 1) {
    return buildPotRenderStems(
      { ...this.currentPot, stems: this.workingStems },
      layout,
      { lengthScale }
    ).map((stem, i) => {
      stem.isSelected = this.selectedStemIndex === i;
      stem.isHovered = this._distToPath(mouseX, mouseY, stem.displayPoints) < 15;
      return stem;
    });
  }

  _stemPathPoints(stem, shapeIdx) {
    switch (shapeIdx) {
      case 1:
        return this._curvedStemPoints(stem);
      case 2:
        return this._waveStemPoints(stem, 5, stem.data.waveWidth, true);
      case 3:
        return this._waveStemPoints(stem, 3, stem.data.waveWidth, false);
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
    let dx = end.x - start.x;
    let dy = end.y - start.y;
    let length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) {
      return [start];
    }

    let tangent = { x: dx / length, y: dy / length };
    let normal = { x: -tangent.y, y: tangent.x };
    let depth = constrain(stem.data.curveDepth, -100, 100) / 100;
    let sharpness = constrain(stem.data.curveSharpness, 0, 100) / 100;
    let midpoint = {
      x: (start.x + end.x) / 2 + normal.x * length * depth * 0.5,
      y: (start.y + end.y) / 2 + normal.y * length * depth * 0.5,
    };
    let smoothHandle = length * 0.24;
    let smoothIn = {
      x: midpoint.x - tangent.x * smoothHandle,
      y: midpoint.y - tangent.y * smoothHandle,
    };
    let smoothOut = {
      x: midpoint.x + tangent.x * smoothHandle,
      y: midpoint.y + tangent.y * smoothHandle,
    };
    let sharpIn = {
      x: lerp(start.x, midpoint.x, 0.55),
      y: lerp(start.y, midpoint.y, 0.55),
    };
    let sharpOut = {
      x: lerp(midpoint.x, end.x, 0.45),
      y: lerp(midpoint.y, end.y, 0.45),
    };
    let controlIn = {
      x: lerp(smoothIn.x, sharpIn.x, sharpness),
      y: lerp(smoothIn.y, sharpIn.y, sharpness),
    };
    let controlOut = {
      x: lerp(smoothOut.x, sharpOut.x, sharpness),
      y: lerp(smoothOut.y, sharpOut.y, sharpness),
    };

    for (let i = 0; i <= 14; i++) {
      points.push(this._quadraticPoint(start, controlIn, midpoint, i / 14));
    }
    for (let i = 1; i <= 14; i++) {
      points.push(this._quadraticPoint(midpoint, controlOut, end, i / 14));
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
    return (2 / Math.PI) * Math.asin(Math.sin(value * TWO_PI));
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

  #stemSectionY(panY) {
    const pots = this.availablePots ?? [];
    const potGridRows = Math.ceil(pots.length / 4);
    const potGridBottom = panY + 34 + potGridRows * (90 + 18 + 16);
    const nextOptionY = potGridBottom + 16;
    return nextOptionY + this.#backgroundPaletteHeight() + 18;
  }

  #backgroundGridConfig() {
    return { cols: 8, cellSize: 48, gap: 10, labelHeight: 22 };
  }

  #backgroundOptions() {
    return [
      ...this.bgColors.map((colorValue, index) => ({
        type: 'color',
        color: colorValue,
        colorIndex: index,
        label: `Color ${index + 1}`,
      })),
      ...getPotBackgroundOptions(this.#potTheme()).map(option => ({ ...option })),
    ];
  }

  #backgroundPaletteHeight() {
    const { cols, cellSize, gap, labelHeight } = this.#backgroundGridConfig();
    const rows = Math.ceil(this.#backgroundOptions().length / cols);
    return labelHeight + rows * cellSize + Math.max(0, rows - 1) * gap;
  }

  #isBackgroundOptionSelected(option) {
    if (option.type === 'color') {
      return this.selectedBgType === 'color' && this.selectedBgColor === option.colorIndex;
    }
    return this.selectedBgType === 'image' && this.selectedBgImagePath === option.path;
  }

  #selectBackgroundOption(option) {
    if (option.type === 'color') {
      this.selectedBgType = 'color';
      this.selectedBgColor = option.colorIndex;
      this.selectedBgImagePath = '';
      return;
    }

    this.selectedBgType = 'image';
    this.selectedBgImagePath = option.path;
  }

  #revealOptionsScrollBar(holdFrames = 45) {
    this.optionsScrollBarHoldFrames = max(this.optionsScrollBarHoldFrames, holdFrames);
  }

  #isNearOptionsScrollBar(controlsClip) {
    const hoverW = 76;
    return mouseX >= controlsClip.x + controlsClip.w - hoverW &&
      mouseX <= controlsClip.x + controlsClip.w + 8 &&
      mouseY >= controlsClip.y &&
      mouseY <= controlsClip.y + controlsClip.h;
  }

  #updateOptionsScrollBarState(controlsClip, contentHeight, visibleHeight) {
    const hasOverflow = this.maxScrollY > 1;
    const heightChanged = this.optionsContentHeight !== null &&
      (
        Math.abs(contentHeight - this.optionsContentHeight) > 1 ||
        Math.abs(visibleHeight - this.optionsVisibleHeight) > 1
      );

    this.optionsContentHeight = contentHeight;
    this.optionsVisibleHeight = visibleHeight;

    if (!hasOverflow) {
      this.optionsScrollBarHoldFrames = 0;
      this.optionsScrollBarAlpha = lerp(this.optionsScrollBarAlpha, 0, 0.12);
      return;
    }

    const isHovering = this.#isNearOptionsScrollBar(controlsClip);
    if (heightChanged) {
      this.#revealOptionsScrollBar(55);
    }

    const isActive = isHovering || this.optionsScrollBarHoldFrames > 0;
    this.optionsScrollBarAlpha = lerp(
      this.optionsScrollBarAlpha,
      isActive ? 1 : 0,
      isActive ? 0.32 : 0.055
    );

    if (!isHovering && this.optionsScrollBarHoldFrames > 0) {
      this.optionsScrollBarHoldFrames -= 1;
    }
  }

  #drawOptionsScrollBar(controlsClip, contentHeight, visibleHeight) {
    if (this.maxScrollY <= 1 || this.optionsScrollBarAlpha < 0.01) return;

    const padY = 8;
    const trackW = 8;
    const trackX = controlsClip.x + controlsClip.w - 16;
    const trackY = controlsClip.y + padY;
    const trackH = controlsClip.h - padY * 2;
    const thumbH = constrain(trackH * visibleHeight / max(contentHeight, visibleHeight), 36, trackH);
    const scrollRatio = constrain(this.scrollY / this.maxScrollY, 0, 1);
    const thumbY = trackY + (trackH - thumbH) * scrollRatio;
    const alpha = this.optionsScrollBarAlpha;

    noStroke();
    fill(120, 120, 120, 42 * alpha);
    rect(trackX, trackY, trackW, trackH, trackW / 2);
    fill(100, 100, 100, 155 * alpha);
    rect(trackX, thumbY, trackW, thumbH, trackW / 2);
  }

  #stemButtonBounds(index, x, y) {
    const buttonW = 54;
    const buttonH = 150;
    const gap = 14;
    return {
      x: x + index * (buttonW + gap),
      y,
      w: buttonW,
      h: buttonH,
    };
  }

  #stemButtonIndexAt(x, y, clipRect = null) {
    if (this.workingStems.length === 0) return -1;
    if (clipRect && !this.#isPointInRect(mouseX, mouseY, clipRect)) return -1;

    for (let i = 0; i < this.workingStems.length; i++) {
      if (this.#isPointInRect(mouseX, mouseY, this.#stemButtonBounds(i, x, y))) {
        return i;
      }
    }
    return -1;
  }

  #drawStemSelectionButtons(x, y) {
    if (this.workingStems.length === 0) return y;

    const buttonH = 150;
    for (let i = 0; i < this.workingStems.length; i++) {
      const bounds = this.#stemButtonBounds(i, x, y);
      const isSelected = this.selectedStemIndex === i;
      const isHovered = this.#isPointInRect(mouseX, mouseY, bounds);

      fill(isSelected ? color(255, 230, 255) : isHovered ? 252 : 255);
      stroke(isSelected ? color(255, 0, 255) : isHovered ? color(230, 190, 230) : 225);
      strokeWeight(isSelected ? 2.5 : 1);
      rect(bounds.x, bounds.y, bounds.w, bounds.h, 5);

      this.#drawStraightStemButtonPreview(this.workingStems[i], bounds);

      noFill();
      stroke(isSelected ? color(255, 0, 255) : isHovered ? color(230, 190, 230) : 225);
      strokeWeight(isSelected ? 2.5 : 1);
      rect(bounds.x, bounds.y, bounds.w, bounds.h, 5);

      if (this.#consumeOptionClick(bounds.x, bounds.y, bounds.w, bounds.h)) {
        this.selectStem(i);
        this.isDraggingStem = false;
        this.draggingStemIndex = -1;
      }
    }

    return y + buttonH + 28;
  }

  #drawStraightStemButtonPreview(stem, bounds) {
    const padding = 8;
    const cx = bounds.x + bounds.w / 2;
    const tipY = bounds.y + 20;
    const allBeads = stem.beads ?? [];
    const previewBeads = allBeads.slice().reverse();
    const previewBeadCount = allBeads.length > 0
      ? previewBeads.length
      : stem.beadCount ?? 0;
    const beadStep = 18.5;
    const renderedLength = max(bounds.h, previewBeadCount * beadStep + 12);
    const baseY = tipY + renderedLength;
    const data = {
      ...stem,
      beads: previewBeads,
      beadCount: previewBeadCount,
      stemShape: 0,
      stemAngle: 0,
      angle: 0,
    };
    const points = [
      { x: cx, y: tipY },
      { x: cx, y: baseY },
    ];
    const placements = beadPathPlacements(
      points,
      data.beads,
      data.beads.length || data.beadCount || 0,
      18,
      0.5,
      'start'
    );
    const visiblePlacements = [];
    const visibleBeads = [];
    for (let i = 0; i < placements.length; i++) {
      if (!this.#stemButtonPlacementIntersects(bounds, placements[i])) continue;
      visiblePlacements.push(placements[i]);
      visibleBeads.push(data.beads[i]);
    }
    const visibleData = {
      ...data,
      beads: visibleBeads,
      beadCount: visiblePlacements.length,
    };
    const previewStem = {
      data: visibleData,
      points,
      beadPlacements: visiblePlacements,
      displayPoints: this.#pathPointsThroughDistance(
        points,
        min(stemPathLength(points), bounds.h - padding)
      ),
    };

    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.roundRect(bounds.x, bounds.y, bounds.w, bounds.h, 5);
    drawingContext.clip();

    stroke(getStemColor(this.currentPot, data.stemColor));
    strokeWeight(4);
    drawPotRenderPath(previewStem.displayPoints);
    this.#drawStemBeads(previewStem);

    drawingContext.restore();
  }

  #stemButtonPlacementIntersects(bounds, placement) {
    if (!placement) return false;
    const halfW = (placement.width ?? placement.height ?? 0) / 2;
    const halfH = (placement.height ?? placement.width ?? 0) / 2;
    return (
      placement.x + halfW >= bounds.x &&
      placement.x - halfW <= bounds.x + bounds.w &&
      placement.y + halfH >= bounds.y &&
      placement.y - halfH <= bounds.y + bounds.h
    );
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
    textSize(14); textStyle(BOLD); textAlign(LEFT);
    text(label, x, y);

    for (let i = 0; i < colors.length; i++) {
      let cx = x + i * 58;
      let cy = y + 12;
      fill(colors[i]);
      if (i === selected) {
        stroke(255, 0, 255); strokeWeight(2.5);
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

  _drawBackgroundPalette(label, x, y) {
    const options = this.#backgroundOptions();
    const { cols, cellSize, gap, labelHeight } = this.#backgroundGridConfig();

    fill(30); noStroke();
    textSize(14); textStyle(BOLD); textAlign(LEFT);
    text(label, x, y);

    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      const col = i % cols;
      const row = floor(i / cols);
      const sx = x + col * (cellSize + gap);
      const sy = y + labelHeight + row * (cellSize + gap);
      const selected = this.#isBackgroundOptionSelected(option);

      fill(selected ? color(255, 230, 255) : 248);
      stroke(selected ? color(255, 0, 255) : 210);
      strokeWeight(selected ? 2.5 : 1);
      rect(sx, sy, cellSize, cellSize, 7);

      if (option.type === 'color') {
        fill(option.color);
        stroke(220);
        strokeWeight(1);
        rect(sx + 8, sy + 8, cellSize - 16, cellSize - 16, 6);
      } else {
        const img = getPotBackgroundImage(option.path);
        if (!drawRoundedImageCover(img, sx + 5, sy + 5, cellSize - 10, cellSize - 10, 5)) {
          fill(232); noStroke();
          rect(sx + 5, sy + 5, cellSize - 10, cellSize - 10, 5);
        }
      }

      if (selected) {
        fill(255, 0, 255); noStroke();
        rect(sx + cellSize - 18, sy + 4, 14, 14, 3);
        fill(255); textSize(9); textAlign(CENTER, CENTER);
        text('✓', sx + cellSize - 11, sy + 11);
      }

      if (this.#consumeOptionClick(sx, sy, cellSize, cellSize)) {
        this.#selectBackgroundOption(option);
      }
    }
  }

  _drawStemSlider(
    label,
    key,
    minValue,
    maxValue,
    step,
    x,
    y,
    widthValue = 330,
    decimalPlaces = 0,
    valueLabels = null
  ) {
    let stem = this.workingStems[this.selectedStemIndex];
    if (!stem) return;

    let value = constrain(Number(stem[key]) || 0, minValue, maxValue);
    stem[key] = value;
    let normalized = (value - minValue) / (maxValue - minValue);
    let trackY = y + 28;

    fill(30); noStroke();
    textSize(13); textStyle(NORMAL); textAlign(LEFT, CENTER);
    text(label, x, y + 4);
    if (!valueLabels) {
      fill(120); textAlign(RIGHT, CENTER);
      text(Number(value).toFixed(decimalPlaces), x + widthValue, y + 4);
    }

    stroke(205); strokeWeight(6); strokeCap(ROUND);
    line(x, trackY, x + widthValue, trackY);
    stroke(255, 0, 255); strokeWeight(6);
    line(x, trackY, x + widthValue * normalized, trackY);
    noStroke(); fill(255, 0, 255);
    circle(x + widthValue * normalized, trackY, 18);

    if (valueLabels) {
      fill(120); noStroke();
      textSize(11); textStyle(NORMAL);
      textAlign(LEFT, TOP);
      text(valueLabels.start, x, trackY + 12);
      if (valueLabels.middle) {
        textAlign(CENTER, TOP);
        text(valueLabels.middle, x + widthValue / 2, trackY + 12);
      }
      textAlign(RIGHT, TOP);
      text(valueLabels.end, x + widthValue, trackY + 12);
    }

    this.sliderHitAreas.push({
      key,
      minValue,
      maxValue,
      step,
      x,
      y: trackY - 14,
      w: widthValue,
      h: 28,
    });
  }

  // ── 각도 다이얼 그리기 ──
  _drawAngleDial(x, y, r) {
    // 배경 원
    fill(220); noStroke();
    ellipse(x, y, r * 2);

    // 선택 부채꼴
    fill(255, 0, 255, 120); noStroke();
    arc(x, y, r * 2, r * 2, -HALF_PI, -HALF_PI + radians(this.stemAngle), PIE);

    // 바늘
    let nx = x + cos(radians(this.stemAngle) - HALF_PI) * (r - 10);
    let ny = y + sin(radians(this.stemAngle) - HALF_PI) * (r - 10);
    stroke(255, 0, 255); strokeWeight(3);
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

    this.sliderHitAreas = [];
    this.deleteStemButtonRect = null;

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

    // 타이틀
    noStroke(); fill(30);
    textStyle(BOLD); textSize(18); textAlign(CENTER);
    text(`[${this.currentPot?.name ?? '화분'}] 꾸미기`, width / 2, popY + 38);

    // 구분선
    stroke(220); strokeWeight(1);
    line(popX + 20, popY + 52, popX + popW - 20, popY + 52);

    // ── 오른쪽: 설정 패널 위치 ──
    let panX = popX + 440;
    let panY = popY + 62 - this.scrollY;
    let controlsClip = {
      x: popX + 431,
      y: popY + 53,
      w: popW - 431,
      h: popH - 123,
    };
    const stemSecYForHover = this.#stemSectionY(panY);
    this.hoveredStemButtonIndex = this.#stemButtonIndexAt(panX, stemSecYForHover + 20, controlsClip);

    // ── 왼쪽: 미리보기 ──
    let prevX = popX + 20, prevY = popY + 62;
    let prevW = 400, prevH = 520;
    this.drawPreview(prevX, prevY, prevW, prevH);

    // 세로 구분선
    stroke(220); strokeWeight(1);
    line(popX + 430, popY + 52, popX + 430, popY + popH - 70);
    noStroke();

    // 오른쪽 패널 클리핑 — 팝업 경계 밖으로 콘텐츠가 삐져나오지 않도록
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(controlsClip.x, controlsClip.y, controlsClip.w, controlsClip.h);
    drawingContext.clip();

    // 화분 선택 타이틀
    fill(30); textStyle(BOLD); textSize(14); textAlign(LEFT);
    text('화분 선택', panX, panY + 20);

    // 화분 이미지 그리드 (3열)
    const pots = this.availablePots ?? [];
    const cellW = 90, cellH = 90, colGap = 14, rowGap = 18;
    const cols = 4;
    for (let i = 0; i < pots.length; i++) {
      let col = i % cols;
      let row = Math.floor(i / cols);
      let sx = panX + col * (cellW + colGap);
      let sy = panY + 34 + row * (cellH + rowGap + 16);
      let isSel = (this.selectedPotAsset === i);

      // 셀 배경
      fill(isSel ? color(255, 230, 255) : 248);
      stroke(isSel ? color(255, 0, 255) : 210);
      strokeWeight(isSel ? 2.5 : 1);
      rect(sx, sy, cellW, cellH, 8);

      // 화분 이미지
      const asset = this.#potAssetAt(i);
      drawPotAsset(
        asset,
        asset?.theme,
        sx + cellW / 2,
        sy + cellH / 2,
        cellW - 16,
        cellH - 16,
        this.selectedPotColor,
        true
      );

      // 선택 체크
      if (isSel) {
        fill(255, 0, 255); noStroke();
        rect(sx + cellW - 20, sy + 4, 16, 16, 3);
        fill(255); textSize(10); textAlign(CENTER, CENTER);
        text('✓', sx + cellW - 12, sy + 12);
      }

      if (this.#consumeOptionClick(sx, sy, cellW, cellH)) this.selectedPotAsset = i;
    }

    const potGridRows = Math.ceil(pots.length / cols);
    const potGridBottom = panY + 34 + potGridRows * (cellH + rowGap + 16);
    let nextOptionY = potGridBottom + 16;

    // 배경 선택
    this._drawBackgroundPalette('배경 선택', panX, nextOptionY);

    // 줄기 세부 설정
    let stemSecY = this.#stemSectionY(panY);
    let contentBottomOffset = stemSecY - panY + 60;
    fill(30); noStroke(); textStyle(BOLD); textSize(14); textAlign(LEFT);
    text('줄기 세부 설정', panX, stemSecY);

    let stemButtonsBottom = stemSecY + 20;
    if (this.workingStems.length > 0) {
      stemButtonsBottom = this.#drawStemSelectionButtons(panX, stemSecY + 20);
      contentBottomOffset = stemButtonsBottom - panY + 24;
    } else if (this.selectedStemIndex === -1) {
      fill(160); textStyle(NORMAL); textSize(12);
      text('아직 꾸밀 수 있는 줄기가 없어요.', panX, stemSecY + 20);
    }

    if (this.selectedStemIndex !== -1) {
      let secY = this.workingStems.length > 0 ? stemButtonsBottom + 4 : stemSecY;
      // ── 줄기 위치 (맨 위) ──
      secY += 24;
      fill(30); noStroke(); textStyle(BOLD); textSize(14); textAlign(LEFT);
      text('줄기 위치', panX, secY);
      secY += 20;
      fill(150); textStyle(NORMAL); textSize(12);
      text('미리보기 속 줄기를 좌우로 드래그하거나 아래 조절바를 드래그하여 줄기 배치를 바꾸세요.', panX, secY);
      secY += 24;
      this._drawStemSlider('', 'baseOffset', -60, 60, 1, panX, secY, 330, 0,
        { start: '왼쪽', end: '오른쪽' });
      secY += 68;

      // ── 줄기 색상 ──
      this._drawColorPalette(
        '줄기 색상', this.stemColors, this.selectedStemColor,
        panX, secY,
        (i) => {
          this.selectedStemColor = i;
          this.workingStems[this.selectedStemIndex].stemColor = i;
        }
      );
      secY += 100;

      // ── 줄기 형태 ──
      fill(30); textStyle(BOLD); textSize(14); textAlign(LEFT);
      text('줄기 형태', panX, secY);
      secY += 20;
      for (let i = 0; i < this.stemShapes.length; i++) {
        let sx = panX + i * 98;
        let isSelected = (this.selectedStemShape === i);
        fill(isSelected ? color(255, 230, 255) : 248);
        stroke(isSelected ? color(255, 0, 255) : 210);
        strokeWeight(isSelected ? 2.5 : 1);
        rect(sx, secY, 82, 52, 6);
        this._drawStemShapeButton(i, sx, secY, 82, 52);
        noStroke(); fill(isSelected ? color(255, 0, 255) : 100);
        textSize(12); textAlign(CENTER);
        text(this.stemShapes[i], sx + 41, secY + 68);
        if (this.#consumeOptionClick(sx, secY, 82, 52)) {
          this.selectedStemShape = i;
          this.workingStems[this.selectedStemIndex].stemShape = i;
        }
      }
      secY += 92;

      // ── 형태별 슬라이더 ──
      if (this.selectedStemShape === 1) {
        this._drawStemSlider('모양', 'curveSharpness', 0, 100, 1, panX, secY, 330, 0,
          { start: '둥글게', end: '각지게' });
        secY += 76;
        this._drawStemSlider('휘어짐', 'curveDepth', -100, 100, 1, panX, secY, 330, 0,
          { start: '왼쪽으로', middle: '0', end: '오른쪽으로' });
        secY += 82;
      } else if (this.selectedStemShape === 2) {
        this._drawStemSlider('휘어짐', 'waveWidth', 0, 12, 0.5, panX, secY, 330, 1);
        secY += 82;
      } else if (this.selectedStemShape === 3) {
        this._drawStemSlider('휘어짐', 'waveWidth', 0, 20, 0.5, panX, secY, 330, 1);
        secY += 82;
      } else {
        secY += 12;
      }

      // ── 각도 다이얼 ──
      fill(30); noStroke(); textStyle(BOLD); textSize(14); textAlign(LEFT);
      text('줄기 기울기', panX, secY);
      fill(150); textStyle(NORMAL); textSize(14);
      text(`${this.stemAngle}°`, panX + 96, secY);
      this._drawAngleDial(panX + 70, secY + 86, 60);
      secY += 200;

      // ── 삭제 버튼 ──
      let deleteW = 180, deleteH = 40;
      let deleteHov = isHovered(panX, secY, deleteW, deleteH);
      fill(deleteHov ? color(185, 45, 65) : color(215, 70, 85)); noStroke();
      rect(panX, secY, deleteW, deleteH, 20);
      fill(255); textStyle(BOLD); textSize(13); textAlign(CENTER, CENTER);
      text('선택한 줄기 삭제', panX + deleteW / 2, secY + deleteH / 2);
      this.deleteStemButtonRect = { x: panX, y: secY, w: deleteW, h: deleteH };
      contentBottomOffset = secY + deleteH - panY + 24;
    }

    let visibleContentH = popH - 132;
    this.maxScrollY = max(0, contentBottomOffset - visibleContentH);
    this.targetScrollY = constrain(this.targetScrollY, 0, this.maxScrollY);
    this.#updateOptionsScrollBarState(controlsClip, contentBottomOffset, visibleContentH);

    drawingContext.restore();
    this.pendingOptionClick = null;
    this.#drawOptionsScrollBar(controlsClip, contentBottomOffset, visibleContentH);

    // ── 하단 버튼 ──
    // 이전으로
    let skipX = popX + 28, skipY = popY + popH - 62;
    let skipHov = isHovered(skipX, skipY, 140, 44);
    fill(skipHov ? 160 : 180); noStroke();
    rect(skipX, skipY, 140, 44, 22);
    fill(255); textSize(14); textStyle(NORMAL); textAlign(CENTER, CENTER);
    text('← 이전으로', skipX + 70, skipY + 22);

    // 저장하기 위 안내문구
    let saveX = popX + popW - 168, saveY = popY + popH - 62;
    noStroke(); fill(150); textSize(11); textStyle(NORMAL); textAlign(RIGHT);
    text('화분의 디자인은 언제든지 수정할 수 있어요.', saveX + 140, saveY - 10);

    // 저장하기
    let saveHov = !this.isSaving && isHovered(saveX, saveY, 140, 44);
    fill(this.isSaving ? 120 : saveHov ? 55 : 30); noStroke();
    rect(saveX, saveY, 140, 44, 22);
    fill(255); textSize(14); textAlign(CENTER, CENTER);
    text(this.isSaving ? '저장 중...' : '저장하기', saveX + 70, saveY + 22);

    if (this.pendingStemDeletion) {
      this.#drawStemDeleteConfirmation();
    } else if (
      skipHov ||
      saveHov ||
      this.hoveredStemButtonIndex >= 0 ||
      this.#isPointInRect(mouseX, mouseY, this.deleteStemButtonRect)
    ) {
      cursor(HAND);
    } else {
      cursor(ARROW);
    }
  }

  // 마우스 클릭으로 줄기 선택
  onMousePressed() {
    if (!this.isVisible) return;
    if (this.isSaving) return;

    let popW = 1060, popH = 700;
    let popX = width / 2 - popW / 2;
    let popY = height / 2 - popH / 2;
    let controlsClip = {
      x: popX + 431,
      y: popY + 53,
      w: popW - 431,
      h: popH - 123,
    };

    if (this.pendingStemDeletion) {
      let buttons = this.#stemDeleteConfirmationButtons();
      if (this.#isPointInRect(mouseX, mouseY, buttons.confirm)) {
        this.workingStems.splice(this.selectedStemIndex, 1);
        this.selectedStemIndex = -1;
        this.pendingStemDeletion = false;
      } else if (this.#isPointInRect(mouseX, mouseY, buttons.cancel)) {
        this.pendingStemDeletion = false;
      }
      return;
    }

    let slider = this.sliderHitAreas.find((area) =>
      this.#isPointInRect(mouseX, mouseY, area) &&
      this.#isPointInRect(mouseX, mouseY, controlsClip)
    );
    if (slider) {
      this.activeSlider = slider;
      this.#updateActiveSlider();
      return;
    }

    if (this.#isPointInRect(mouseX, mouseY, this.deleteStemButtonRect) &&
      this.#isPointInRect(mouseX, mouseY, controlsClip)) {
      this.pendingStemDeletion = true;
      this.isDraggingAngle = false;
      this.isDraggingStem = false;
      this.draggingStemIndex = -1;
      return;
    }

    // 이전으로 버튼
    let skipX = popX + 28, skipY = popY + popH - 62;
    if (mouseX > skipX && mouseX < skipX + 140 &&
      mouseY > skipY && mouseY < skipY + 44) {
      this.#restoreSavedState();
      if (this.entrySource === 'pot-setup') {
        this.#returnToPotSetup();
        return;
      }
      this.hide();
      goTo(GAME_STATE.GARDEN_LIST);
      return;
    }

    let saveX = popX + popW - 168, saveY = popY + popH - 62;
    if (mouseX > saveX && mouseX < saveX + 140 &&
      mouseY > saveY && mouseY < saveY + 44) {
      this.#saveAndReturn();
      return;
    }

    let layout = this.#previewLayout(popX + 20, popY + 62, 400, 520);
    this.#constrainStemOffsets(layout);
    let stems = this._previewStems(layout, 1.2);

    for (let i = 0; i < stems.length; i++) {
      let s = stems[i];
      let d = this._distToPath(mouseX, mouseY, s.displayPoints);
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
    if (this.activeSlider) {
      this.#updateActiveSlider();
      return;
    }

    if (!this.isVisible || !this.isDraggingStem || this.draggingStemIndex < 0) {
      return;
    }

    let popW = 1060, popH = 700;
    let popX = width / 2 - popW / 2;
    let popY = height / 2 - popH / 2;
    let layout = this.#previewLayout(popX + 20, popY + 62, 400, 520);
    let maxOffset = this.#stemOffsetLimit(layout);
    this.workingStems[this.draggingStemIndex].baseOffset =
      constrain(mouseX - layout.cx, -maxOffset, maxOffset);
  }

  onMouseReleased() {
    this.isDraggingAngle = false;
    this.isDraggingStem = false;
    this.draggingStemIndex = -1;
    this.activeSlider = null;
  }

  onMouseWheel(delta) {
    if (!this.isVisible || this.pendingStemDeletion) return;
    if (delta !== 0) {
      this.#revealOptionsScrollBar(45);
    }
    this.targetScrollY = constrain(this.targetScrollY + delta, 0, this.maxScrollY);
  }

  #updateActiveSlider() {
    if (!this.activeSlider || this.selectedStemIndex < 0) return;

    let slider = this.activeSlider;
    let normalized = constrain((mouseX - slider.x) / slider.w, 0, 1);
    let rawValue = lerp(slider.minValue, slider.maxValue, normalized);
    let value = Math.round(rawValue / slider.step) * slider.step;
    this.workingStems[this.selectedStemIndex][slider.key] =
      constrain(value, slider.minValue, slider.maxValue);
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
    this.selectedBgType = this._savedState.bgType;
    this.selectedBgColor = this._savedState.bgColor;
    this.selectedBgImagePath = this._savedState.bgImagePath;
    this.workingStems = this._savedState.stems.map((stem) => this.#cloneStem(stem));
  }

  #applyCurrentData() {
    if (!this.currentPot) {
      this.currentPot = { name: '내 첫 번째 화분', desc: '', stems: [], locked: false };
    }

    let data = this.getData();
    this.currentPot.potAssetIndex = data.potAssetIndex;
    this.currentPot.potAssetName = data.potAssetName;
    this.currentPot.colorIndex = data.colorIndex;
    this.currentPot.bgType = data.bgType;
    this.currentPot.bgIndex = data.bgIndex;
    this.currentPot.bgColor = data.bgColor;
    this.currentPot.bgImagePath = data.bgImagePath;
    this.currentPot.stems = data.stems;

    if (this.currentPot.firestoreId) {
      return updatePotDecor(this.currentPot.firestoreId, data);
    }

    if (this.mode !== 'new') {
      return Promise.resolve();
    }

    return createPot({ ...this.currentPot, ...data })
      .then(potId => {
        this.currentPot.firestoreId = potId;
        this.currentPot.createdBy = this.currentPot.createdBy ?? myDeviceId;
        this.currentPot.createdAt = this.currentPot.createdAt ?? Date.now();
        this.mode = 'edit';
      });
  }

  async #saveAndReturn() {
    if (this.isSaving) return;

    this.isSaving = true;
    try {
      await this.#applyCurrentData();
      this.#returnToPotDetail();
    } catch (err) {
      this.isSaving = false;
      console.error('[Firestore] 꾸미기 저장 오류:', err);
    }
  }

  #returnToPotDetail() {
    this.hide();
    potDetailUI.show(this.currentPot);
    goTo(GAME_STATE.POT_PREVIEW);
  }

  #returnToPotSetup() {
    const draftPot = this.currentPot;
    this.hide();
    potSetupUI.show(draftPot);
    goTo(GAME_STATE.NEW_POT);
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
    return createPotRenderLayout({
      ...this.currentPot,
      potAssetName: this.availablePots?.[this.selectedPotAsset],
      potAssetIndex: this.selectedPotAsset,
    }, x, y, w, h);
  }

  #stemOffsetLimit(layout) {
    const openingRatio = layout.asset?.stemOpeningRatio ?? 0.8;
    return max(0, layout.potSize.width * openingRatio / 2 - 4);
  }

  #stemBaseY(layout, baseOffset) {
    const maxOffset = this.#stemOffsetLimit(layout);
    if (maxOffset <= 0) return layout.baseY;

    const normalizedX = constrain(baseOffset / maxOffset, -1, 1);
    const curve = layout.asset?.stemOpeningCurveRatio ?? 0;
    const tilt = layout.asset?.stemOpeningTiltRatio ?? 0;
    return layout.baseY +
      layout.potSize.height * (
        curve * normalizedX * normalizedX +
        tilt * normalizedX
      );
  }

  #constrainStemOffsets(layout) {
    const maxOffset = this.#stemOffsetLimit(layout);
    for (let stem of this.workingStems) {
      stem.baseOffset = constrain(stem.baseOffset, -maxOffset, maxOffset);
    }
  }

  #normalizeStem(stem, index) {
    const defaultAngles = [340, 0, 20, 330, 30];
    const defaultOffsets = [-48, 0, 48, -24, 24];
    const stemShape = stem?.stemShape ?? 0;
    const defaultWaveWidth = stemShape === 3 ? 12 : 13;
    const waveWidthMax = stemShape === 2 ? 12 : stemShape === 3 ? 20 : Infinity;
    const waveWidth = constrain(
      Number(stem?.waveWidth ?? defaultWaveWidth),
      0,
      waveWidthMax
    );
    return {
      ...this.#cloneStem(stem),
      stemColor: stem?.stemColor ?? 0,
      stemShape,
      stemAngle: stem?.stemAngle ?? stem?.angle ?? defaultAngles[index % defaultAngles.length],
      angle: stem?.stemAngle ?? stem?.angle ?? defaultAngles[index % defaultAngles.length],
      baseOffset: stem?.baseOffset ?? defaultOffsets[index % defaultOffsets.length],
      stemLength: stem?.stemLength ?? 210,
      curveSharpness: stem?.curveSharpness ?? 45,
      curveDepth: stem?.curveDepth ?? 45,
      waveWidth,
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

  #drawStemDeleteConfirmation() {
    let modalW = 420;
    let modalH = 220;
    let modalX = width / 2 - modalW / 2;
    let modalY = height / 2 - modalH / 2;
    let buttons = this.#stemDeleteConfirmationButtons();

    fill(0, 0, 0, 120); noStroke();
    rect(0, 0, width, height);
    fill(255); stroke(220); strokeWeight(1);
    rect(modalX, modalY, modalW, modalH, 14);

    fill(30); noStroke(); textStyle(BOLD); textSize(18); textAlign(CENTER, CENTER);
    text('줄기를 삭제할까요?', width / 2, modalY + 50);
    fill(120); textStyle(NORMAL); textSize(13);
    text('삭제한 줄기는 저장하기 전까지만 되돌릴 수 있어요.', width / 2, modalY + 88);

    let cancelHov = this.#isPointInRect(mouseX, mouseY, buttons.cancel);
    fill(cancelHov ? 225 : 240); stroke(210); strokeWeight(1);
    rect(buttons.cancel.x, buttons.cancel.y, buttons.cancel.w, buttons.cancel.h, 22);
    fill(80); noStroke(); textStyle(BOLD);
    text('취소', buttons.cancel.x + buttons.cancel.w / 2, buttons.cancel.y + buttons.cancel.h / 2);

    let confirmHov = this.#isPointInRect(mouseX, mouseY, buttons.confirm);
    fill(confirmHov ? color(175, 35, 55) : color(210, 60, 75)); noStroke();
    rect(buttons.confirm.x, buttons.confirm.y, buttons.confirm.w, buttons.confirm.h, 22);
    fill(255);
    text('삭제', buttons.confirm.x + buttons.confirm.w / 2, buttons.confirm.y + buttons.confirm.h / 2);
    cursor(cancelHov || confirmHov ? HAND : ARROW);
  }

  #stemDeleteConfirmationButtons() {
    let modalW = 420;
    let modalH = 220;
    let modalX = width / 2 - modalW / 2;
    let modalY = height / 2 - modalH / 2;
    let buttonW = 150;
    let buttonH = 44;
    let gap = 16;
    return {
      cancel: {
        x: modalX + (modalW - buttonW * 2 - gap) / 2,
        y: modalY + modalH - 68,
        w: buttonW,
        h: buttonH,
      },
      confirm: {
        x: modalX + (modalW - buttonW * 2 - gap) / 2 + buttonW + gap,
        y: modalY + modalH - 68,
        w: buttonW,
        h: buttonH,
      },
    };
  }

  #isPointInRect(x, y, rectValue) {
    return !!rectValue &&
      x >= rectValue.x && x <= rectValue.x + rectValue.w &&
      y >= rectValue.y && y <= rectValue.y + rectValue.h;
  }

  #drawStemBeads(stem) {
    let beads = stem.data.beads ?? [];
    let count = beads.length || stem.data.beadCount || 0;
    let placements = stem.beadPlacements ?? this.#stemBeadPlacements(stem);

    for (let i = 0; i < count; i++) {
      let placement = placements[i];
      let bead = beads[i];
      let asset = bead?.assetId ? getBeadAtlasEntry(bead.assetId) : null;
      let imageAsset = bead?.beadId ? beadImages[bead.beadId] : null;

      if (asset) {
        drawBeadAtlas(
          asset,
          placement.x,
          placement.y,
          placement.width,
          placement.height,
          placement.angle
        );
      } else if (imageAsset) {
        push();
        translate(placement.x, placement.y);
        rotate(placement.angle);
        imageMode(CENTER);
        image(imageAsset, 0, 0, placement.width, placement.height);
        pop();
      } else {
        noStroke();
        fill(bead?.color ?? 200);
        ellipse(placement.x, placement.y, placement.height);
      }
    }
  }

  #stemBeadPlacements(stem) {
    let beads = stem.data.beads ?? [];
    let count = beads.length || stem.data.beadCount || 0;
    return beadPathPlacements(stem.points, beads, count, 18, 0.5, 'start');
  }

  #stemDisplayPoints(stem) {
    let placements = stem.beadPlacements ?? [];
    if (placements.length === 0) {
      return stem.points;
    }

    let last = placements[placements.length - 1];
    let endDistance = (last.pathDistance ?? stemPathLength(stem.points)) +
      (last.visibleWidth ?? last.width) / 2;
    return this.#pathPointsThroughDistance(stem.points, endDistance);
  }

  #pathPointsThroughDistance(points, endDistance) {
    if (points.length < 2) return points;

    let result = [points[0]];
    let travelled = 0;
    for (let i = 1; i < points.length; i++) {
      let segmentLength = dist(
        points[i - 1].x,
        points[i - 1].y,
        points[i].x,
        points[i].y
      );
      if (travelled + segmentLength >= endDistance) {
        let t = segmentLength > 0
          ? constrain((endDistance - travelled) / segmentLength, 0, 1)
          : 0;
        result.push({
          x: lerp(points[i - 1].x, points[i].x, t),
          y: lerp(points[i - 1].y, points[i].y, t),
        });
        return result;
      }
      result.push(points[i]);
      travelled += segmentLength;
    }
    return result;
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
