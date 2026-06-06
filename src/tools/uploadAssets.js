/**
 * Firestore 비즈 메타데이터 등록 스크립트 (Firebase Storage 불필요)
 * 이미지는 assets/ 폴더에서 상대 경로로 직접 서빙
 *
 * 실행: node src/tools/uploadAssets.js
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'beadgarden-51b72-firebase-adminsdk-fbsvc-6ba2924bff.json');
const ASSET_DIR = path.join(__dirname, '../../assets');

admin.initializeApp({
  credential: admin.credential.cert(require(SERVICE_ACCOUNT_PATH)),
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
  const themes = fs.readdirSync(ASSET_DIR).filter(d =>
    fs.statSync(path.join(ASSET_DIR, d)).isDirectory()
  );

  let total = 0, success = 0, failed = 0;

  for (const theme of themes) {
    const themeDir = path.join(ASSET_DIR, theme);
    const files    = fs.readdirSync(themeDir).filter(f => /\.(png|jpg|webp)$/i.test(f));

    console.log(`\n📂 ${theme}/ — ${files.length}개 파일`);

    for (const filename of files) {
      const base     = path.basename(filename, path.extname(filename));
      // 앱에서 사용할 상대 경로 (index.html 기준)
      const imagePath = `assets/${theme}/${filename}`;
      total++;

      try {
        if (theme === 'pots') {
          const potId = `pot_${base}`;
          await db.collection('potAssets').doc(potId).set({
            name:      makeDisplayName(base),
            imagePath,
          });
          console.log(`  ✅ ${potId}`);
        } else {
          const beadId = makeBeadId(theme, filename);
          await db.collection('beads').doc(beadId).set({
            name:      makeDisplayName(base),
            theme,
            imagePath,
            width:     40,
            height:    40,
          });
          console.log(`  ✅ ${beadId}`);
        }
        success++;
      } catch (err) {
        console.error(`  ❌ ${filename}: ${err.message}`);
        failed++;
      }

      await sleep(50);
    }
  }

  console.log(`\n🎉 완료: 성공 ${success} / 실패 ${failed} / 전체 ${total}`);
}

main().catch(err => { console.error(err); process.exit(1); });
