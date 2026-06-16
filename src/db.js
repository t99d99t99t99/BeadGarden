const DATABASE_SERVER = 'server';
const DATABASE_LOCAL = 'local';
const LOCAL_DATABASE_KEY = 'beadgarden_local_database_v1';
const DATABASE_MODE_STORAGE_KEY = 'beadgarden_debug_database_mode';
const DATABASE_CONNECT_TIMEOUT_MS = 5000;
const STORAGE_UPLOAD_TIMEOUT_MS = 30000;
const POT_LIKE_COOLDOWN_MS = 300 * 1000;
const POT_LIKE_STORAGE_KEY = 'beadgarden_pot_like_timestamps_v1';

let databaseMode = readStoredDatabaseMode();
let databaseStatus = databaseMode === DATABASE_LOCAL ? 'Using local database' : 'Connecting to server';
let potsListener = null;
let firestoreUnsubscribe = null;
let potsListenerGeneration = 0;

// ── 비즈 카탈로그 ────────────────────────────────────────────────────────────
let beadCatalog = {};
let beadImages = {};

async function loadBeadCatalog() {
  if (databaseMode === DATABASE_LOCAL) {
    beadCatalog = readLocalDatabase().beads;
    return beadCatalog;
  }

  try {
    await ensureFirebaseReady();
    const snapshot = await withDatabaseTimeout(db.collection('beads').get());
    beadCatalog = {};
    snapshot.docs.forEach(doc => {
      beadCatalog[doc.id] = doc.data();
    });
    updateLocalDatabase(data => {
      data.beads = beadCatalog;
    });
    databaseStatus = 'Connected to server';
  } catch (err) {
    switchToLocalDatabase(err);
    beadCatalog = readLocalDatabase().beads;
    restartPotsListener();
  }

  return beadCatalog;
}

function preloadBeadImages() {
  for (const [beadId, data] of Object.entries(beadCatalog)) {
    if (data.imagePath) {
      beadImages[beadId] = loadImage(normalizeAssetPath(data.imagePath));
    }
  }
}

function getBeadsByTheme(theme) {
  return Object.entries(beadCatalog)
    .filter(([, data]) => data.theme === 'basic' || data.theme === theme)
    .map(([id, data]) => ({
      beadId: id,
      ...data,
      imagePath: normalizeAssetPath(data.imagePath),
    }));
}

function normalizeAssetPath(imagePath) {
  if (typeof imagePath !== 'string') return imagePath;

  return imagePath
    .replace(/^assets\/(plant|star|ocean)\//, 'assets/beads/$1/')
    .replace(/^assets\/pots\/(?!source\/)/, 'assets/pots/source/');
}

// ── Device ID ────────────────────────────────────────────────────────────────
const myDeviceId = (() => {
  let id = localStorage.getItem('beadgarden_device_id');
  if (!id) {
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

// ── Backend selection ────────────────────────────────────────────────────────
function getDatabaseMode() {
  return databaseMode;
}

function getDatabaseStatus() {
  return databaseStatus;
}

async function setDatabaseMode(mode) {
  if (mode === DATABASE_LOCAL) {
    storeDatabaseMode(DATABASE_LOCAL);
    switchToLocalDatabase();
    restartPotsListener();
    return true;
  }

  databaseStatus = 'Connecting to server';
  try {
    await ensureFirebaseReady();
    await withDatabaseTimeout(db.collection('pots').limit(1).get());
    databaseMode = DATABASE_SERVER;
    storeDatabaseMode(DATABASE_SERVER);
    databaseStatus = 'Connected to server';
    restartPotsListener();
    return true;
  } catch (err) {
    switchToLocalDatabase(err);
    restartPotsListener();
    return false;
  }
}

function readStoredDatabaseMode() {
  try {
    let storedMode = localStorage.getItem(DATABASE_MODE_STORAGE_KEY);
    return storedMode === DATABASE_LOCAL ? DATABASE_LOCAL : DATABASE_SERVER;
  } catch (err) {
    console.warn('[Database] Failed to read stored database mode:', err);
    return DATABASE_SERVER;
  }
}

function storeDatabaseMode(mode) {
  try {
    localStorage.setItem(DATABASE_MODE_STORAGE_KEY, mode);
  } catch (err) {
    console.warn('[Database] Failed to store database mode:', err);
  }
}

function switchToLocalDatabase(err) {
  if (firestoreUnsubscribe) {
    firestoreUnsubscribe();
    firestoreUnsubscribe = null;
  }
  databaseMode = DATABASE_LOCAL;
  databaseStatus = err ? 'Server unavailable; using local' : 'Using local database';
  if (err) {
    console.warn('[Database] Server unavailable; switched to local database:', err);
  }
}

function withDatabaseTimeout(promise) {
  return withOperationTimeout(
    promise,
    DATABASE_CONNECT_TIMEOUT_MS,
    'Database connection timed out'
  );
}

function withOperationTimeout(promise, timeoutMs, message) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(message)),
      timeoutMs
    );

    Promise.resolve(promise).then(
      value => {
        clearTimeout(timeout);
        resolve(value);
      },
      err => {
        clearTimeout(timeout);
        reject(err);
      }
    );
  });
}

