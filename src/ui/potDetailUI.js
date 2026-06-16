class PotDetailUI {
  constructor() {
    this.isVisible = false;
    this.pot = null;
    this.imageDownloadPopup = this.#emptyImageDownloadPopup();
    this.imageDownloadRequestId = 0;
  }

  show(pot) {
    this.isVisible = true;
    this.imageDownloadRequestId++;
    this.imageDownloadPopup = this.#emptyImageDownloadPopup();
    this.pot = pot ?? {
      name: '내 첫 번째 화분',
      desc: '',
      createdAt: '2025.05.15',
      stems: [],
      locked: false,
      colorIndex: 0,
      bgIndex: 0,
      shapeIndex: 0,
    };
  }

  hide() {
    this.isVisible = false;
    this.pot = null;
    this.imageDownloadRequestId++;
    this.imageDownloadPopup = this.#emptyImageDownloadPopup();
  }

  drawPotPreview(x, y, w, h) {
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.roundRect(x, y, w, h, 10);
    drawingContext.clip();

    drawPotComposition(this.pot, x, y, w, h, { bottomMargin: 20 });

    if (!(this.pot.stems && this.pot.stems.length > 0)) {
      fill(180); textSize(13); textStyle(NORMAL); textAlign(CENTER);
      text('아직 줄기가 없어요.\n새 비즈 줄기를 만들어 심어주세요.', x + w / 2, y + h * 0.5);
    }

    drawingContext.restore();
  }

  #layout() {
    const popW = 780, popH = 560;
    const popX = width / 2 - popW / 2;
    const popY = height / 2 - popH / 2;
    const preX = popX + 16, preY = popY + 16;
    const preW = 368, preH = popH - 32;
    const panX = popX + 400, panY = popY + 16;
    const panW = popW - 400 - 16; // 364
    return { popW, popH, popX, popY, preX, preY, preW, preH, panX, panY, panW };
  }

  #emptyImageDownloadPopup() {
    return {
      visible: false,
      status: 'idle',
      message: '',
      qrMatrix: null,
      url: null,
    };
  }

  #downloadButtonRect(layout) {
    const infoY = layout.panY + 72;
    const w = 154, h = 36;
    return {
      x: layout.panX + layout.panW - w,
      y: infoY - 14,
      w,
      h,
    };
  }

  #imageDownloadPopupLayout(layout) {
    const w = 236, h = 302;
    const x = layout.panX + layout.panW - w;
    const y = layout.panY + 124;
    return {
      x,
      y,
      w,
      h,
      close: { x: x + w - 33, y: y + 12, w: 22, h: 22 },
      qr: { x: x + 34, y: y + 55, size: 168 },
    };
  }

  #containsRect(bounds) {
    return mouseX >= bounds.x && mouseX <= bounds.x + bounds.w &&
      mouseY >= bounds.y && mouseY <= bounds.y + bounds.h;
  }

  #formatPotDate(value) {
    if (typeof value === 'string') return value;
    return formatDate(value ?? '');
  }

  #isLocalDataMode() {
    return typeof getDatabaseMode === 'function' &&
      typeof DATABASE_LOCAL !== 'undefined' &&
      getDatabaseMode() === DATABASE_LOCAL;
  }

  #showImageDownloadError(message) {
    this.imageDownloadPopup = {
      visible: true,
      status: 'error',
      message,
      qrMatrix: null,
      url: null,
    };
  }

  #closeImageDownloadPopup() {
    this.imageDownloadRequestId++;
    this.imageDownloadPopup = this.#emptyImageDownloadPopup();
  }

  #startImageDownload(layout) {
    if (this.imageDownloadPopup.status === 'loading') return;

    if (this.#isLocalDataMode()) {
      this.#showImageDownloadError('로컬 데이터 모드에서는\n이미지 QR을 만들 수 없어요.');
      return;
    }
    if (!this.pot?.firestoreId) {
      this.#showImageDownloadError('서버에 저장된 화분만\n이미지 QR을 만들 수 있어요.');
      return;
    }
    if (typeof uploadPotImageDownload !== 'function') {
      this.#showImageDownloadError('Firebase 업로드 기능을\n사용할 수 없어요.');
      return;
    }

    const requestId = ++this.imageDownloadRequestId;
    const pot = this.pot;
    this.imageDownloadPopup = {
      visible: true,
      status: 'loading',
      message: '화분 이미지를 준비하고 있어요...',
      qrMatrix: null,
      url: null,
    };

    this.#capturePotImageBlob(layout)
      .then(async blob => {
        const hash = await this.#hashBlob(blob);
        if (pot.imageDownload?.hash === hash && pot.imageDownload?.url) {
          return pot.imageDownload;
        }
        return uploadPotImageDownload(pot, blob, hash);
      })
      .then(imageDownload => {
        if (requestId !== this.imageDownloadRequestId || this.pot !== pot) return;
        this.imageDownloadPopup = {
          visible: true,
          status: 'ready',
          message: 'QR코드를 스캔하여\n화분 이미지를 저장하세요.',
          qrMatrix: createQrCodeMatrix(imageDownload.url),
          url: imageDownload.url,
        };
      })
      .catch(err => {
        console.error('[PotDetailUI] 화분 이미지 다운로드 QR 생성 실패:', err);
        if (requestId !== this.imageDownloadRequestId || this.pot !== pot) return;
        const message = err?.message === 'LOCAL_DATABASE_MODE'
          ? '로컬 데이터 모드에서는\n이미지 QR을 만들 수 없어요.'
          : '이미지 QR 생성에 실패했어요.\n네트워크와 Firebase 설정을 확인하세요.';
        this.#showImageDownloadError(message);
      });
  }

  #capturePotImageBlob(layout) {
    const image = get(
      Math.round(layout.preX),
      Math.round(layout.preY),
      Math.round(layout.preW),
      Math.round(layout.preH)
    );
    const canvas = image?.canvas;
    if (!canvas) {
      return Promise.reject(new Error('Could not capture pot image'));
    }

    return new Promise((resolve, reject) => {
      if (typeof canvas.toBlob === 'function') {
        canvas.toBlob(blob => {
          if (blob) resolve(blob);
          else reject(new Error('Could not encode pot image'));
        }, 'image/png');
        return;
      }

      try {
        resolve(this.#dataUrlToBlob(canvas.toDataURL('image/png')));
      } catch (err) {
        reject(err);
      }
    });
  }

  #dataUrlToBlob(dataUrl) {
    const [meta, base64] = dataUrl.split(',');
    const mime = /data:([^;]+)/.exec(meta)?.[1] ?? 'image/png';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  async #hashBlob(blob) {
    const buffer = await blob.arrayBuffer();
    if (typeof crypto !== 'undefined' && crypto.subtle?.digest) {
      const digest = await crypto.subtle.digest('SHA-256', buffer);
      return Array.from(new Uint8Array(digest))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
    }
    return this.#fallbackHash(buffer);
  }

  #fallbackHash(buffer) {
    let hash = 0x811c9dc5;
    for (const byte of new Uint8Array(buffer)) {
      hash ^= byte;
      hash = Math.imul(hash, 0x01000193);
    }
    return `fnv1a-${buffer.byteLength}-${(hash >>> 0).toString(16).padStart(8, '0')}`;
  }

  #drawDownloadButton(layout) {
    const bounds = this.#downloadButtonRect(layout);
    const hovered = this.#containsRect(bounds);
    fill(hovered ? 175 : 190);
    noStroke();
    rect(bounds.x, bounds.y, bounds.w, bounds.h, 9);
    fill(255);
    textSize(12);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text('화분 이미지 다운로드', bounds.x + bounds.w / 2, bounds.y + bounds.h / 2);
    return hovered;
  }

  #drawImageDownloadPopup(layout) {
    if (!this.imageDownloadPopup.visible) return false;

    const popup = this.#imageDownloadPopupLayout(layout);
    const closeHovered = this.#containsRect(popup.close);

    drawingContext.save();
    drawingContext.shadowBlur = 10;
    drawingContext.shadowColor = 'rgba(0,0,0,0.18)';
    fill(255);
    noStroke();
    rect(popup.x, popup.y, popup.w, popup.h, 12);
    drawingContext.restore();

    fill(closeHovered ? 70 : 120);
    noStroke();
    textSize(26);
    textStyle(NORMAL);
    textAlign(CENTER, CENTER);
    text('×', popup.close.x + popup.close.w / 2, popup.close.y + popup.close.h / 2 - 1);

    if (this.imageDownloadPopup.status === 'ready' && this.imageDownloadPopup.qrMatrix) {
      this.#drawQrMatrix(this.imageDownloadPopup.qrMatrix, popup.qr.x, popup.qr.y, popup.qr.size);
    } else {
      fill(216);
      noStroke();
      rect(popup.qr.x, popup.qr.y, popup.qr.size, popup.qr.size, 1);
      fill(this.imageDownloadPopup.status === 'error' ? color(255, 84, 94) : 90);
      textSize(13);
      textStyle(BOLD);
      textAlign(CENTER, CENTER);
      text(
        this.imageDownloadPopup.status === 'loading' ? '이미지 준비 중' : '안내',
        popup.qr.x + popup.qr.size / 2,
        popup.qr.y + popup.qr.size / 2
      );
    }

    fill(80);
    textSize(12);
    textStyle(NORMAL);
    textAlign(CENTER, CENTER);
    text(
      this.imageDownloadPopup.message,
      popup.x + popup.w / 2,
      popup.y + popup.h - 42
    );

    return closeHovered;
  }

  #drawQrMatrix(matrix, x, y, size) {
    const quietZone = 4;
    const totalModules = matrix.length + quietZone * 2;
    const moduleSize = size / totalModules;

    fill(255);
    noStroke();
    rect(x, y, size, size);

    fill(30);
    for (let row = 0; row < matrix.length; row++) {
      for (let col = 0; col < matrix.length; col++) {
        if (!matrix[row][col]) continue;
        rect(
          x + (col + quietZone) * moduleSize,
          y + (row + quietZone) * moduleSize,
          Math.ceil(moduleSize),
          Math.ceil(moduleSize)
        );
      }
    }
  }

  onMousePressed() {
    if (!this.isVisible || !this.pot) return;

    const layout = this.#layout();
    const { popW, popH, popX, popY, panX, panY, panW } = layout;
    const hasStem = (this.pot.stems ?? []).length > 0;
    const canEdit = !this.pot.locked;

    if (mouseX < popX || mouseX > popX + popW ||
      mouseY < popY || mouseY > popY + popH) {
      this.hide();
      goTo(GAME_STATE.GARDEN_LIST);
      return;
    }

    if (this.imageDownloadPopup.visible) {
      const popup = this.#imageDownloadPopupLayout(layout);
      if (this.#containsRect(popup.close)) {
        this.#closeImageDownloadPopup();
        return;
      }
      if (this.#containsRect(popup)) return;
    }

    // X 버튼
    if (mouseX > popX + popW - 38 && mouseX < popX + popW - 12 &&
      mouseY > popY + 10 && mouseY < popY + 36) {
      this.hide();
      goTo(GAME_STATE.GARDEN_LIST);
      return;
    }

    if (this.#containsRect(this.#downloadButtonRect(layout))) {
      this.#startImageDownload(layout);
      return;
    }

    if (!canEdit) return;

    // 새 비즈 줄기 만들기 버튼
    const btn1Y = panY + 290;
    if (mouseX > panX && mouseX < panX + panW &&
      mouseY > btn1Y && mouseY < btn1Y + 48) {
      const pot = this.pot;
      this.hide();
      startStemCraftForPot(pot);
      return;
    }

    // 화분·줄기 꾸미기 버튼
    const btn2Y = panY + 350;
    if (mouseX > panX && mouseX < panX + panW &&
      mouseY > btn2Y && mouseY < btn2Y + 48) {
      const pot = this.pot;
      this.hide();
      potDecorateUI.show('edit', pot);
      goTo(GAME_STATE.POT_DECORATE);
      return;
    }

    // 화분 잠그기 버튼
    const lockBtnW = 100, lockBtnH = 36;
    const lockBtnX = panX + panW - lockBtnW;
    const lockBtnY = panY + 420 + 14;
    if (hasStem &&
      mouseX > lockBtnX && mouseX < lockBtnX + lockBtnW &&
      mouseY > lockBtnY && mouseY < lockBtnY + lockBtnH) {
      const pot = this.pot;
      this.hide();
      potLockUI.show(pot);
      goTo(GAME_STATE.POT_LOCK);
      return;
    }
  }

  draw() {
    if (!this.isVisible || !this.pot) return;

    const layout = this.#layout();
    const { popW, popH, popX, popY, preX, preY, preW, preH, panX, panY, panW } = layout;
    const hasStem = (this.pot.stems ?? []).length > 0;
    const isLocked = this.pot.locked;
    const canEdit = !isLocked;

    // 배경 dim
    fill(0, 0, 0, 100); noStroke();
    rect(0, 0, width, height);

    // 팝업 박스
    fill(255); stroke(220); strokeWeight(1);
    rect(popX, popY, popW, popH, 14);

    // X 버튼
    const xBtnX = popX + popW - 38, xBtnY = popY + 10, xBtnSize = 26;
    const xHov = isHovered(xBtnX, xBtnY, xBtnSize, xBtnSize);
    fill(xHov ? 210 : 235); noStroke();
    ellipse(xBtnX + xBtnSize / 2, xBtnY + xBtnSize / 2, xBtnSize);
    fill(80); textSize(15); textAlign(CENTER, CENTER);
    text('×', xBtnX + xBtnSize / 2, xBtnY + xBtnSize / 2);

    // ── 왼쪽: 화분 미리보기 ──
    this.drawPotPreview(preX, preY, preW, preH);

    // 세로 구분선
    stroke(220); strokeWeight(1);
    line(popX + 392, popY + 16, popX + 392, popY + popH - 16);

    // ── 오른쪽: 정보 패널 ──

    // 화분 이름
    noStroke(); fill(216, 0, 255);
    textStyle(BOLD); textSize(19); textAlign(LEFT, CENTER);
    text(this.pot.name || '화분 이름', panX, panY + 28);

    // 구분선
    stroke(220); strokeWeight(1);
    line(panX, panY + 46, panX + panW, panY + 46);

    // 정보 테이블
    const infoY = panY + 72;
    const labelX = panX;
    const valueX = panX + 72;

    // 왼쪽 열: 심은날짜 / 줄기 / 디자인
    noStroke();
    fill(140); textSize(12); textStyle(NORMAL); textAlign(LEFT, CENTER);
    text('심은 날짜', labelX, infoY);
    text('줄기', labelX, infoY + 24);
    text('디자인', labelX, infoY + 48);

    fill(140); textSize(12);
    text(this.#formatPotDate(this.pot.createdAt), valueX, infoY);
    text(`${(this.pot.stems ?? []).length}개`, valueX, infoY + 24);
    text(this.pot.concept ?? '식물 에디션', valueX, infoY + 48);

    const downloadHov = this.#drawDownloadButton(layout);

    stroke(220); strokeWeight(1);
    line(panX, infoY + 70, panX + panW, infoY + 70);

    // ── 버튼 영역 ──
    if (canEdit) {
      // 새 비즈 줄기 만들기
      const btn1Y = panY + 290;
      const btn1Hov = isHovered(panX, btn1Y, panW, 48);
      fill(btn1Hov ? color(180, 0, 180) : color(255, 0, 255)); noStroke();
      rect(panX, btn1Y, panW, 48, 24);
      fill(255); textSize(14); textStyle(BOLD);
      textAlign(CENTER, CENTER);
      text('+ 새 비즈 줄기 만들기', panX + panW / 2, btn1Y + 24);

      // 화분·줄기 꾸미기
      const btn2Y = panY + 350;
      const btn2Hov = isHovered(panX, btn2Y, panW, 48);
      fill(btn2Hov ? 185 : 200); noStroke();
      rect(panX, btn2Y, panW, 48, 24);
      fill(255); textSize(14); textStyle(NORMAL);
      textAlign(CENTER, CENTER);
      text('화분·줄기 꾸미기', panX + panW / 2, btn2Y + 24);

      // 화분 잠금 섹션
      const lockSectionY = panY + 420;
      stroke(220); strokeWeight(1);
      line(panX, lockSectionY - 8, panX + panW, lockSectionY - 8);
      noStroke(); fill(40); textSize(13); textStyle(BOLD); textAlign(LEFT);
      text('화분 잠금', panX, lockSectionY + 12);
      fill(140); textSize(11); textStyle(NORMAL);
      if (hasStem) {
        text('잠금 시 화분에 더 이상 줄기를 추가하거나', panX, lockSectionY + 30);
        text('꾸밀 수 없어요.', panX, lockSectionY + 46);
      } else {
        text('줄기를 하나 이상 심은 뒤 잠글 수 있어요.', panX, lockSectionY + 30);
        text('먼저 새 비즈 줄기를 만들어주세요.', panX, lockSectionY + 46);
      }

      const lockBtnW = 100, lockBtnH = 36;
      const lockBtnX = panX + panW - lockBtnW;
      const lockBtnY = lockSectionY + 14;
      const lockHov = hasStem && isHovered(lockBtnX, lockBtnY, lockBtnW, lockBtnH);
      if (hasStem) {
        fill(lockHov ? 40 : 20);
        noStroke();
      } else {
        fill(232);
        stroke(205);
        strokeWeight(1);
      }
      rect(lockBtnX, lockBtnY, lockBtnW, lockBtnH, 18);
      noStroke();
      fill(hasStem ? 255 : 145); textSize(12); textStyle(NORMAL);
      textAlign(CENTER, CENTER);
      text(hasStem ? '화분 잠그기' : '줄기 필요', lockBtnX + lockBtnW / 2, lockBtnY + lockBtnH / 2);

      // 커서
      const anyHov = btn1Hov || btn2Hov || xHov ||
        downloadHov ||
        (hasStem && isHovered(lockBtnX, lockBtnY, lockBtnW, lockBtnH));
      const popupCloseHov = this.#drawImageDownloadPopup(layout);
      if (anyHov || popupCloseHov) cursor(HAND); else cursor(ARROW);
    } else {
      // 잠금됨 표시
      const lockSectionY = panY + 420;
      stroke(220); strokeWeight(1);
      line(panX, lockSectionY - 8, panX + panW, lockSectionY - 8);
      noStroke(); fill(40); textSize(13); textStyle(BOLD); textAlign(LEFT);
      text('화분 잠금', panX, lockSectionY + 12);

      const lockBtnW = 100, lockBtnH = 36;
      const lockBtnX = panX + panW - lockBtnW;
      fill(245); stroke(210); strokeWeight(1);
      rect(lockBtnX, lockSectionY + 4, lockBtnW, lockBtnH, 18);
      fill(130); noStroke(); textSize(12);
      textAlign(CENTER, CENTER);
      text('🔒 잠금됨', lockBtnX + lockBtnW / 2, lockSectionY + 4 + lockBtnH / 2);

      const popupCloseHov = this.#drawImageDownloadPopup(layout);
      if (xHov || downloadHov || popupCloseHov) cursor(HAND); else cursor(ARROW);
    }
  }
}
