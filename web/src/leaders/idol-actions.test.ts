import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../engine.ts';
import type { EngineContext, GameState } from '../types.ts';
import { resolveLeaderPendingChoice } from './pending.ts';
import { useLeaderIdol } from './idol-actions.ts';

const context:EngineContext={cards:{fear:{id:'fear',name:'Fear',type:'Fear',expansion:'Base Game'},draw:{id:'draw',name:'Draw',type:'Item',expansion:'Base Game'}},idols:{idol:{id:'idol',rewardCode:'c',expansion:'Base Game'},idol2:{id:'idol2',rewardCode:'t',expansion:'Base Game'}}};
function leaderState(id:string):GameState{const s=createGame(['p1']);s.phase='playing';s.currentPlayer='p1';s.players.p1.leader={id,data:{}};s.players.p1.idols=[{id:'idol',faceUp:true},{id:'idol2',faceUp:true}];return s;}

test('Captain blue idol gains compass and temporary plane',()=>{let s=leaderState('captain');s=useLeaderIdol(s,'p1','idol',2,'leaderUnique',context);assert.equal(s.players.p1.resources.compass,1);assert.equal(s.actionWindow?.temporaryTravel.plane,1);assert.equal((s.players.p1.idols[0] as any).slotIndex,2);});
test('Falconer blue idol gains compass and advances eagle',()=>{let s=leaderState('falconer');s.players.p1.leader!.data.eaglePosition=1;s.players.p1.leader!.data.eagleMaxPosition=4;s=useLeaderIdol(s,'p1','idol',3,'leaderUnique',context);assert.equal(s.players.p1.resources.compass,1);assert.equal(s.players.p1.leader!.data.eaglePosition,2);});
test('Baroness blue idol gains coin and draws',()=>{let s=leaderState('baroness');s.players.p1.deck=['draw'];s=useLeaderIdol(s,'p1','idol',2,'leaderUnique',context);assert.equal(s.players.p1.resources.coin,1);assert.deepEqual(s.players.p1.hand,['draw']);});
test('Explorer blue idol refreshes a used snack',()=>{let s=leaderState('explorer');s.players.p1.leader!.data.snacks=[{id:'free',used:true,siteId:'s1'},{id:'coin',used:false}];s=useLeaderIdol(s,'p1','idol',2,'leaderUnique',context,{snackId:'free'});assert.equal(s.players.p1.resources.coin,1);assert.equal(s.players.p1.resources.compass,1);assert.equal((s.players.p1.leader!.data.snacks as any[])[0].used,false);});
test('Mystic fear slot adds Fear before chained exile then ritual choice',()=>{let s=leaderState('mystic');s.players.p1.leader!.data.ritualPile=['fear'];s=useLeaderIdol(s,'p1','idol',2,'mysticExileRitual',context);assert.ok(s.players.p1.playedCards.includes('fear'));assert.equal(s.pendingRewards[0].code,'leader:EXILE_OWN_CARD');s=resolveLeaderPendingChoice(s,'p1',0,{type:'card',cardId:'fear'},context);assert.deepEqual(s.players.p1.leader!.data.ritualPile,['fear','fear']);assert.equal(s.pendingRewards[0].code,'leader:MYSTIC_RITUAL_CHOICE');s=resolveLeaderPendingChoice(s,'p1',0,{type:'ritual',fearCount:2},context);assert.equal(s.players.p1.resources.coin,1);assert.equal(s.players.p1.resources.compass,1);});
test('ordinary idol effects remain legal in blue slots',()=>{let s=leaderState('captain');s=useLeaderIdol(s,'p1','idol',3,'tablets',context);assert.equal(s.players.p1.resources.tablet,2);});
test('unique idol effects are rejected in non-blue slots',()=>{const s=leaderState('captain');assert.throws(()=>useLeaderIdol(s,'p1','idol',0,'leaderUnique',context),/blue slot/);});
