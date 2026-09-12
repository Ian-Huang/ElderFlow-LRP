import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

function createPng(width, height) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      c = (c >>> 8) ^ crcTable[(c ^ buf[i]) & 0xFF];
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData), 0);
    return Buffer.concat([len, typeAndData, crc]);
  }

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = makeChunk('IHDR', ihdrData);

  const rowLen = 1 + width * 4;
  const rawData = Buffer.alloc(rowLen * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.22;
  const armW = width * 0.16;
  const armL = width * 0.60;

  for (let y = 0; y < height; y++) {
    const offset = y * rowLen;
    rawData[offset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const pxOffset = offset + 1 + x * 4;

      // Base blue background #2563eb
      let r = 37, g = 99, b = 235, a = 255;

      const inVert = Math.abs(x - cx) <= armW / 2 && Math.abs(y - cy) <= armL / 2;
      const inHoriz = Math.abs(y - cy) <= armW / 2 && Math.abs(x - cx) <= armL / 2;
      const distCenter = Math.hypot(x - cx, y - cy);

      if (distCenter <= radius * 0.35) {
        // Sky blue center
        r = 56; g = 189; b = 248; a = 255;
      } else if (inVert || inHoriz) {
        // White cross
        r = 255; g = 255; b = 255; a = 255;
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

const outDir = '/Users/ian.huang/aiProjects/LRP/apps/web/public';
fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), createPng(192, 192));
fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), createPng(512, 512));
console.log('Successfully generated pwa-192x192.png and pwa-512x512.png');
