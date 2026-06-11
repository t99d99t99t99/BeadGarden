const DEBUG_POT_MANAGEMENT_POPUP = Object.freeze({
  w: 420,
  h: 250,
});

const DEBUG_POT_DELETE_POPUP = Object.freeze({
  w: 420,
  h: 220,
});

let debugManagedPot = null;
let debugPotDeleteConfirmationVisible = false;
let debugPotManagementBusy = false;
let debugPotManagementError = '';
let debugPotManagementDragging = false;
let debugPotManagementDragStartX = 0;
let debugPotManagementDragScrollX = 0;

function debugPotManagementSceneSetup() {
  debugPotManagementSceneReset();
}

function debugPotManagementSceneReset() {
  debugManagedPot = null;
  debugPotDeleteConfirmationVisible = false;
  debugPotManagementBusy = false;
  debugPotManagementError = '';
  debugPotManagementDragging = false;
}

function debugPotManagementSceneDraw() {
  gardenUI.draw();

  push();
  fill(255, 255, 255, 220);
  noStroke();
  rect(width / 2 - 180, 18, 360, 38, 19);
  fill(35);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(16);
  text('Debug pot management', width / 2, 37);
  pop();

  if (debugManagedPot) {
    debugPotManagementSceneDrawPopup();
  }
}

function debugPotManagementSceneDrawPopup() {
  const popup = debugPotManagementScenePopupRect();

  push();
  fill(0, 0, 0, 115);
  noStroke();
  rect(0, 0, width, height);

  fill(255);
  stroke(220);
  strokeWeight(1);
  rect(popup.x, popup.y, popup.w, popup.h, 14);

  debugPotManagementSceneDrawCloseButton(popup);

  fill(30);
  noStroke();
  textStyle(BOLD);
  textSize(19);
  textAlign(CENTER, CENTER);
  text(debugManagedPot.name ?? '화분 관리', width / 2, popup.y + 48);

  const buttons = debugPotManagementSceneActionButtons(popup);
  debugPotManagementSceneDrawButton(
    buttons.unlock,
    '강제 잠금 해제',
    color(245),
    color(230),
    color(55)
  );
  debugPotManagementSceneDrawButton(
    buttons.delete,
    '화분 삭제',
    color(210, 60, 75),
    color(180, 40, 55),
    color(255)
  );

  if (debugPotManagementError) {
    fill(185, 45, 60);
    noStroke();
    textStyle(NORMAL);
    textSize(12);
    text(debugPotManagementError, width / 2, popup.y + popup.h - 18);
  }

  if (debugPotManagementBusy) {
    fill(255, 255, 255, 190);
    noStroke();
    rect(popup.x, popup.y, popup.w, popup.h, 14);
    fill(70);
    textStyle(BOLD);
    textSize(14);
    text('처리 중...', width / 2, height / 2);
  }

  if (debugPotDeleteConfirmationVisible) {
    debugPotManagementSceneDrawDeleteConfirmation();
  }
  pop();
}

function debugPotManagementSceneDrawDeleteConfirmation() {
  const popup = debugPotManagementSceneDeletePopupRect();
  const buttons = debugPotManagementSceneDeleteButtons(popup);

  fill(0, 0, 0, 100);
  noStroke();
  rect(0, 0, width, height);

  fill(255);
  stroke(220);
  strokeWeight(1);
  rect(popup.x, popup.y, popup.w, popup.h, 14);

  fill(30);
  noStroke();
  textStyle(BOLD);
  textSize(18);
  textAlign(CENTER, CENTER);
  text('정말로 삭제하시겠습니까?', width / 2, popup.y + 62);

  fill(125);
  textStyle(NORMAL);
  textSize(12);
  text('삭제한 화분은 복구할 수 없습니다.', width / 2, popup.y + 96);

  debugPotManagementSceneDrawButton(
    buttons.cancel,
    '취소',
    color(245),
    color(230),
    color(70)
  );
  debugPotManagementSceneDrawButton(
    buttons.confirm,
    '삭제',
    color(210, 60, 75),
    color(180, 40, 55),
    color(255)
  );
}

