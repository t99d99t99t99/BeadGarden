const QR_LOW_ECC_BLOCKS = [
  null,
  { ecc: 7, blocks: [19] },
  { ecc: 10, blocks: [34] },
  { ecc: 15, blocks: [55] },
  { ecc: 20, blocks: [80] },
  { ecc: 26, blocks: [108] },
  { ecc: 18, blocks: [68, 68] },
  { ecc: 20, blocks: [78, 78] },
  { ecc: 24, blocks: [97, 97] },
  { ecc: 30, blocks: [116, 116] },
  { ecc: 18, blocks: [68, 68, 69, 69] },
  { ecc: 20, blocks: [81, 81, 81, 81] },
  { ecc: 24, blocks: [92, 92, 93, 93] },
  { ecc: 26, blocks: [107, 107, 107, 107] },
  { ecc: 30, blocks: [115, 115, 115, 116] },
  { ecc: 22, blocks: [87, 87, 87, 87, 87, 88] },
  { ecc: 24, blocks: [98, 98, 98, 98, 98, 99] },
  { ecc: 28, blocks: [107, 108, 108, 108, 108, 108] },
  { ecc: 30, blocks: [120, 120, 120, 120, 120, 121] },
  { ecc: 28, blocks: [113, 113, 113, 114, 114, 114, 114] },
  { ecc: 28, blocks: [107, 107, 107, 108, 108, 108, 108, 108] },
];

const QR_ALIGNMENT_POSITIONS = [
  null,
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70],
  [6, 26, 50, 74],
  [6, 30, 54, 78],
  [6, 30, 56, 82],
  [6, 30, 58, 86],
  [6, 34, 62, 90],
];

const QR_GF_EXP = new Array(512);
const QR_GF_LOG = new Array(256);

(() => {
  let value = 1;
  for (let i = 0; i < 255; i++) {
    QR_GF_EXP[i] = value;
    QR_GF_LOG[value] = i;
    value <<= 1;
    if (value & 0x100) value ^= 0x11D;
  }
  for (let i = 255; i < 512; i++) {
    QR_GF_EXP[i] = QR_GF_EXP[i - 255];
  }
})();

function createQrCodeMatrix(text) {
  const data = new TextEncoder().encode(text);
  const version = selectQrVersion(data.length);
  const blockInfo = QR_LOW_ECC_BLOCKS[version];
  const dataCodewordCount = blockInfo.blocks.reduce((sum, count) => sum + count, 0);
  const dataCodewords = createQrDataCodewords(data, version, dataCodewordCount);
  const codewords = addQrErrorCorrection(dataCodewords, blockInfo);
  return buildQrMatrix(version, codewords);
}

function selectQrVersion(byteLength) {
  for (let version = 1; version < QR_LOW_ECC_BLOCKS.length; version++) {
    if (version < 10 && byteLength > 255) continue;
    const dataCodewordCount = QR_LOW_ECC_BLOCKS[version].blocks
      .reduce((sum, count) => sum + count, 0);
    const countBits = version < 10 ? 8 : 16;
    if (4 + countBits + byteLength * 8 <= dataCodewordCount * 8) {
      return version;
    }
  }
  throw new Error('QR 코드로 만들기에는 URL이 너무 깁니다.');
}

