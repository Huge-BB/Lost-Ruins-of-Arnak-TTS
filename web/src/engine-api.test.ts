import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from './engine.ts';
import { applyEngineCommand } from './engine-api.ts';
import type { EngineContext } from './types.ts';

const context:EngineContext={
  cards:{},
  sites:{tile:{id:'tile',level:1,rewardCode:'',expansion:'Base Game'}},
};
function game(){const s=createGame(['p1','p2']);s.phase='playing';s.currentPlayer='p1';return s;}

test('canonical action route keeps leader-aware discovery hooks',()=>{
  const s=game();s.players.p1.leader={id:'explorer',data:{scoutingSiteChoiceThisTurn:true}};
  s.players.p1.resources.compass=3;s.sites.x={id:'x',level:1,idolSlots:0};s.discovery.level1Deck=['a','b'];
  const ctx:EngineContext={...context,sites:{a:{id:'a',level:1,rewardCode:'',expansion:'Base Game'},b:{id:'b',level:1,rewardCode:'',expansion:'Base Game'}}};
  const next=applyEngineCommand(s,{type:'action',action:{type:'DISCOVER_SITE',playerId:'p1',siteId:'x',useScouting:true,siteChoiceIndex:1}},ctx);
  assert.equal(next.sites.x.tileId,'b');assert.equal(next.players.p1.leader!.data.scoutingSiteChoiceThisTurn,false);
});

test('canonical action route preserves temporary travel from leader free action',()=>{
  let s=game();s.players.p1.leader={id:'captain',data:{}};s.players.p1.idols=[{id:'idol',faceUp:true}];s.sites.x={id:'x',level:1,tileId:'tile',idolSlots:0,travelCost:{boat:1}};
  s=applyEngineCommand(s,{type:'action',action:{type:'LEADER_USE_IDOL',playerId:'p1',idolId:'idol',slotIndex:2,effect:'leaderUnique'}},context);
  assert.equal(s.actionWindow?.temporaryTravel.plane,1);
  s=applyEngineCommand(s,{type:'action',action:{type:'PLACE_WORKER',playerId:'p1',siteId:'x'}},context);
  assert.equal(s.sites.x.occupiedBy,'p1');assert.equal(s.actionWindow?.temporaryTravel.plane,0);
});

test('canonical pending route validates owner and resolves through public dispatcher',()=>{
  const s=game();s.assistants.stacks=[['a1']];s.pendingRewards=[{playerId:'p1',sourceId:'bird',code:'research:CLAIM_ASSISTANT',payload:{type:'CLAIM_ASSISTANT',level:'silver'}}];
  assert.throws(()=>applyEngineCommand(s,{type:'pending-choice',playerId:'p2',pendingIndex:0,choice:{type:'assistant-stack',stackIndex:0}},context),/belongs to p1/);
  const next=applyEngineCommand(s,{type:'pending-choice',playerId:'p1',pendingIndex:0,choice:{type:'assistant-stack',stackIndex:0}},context);
  assert.equal(next.players.p1.assistants[0].id,'a1');assert.equal(next.pendingRewards.length,0);
});
