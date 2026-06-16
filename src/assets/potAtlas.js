const POT_ATLAS_VERSION = 1;
const POT_ATLAS_REFERENCE_WIDTH = 337;
const POT_ATLAS_REFERENCE_HEIGHT = 317;

let potSpriteSheet = null;
const potAssetImages = {};

function potAtlasEntry(
  id,
  theme,
  x,
  y,
  w,
  h,
  tintable = false,
  stemYRatio = 0,
  stemOpeningRatio = 0.8,
  stemOpeningCenterRatio = 0.5,
  stemOpeningCurveRatio = 0,
  stemOpeningTiltRatio = 0
) {
  return Object.freeze({
    id,
    theme,
    source: Object.freeze({ x, y, w, h }),
    tintable,
    stemYRatio, // 0 = 이미지 최상단, 0.3 = 이미지 높이의 30% 아래에서 줄기 시작
    stemOpeningRatio,
    stemOpeningCenterRatio,
    stemOpeningCurveRatio,
    stemOpeningTiltRatio,
  });
}

const POT_ATLAS = Object.freeze([
  potAtlasEntry('potBrown', POT_THEMES.PLANT, 378, 349, 221, 200),
  potAtlasEntry('potBlack', POT_THEMES.PLANT, 654, 349, 220, 200, true),
  potAtlasEntry('ceramicWhite', POT_THEMES.PLANT, 928, 419, 321, 130, false, 0, 0.32),
  potAtlasEntry('Glass', POT_THEMES.PLANT, 1302, 284, 153, 265, false, 0, 0.58),
  potAtlasEntry('ceramicBlack', POT_THEMES.PLANT, 1508, 305, 163, 244, true, 0, 0.46),
  potAtlasEntry('mushroomPink', POT_THEMES.PLANT, 1724, 327, 261, 222, false, 0, 0.72),
  potAtlasEntry('mushroomYellow', POT_THEMES.PLANT, 2038, 327, 260, 222, false, 0, 0.72),

  potAtlasEntry('potPinkTaddy', POT_THEMES.STAR, 378, 768, 212, 174),
  potAtlasEntry('potBlack', POT_THEMES.STAR, 645, 742, 220, 199, true),
  potAtlasEntry('Glass', POT_THEMES.STAR, 920, 676, 152, 265, false, 0, 0.58),
  potAtlasEntry('ceramicBlack', POT_THEMES.STAR, 1126, 697, 162, 244, true, 0, 0.46),
  potAtlasEntry('bootsBlack', POT_THEMES.STAR, 1343, 624, 275, 317, true, 0.009, 0.509, 0.727, 0.077, -0.039),
  potAtlasEntry('bootsTaddyWhite', POT_THEMES.STAR, 1673, 624, 275, 317, false, 0.009, 0.509, 0.727, 0.077, -0.039),
  potAtlasEntry('bootsTaddyPink', POT_THEMES.STAR, 2002, 624, 275, 317, false, 0.009, 0.509, 0.727, 0.077, -0.039),
  potAtlasEntry('bootsTaddyMint', POT_THEMES.STAR, 2332, 624, 275, 317, false, 0.009, 0.509, 0.727, 0.077, -0.039),

  potAtlasEntry('potSkyblue', POT_THEMES.OCEAN, 378, 1082, 221, 200),
  potAtlasEntry('potBlack', POT_THEMES.OCEAN, 654, 1082, 220, 200, true),
  potAtlasEntry('Rectangle 144', POT_THEMES.OCEAN, 929, 1132, 178, 150, false, 0, 0.8),
  potAtlasEntry('Glass', POT_THEMES.OCEAN, 1161, 1017, 152, 265, false, 0, 0.58),
  potAtlasEntry('ceramicBlack', POT_THEMES.OCEAN, 1367, 1038, 163, 244, true, 0, 0.46),
  potAtlasEntry('ceramicGreen', POT_THEMES.OCEAN, 1583, 1107, 253, 175, false, 0, 0.72),
  potAtlasEntry('ceramicBlue', POT_THEMES.OCEAN, 1889, 1107, 253, 175, false, 0, 0.72),
  potAtlasEntry('whale', POT_THEMES.OCEAN, 2196, 1055, 337, 227, false, 0.24, 0.42, 0.62),
]);