function createQrDataCodewords(data, version, dataCodewordCount) {
  const bits = [];
  appendQrBits(bits, 0x4, 4); // Byte mode
  appendQrBits(bits, data.length, version < 10 ? 8 : 16);
  for (const byte of data) appendQrBits(bits, byte, 8);

  const capacityBits = dataCodewordCount * 8;
  appendQrBits(bits, 0, Math.min(4, capacityBits - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let value = 0;
    for (let j = 0; j < 8; j++) value = (value << 1) | bits[i + j];
    codewords.push(value);
  }

  for (let pad = 0xEC; codewords.length < dataCodewordCount; pad ^= 0xFD) {
    codewords.push(pad);
  }
  return codewords;
}

function appendQrBits(bits, value, length) {
  if (length < 0 || value >>> length !== 0) {
    throw new Error('Invalid QR bit field');
  }
  for (let i = length - 1; i >= 0; i--) {
    bits.push((value >>> i) & 1);
  }
}

function addQrErrorCorrection(dataCodewords, blockInfo) {
  const blocks = [];
  let offset = 0;
  for (const blockSize of blockInfo.blocks) {
    const data = dataCodewords.slice(offset, offset + blockSize);
    blocks.push({
      data,
      ecc: createQrErrorCorrection(data, blockInfo.ecc),
    });
    offset += blockSize;
  }

  const result = [];
  const maxDataLength = Math.max(...blocks.map(block => block.data.length));
  for (let i = 0; i < maxDataLength; i++) {
    for (const block of blocks) {
      if (i < block.data.length) result.push(block.data[i]);
    }
  }
  for (let i = 0; i < blockInfo.ecc; i++) {
    for (const block of blocks) {
      result.push(block.ecc[i]);
    }
  }
  return result;
}

function createQrErrorCorrection(data, degree) {
  const generator = createQrGeneratorPolynomial(degree);
  const result = new Array(degree).fill(0);

  for (const byte of data) {
    const factor = byte ^ result.shift();
    result.push(0);
    for (let i = 0; i < degree; i++) {
      result[i] ^= qrGfMultiply(generator[i], factor);
    }
  }
  return result;
}

function createQrGeneratorPolynomial(degree) {
  const result = [1];
  for (let i = 0; i < degree; i++) {
    result.push(0);
    for (let j = 0; j < result.length - 1; j++) {
      result[j] = qrGfMultiply(result[j], QR_GF_EXP[i]);
      result[j] ^= result[j + 1];
    }
  }
  return result.slice(0, degree);
}

function qrGfMultiply(x, y) {
  if (x === 0 || y === 0) return 0;
  return QR_GF_EXP[QR_GF_LOG[x] + QR_GF_LOG[y]];
}

function buildQrMatrix(version, codewords) {
  const size = version * 4 + 17;
  const base = createQrBaseMatrix(version, size);
  const dataBits = [];
  for (const codeword of codewords) appendQrBits(dataBits, codeword, 8);

  let best = null;
  for (let mask = 0; mask < 8; mask++) {
    const modules = cloneQrMatrix(base.modules);
    placeQrDataBits(modules, base.isFunction, dataBits, mask);
    drawQrFormatBits(modules, base.isFunction, mask);
    if (version >= 7) drawQrVersionBits(modules, base.isFunction, version);
    const penalty = calculateQrPenalty(modules);
    if (!best || penalty < best.penalty) best = { modules, penalty };
  }
  return best.modules;
}

function createQrBaseMatrix(version, size) {
  const modules = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction = Array.from({ length: size }, () => Array(size).fill(false));
  const setFunction = (x, y, dark) => {
    modules[y][x] = dark;
    isFunction[y][x] = true;
  };

  drawQrFinderPattern(setFunction, 3, 3, size);
  drawQrFinderPattern(setFunction, size - 4, 3, size);
  drawQrFinderPattern(setFunction, 3, size - 4, size);

  for (const y of QR_ALIGNMENT_POSITIONS[version]) {
    for (const x of QR_ALIGNMENT_POSITIONS[version]) {
      if (isFunction[y][x]) continue;
      drawQrAlignmentPattern(setFunction, x, y);
    }
  }

  for (let i = 0; i < size; i++) {
    if (!isFunction[6][i]) setFunction(i, 6, i % 2 === 0);
    if (!isFunction[i][6]) setFunction(6, i, i % 2 === 0);
  }

  drawQrFormatBits(modules, isFunction, 0);
  if (version >= 7) drawQrVersionBits(modules, isFunction, version);
  setFunction(8, size - 8, true);

  return { modules, isFunction };
}

function drawQrFinderPattern(setFunction, cx, cy, size) {
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || x >= size || y < 0 || y >= size) continue;
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      setFunction(x, y, dist !== 2 && dist !== 4);
    }
  }
}

function drawQrAlignmentPattern(setFunction, cx, cy) {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      setFunction(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }
}

function drawQrFormatBits(modules, isFunction, mask) {
  const size = modules.length;
  const bits = getQrFormatBits(mask);
  const set = (x, y, dark) => {
    modules[y][x] = dark;
    isFunction[y][x] = true;
  };

  for (let i = 0; i <= 5; i++) set(8, i, getQrBit(bits, i));
  set(8, 7, getQrBit(bits, 6));
  set(8, 8, getQrBit(bits, 7));
  set(7, 8, getQrBit(bits, 8));
  for (let i = 9; i < 15; i++) set(14 - i, 8, getQrBit(bits, i));

  for (let i = 0; i < 8; i++) set(size - 1 - i, 8, getQrBit(bits, i));
  for (let i = 8; i < 15; i++) set(8, size - 15 + i, getQrBit(bits, i));
  set(8, size - 8, true);
}

