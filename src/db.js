// ── 비즈 카탈로그 (앱 시작 시 1회 로드) ──────────────────────────────────────
// beadCatalog: { [beadId]: { name, theme, imageUrl, width, height } }
// beadImages:  { [beadId]: p5.Image }
let beadCatalog = {};
let beadImages  = {};

async function loadBeadCatalog() {
  const snapshot = await db.collection('beads').get();
  snapshot.docs.forEach(doc => {
    beadCatalog[doc.id] = doc.data();
  });
  return beadCatalog;
}

// p5.js preload()에서 호출 — 모든 비즈 이미지를 미리 로드
function preloadBeadImages() {
  for (const [beadId, data] of Object.entries(beadCatalog)) {
    beadImages[beadId] = loadImage(data.imagePath);
  }
}

// 특정 theme의 비즈 목록 반환 ('basic' 포함)
function getBeadsByTheme(theme) {
  return Object.entries(beadCatalog)
    .filter(([, d]) => d.theme === 'basic' || d.theme === theme)
    .map(([id, d]) => ({ beadId: id, ...d }));
}

// ── Device ID ──────────────────────────────────────────────────────────────
// 로그인 없이 기기를 구분하기 위한 UUID. localStorage에 영구 저장.
const myDeviceId = (() => {
  let id = localStorage.getItem('beadgarden_device_id');
  if (!id) {
    // crypto.randomUUID() 미지원 브라우저 폴백
    id = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
          const r = Math.random() * 16 | 0;
          return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    localStorage.setItem('beadgarden_device_id', id);
  }
  return id;
})();

// ── 전체 화분 실시간 구독 ────────────────────────────────────────────────────
// gardenUI.pots를 실시간으로 갱신한다.
function listenPots(onUpdate) {
  db.collection('pots')
    .orderBy('createdAt', 'asc')
    .onSnapshot(snapshot => {
      const pots = snapshot.docs.map(doc => ({
        firestoreId: doc.id,
        ...doc.data(),
      }));
      onUpdate(pots);
    }, err => {
      console.error('[Firestore] 구독 오류:', err);
    });
}

// ── 새 화분 생성 ─────────────────────────────────────────────────────────────
// potSetupUI 확정 시 호출. 생성된 문서 ID를 반환한다.
async function createPot(data) {
  const ref = await db.collection('pots').add({
    createdBy:  myDeviceId,
    createdAt:  firebase.firestore.FieldValue.serverTimestamp(),
    name:       data.name,
    desc:       data.desc       ?? '',
    concept:    data.concept    ?? '',
    cardY:      data.cardY,       // 카드 세로 위치 (픽셀, 고정 저장)
    colorIndex: 0,
    bgIndex:    0,
    shapeIndex: 0,
    locked:     false,
    stems:      [],
  });
  return ref.id;
}

// ── 화분 꾸미기 저장 ──────────────────────────────────────────────────────────
// potDecorateUI 저장 시 호출.
async function updatePotDecor(potId, decorData) {
  await db.collection('pots').doc(potId).update({
    potAssetIndex: decorData.potAssetIndex,
    potAssetName:  decorData.potAssetName,
    bgIndex:       decorData.bgIndex,
  });
}

// ── 줄기 추가 ────────────────────────────────────────────────────────────────
// stemFinishUI 저장 시 호출.
async function addStemToPot(potId, stemData) {
  await db.collection('pots').doc(potId).update({
    stems: firebase.firestore.FieldValue.arrayUnion(stemData),
  });
}

// ── 화분 잠금 ────────────────────────────────────────────────────────────────
// potLockUI 확정 시 호출.
async function lockPot(potId) {
  await db.collection('pots').doc(potId).update({ locked: true });
}