async function ensureFirebaseReady() {
  if (!db) {
    throw new Error('Firebase is unavailable');
  }

  const result = await withDatabaseTimeout(firebaseAuthReadyPromise);
  if (!result?.ok) {
    throw result?.error ?? new Error('Firebase authentication failed');
  }
}

// ── Pots subscription ────────────────────────────────────────────────────────
function listenPots(onUpdate) {
  potsListener = onUpdate;
  restartPotsListener();
}

function restartPotsListener() {
  if (!potsListener) return;

  potsListenerGeneration += 1;
  const generation = potsListenerGeneration;

  if (firestoreUnsubscribe) {
    firestoreUnsubscribe();
    firestoreUnsubscribe = null;
  }

  if (databaseMode === DATABASE_LOCAL) {
    emitLocalPots();
    return;
  }

  if (!db) {
    switchToLocalDatabase(new Error('Firebase is unavailable'));
    emitLocalPots();
    return;
  }

  ensureFirebaseReady().then(() => {
    if (generation !== potsListenerGeneration ||
      databaseMode !== DATABASE_SERVER ||
      !potsListener) {
      return;
    }

    firestoreUnsubscribe = db.collection('pots')
      .orderBy('createdAt', 'asc')
      .onSnapshot(snapshot => {
        if (generation !== potsListenerGeneration ||
          databaseMode !== DATABASE_SERVER) {
          return;
        }

        const pots = snapshot.docs.map(doc => ({
          firestoreId: doc.id,
          ...doc.data(),
        })).map(normalizeStoredPot);

        updateLocalDatabase(data => {
          if (pots.length > 0 || data.pots.length === 0) {
            data.pots = pots;
          }
        });
        databaseStatus = 'Connected to server';
        potsListener(pots);
      }, err => {
        if (generation !== potsListenerGeneration) {
          return;
        }
        firestoreUnsubscribe = null;
        switchToLocalDatabase(err);
        emitLocalPots();
      });
  }).catch(err => {
    if (generation === potsListenerGeneration &&
      databaseMode === DATABASE_SERVER) {
      switchToLocalDatabase(err);
      emitLocalPots();
    }
  });
}

function emitLocalPots() {
  if (!potsListener) return;
  const pots = readLocalDatabase().pots
    .map(normalizeStoredPot)
    .sort((a, b) => databaseDateValue(a.createdAt) - databaseDateValue(b.createdAt));
  potsListener(pots);
}

function normalizeStoredPot(pot) {
  return {
    ...pot,
    theme: normalizePotTheme(pot),
    likeCount: getPotLikeCount(pot),
  };
}

function databaseDateValue(value) {
  if (typeof value === 'number') return value;
  if (value?.toMillis) return value.toMillis();
  if (value?.seconds) return value.seconds * 1000;
  return 0;
}

// ── Pot writes ────────────────────────────────────────────────────────────────
async function createPot(data) {
  const pot = {
    createdBy: myDeviceId,
    createdAt: Date.now(),
    name: data.name,
    desc: data.desc ?? '',
    concept: data.concept ?? '',
    theme: normalizePotTheme(data.theme),
    cardY: data.cardY,
    colorIndex: 0,
    bgIndex: 0,
    shapeIndex: 0,
    locked: false,
    likeCount: 0,
    stems: [],
  };

  if (databaseMode === DATABASE_SERVER) {
    try {
      await ensureFirebaseReady();
      const ref = await withDatabaseTimeout(db.collection('pots').add({
        ...pot,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      }));
      return ref.id;
    } catch (err) {
      switchToLocalDatabase(err);
    }
  }

  const potId = createLocalId();
  updateLocalPot(potId, () => pot);
  emitLocalPots();
  return potId;
}