const POT_ASSETS_BY_THEME = Object.freeze({
  [POT_THEMES.PLANT]: POT_ATLAS.filter((asset) => asset.theme === POT_THEMES.PLANT),
  [POT_THEMES.STAR]: POT_ATLAS.filter((asset) => asset.theme === POT_THEMES.STAR),
  [POT_THEMES.OCEAN]: POT_ATLAS.filter((asset) => asset.theme === POT_THEMES.OCEAN),
});

const POT_ASSETS_BY_CONCEPT = Object.freeze({
  '식물 에디션': POT_ASSETS_BY_THEME[POT_THEMES.PLANT].map((asset) => asset.id),
  '스타 에디션': POT_ASSETS_BY_THEME[POT_THEMES.STAR].map((asset) => asset.id),
  '바다 에디션': POT_ASSETS_BY_THEME[POT_THEMES.OCEAN].map((asset) => asset.id),
});

function preloadPotImages() {
  potSpriteSheet = loadImage('assets/atlases/pots.png');
}

function initializePotAtlasSprites() {
  if (!potSpriteSheet) return;

  for (let asset of POT_ATLAS) {
    let source = asset.source;
    potAssetImages[`${asset.theme}:${asset.id}`] =
      potSpriteSheet.get(source.x, source.y, source.w, source.h);
  }
}

function getPotAssetsForTheme(theme) {
  let normalizedTheme = normalizePotTheme(theme);
  if (normalizedTheme === POT_THEMES.LEGACY && typeof theme === 'object') {
    normalizedTheme = themeForConcept(theme?.concept);
  }
  return POT_ASSETS_BY_THEME[normalizedTheme] || POT_ASSETS_BY_THEME[POT_THEMES.STAR];
}

function getPotAsset(assetId, theme) {
  let pool = getPotAssetsForTheme(theme);
  return pool.find((asset) => asset.id === assetId) || null;
}

function getPotAssetForPot(pot) {
  let pool = getPotAssetsForTheme(pot);
  return getPotAsset(pot?.potAssetName, pot) || pool[pot?.potAssetIndex ?? 0] || pool[0] || null;
}

function getPotAssetDrawSize(asset, maxWidth, maxHeight, preserveAtlasScale = false) {
  if (!asset) return { width: 0, height: 0 };

  let scale = preserveAtlasScale
    ? Math.min(
      maxWidth / POT_ATLAS_REFERENCE_WIDTH,
      maxHeight / POT_ATLAS_REFERENCE_HEIGHT
    )
    : Math.min(maxWidth / asset.source.w, maxHeight / asset.source.h);
  return {
    width: asset.source.w * scale,
    height: asset.source.h * scale,
  };
}

function drawPotAsset(
  assetOrId,
  theme,
  x,
  y,
  maxWidth,
  maxHeight,
  colorIndex = 0,
  preserveAtlasScale = false
) {
  let asset = typeof assetOrId === 'string' ? getPotAsset(assetOrId, theme) : assetOrId;
  if (!asset) return false;

  let sprite = potAssetImages[`${asset.theme}:${asset.id}`];
  if (!sprite) return false;

  let drawSize = getPotAssetDrawSize(asset, maxWidth, maxHeight, preserveAtlasScale);

  push();
  imageMode(CENTER);
  if (asset.tintable) {
    tint(POT_COLORS[colorIndex] ?? POT_COLORS[0]);
  }
  image(sprite, x, y, drawSize.width, drawSize.height);
  noTint();
  pop();
  return true;
}
