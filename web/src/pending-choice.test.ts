import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from './engine.ts';
import { resolvePendingChoice } from './pending-choice.ts';
import type { EngineContext } from './types.ts';

const context:EngineContext={cards:{artifact:{id:'artifact',name:'Artifact',type:'Artifact',expansion:'Base Game',cost:3}},sites:{tile:{id:'tile',level:1,rewardCode:'c',expansion:'Base Game'}}};

test('unified pending choice resolves research assistant claim',()=>{
 const s=createGame(['p1']);s.assistants.stacks=[['a1']];s.pendingRewards=[{playerId:'p1',sourceId:'bird',code:'research:CLAIM_ASSISTANT',payload:{type:'CLAIM_ASSISTANT',level:'silver'}}];
 const next=resolvePendingChoice(s,'p1',0,{type:'assistant-stack',stackIndex:0},context);
 assert.deepEqual(next.players.p1.assistants,[{id:'a1',level:'silver',exhausted:false}]);assert.equal(next.pendingRewards.length,0);
});

test('unified pending choice resolves research CHOOSE and preserves follow-up pending',()=>{
 const s=createGame(['p1']);s.pendingRewards=[{playerId:'p1',sourceId:'monkey',code:'research:CHOOSE',payload:{type:'CHOOSE',count:1,options:[{type:'CLAIM_ASSISTANT',level:'silver'},{type:'UPGRADE_ASSISTANT',level:'gold'}]}}];
 const next=resolvePendingChoice(s,'p1',0,{type:'research-option',optionIndex:0},context);
 assert.equal(next.pendingRewards[0].code,'research:CLAIM_ASSISTANT');
});

test('unified pending choice resolves leader optional skip',()=>{
 const s=createGame(['p1']);s.players.p1.leader={id:'baroness',data:{}};s.pendingRewards=[{playerId:'p1',sourceId:'leader-card:Connections',code:'leader:OPTIONAL_EXILE_FAR_LEFT_ITEM',payload:{refill:true}}];
 const next=resolvePendingChoice(s,'p1',0,{type:'skip'},context);assert.equal(next.pendingRewards.length,0);
});

test('unified pending choice resolves free guardian site',()=>{
 const s=createGame(['p1']);s.sites.s1={id:'s1',level:1,idolSlots:1,occupiedBy:'p1',guardian:'g1'};s.pendingRewards=[{playerId:'p1',sourceId:'bird',code:'research:OVERCOME_GUARDIAN_FREE',payload:{type:'OVERCOME_GUARDIAN_FREE'}}];
 const next=resolvePendingChoice(s,'p1',0,{type:'site',siteId:'s1'},context);assert.deepEqual(next.players.p1.defeatedGuardians,['g1']);assert.equal(next.pendingRewards.length,0);
});

test('unified pending choice rejects wrong player before dispatch',()=>{
 const s=createGame(['p1','p2']);s.pendingRewards=[{playerId:'p2',sourceId:'x',code:'research:CLAIM_ASSISTANT',payload:{type:'CLAIM_ASSISTANT',level:'silver'}}];
 assert.throws(()=>resolvePendingChoice(s,'p1',0,{type:'assistant-stack',stackIndex:0},context),/belongs to p2/);
});
