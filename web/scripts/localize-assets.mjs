import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '../..');
const manifestPath = join(repoRoot, 'web/data/assets-manifest.json');
const publicRoot = join(repoRoot, 'web/public/assets');
const sheetDir = join(publicRoot, 'sheets');
const cropDir = join(publicRoot, 'cropped');
const runtimeMapPath = join(repoRoot, 'web/src/generated/local-assets.json');
const publicMapPath = join(publicRoot, 'asset-map.json');
const crop = process.argv.includes('--crop');
const force = process.argv.includes('--force');

const CONTENT_EXT = new Map([
  ['image/jpeg', '.jpg'], ['image/jpg', '.jpg'], ['image/png', '.png'], ['image/webp', '.webp'], ['image/gif', '.gif'],
]);

function safe(value) { return String(value).replace(/[^a-zA-Z0-9._-]+/g, '_'); }
async function exists(path) { try { await access(path); return true; } catch { return false; } }
function publicUrl(pathWithinAssets) { return `/assets/${pathWithinAssets.replaceAll('\\','/')}`; }

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
await mkdir(sheetDir, { recursive:true });
await mkdir(cropDir, { recursive:true });

let sharp;
if (crop) {
  try { ({ default: sharp } = await import('sharp')); }
  catch { throw new Error('Cropping requires the optional "sharp" package. Run npm install, then retry npm run assets:localize:crop.'); }
}

const sheetFiles = new Map();
for (const sheet of manifest.sheets) {
  const response = await fetch(sheet.url);
  if (!response.ok) throw new Error(`Failed to download ${sheet.url}: HTTP ${response.status}`);
  const contentType = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  const extension = CONTENT_EXT.get(contentType) ?? extname(new URL(sheet.url).pathname) ?? '.img';
  const filename = `${sheet.id}${extension || '.img'}`;
  const localPath = join(sheetDir, filename);
  if (force || !(await exists(localPath))) {
    const bytes = Buffer.from(await response.arrayBuffer());
    await writeFile(localPath, bytes);
  }
  sheetFiles.set(sheet.id, { localPath, url: publicUrl(`sheets/${filename}`) });
}

const localized = {};
for (const asset of manifest.assets) {
  const sheet = manifest.sheets.find(candidate=>candidate.id===asset.sheetId);
  const localSheet = sheetFiles.get(asset.sheetId);
  if (!sheet || !localSheet) throw new Error(`Missing localized sheet ${asset.sheetId}`);
  const entry = {
    key: asset.key,
    kind: asset.kind,
    id: asset.id,
    side: asset.side,
    sheetUrl: localSheet.url,
    sheetWidth: asset.sheetWidth,
    sheetHeight: asset.sheetHeight,
    cardIndex: asset.cardIndex,
  };
  if (crop) {
    const image = sharp(localSheet.localPath);
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) throw new Error(`Cannot read image dimensions for ${asset.sheetId}`);
    if (metadata.width % asset.sheetWidth !== 0 || metadata.height % asset.sheetHeight !== 0) {
      throw new Error(`Sheet ${asset.sheetId} dimensions ${metadata.width}x${metadata.height} are not divisible by grid ${asset.sheetWidth}x${asset.sheetHeight}`);
    }
    const cellWidth = metadata.width / asset.sheetWidth;
    const cellHeight = metadata.height / asset.sheetHeight;
    const column = asset.cardIndex % asset.sheetWidth;
    const row = Math.floor(asset.cardIndex / asset.sheetWidth);
    const filename = `${safe(asset.kind)}-${safe(asset.id)}-${safe(asset.side)}.webp`;
    const target = join(cropDir, filename);
    if (force || !(await exists(target))) {
      await sharp(localSheet.localPath)
        .extract({ left:column*cellWidth, top:row*cellHeight, width:cellWidth, height:cellHeight })
        .webp({ quality:92 })
        .toFile(target);
    }
    entry.url = publicUrl(`cropped/${filename}`);
    entry.width = cellWidth;
    entry.height = cellHeight;
  }
  localized[asset.key] = entry;
}

const output = {
  version: 1,
  mode: crop ? 'cropped' : 'sprite-sheet',
  sourceManifest: 'web/data/assets-manifest.json',
  assets: localized,
};
await mkdir(join(repoRoot, 'web/src/generated'), { recursive:true });
await writeFile(runtimeMapPath, `${JSON.stringify(output, null, 2)}\n`);
await writeFile(publicMapPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Localized ${manifest.sheets.length} sheets and ${manifest.assets.length} asset references (${output.mode})`);
console.log(`Runtime map: ${runtimeMapPath}`);