function debugPotManagementSceneDrawCloseButton(popup) {
  const close = debugPotManagementSceneCloseButton(popup);
  const hovering = debugPotManagementScenePointInRect(mouseX, mouseY, close);

  fill(hovering ? 210 : 235);
  noStroke();
  circle(close.x + close.w / 2, close.y + close.h / 2, close.w);
  fill(80);
  textStyle(NORMAL);
  textSize(16);
  textAlign(CENTER, CENTER);
  text('×', close.x + close.w / 2, close.y + close.h / 2);
}

function debugPotManagementSceneDrawButton(rectValue, label, fillColor, hoverColor, textColor) {
  const hovering = debugPotManagementScenePointInRect(mouseX, mouseY, rectValue);
  fill(hovering ? hoverColor : fillColor);
  stroke(hovering ? 190 : 215);
  strokeWeight(1);
  rect(rectValue.x, rectValue.y, rectValue.w, rectValue.h, 22);
  fill(textColor);
  noStroke();
  textStyle(BOLD);
  textSize(14);
  textAlign(CENTER, CENTER);
  text(label, rectValue.x + rectValue.w / 2, rectValue.y + rectValue.h / 2);
}

function debugPotManagementSceneMousePressed() {
  if (debugPotManagementBusy) return;

  if (debugManagedPot) {
    debugPotManagementScenePopupMousePressed();
    return;
  }

  const arrow = debugPotManagementSceneArrowAt(mouseX, mouseY);
  if (arrow !== 0) {
    const step = gardenUI.cardW + gardenUI.cardGap;
    const maxScroll = debugPotManagementSceneMaxScroll();
    gardenUI.targetScrollX = constrain(
      gardenUI.targetScrollX + arrow * step,
      0,
      maxScroll
    );
    return;
  }

  debugPotManagementDragging = true;
  debugPotManagementDragStartX = mouseX;
  debugPotManagementDragScrollX = gardenUI.targetScrollX;
}

function debugPotManagementSceneMouseDragged() {
  if (!debugPotManagementDragging || debugManagedPot) return;
  gardenUI.targetScrollX = constrain(
    debugPotManagementDragScrollX - (mouseX - debugPotManagementDragStartX),
    0,
    debugPotManagementSceneMaxScroll()
  );
}

function debugPotManagementSceneMouseReleased() {
  if (!debugPotManagementDragging || debugManagedPot) {
    debugPotManagementDragging = false;
    return;
  }

  if (abs(mouseX - debugPotManagementDragStartX) < 5) {
    const pot = debugPotManagementScenePotAt(mouseX, mouseY);
    if (pot) {
      debugManagedPot = pot;
      debugPotManagementError = '';
    }
  }
  debugPotManagementDragging = false;
}

function debugPotManagementSceneMouseWheel(delta) {
  if (debugManagedPot) return;
  gardenUI.targetScrollX = constrain(
    gardenUI.targetScrollX + delta * 0.8,
    0,
    debugPotManagementSceneMaxScroll()
  );
}

function debugPotManagementScenePopupMousePressed() {
  if (debugPotDeleteConfirmationVisible) {
    const popup = debugPotManagementSceneDeletePopupRect();
    const buttons = debugPotManagementSceneDeleteButtons(popup);
    if (debugPotManagementScenePointInRect(mouseX, mouseY, buttons.cancel)) {
      debugPotDeleteConfirmationVisible = false;
    } else if (debugPotManagementScenePointInRect(mouseX, mouseY, buttons.confirm)) {
      debugPotManagementSceneDeleteSelectedPot();
    }
    return;
  }

  const popup = debugPotManagementScenePopupRect();
  const buttons = debugPotManagementSceneActionButtons(popup);
  if (debugPotManagementScenePointInRect(
    mouseX,
    mouseY,
    debugPotManagementSceneCloseButton(popup)
  )) {
    debugManagedPot = null;
    debugPotManagementError = '';
  } else if (debugPotManagementScenePointInRect(mouseX, mouseY, buttons.unlock)) {
    debugPotManagementSceneUnlockSelectedPot();
  } else if (debugPotManagementScenePointInRect(mouseX, mouseY, buttons.delete)) {
    debugPotDeleteConfirmationVisible = true;
  }
}

