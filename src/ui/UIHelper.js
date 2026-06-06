/**
 * 
 * @param {number} x 
 * @param {number} y
 * @param {number} w
 * @param {number} h
 */
function isClicked(x, y, w, h) {
    return mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h && mouseIsPressed;
}

function isHovered(x, y, w, h) {
    return mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h;
}

// ── 공유 색상/모양 상수 ────────────────────────────────────────────────────────
const POT_COLORS  = ['#F4A7B9','#89C4E1','#90E0AE','#D4A8E8','#F5F5F5','#CCCCCC','#888888','#333333'];
const BG_COLORS   = ['#EDE8F5','#D6EAF8','#D5F5E3','#FEF9E7','#F9E4F0','#F5F5F5','#CCCCCC','#111111'];
const STEM_COLORS = ['#222222','#FFFFFF','#1A7A1A','#66FF44'];

// ── 컨셉별 화분 에셋 매핑 ────────────────────────────────────────────────────
// pot_setup에서 선택한 concept label → 사용 가능한 화분 파일명 목록
const POT_ASSETS_BY_CONCEPT = {
  '스타 에디션': ['bootsTaddyMint', 'bootsTaddyPink', 'potPinkTaddy', 'potBlack', 'bootsBlack', 'Glass'],
  '식물 에디션': ['mushroomPink', 'Rectangle 144', 'ceramicWhite', 'potBrown', 'ceramicGreen', 'Glass', 'mushroomYellow'],
  '바다 에디션': ['potBlack', 'whale', 'potSkyblue', 'ceramicBlue', 'ceramicGreen', 'Glass'],
};

// 화분 이미지 캐시 (preloadPotImages에서 채워짐)
const potAssetImages = {};

function preloadPotImages() {
  const allNames = new Set(Object.values(POT_ASSETS_BY_CONCEPT).flat());
  for (const name of allNames) {
    potAssetImages[name] = loadImage(`assets/pots/${name}.png`);
  }
}

// ── 화분 모양 그리기 (scale 파라미터로 카드/팝업 크기 조정) ─────────────────────
// cx, baseY: 화분 상단 중앙 기준점 / scale: 1.0 = 원본, 0.6 = 카드용
function drawPotShapeAt(cx, baseY, shapeIdx, scale) {
    if (scale === undefined) scale = 1;
    let s = scale;
    noStroke();
    switch (shapeIdx) {
        case 0: // 사각형
            rect(cx - 45*s, baseY, 90*s, 80*s, 4); break;
        case 1: // 삼각형
            triangle(cx, baseY, cx - 50*s, baseY + 80*s, cx + 50*s, baseY + 80*s); break;
        case 2: // 원형
            ellipse(cx, baseY + 40*s, 90*s, 90*s); break;
        case 3: // 지그재그형
            beginShape();
            vertex(cx - 40*s, baseY);      vertex(cx - 20*s, baseY + 25*s);
            vertex(cx - 40*s, baseY + 50*s); vertex(cx + 40*s, baseY + 50*s);
            vertex(cx + 20*s, baseY + 25*s); vertex(cx + 40*s, baseY);
            endShape(CLOSE); break;
        case 4: // 비정형
            beginShape();
            vertex(cx - 30*s, baseY);      vertex(cx - 50*s, baseY + 30*s);
            vertex(cx - 30*s, baseY + 70*s); vertex(cx + 40*s, baseY + 65*s);
            vertex(cx + 45*s, baseY + 30*s); vertex(cx + 25*s, baseY);
            endShape(CLOSE); break;
        default:
            rect(cx - 45*s, baseY, 90*s, 80*s, 4);
    }
}

// ── 날짜 포맷: Firestore Timestamp → yyyy-mm-dd ────────────────────────────
function formatDate(timestamp) {
    if (!timestamp) return '날짜 없음';
    let date;
    if (typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else {
        return '날짜 없음';
    }
    let y = date.getFullYear();
    let m = String(date.getMonth() + 1).padStart(2, '0');
    let d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}