import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');
const src=join(root,'src');
async function files(dir){const out=[];for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())out.push(...await files(path));else if(entry.name.endsWith('.ts')&&!entry.name.endsWith('.test.ts'))out.push(path);}return out;}
const sourceFiles=await files(src);
const pendingCodes=new Map();
const directReducers=[];
const legacyTravel=[];
for(const file of sourceFiles){const text=await readFile(file,'utf8');const rel=file.slice(root.length+1);
 for(const match of text.matchAll(/code\s*:\s*['"]([^'"]+)['"]/g)){const code=match[1];if(code.includes(':')){const list=pendingCodes.get(code)??[];list.push(rel);pendingCodes.set(code,list);}}
 if(rel!=='src/engine-api.ts'&&/\breduceWithLeaders\s*\(/.test(text))directReducers.push(`${rel}: reduceWithLeaders`);
 if(!['src/engine-api.ts','src/engine-with-leaders.ts'].includes(rel)&&/\breduceWithActionWindow\s*\(/.test(text))directReducers.push(`${rel}: reduceWithActionWindow`);
 if(rel!=='src/engine-with-action-window.ts'&&/\breduce\s*\(/.test(text)&&text.includes("from './engine.ts'"))directReducers.push(`${rel}: reduce`);
 if(/payTravelFromHand/.test(text))legacyTravel.push(rel);
}
const dispatcher=await readFile(join(src,'pending-choice.ts'),'utf8');
const unsupported=[...pendingCodes.keys()].filter(code=>!dispatcher.includes(code)&&!code.startsWith('assistant:')&&!code.startsWith('research:'));
console.log(`Pending code literals found: ${pendingCodes.size}`);
for(const [code,origins] of [...pendingCodes].sort(([a],[b])=>a.localeCompare(b)))console.log(`  ${code} <- ${[...new Set(origins)].join(', ')}`);
console.log('\nProduction direct reducer usages outside canonical layers:');
console.log(directReducers.length?directReducers.map(x=>`  ${x}`).join('\n'):'  none');
console.log('\nLegacy hand-only travel helper locations:');
console.log(legacyTravel.length?legacyTravel.map(x=>`  ${x}`).join('\n'):'  none');
if(unsupported.length){console.error(`\nPending codes not visibly routed by pending-choice.ts: ${unsupported.join(', ')}`);process.exitCode=1;}