function getQrFormatBits(mask) {
  const errorCorrectionLow = 1;
  const data = (errorCorrectionLow << 3) | mask;
  let remainder = data;
  for (let i = 0; i < 10; i++) {
    remainder = (remainder << 1) ^ (((remainder >>> 9) & 1) * 0x537);
  }
  return ((data << 10) | remainder) ^ 0x5412;
}

function drawQrVersionBits(modules, isFunction, version) {
  const size = modules.length;
  let remainder = version;
  for (let i = 0; i < 12; i++) {
    remainder = (remainder << 1) ^ (((remainder >>> 11) & 1) * 0x1F25);
  }
  const bits = (version << 12) | remainder;

  for (let i = 0; i < 18; i++) {
    const dark = getQrBit(bits, i);
    const a = size - 11 + (i % 3);
    const b = Math.floor(i / 3);
    modules[b][a] = dark;
    isFunction[b][a] = true;
    modules[a][b] = dark;
    isFunction[a][b] = true;
  }
}

function getQrBit(value, index) {
  return ((value >>> index) & 1) !== 0;
}

function placeQrDataBits(modules, isFunction, dataBits, mask) {
  const size = modules.length;
  let bitIndex = 0;
  let upward = true;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right--;
    for (let vertical = 0; vertical < size; vertical++) {
      const y = upward ? size - 1 - vertical : vertical;
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        if (isFunction[y][x]) continue;
        let dark = bitIndex < dataBits.length ? dataBits[bitIndex] !== 0 : false;
        if (qrMaskBit(mask, x, y)) dark = !dark;
        modules[y][x] = dark;
        bitIndex++;
      }
    }
    upward = !upward;
  }
}

function qrMaskBit(mask, x, y) {
  switch (mask) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
    case 5: return (x * y) % 2 + (x * y) % 3 === 0;
    case 6: return ((x * y) % 2 + (x * y) % 3) % 2 === 0;
    case 7: return ((x + y) % 2 + (x * y) % 3) % 2 === 0;
    default: throw new Error('Invalid QR mask');
  }
}

function cloneQrMatrix(matrix) {
  return matrix.map(row => row.slice());
}

function calculateQrPenalty(modules) {
  const size = modules.length;
  let penalty = 0;

  for (let y = 0; y < size; y++) {
    penalty += calculateQrRunPenalty(modules[y]);
  }
  for (let x = 0; x < size; x++) {
    const column = [];
    for (let y = 0; y < size; y++) column.push(modules[y][x]);
    penalty += calculateQrRunPenalty(column);
  }

  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const color = modules[y][x];
      if (modules[y][x + 1] === color &&
        modules[y + 1][x] === color &&
        modules[y + 1][x + 1] === color) {
        penalty += 3;
      }
    }
  }

  penalty += calculateQrFinderPenalty(modules);

  let dark = 0;
  for (const row of modules) {
    for (const module of row) {
      if (module) dark++;
    }
  }
  const total = size * size;
  penalty += Math.floor(Math.abs(dark * 20 - total * 10) / total) * 10;
  return penalty;
}

function calculateQrRunPenalty(line) {
  let penalty = 0;
  let runColor = line[0];
  let runLength = 1;
  for (let i = 1; i < line.length; i++) {
    if (line[i] === runColor) {
      runLength++;
    } else {
      if (runLength >= 5) penalty += runLength - 2;
      runColor = line[i];
      runLength = 1;
    }
  }
  if (runLength >= 5) penalty += runLength - 2;
  return penalty;
}

function calculateQrFinderPenalty(modules) {
  const size = modules.length;
  const patternA = [true, false, true, true, true, false, true, false, false, false, false];
  const patternB = [false, false, false, false, true, false, true, true, true, false, true];
  let penalty = 0;

  const matches = (line, offset, pattern) =>
    pattern.every((value, index) => line[offset + index] === value);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x <= size - 11; x++) {
      if (matches(modules[y], x, patternA) || matches(modules[y], x, patternB)) penalty += 40;
    }
  }
  for (let x = 0; x < size; x++) {
    const column = [];
    for (let y = 0; y < size; y++) column.push(modules[y][x]);
    for (let y = 0; y <= size - 11; y++) {
      if (matches(column, y, patternA) || matches(column, y, patternB)) penalty += 40;
    }
  }
  return penalty;
}
