/**
 * Firestore 비즈 메타데이터 등록 스크립트 (Firebase Storage 불필요)
 * 이미지는 assets/ 폴더에서 상대 경로로 직접 서빙
 *
 * 실행: GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json node src/tools/uploadAssets.js
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const ASSET_DIR = path.join(__dirname, '../../assets');
const BEAD_ASSET_DIR = path.join(ASSET_DIR, 'beads');
const POT_ASSET_DIR = path.join(ASSET_DIR, 'pots/source');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});
const db = admin.firestore();

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function makeBeadId(theme, filename) {
  const base = path.basename(filename, path.extname(filename));
  return `${theme}_${base}`;
}

function makeDisplayName(base) {
  return base.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

async function main() {
  const themes = fs.readdirSync(BEAD_ASSET_DIR).filter(d =>
    fs.statSync(path.join(BEAD_ASSET_DIR, d)).isDirectory()
  );

  let total = 0, success = 0, failed = 0;

  for (const theme of themes) {
    const themeDir = path.join(BEAD_ASSET_DIR, theme);
    const files    = fs.readdirSync(themeDir).filter(f => /\.(png|jpg|webp)$/i.test(f));

    console.log(`\n📂 ${theme}/ — ${files.length}개 파일`);

    for (const filename of files) {
      const base     = path.basename(filename, path.extname(filename));
      // 앱에서 사용할 상대 경로 (index.html 기준)
      const imagePath = `assets/beads/${theme}/${filename}`;
      total++;

      try {
        const beadId = makeBeadId(theme, filename);
        await db.collection('beads').doc(beadId).set({
          name:      makeDisplayName(base),
          theme,
          imagePath,
          width:     40,
          height:    40,
        });
        console.log(`  ✅ ${beadId}`);
        success++;
      } catch (err) {
        console.error(`  ❌ ${filename}: ${err.message}`);
        failed++;
      }

      await sleep(50);
    }
  }

  const potFiles = fs.readdirSync(POT_ASSET_DIR).filter(f => /\.(png|jpg|webp)$/i.test(f));
  console.log(`\n📂 pots/source — ${potFiles.length}개 파일`);
  for (const filename of potFiles) {
    const base = path.basename(filename, path.extname(filename));
    const imagePath = `assets/pots/source/${filename}`;
    const potId = `pot_${base}`;
    total++;

    try {
      await db.collection('potAssets').doc(potId).set({
        name: makeDisplayName(base),
        imagePath,
      });
      console.log(`  ✅ ${potId}`);
      success++;
    } catch (err) {
      console.error(`  ❌ ${filename}: ${err.message}`);
      failed++;
    }

    await sleep(50);
  }

  console.log(`\n🎉 완료: 성공 ${success} / 실패 ${failed} / 전체 ${total}`);
}

main().catch(err => { console.error(err); process.exit(1); });
