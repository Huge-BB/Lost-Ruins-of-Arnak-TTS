import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '../..');
const generatedDir = join(repoRoot, 'web/src/generated');
const outputPath = join(repoRoot, 'web/data/assets-manifest.json');

const SOURCES = [
  ['card', 'cards.json'],
  ['site', 'sites.json'],
  ['idol', 'idols.json'],
  ['guardian', 'guardians.json'],
  ['assistant', 'assistants.json'],
];

function sheetId(url) {
  return createHash('sha256').update(url).digest('hex').slice(0, 20);
}

function assertGrid(width, height, label) {
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1) {
    throw new Error(`${label} has invalid sprite grid ${width}x${height}`);
  }
}

function addAsset(assets, sheets, { key, kind, id, side, url, sheetWidth, sheetHeight, cardIndex }) {
  if (!url) return;
  assertGrid(sheetWidth, sheetHeight, key);
  const count = sheetWidth * sheetHeight;
  if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex >= count) {
    throw new Error(`${key} has invalid sprite index ${cardIndex} for ${sheetWidth}x${sheetHeight}`);
  }
  const idHash = sheetId(url);
  const existing = sheets.get(idHash);
  if (existing && existing.url !== url) throw new Error(`Asset sheet hash collision: ${idHash}`);
  if (existing) {
    const sameGrid = existing.sheetWidth === sheetWidth && existing.sheetHeight === sheetHeight;
    if (!sameGrid) throw new Error(`Sheet ${idHash} is referenced with conflicting grids`);
  } else {
    sheets.set(idHash, { id: idHash, url, sheetWidth, sheetHeight });
  }
  assets.push({ key, kind, id, side, sheetId: idHash, sheetWidth, sheetHeight, cardIndex });
}

const assets = [];
const sheets = new Map();
for (const [kind, filename] of SOURCES) {
  const path = join(generatedDir, filename);
  let records;
  try {
    records = JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') throw new Error(`Missing ${path}. Run npm run extract:data first.`);
    throw error;
  }
  for (const [id, record] of Object.entries(records)) {
    if (kind === 'assistant') {
      const image = record.image;
      if (!image) continue;
      addAsset(assets, sheets, { key:`assistant:${id}:silver`, kind, id, side:'silver', url:image.silverUrl, sheetWidth:image.sheetWidth, sheetHeight:image.sheetHeight, cardIndex:image.cardIndex });
      addAsset(assets, sheets, { key:`assistant:${id}:gold`, kind, id, side:'gold', url:image.goldUrl, sheetWidth:image.sheetWidth, sheetHeight:image.sheetHeight, cardIndex:image.cardIndex });
      continue;
    }
    const image = record.image;
    if (!image) continue;
    addAsset(assets, sheets, { key:`${kind}:${id}:face`, kind, id, side:'face', url:image.faceUrl, sheetWidth:image.sheetWidth, sheetHeight:image.sheetHeight, cardIndex:image.cardIndex });
    if (image.backUrl) addAsset(assets, sheets, { key:`${kind}:${id}:back`, kind, id, side:'back', url:image.backUrl, sheetWidth:image.sheetWidth, sheetHeight:image.sheetHeight, cardIndex:image.cardIndex });
  }
}

assets.sort((a,b)=>a.key.localeCompare(b.key));
const manifest = {
  version: 1,
  generatedFrom: SOURCES.map(([,filename])=>`web/src/generated/${filename}`),
  sheets: [...sheets.values()].sort((a,b)=>a.id.localeCompare(b.id)),
  assets,
};
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Asset manifest: ${manifest.assets.length} sprite references across ${manifest.sheets.length} unique sheets`);
console.log(`Wrote ${outputPath}`);
