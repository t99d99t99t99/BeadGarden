const BEAD_ATLAS_VERSION = 1;
const BEAD_GAMEPLAY_SCALE = 2 / 3;
const POT_THEMES = Object.freeze({
  PLANT: 'plant',
  STAR: 'star',
  OCEAN: 'ocean',
  LEGACY: 'legacy',
});

let beadBodySheet = null;
let beadHoleSheet = null;
const beadBodySprites = {};
const beadHoleSprites = {};

function beadAtlasEntry(id, theme, x, y, w, h) {
  return Object.freeze({
    id,
    theme,
    source: Object.freeze({ x, y, w, h }),
    gameplayWidth: w * BEAD_GAMEPLAY_SCALE,
    gameplayHeight: h * BEAD_GAMEPLAY_SCALE,
    holeHeight: Math.max(6, h * BEAD_GAMEPLAY_SCALE * 0.32),
  });
}

const BEAD_ATLAS = Object.freeze([
  beadAtlasEntry('plant-leaf-round', POT_THEMES.PLANT, 1848, 285, 30, 41),
  beadAtlasEntry('plant-leaf-pointed', POT_THEMES.PLANT, 1885, 285, 29, 41),
  beadAtlasEntry('plant-leaf-dark', POT_THEMES.PLANT, 1921, 285, 30, 41),
  beadAtlasEntry('plant-leaf-veined', POT_THEMES.PLANT, 1958, 285, 29, 41),
  beadAtlasEntry('plant-flower', POT_THEMES.PLANT, 1995, 285, 40, 41),
  beadAtlasEntry('plant-apple-red', POT_THEMES.PLANT, 2042, 284, 35, 43),
  beadAtlasEntry('plant-apple-pink', POT_THEMES.PLANT, 2084, 284, 35, 43),
  beadAtlasEntry('plant-strawberry', POT_THEMES.PLANT, 2126, 285, 34, 41),
  beadAtlasEntry('plant-bow-white', POT_THEMES.PLANT, 2169, 287, 33, 37),
  beadAtlasEntry('plant-bow-purple', POT_THEMES.PLANT, 2211, 287, 33, 37),
  beadAtlasEntry('plant-bow-pink', POT_THEMES.PLANT, 2254, 287, 32, 37),
  beadAtlasEntry('plant-bow-yellow', POT_THEMES.PLANT, 2296, 287, 33, 37),

  beadAtlasEntry('star-soft-pink', POT_THEMES.STAR, 1865, 1163, 36, 34),
  beadAtlasEntry('star-soft-silver', POT_THEMES.STAR, 1908, 1163, 36, 34),
  beadAtlasEntry('star-heart-white', POT_THEMES.STAR, 2033, 1161, 32, 36),
  beadAtlasEntry('star-heart-blue', POT_THEMES.STAR, 2072, 1161, 32, 36),
  beadAtlasEntry('star-heart-pink', POT_THEMES.STAR, 2111, 1161, 32, 36),
  beadAtlasEntry('star-heart-mint', POT_THEMES.STAR, 2150, 1161, 32, 36),

  beadAtlasEntry('ocean-conch-purple', POT_THEMES.OCEAN, 1873, 2192, 42, 44),
  beadAtlasEntry('ocean-conch-cream', POT_THEMES.OCEAN, 1923, 2192, 42, 44),
  beadAtlasEntry('ocean-conch-pink', POT_THEMES.OCEAN, 1972, 2192, 42, 44),
  beadAtlasEntry('ocean-shell-lilac', POT_THEMES.OCEAN, 2021, 2198, 47, 32),
  beadAtlasEntry('ocean-shell-ivory', POT_THEMES.OCEAN, 2075, 2198, 47, 32),
  beadAtlasEntry('ocean-shell-blush', POT_THEMES.OCEAN, 2129, 2198, 47, 32),
  beadAtlasEntry('ocean-drop-blue', POT_THEMES.OCEAN, 2078, 2148, 34, 26),
  beadAtlasEntry('ocean-drop-navy', POT_THEMES.OCEAN, 2120, 2148, 35, 26),
  beadAtlasEntry('ocean-drop-green', POT_THEMES.OCEAN, 2162, 2148, 31, 26),
  beadAtlasEntry('ocean-drop-mint', POT_THEMES.OCEAN, 2204, 2148, 31, 26),
  beadAtlasEntry('ocean-drop-sky', POT_THEMES.OCEAN, 2246, 2148, 31, 26),
  beadAtlasEntry('ocean-drop-aqua', POT_THEMES.OCEAN, 2288, 2148, 35, 26),
  beadAtlasEntry('ocean-drop-sand', POT_THEMES.OCEAN, 2330, 2148, 31, 26),
]);

const BEAD_ATLAS_BY_ID = Object.freeze(
  Object.fromEntries(BEAD_ATLAS.map((entry) => [entry.id, entry]))
);

function preloadBeadSpriteSheets() {
  beadBodySheet = loadImage('assets/beads.png');
  beadHoleSheet = loadImage('assets/holes.png');
}

function initializeBeadAtlasSprites() {
  if (!beadBodySheet || !beadHoleSheet) return;

  for (let asset of BEAD_ATLAS) {
    let source = asset.source;
    beadBodySprites[asset.id] = beadBodySheet.get(source.x, source.y, source.w, source.h);
    beadHoleSprites[asset.id] = beadHoleSheet.get(source.x, source.y, source.w, source.h);
  }
}

function normalizePotTheme(potOrTheme) {
  let theme = typeof potOrTheme === 'string' ? potOrTheme : potOrTheme?.theme;
  if (theme === POT_THEMES.PLANT || theme === POT_THEMES.STAR || theme === POT_THEMES.OCEAN) {
    return theme;
  }

  return POT_THEMES.LEGACY;
}

function themeForConcept(concept) {
  if (concept?.includes('식물')) return POT_THEMES.PLANT;
  if (concept?.includes('스타')) return POT_THEMES.STAR;
  if (concept?.includes('바다')) return POT_THEMES.OCEAN;
  return POT_THEMES.LEGACY;
}

function getBeadAtlasEntry(assetId) {
  return BEAD_ATLAS_BY_ID[assetId] || null;
}

function getBeadAtlasPool(theme) {
  let normalizedTheme = normalizePotTheme(theme);
  return BEAD_ATLAS.filter((entry) => entry.theme === normalizedTheme);
}

function drawBeadAtlasLayer(assetOrId, layer, x, y, displayWidth, displayHeight, angle = 0) {
  let asset = typeof assetOrId === 'string' ? getBeadAtlasEntry(assetOrId) : assetOrId;
  if (!asset) return;

  let sprite = layer === 'hole' ? beadHoleSprites[asset.id] : beadBodySprites[asset.id];
  let source = asset.source;
  push();
  translate(x, y);
  rotate(angle);
  imageMode(CENTER);
  if (sprite) {
    image(
      sprite,
      0,
      0,
      displayWidth ?? asset.gameplayWidth,
      displayHeight ?? asset.gameplayHeight
    );
  } else {
    let sheet = layer === 'hole' ? beadHoleSheet : beadBodySheet;
    if (sheet) {
      image(
        sheet,
        0,
        0,
        displayWidth ?? asset.gameplayWidth,
        displayHeight ?? asset.gameplayHeight,
        source.x,
        source.y,
        source.w,
        source.h
      );
    }
  }
  pop();
}