async function updatePotDecor(potId, decorData) {
  const changes = {
    potAssetIndex: decorData.potAssetIndex,
    potAssetName: decorData.potAssetName,
    colorIndex: decorData.colorIndex,
    bgIndex: decorData.bgIndex,
    stems: decorData.stems,
  };
  await updatePotWithFallback(potId, changes);
}

async function addStemToPot(potId, stemData) {
  if (databaseMode === DATABASE_SERVER) {
    try {
      await ensureFirebaseReady();
      await withDatabaseTimeout(db.collection('pots').doc(potId).update({
        stems: firebase.firestore.FieldValue.arrayUnion(stemData),
      }));
      return;
    } catch (err) {
      switchToLocalDatabase(err);
    }
  }

  updateLocalPot(potId, pot => ({
    ...pot,
    stems: [...(pot.stems ?? []), stemData],
  }));
  emitLocalPots();
}

async function lockPot(potId) {
  await updatePotWithFallback(potId, { locked: true });
}

async function unlockPot(potId) {
  await updatePotWithFallback(potId, { locked: false });
}

function getPotLikeCount(pot) {
  const count = Number(pot?.likeCount ?? pot?.likes ?? 0);
  return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
}

function getPotLikeCooldownRemaining(potOrId, now = Date.now()) {
  const potId = potLikeStorageId(potOrId);
  if (!potId) return 0;

  const timestamps = readPotLikeTimestamps();
  const likedAt = Number(timestamps[potId] ?? 0);
  if (!Number.isFinite(likedAt) || likedAt <= 0) return 0;
  return Math.max(0, POT_LIKE_COOLDOWN_MS - (now - likedAt));
}

function clearPotLikeCooldowns() {
  try {
    localStorage.removeItem(POT_LIKE_STORAGE_KEY);
  } catch (err) {
    console.warn('[Database] Failed to clear pot like cooldowns:', err);
  }
}

async function likePot(pot) {
  const potId = potLikeStorageId(pot);
  if (!potId) {
    throw new Error('MISSING_POT_ID');
  }

  const remainingMs = getPotLikeCooldownRemaining(potId);
  if (remainingMs > 0) {
    return {
      ok: false,
      cooldown: true,
      remainingMs,
      likeCount: getPotLikeCount(pot),
    };
  }

  const likedAt = Date.now();

  if (databaseMode === DATABASE_SERVER) {
    try {
      await ensureFirebaseReady();
      await withDatabaseTimeout(db.collection('pots').doc(potId).update({
        likeCount: firebase.firestore.FieldValue.increment(1),
        likedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }));

      const likeCount = getPotLikeCount(pot) + 1;
      if (pot && typeof pot === 'object') {
        pot.likeCount = likeCount;
      }
      updateLocalDatabase(data => {
        const index = data.pots.findIndex(item => item.firestoreId === potId);
        if (index >= 0) {
          data.pots[index] = {
            ...data.pots[index],
            likeCount,
          };
        }
      });
      writePotLikeTimestamp(potId, likedAt);
      return { ok: true, likeCount };
    } catch (err) {
      switchToLocalDatabase(err);
    }
  }

  updateLocalPot(potId, current => ({
    ...pot,
    ...current,
    likeCount: Math.max(getPotLikeCount(current), getPotLikeCount(pot)) + 1,
    likedAt,
  }));
  const storedPot = readLocalDatabase().pots.find(item =>
    item.firestoreId === potId || item.localId === potId
  );
  const likeCount = getPotLikeCount(storedPot);
  if (pot && typeof pot === 'object') {
    pot.likeCount = likeCount;
  }
  writePotLikeTimestamp(potId, likedAt);
  emitLocalPots();
  return { ok: true, likeCount };
}

function potLikeStorageId(potOrId) {
  if (typeof potOrId === 'string') return potOrId;
  return potOrId?.firestoreId ?? potOrId?.localId ?? potOrId?.id ?? '';
}

function readPotLikeTimestamps() {
  try {
    const stored = JSON.parse(localStorage.getItem(POT_LIKE_STORAGE_KEY));
    return stored && typeof stored === 'object' ? stored : {};
  } catch (err) {
    console.warn('[Database] Failed to read pot like timestamps:', err);
    return {};
  }
}

