import test from 'node:test';
import assert from 'node:assert/strict';
import {swipeDirection,resolvePageTurn} from '../lib/reader-navigation.ts';
const origin={x:200,y:200,time:100};
test('A horizontal swipe moves in reading order',()=>{
  assert.equal(swipeDirection(origin,{x:80,y:210,time:400}),1);
  assert.equal(swipeDirection(origin,{x:300,y:180,time:500}),-1);
});
test('Taps, vertical scrolls, diagonal drags and text selection do not turn pages',()=>{
  for(const end of [{x:198,y:205,time:140},{x:180,y:10,time:300},{x:100,y:100,time:350},{x:50,y:202,time:1500}])assert.equal(swipeDirection(origin,end),0);
});
test('A page turn never escapes the book bounds',()=>{
  assert.equal(resolvePageTurn(1,40,-1),null);
  assert.equal(resolvePageTurn(40,40,1),null);
  assert.equal(resolvePageTurn(0,40,1),null);
  assert.equal(resolvePageTurn(1,0,1),null);
});
test('A segmented PDF continues at the next section and can return to the previous section',()=>{
  assert.equal(resolvePageTurn(40,40,1,true),'next-section');
  assert.equal(resolvePageTurn(1,40,-1,true),'previous-section');
  assert.equal(resolvePageTurn(39,40,1,true),40);
  assert.equal(resolvePageTurn(2,40,-1,true),1);
});