async function debugPotManagementSceneUnlockSelectedPot() {
  const pot = debugManagedPot;
  const potId = pot?.firestoreId ?? pot?.localId;
  if (!pot || !potId) return;

  debugPotManagementBusy = true;
  debugPotManagementError = '';
  try {
    await unlockPot(potId);
    pot.locked = false;
  } catch (err) {
    console.error('[Debug] Pot unlock failed:', err);
    debugPotManagementError = '잠금 해제에 실패했습니다.';
  } finally {
    debugPotManagementBusy = false;
  }
}

async function debugPotManagementSceneDeleteSelectedPot() {
  const pot = debugManagedPot;
  const potId = pot?.firestoreId ?? pot?.localId;
  if (!pot || !potId) return;

  debugPotManagementBusy = true;
  debugPotManagementError = '';
  try {
    await deletePot(potId);
    debugManagedPot = null;
    debugPotDeleteConfirmationVisible = false;
  } catch (err) {
    console.error('[Debug] Pot deletion failed:', err);
    debugPotManagementError = '화분 삭제에 실패했습니다.';
  } finally {
    debugPotManagementBusy = false;
  }
}

function debugPotManagementScenePotAt(x, y) {
  for (let i = 0; i < gardenUI.pots.length; i++) {
    const pot = gardenUI.pots[i];
    const cardX = gardenUI._cardX(i);
    const cx = cardX + gardenUI.cardW / 2;
    const potBaseY = gardenUI._cardY(pot);
    if (
      x > cx - 70 && x < cx + 70 &&
      y > potBaseY - 160 && y < potBaseY + 130
    ) {
      return pot;
    }
  }
  return null;
}

function debugPotManagementSceneMaxScroll() {
  return max(
    0,
    gardenUI.pots.length * (gardenUI.cardW + gardenUI.cardGap) - width + 120
  );
}

function debugPotManagementSceneArrowAt(x, y) {
  const arrowY = height / 2 - 26;
  if (
    x > 48 && x < 92 &&
    y > arrowY && y < arrowY + 52 &&
    gardenUI.targetScrollX > 0
  ) {
    return -1;
  }
  if (
    x > width - 92 && x < width - 48 &&
    y > arrowY && y < arrowY + 52 &&
    gardenUI.targetScrollX < debugPotManagementSceneMaxScroll()
  ) {
    return 1;
  }
  return 0;
}

function debugPotManagementScenePopupRect() {
  return {
    x: width / 2 - DEBUG_POT_MANAGEMENT_POPUP.w / 2,
    y: height / 2 - DEBUG_POT_MANAGEMENT_POPUP.h / 2,
    ...DEBUG_POT_MANAGEMENT_POPUP,
  };
}

function debugPotManagementSceneDeletePopupRect() {
  return {
    x: width / 2 - DEBUG_POT_DELETE_POPUP.w / 2,
    y: height / 2 - DEBUG_POT_DELETE_POPUP.h / 2,
    ...DEBUG_POT_DELETE_POPUP,
  };
}

function debugPotManagementSceneCloseButton(popup) {
  return {
    x: popup.x + popup.w - 40,
    y: popup.y + 8,
    w: 28,
    h: 28,
  };
}

function debugPotManagementSceneActionButtons(popup) {
  return {
    unlock: {
      x: popup.x + 36,
      y: popup.y + 96,
      w: popup.w - 72,
      h: 48,
    },
    delete: {
      x: popup.x + 36,
      y: popup.y + 158,
      w: popup.w - 72,
      h: 48,
    },
  };
}

function debugPotManagementSceneDeleteButtons(popup) {
  const buttonW = 150;
  const gap = 16;
  const startX = popup.x + (popup.w - buttonW * 2 - gap) / 2;
  return {
    cancel: {
      x: startX,
      y: popup.y + popup.h - 68,
      w: buttonW,
      h: 44,
    },
    confirm: {
      x: startX + buttonW + gap,
      y: popup.y + popup.h - 68,
      w: buttonW,
      h: 44,
    },
  };
}

function debugPotManagementScenePointInRect(x, y, rectValue) {
  return x >= rectValue.x && x <= rectValue.x + rectValue.w &&
    y >= rectValue.y && y <= rectValue.y + rectValue.h;
}
