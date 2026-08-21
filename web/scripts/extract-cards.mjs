import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '../..');
const cardsDir = join(repoRoot, 'objects/AllCards.4bfea4');
const outputPath = join(repoRoot, 'web/src/generated/cards.json');

function normalizeType(type) {
  if (type === 'Item' || type === 'Artifact' || type === 'Fear' || type === 'Starter') return type;
  return 'Other';
}

function parseTravel(metadata) {
  const travel = {};
  for (const key of ['boot', 'car', 'ship', 'plane']) {
    if (Number.isInteger(metadata[key]) && metadata[key] > 0) travel[key] = metadata[key];
  }
  return Object.keys(travel).length ? travel : undefined;
}

function getImage(ttsObject) {
  const deckEntries = Object.entries(ttsObject.CustomDeck ?? {});
  if (deckEntries.length === 0) return undefined;

  const [deckId, deck] = deckEntries[0];
  const cardId = String(ttsObject.CardID ?? '');
  const cardIndex = cardId.startsWith(deckId) ? Number(cardId.slice(deckId.length)) : undefined;

  return {
    faceUrl: deck.FaceURL,
    ...(deck.BackURL ? { backUrl: deck.BackURL } : {}),
    ...(deck.NumWidth ? { sheetWidth: deck.NumWidth } : {}),
    ...(deck.NumHeight ? { sheetHeight: deck.NumHeight } : {}),
    ...(Number.isInteger(cardIndex) ? { cardIndex } : {}),
  };
}

const files = await readdir(cardsDir);
const metadataFiles = files.filter(name => name.endsWith('.gmnotes')).sort();
const cards = {};

for (const metadataFile of metadataFiles) {
  const metadataPath = join(cardsDir, metadataFile);
  const objectPath = join(cardsDir, metadataFile.replace(/\.gmnotes$/, '.json'));

  try {
    const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
    const ttsObject = JSON.parse(await readFile(objectPath, 'utf8'));
    if (!metadata.id) continue;

    cards[metadata.id] = {
      id: metadata.id,
      name: ttsObject.Nickname || basename(metadataFile, '.gmnotes'),
      type: normalizeType(metadata.type),
      expansion: metadata.expansion ?? 'Unknown',
      ...(Number.isFinite(metadata.cost) ? { cost: metadata.cost } : {}),
      ...(Number.isFinite(metadata.points) ? { points: metadata.points } : {}),
      ...(parseTravel(metadata) ? { travel: parseTravel(metadata) } : {}),
      ...(getImage(ttsObject) ? { image: getImage(ttsObject) } : {}),
    };
  } catch (error) {
    console.warn(`Skipping ${metadataFile}: ${error.message}`);
  }
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(cards, null, 2)}\n`);
console.log(`Extracted ${Object.keys(cards).length} cards to ${outputPath}`);
