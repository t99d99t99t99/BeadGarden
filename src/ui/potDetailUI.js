class PotDetailUI {
  constructor() {
    this.isVisible = false;
    this.pot       = null;
  }

  show(pot) {
    this.isVisible = true;
    this.pot = pot ?? {
      name:       '내 첫 번째 화분',
      desc:       '화분의 한 줄 설명이 적힙니다.',
      createdAt:  '2025.05.15',
      stems:      [],
      locked:     false,
      colorIndex: 0,
      bgIndex:    0,
      shapeIndex: 0,
    };
  }

  hide() {
    this.isVisible = false;
    this.pot = null;
  }

  drawPotPreview(x, y, w, h) {
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(x, y, w, h);
    drawingContext.clip();

    drawPotComposition(this.pot, x, y, w, h, {
      bottomMargin: 14,
    });

    let hasStem = this.pot.stems && this.pot.stems.length > 0;

    if (!hasStem) {
      fill(180); textSize(13); textStyle(NORMAL); textAlign(CENTER);
      text('아직 비즈 식물의 줄기가 없어요.\n새로운 비즈 줄기를 만들어서 식물을 심어주세요.',
        x + w / 2, y + h * 0.44);
    }

    drawingContext.restore();
  }

  #defaultStemAngle(index) {
    return [340, 0, 20, 330, 30][index % 5];
  }

  #defaultStemOffset(index) {
    return [-48, 0, 48, -24, 24][index % 5];
  }

  #boundedStemLength(x, y, w, h, baseX, baseY, angle, desiredLength) {
    let dx = sin(angle);
    let dy = -cos(angle);
    let margin = 22;
    let maxLength = desiredLength;

    if (dx > 0.001) maxLength = min(maxLength, (x + w - margin - baseX) / dx);
    if (dx < -0.001) maxLength = min(maxLength, (x + margin - baseX) / dx);
    if (dy > 0.001) maxLength = min(maxLength, (y + h - margin - baseY) / dy);
    if (dy < -0.001) maxLength = min(maxLength, (y + margin - baseY) / dy);

    return max(24, maxLength);
  }

  #stemPathPoints(stem, shapeIdx, stemData = {}) {
    if (shapeIdx === 1) {
      let points = [];
      let dx = stem.tipX - stem.baseX;
      let dy = stem.tipY - stem.baseY;
      let length = sqrt(dx * dx + dy * dy);
      if (length === 0) return [{ x: stem.baseX, y: stem.baseY }];

      let tangent = { x: dx / length, y: dy / length };
      let normal = { x: -tangent.y, y: tangent.x };
      let depth = constrain(stemData.curveDepth ?? 45, -100, 100) / 100;
      let sharpness = constrain(stemData.curveSharpness ?? 45, 0, 100) / 100;
      let midpoint = {
        x: (stem.baseX + stem.tipX) / 2 + normal.x * length * depth * 0.5,
        y: (stem.baseY + stem.tipY) / 2 + normal.y * length * depth * 0.5,
      };
      let handle = length * 0.24;
      let smoothIn = {
        x: midpoint.x - tangent.x * handle,
        y: midpoint.y - tangent.y * handle,
      };
      let smoothOut = {
        x: midpoint.x + tangent.x * handle,
        y: midpoint.y + tangent.y * handle,
      };
      let controlIn = {
        x: lerp(smoothIn.x, lerp(stem.baseX, midpoint.x, 0.55), sharpness),
        y: lerp(smoothIn.y, lerp(stem.baseY, midpoint.y, 0.55), sharpness),
      };
      let controlOut = {
        x: lerp(smoothOut.x, lerp(midpoint.x, stem.tipX, 0.45), sharpness),
        y: lerp(smoothOut.y, lerp(midpoint.y, stem.tipY, 0.45), sharpness),
      };
      let quadratic = (start, control, end, t) => {
        let u = 1 - t;
        return {
          x: u * u * start.x + 2 * u * t * control.x + t * t * end.x,
          y: u * u * start.y + 2 * u * t * control.y + t * t * end.y,
        };
      };
      let start = { x: stem.baseX, y: stem.baseY };
      let end = { x: stem.tipX, y: stem.tipY };
      for (let i = 0; i <= 14; i++) {
        points.push(quadratic(start, controlIn, midpoint, i / 14));
      }
      for (let i = 1; i <= 14; i++) {
        points.push(quadratic(midpoint, controlOut, end, i / 14));
      }
      return points;
    }

    if (shapeIdx === 2 || shapeIdx === 3) {
      let points = [];
      let dx = stem.tipX - stem.baseX;
      let dy = stem.tipY - stem.baseY;
      let length = sqrt(dx * dx + dy * dy);
      let normalX = length > 0 ? -dy / length : 0;
      let normalY = length > 0 ? dx / length : 0;
      let cycles = shapeIdx === 2 ? 5 : 3;
      let amplitude = stemData.waveWidth ?? (shapeIdx === 2 ? 13 : 12);
      let samples = cycles * 12;
      for (let i = 0; i <= samples; i++) {
        let t = i / samples;
        let wave;
        if (shapeIdx === 2) {
          wave = (2 / Math.PI) * Math.asin(Math.sin(t * cycles * TWO_PI));
        } else {
          wave = sin(t * cycles * TWO_PI);
        }
        points.push({
          x: lerp(stem.baseX, stem.tipX, t) + normalX * amplitude * wave,
          y: lerp(stem.baseY, stem.tipY, t) + normalY * amplitude * wave,
        });
      }
      return points;
    }

    return [
      { x: stem.baseX, y: stem.baseY },
      { x: stem.tipX, y: stem.tipY },
    ];
  }

  #drawStemPath(points) {
    noFill();
    beginShape();
    for (let point of points) vertex(point.x, point.y);
    endShape();
  }

  #pointOnStemPath(points, t) {
    let scaled = constrain(t, 0, 1) * (points.length - 1);
    let index = min(floor(scaled), points.length - 2);
    let localT = scaled - index;
    return {
      x: lerp(points[index].x, points[index + 1].x, localT),
      y: lerp(points[index].y, points[index + 1].y, localT),
    };
  }

  #stemTangentAt(points, t) {
    let scaled = constrain(t, 0, 1) * (points.length - 1);
    let index = min(floor(scaled), points.length - 2);
    return {
      x: points[index + 1].x - points[index].x,
      y: points[index + 1].y - points[index].y,
    };
  }

  onMousePressed() {
    if (!this.isVisible || !this.pot) return;

    let popW     = 600;
    let hasStem  = this.pot.stems && this.pot.stems.length > 0;
    let isLocked = this.pot.locked;
    let canEdit  = !isLocked;
    let popH     = canEdit ? (hasStem ? 660 : 560) : 560;
    let popX     = width  / 2 - popW / 2;
    let popY     = height / 2 - popH / 2;
    let imgX     = popX + 18, imgY = popY + 100;
    let imgW     = popW - 36, imgH = 340;
    let btnY     = imgY + imgH + 16;

    // X 버튼
    if (mouseX > popX + popW - 40 && mouseX < popX + popW - 10 &&
        mouseY > popY + 8 && mouseY < popY + 38) {
      this.hide();
      goTo(GAME_STATE.GARDEN_LIST);
      return;
    }

    if (canEdit) {
      // 화분 꾸미기 버튼
      let decorW = 110, decorH = 36;
      let decorX = imgX + imgW - decorW - 8;
      let decorBtnY = imgY + 12;
      if (mouseX > decorX && mouseX < decorX + decorW &&
          mouseY > decorBtnY && mouseY < decorBtnY + decorH) {
        let pot = this.pot;
        this.hide();
        potDecorateUI.show('edit', pot);
        goTo(GAME_STATE.POT_DECORATE);
        return;
      }

      // 새 비즈 줄기 만들기 버튼
      if (mouseX > popX + 18 && mouseX < popX + 18 + popW - 36 &&
          mouseY > btnY && mouseY < btnY + 48) {
        let pot = this.pot;
        this.hide();
        startStemCraftForPot(pot);
        return;
      }

      // 화분 잠그기 버튼 (줄기 있을 때만)
      if (hasStem) {
        let lockY    = btnY + 64;
        let lockBtnW = 110, lockBtnH = 36;
        let lockBtnX = popX + popW - lockBtnW - 18;
        if (mouseX > lockBtnX && mouseX < lockBtnX + lockBtnW &&
            mouseY > lockY && mouseY < lockY + lockBtnH) {
          this.hide();
          potLockUI.show(this.pot);
          goTo(GAME_STATE.POT_LOCK);
          return;
        }
      }
    }
  }

  draw() {
    if (!this.isVisible || !this.pot) return;

    let popW     = 600;
    let hasStem  = this.pot.stems && this.pot.stems.length > 0;
    let isLocked = this.pot.locked;
    let canEdit  = !isLocked;
    let popH     = canEdit ? (hasStem ? 660 : 560) : 560;
    let popX     = width  / 2 - popW / 2;
    let popY     = height / 2 - popH / 2;

    // 배경 dim
    fill(0, 0, 0, 100); noStroke();
    rect(0, 0, width, height);

    // 팝업 박스
    fill(255); stroke(220); strokeWeight(1);
    rect(popX, popY, popW, popH, 14);

    // X 버튼
    let xBtnX = popX + popW - 40, xBtnY = popY + 8, xBtnSize = 28;
    let xHovDraw = isHovered(xBtnX, xBtnY, xBtnSize, xBtnSize);
    fill(xHovDraw ? 210 : 235); noStroke();
    ellipse(xBtnX + xBtnSize / 2, xBtnY + xBtnSize / 2, xBtnSize);
    fill(80); textSize(16); textAlign(CENTER, CENTER);
    text('×', xBtnX + xBtnSize / 2, xBtnY + xBtnSize / 2);

    // 타이틀
    fill(30); noStroke();
    textStyle(BOLD); textSize(20); textAlign(CENTER);
    text(this.pot.name, width / 2, popY + 42);

    // 날짜
    fill(140); textStyle(NORMAL); textSize(12);
    text(`${isLocked ? '심은' : '만든'} 날짜: ${formatDate(this.pot.createdAt)}`,
      width / 2, popY + 62);

    // 설명
    fill(100); textSize(13);
    text(this.pot.desc, width / 2, popY + 82);

    // 화분 이미지 박스
    let imgX = popX + 18, imgY = popY + 100;
    let imgW = popW - 36, imgH = 340;
    this.drawPotPreview(imgX, imgY, imgW, imgH);

    // TODO: QR 코드 스캔 기능 미구현 — 추후 구현
    // if (hasStem || isLocked) {
    //   fill(30); noStroke();
    //   let qx = imgX + 14, qy = imgY + 12, qs = 8;
    //   let qr = [
    //     [1,1,1,0,1,1,1],
    //     [1,0,1,0,1,0,1],
    //     [1,1,1,0,1,1,1],
    //     [0,0,0,0,0,0,0],
    //     [1,1,1,0,1,0,1],
    //     [1,0,0,0,1,1,1],
    //     [1,0,1,0,0,0,1],
    //   ];
    //   for (let r = 0; r < qr.length; r++) {
    //     for (let c = 0; c < qr[r].length; c++) {
    //       if (qr[r][c]) rect(qx + c * qs, qy + r * qs, qs - 1, qs - 1);
    //     }
    //   }
    //   fill(60); textSize(12); textAlign(LEFT); textStyle(NORMAL);
    //   text('QR 코드를 스캔하여', qx + 68, qy + 18);
    //   text('비즈 화분 이미지를 저장하세요.', qx + 68, qy + 34);
    // }

    let btnY = imgY + imgH + 16;

    let _hoveredBtn = false;

    if (canEdit) {
      // 화분 꾸미기 버튼 — 회색 배경, 호버 시 보라 테두리
      let decorW = 110, decorH = 36;
      let decorX = imgX + imgW - decorW - 8;
      let decorBtnY = imgY + 12;
      let decorHov = isHovered(decorX, decorBtnY, decorW, decorH);
      fill(decorHov ? color(235, 235, 245) : 238);
      stroke(decorHov ? color(100, 80, 220) : 215);
      strokeWeight(decorHov ? 2 : 1);
      rect(decorX, decorBtnY, decorW, decorH, 18);
      fill(decorHov ? color(80, 60, 200) : 60); noStroke();
      textSize(13); textStyle(NORMAL); textAlign(CENTER, CENTER);
      text('화분 꾸미기', decorX + decorW / 2, decorBtnY + decorH / 2);
      if (decorHov) _hoveredBtn = true;

      // 새 비즈 줄기 만들기 버튼 — 핑크 마젠타, 호버 시 어두워짐
      let stemBtnHov = isHovered(popX + 18, btnY, popW - 36, 48);
      fill(stemBtnHov ? color(180, 0, 180) : color(255, 0, 255)); noStroke();
      rect(popX + 18, btnY, popW - 36, 48, 24);
      fill(255); textSize(15); textStyle(BOLD);
      textAlign(CENTER, CENTER);
      text('+ 새 비즈 줄기 만들기', width / 2, btnY + 24);
      if (stemBtnHov) _hoveredBtn = true;

      // 화분 잠금 영역 (줄기 있을 때만)
      if (hasStem) {
        let lockY = btnY + 64;
        fill(40); textSize(14); textStyle(NORMAL); textAlign(LEFT);
        text('화분 잠금', popX + 18, lockY + 12);
        fill(140); textSize(12);
        text('잠금 시 화분에 더 이상 줄기를 추가하거나 꾸밀 수 없어요.',
          popX + 18, lockY + 30);

        let lockBtnW = 110, lockBtnH = 36;
        let lockBtnX = popX + popW - lockBtnW - 18;
        let lockHov = isHovered(lockBtnX, lockY, lockBtnW, lockBtnH);
        // 화분 잠그기 — 검정 배경, 호버 시 살짝 밝아짐
        fill(lockHov ? color(50, 50, 50) : color(20, 20, 20)); noStroke();
        rect(lockBtnX, lockY, lockBtnW, lockBtnH, 18);
        fill(255); textSize(13); textStyle(NORMAL);
        textAlign(CENTER, CENTER);
        text('화분 잠그기', lockBtnX + lockBtnW / 2, lockY + lockBtnH / 2);
        if (lockHov) _hoveredBtn = true;
      }

    } else {
      // 잠금됨 표시
      let lockY    = btnY + 8;
      let lockBtnW = 110, lockBtnH = 36;
      let lockBtnX = popX + popW - lockBtnW - 18;
      fill(40); textSize(14); textStyle(NORMAL); textAlign(LEFT);
      text('화분 잠금', popX + 18, lockY + 12);
      fill(248); stroke(200); strokeWeight(1);
      rect(lockBtnX, lockY, lockBtnW, lockBtnH, 18);
      fill(100); noStroke(); textSize(13);
      textAlign(CENTER, CENTER);
      text('🔒 잠금됨', lockBtnX + lockBtnW / 2, lockY + lockBtnH / 2);
    }

    if (xHovDraw) _hoveredBtn = true;

    if (_hoveredBtn) cursor(HAND); else cursor(ARROW);
  }
}