function writePotLikeTimestamp(potId, likedAt) {
  try {
    const timestamps = readPotLikeTimestamps();
    timestamps[potId] = likedAt;
    localStorage.setItem(POT_LIKE_STORAGE_KEY, JSON.stringify(timestamps));
  } catch (err) {
    console.warn('[Database] Failed to store pot like timestamp:', err);
  }
}

async function uploadPotImageDownload(pot, imageBlob, imageHash) {
  if (databaseMode === DATABASE_LOCAL) {
    throw new Error('LOCAL_DATABASE_MODE');
  }
  if (!pot?.firestoreId) {
    throw new Error('MISSING_POT_ID');
  }
  if (!imageBlob || !imageHash) {
    throw new Error('MISSING_POT_IMAGE');
  }
  if (pot.imageDownload?.hash === imageHash && pot.imageDownload?.url) {
    return pot.imageDownload;
  }

  await ensureFirebaseReady();
  if (typeof firebase === 'undefined' || typeof firebase.storage !== 'function') {
    throw new Error('Firebase Storage is unavailable');
  }

  const path = `pot-images/${sanitizeStoragePathSegment(pot.firestoreId)}/${imageHash}.png`;
  const ref = firebase.storage().ref(path);

  await withOperationTimeout(
    ref.put(imageBlob, {
      contentType: 'image/png',
      customMetadata: {
        potId: String(pot.firestoreId),
        imageHash,
      },
    }),
    STORAGE_UPLOAD_TIMEOUT_MS,
    'Pot image upload timed out'
  );
  const url = await withOperationTimeout(
    ref.getDownloadURL(),
    STORAGE_UPLOAD_TIMEOUT_MS,
    'Storage download URL lookup timed out'
  );

  const imageDownload = {
    hash: imageHash,
    path,
    url,
    updatedAt: Date.now(),
  };

  await withDatabaseTimeout(db.collection('pots').doc(pot.firestoreId).update({
    imageDownload: {
      hash: imageHash,
      path,
      url,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    },
  }));

  pot.imageDownload = imageDownload;
  updateLocalDatabase(data => {
    const index = data.pots.findIndex(item => item.firestoreId === pot.firestoreId);
    if (index >= 0) {
      data.pots[index] = {
        ...data.pots[index],
        imageDownload,
      };
    }
  });

  return imageDownload;
}

function sanitizeStoragePathSegment(value) {
  return String(value).replace(/[^A-Za-z0-9._-]/g, '_');
}

async function deletePot(potId) {
  if (databaseMode === DATABASE_SERVER) {
    try {
      await ensureFirebaseReady();
      await withDatabaseTimeout(db.collection('pots').doc(potId).delete());
      deleteLocalPot(potId);
      emitLocalPots();
      return;
    } catch (err) {
      switchToLocalDatabase(err);
    }
  }

  deleteLocalPot(potId);
  emitLocalPots();
}

async function updatePotWithFallback(potId, changes) {
  if (databaseMode === DATABASE_SERVER) {
    try {
      await ensureFirebaseReady();
      await withDatabaseTimeout(db.collection('pots').doc(potId).update(changes));
      return;
    } catch (err) {
      switchToLocalDatabase(err);
    }
  }

  updateLocalPot(potId, pot => ({ ...pot, ...changes }));
  emitLocalPots();
}

// ── Local database ────────────────────────────────────────────────────────────
function readLocalDatabase() {
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_DATABASE_KEY));
    return {
      pots: Array.isArray(stored?.pots) ? stored.pots : [],
      beads: stored?.beads && typeof stored.beads === 'object' ? stored.beads : {},
    };
  } catch (err) {
    console.warn('[Database] Could not read local database; resetting it:', err);
    return { pots: [], beads: {} };
  }
}

function updateLocalDatabase(update) {
  const data = readLocalDatabase();
  update(data);
  localStorage.setItem(LOCAL_DATABASE_KEY, JSON.stringify(data));
}

function updateLocalPot(potId, update) {
  updateLocalDatabase(data => {
    const index = data.pots.findIndex(pot => pot.firestoreId === potId);
    const current = index >= 0 ? data.pots[index] : { firestoreId: potId };
    const next = { ...update(current), firestoreId: potId };
    if (index >= 0) {
      data.pots[index] = next;
    } else {
      data.pots.push(next);
    }
  });
}

function deleteLocalPot(potId) {
  updateLocalDatabase(data => {
    data.pots = data.pots.filter(pot =>
      pot.firestoreId !== potId && pot.localId !== potId
    );
  });
}

function createLocalId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `local-${crypto.randomUUID()}`;
  }
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
