const BEAD_ATLAS_VERSION = 2;
const BEAD_GAMEPLAY_SCALE = 2 / 3;
const POT_THEMES = Object.freeze({
  PLANT: 'plant',
  STAR: 'star',
  OCEAN: 'ocean',
  LEGACY: 'legacy',
});

let beadBodySheet = null;
const beadBodySprites = {};

function beadAtlasEntry(data) {
  return Object.freeze({
    id: data.id,
    theme: data.theme,
    source: Object.freeze({
      x: data.x,
      y: data.y,
      w: data.w,
      h: data.h,
    }),
    gameplayWidth: data.w * BEAD_GAMEPLAY_SCALE,
    gameplayHeight: data.h * BEAD_GAMEPLAY_SCALE,
    collisionVertices: Object.freeze(
      data.collisionVertices.map((point) => Object.freeze({
        x: point.x * BEAD_GAMEPLAY_SCALE,
        y: point.y * BEAD_GAMEPLAY_SCALE,
      }))
    ),
    renderOffsetX: data.renderOffsetX * BEAD_GAMEPLAY_SCALE,
    renderOffsetY: data.renderOffsetY * BEAD_GAMEPLAY_SCALE,
    collisionWidth: data.collisionWidth * BEAD_GAMEPLAY_SCALE,
    collisionHeight: data.collisionHeight * BEAD_GAMEPLAY_SCALE,
  });
}

const BEAD_ATLAS = Object.freeze(BEAD_ATLAS_MANIFEST.map(beadAtlasEntry));
const BEAD_ATLAS_BY_ID = Object.freeze(
  Object.fromEntries(BEAD_ATLAS.map((entry) => [entry.id, entry]))
);
const BEAD_ATLAS_BY_THEME = Object.freeze({
  [POT_THEMES.PLANT]: Object.freeze(
    BEAD_ATLAS.filter((entry) => entry.theme === POT_THEMES.PLANT)
  ),
  [POT_THEMES.STAR]: Object.freeze(
    BEAD_ATLAS.filter((entry) => entry.theme === POT_THEMES.STAR)
  ),
  [POT_THEMES.OCEAN]: Object.freeze(
    BEAD_ATLAS.filter((entry) => entry.theme === POT_THEMES.OCEAN)
  ),
});

// Old IDs remain readable so previously saved stems continue to render.
const BEAD_ATLAS_ID_ALIASES = Object.freeze({
  'plant-leaf-round': 'plant-leafbottom',
  'plant-leaf-pointed': 'plant-leaftop',
  'plant-leaf-dark': 'plant-leafbottom-1',
  'plant-leaf-veined': 'plant-leaftop-1',
  'plant-flower': 'plant-butterfly',
  'plant-apple-red': 'plant-apple',
  'plant-apple-pink': 'plant-apple-1',
  'plant-strawberry': 'plant-strawberry',
  'plant-bow-white': 'plant-butterfly',
  'plant-bow-purple': 'plant-butterfly-1',
  'plant-bow-pink': 'plant-butterfly-2',
  'plant-bow-yellow': 'plant-butterfly-3',
  'star-soft-pink': 'star-star',
  'star-soft-silver': 'star-star-1',
  'star-heart-white': 'star-heart',
  'star-heart-blue': 'star-heart-1',
  'star-heart-pink': 'star-heart-2',
  'star-heart-mint': 'star-heart-3',
  'ocean-conch-purple': 'ocean-conch',
  'ocean-conch-cream': 'ocean-conch-1',
  'ocean-conch-pink': 'ocean-conch-2',
  'ocean-shell-lilac': 'ocean-seashell',
  'ocean-shell-ivory': 'ocean-seashell-1',
  'ocean-shell-blush': 'ocean-seashell-2',
  'ocean-drop-blue': 'ocean-stone1',
  'ocean-drop-navy': 'ocean-stone1-1',
  'ocean-drop-green': 'ocean-stone1-2',
  'ocean-drop-mint': 'ocean-stone1-3',
  'ocean-drop-sky': 'ocean-stone2',
  'ocean-drop-aqua': 'ocean-stone2-1',
  'ocean-drop-sand': 'ocean-stone2-2',
});

function preloadBeadSpriteSheets() {
  beadBodySheet = loadImage('assets/atlases/beads.png');
}

function initializeBeadAtlasSprites() {
  // Sprites are cached lazily because pre-cropping all 590 entries stalls setup.
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
  let resolvedId = BEAD_ATLAS_ID_ALIASES[assetId] || assetId;
  return BEAD_ATLAS_BY_ID[resolvedId] || null;
}

function getBeadAtlasPool(theme) {
  let normalizedTheme = normalizePotTheme(theme);
  return BEAD_ATLAS_BY_THEME[normalizedTheme] || [];
}

function getBeadAtlasSprite(asset) {
  if (!asset || !beadBodySheet) return null;
  if (!beadBodySprites[asset.id]) {
    let source = asset.source;
    beadBodySprites[asset.id] = beadBodySheet.get(
      source.x,
      source.y,
      source.w,
      source.h
    );
  }
  return beadBodySprites[asset.id];
}

function drawBeadAtlas(
  assetOrId,
  x,
  y,
  displayWidth,
  displayHeight,
  angle = 0,
  renderOffsetX = 0,
  renderOffsetY = 0
) {
  let asset = typeof assetOrId === 'string' ? getBeadAtlasEntry(assetOrId) : assetOrId;
  if (!asset || !beadBodySheet) return;

  let sprite = getBeadAtlasSprite(asset);
  let source = asset.source;
  push();
  translate(x, y);
  rotate(angle);
  imageMode(CENTER);
  if (sprite) {
    image(
      sprite,
      renderOffsetX,
      renderOffsetY,
      displayWidth ?? asset.gameplayWidth,
      displayHeight ?? asset.gameplayHeight
    );
  } else {
    image(
      beadBodySheet,
      renderOffsetX,
      renderOffsetY,
      displayWidth ?? asset.gameplayWidth,
      displayHeight ?? asset.gameplayHeight,
      source.x,
      source.y,
      source.w,
      source.h
    );
  }
  pop();
}
