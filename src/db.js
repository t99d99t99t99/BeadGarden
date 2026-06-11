const DATABASE_SERVER = 'server';
const DATABASE_LOCAL = 'local';
const LOCAL_DATABASE_KEY = 'beadgarden_local_database_v1';
const DATABASE_CONNECT_TIMEOUT_MS = 5000;

let databaseMode = DATABASE_SERVER;
let databaseStatus = 'Connecting to server';
let potsListener = null;
let firestoreUnsubscribe = null;

// ── 비즈 카탈로그 ────────────────────────────────────────────────────────────
let beadCatalog = {};
let beadImages = {};

async function loadBeadCatalog() {
  if (databaseMode === DATABASE_LOCAL) {
    beadCatalog = readLocalDatabase().beads;
    return beadCatalog;
  }

  try {
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
      beadImages[beadId] = loadImage(data.imagePath);
    }
  }
}

function getBeadsByTheme(theme) {
  return Object.entries(beadCatalog)
    .filter(([, data]) => data.theme === 'basic' || data.theme === theme)
    .map(([id, data]) => ({ beadId: id, ...data }));
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
    switchToLocalDatabase();
    restartPotsListener();
    return true;
  }

  databaseStatus = 'Connecting to server';
  try {
    if (!db) throw new Error('Firebase is unavailable');
    await withDatabaseTimeout(db.collection('pots').limit(1).get());
    databaseMode = DATABASE_SERVER;
    databaseStatus = 'Connected to server';
    restartPotsListener();
    return true;
  } catch (err) {
    switchToLocalDatabase(err);
    restartPotsListener();
    return false;
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
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Database connection timed out')),
      DATABASE_CONNECT_TIMEOUT_MS
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

// ── Pots subscription ────────────────────────────────────────────────────────
function listenPots(onUpdate) {
  potsListener = onUpdate;
  restartPotsListener();
}

function restartPotsListener() {
  if (!potsListener) return;

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

  firestoreUnsubscribe = db.collection('pots')
    .orderBy('createdAt', 'asc')
    .onSnapshot(snapshot => {
      if (databaseMode !== DATABASE_SERVER) return;

      const pots = snapshot.docs.map(doc => ({
        firestoreId: doc.id,
        ...doc.data(),
      })).map(normalizeStoredPot);

      updateLocalDatabase(data => {
        data.pots = pots;
      });
      databaseStatus = 'Connected to server';
      potsListener(pots);
    }, err => {
      firestoreUnsubscribe = null;
      switchToLocalDatabase(err);
      emitLocalPots();
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
    stems: [],
  };

  if (databaseMode === DATABASE_SERVER) {
    try {
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

async function updatePotWithFallback(potId, changes) {
  if (databaseMode === DATABASE_SERVER) {
    try {
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

function createLocalId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `local-${crypto.randomUUID()}`;
  }
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
