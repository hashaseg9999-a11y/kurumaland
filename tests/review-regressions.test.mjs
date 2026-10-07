import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';

// Dependency-free tests execute the real TypeScript methods with synthetic DOM/audio.
function load(path, exported, extras = {}) {
  let code = stripTypeScriptTypes(readFileSync(new URL('../src/' + path, import.meta.url), 'utf8'), { mode: 'transform' });
  code = code.replace(/^import[\s\S]*?;\s*$/gm, '').replace(/export /g, '').replace(/import\.meta\.env\.DEV/g, 'false');
  const tasks = new Map(); let next = 1;
  const window = { requestAnimationFrame() { return 1; }, cancelAnimationFrame() {}, innerWidth: 1024, innerHeight: 768,
    setTimeout(fn) { const id=next++;tasks.set(id,fn);return id; }, clearTimeout(id) { tasks.delete(id); } };
  window.setInterval = window.setTimeout; window.clearInterval = window.clearTimeout;
  const sandbox = { window, console, URL, document: { baseURI: 'https://example.invalid/' }, ...extras };
  vm.runInNewContext(code + `\nglobalThis.result = ${exported};`, sandbox);
  return { value: sandbox.result, window, tasks };
}
const assets = { countFishIcon:'',creatureFishRed:'',creatureFishBlue:'',creatureFishYellow:'',creatureFishGreen:'',creatureFishPink:'',creatureFishPurple:'',fishTouchIcon:'' };
const element = () => ({style:{transform:'translate(20px, 30px)'},classList:{add(){},remove(){}},getBoundingClientRect:()=>({left:0,top:0,width:88,height:88})});

class FakeElement {
  style={};children=[];listeners=new Map();classList={add(){},remove(){}};
  append(...nodes){this.children.push(...nodes);} replaceChildren(...nodes){this.children=nodes;}
  setAttribute(){} addEventListener(type,fn){this.listeners.set(type,fn);}
}
function routerFixture(){
 const document={createElement:()=>new FakeElement()};
 const extras={document,getI18nText:()=>'',attachParallax:()=>()=>{},playSceneTransition(){},createSceneStage:()=>({root:new FakeElement(),stage:new FakeElement()}),
   bgRoad:'',carBlue:'',carGreen:'',carRed:'',garageBlue:'', installParentalGate:()=>()=>{},console:{error(){}}};
 const {value:Router,tasks}=load('core/router.ts','ActivityRouter',extras);
 const root=new FakeElement();
 const router=new Router({root,activities:[],speech:{getLanguage:()=> 'ja',speak(){}},sfx:{play(){}},getSettings:()=>({}),onTaskComplete(){}});
 return {router,tasks};
}
test('partial failed mounts are cleaned and their fallback cannot replace newer navigation',()=>{
 const {router,tasks}=routerFixture();let released=0;
 router.openActivity({mount(){throw Error('synthetic mount failure');},unmount(){released++;}});
 assert.equal(released,1);
 router.showMenu();
 assert.equal(tasks.size,0);
});

test('ball drag captures the listener stage and remount releases active input state',()=>{
 const {value:a}=load('activities/ballPool.ts','ballPoolActivity',{menuIcon:'',performance:{now:()=>100}});
 const captures=[];const root={setPointerCapture(){captures.push('root');},replaceChildren(){}};
 const stage={setPointerCapture(){captures.push('stage');}};
 a.root=root;a.context={notifyTaskComplete(){},sfx:{play(){},playScale(){}}};
 a.balls=[{x:100,y:100,r:40,vx:0,vy:0}];
 a.handlePointerDown({clientX:100,clientY:100,pointerId:1,currentTarget:stage,preventDefault(){}});
 assert.deepEqual(captures,['stage']);a.unmount();assert.equal(a.pointerId,null);assert.equal(a.draggedBall,null);
});

test('leaving during a signal drive cancels smoke and deferred entrance timers',()=>{
 const assets={bgRoad:'',carBlue:'',carGreen:'',carRed:'',carYellow:'',menuIcon:'',signalImage:''};
 const {value:a,tasks}=load('activities/signal.ts','signalActivity',assets);
 a.context={sfx:{play(){}},notifyTaskComplete(){}};
 a.root={clientWidth:1000,replaceChildren(){}};a.carImage={};
 a.carButton={classList:{add(){},remove(){}},getBoundingClientRect:()=>({left:30}),animate:()=>({cancel(){}})};
 a.startCar();assert.equal(tasks.size,1);a.unmount();assert.equal(tasks.size,0);
});

test('resizing the 3D world updates the camera projection',()=>{
 const {value:prototype}=load('three/world.ts','ThreeWorld.prototype');
 let updates=0;const world=Object.create(prototype);
 Object.assign(world,{disposed:false,contextLost:false,container:{clientWidth:800,clientHeight:600},renderer:{setSize(){}},camera:{updateProjectionMatrix(){updates++;}},applyCamera(){}});
 world.resizeToContainer();assert.equal(world.camera.aspect,4/3);assert.equal(updates,1);
});

for(const name of ['ColorGarageGame','BigSmallGame','PoolGame','LineUpGame'])test(name+' removes active drag listeners and pointer state on unmount',()=>{
 const file=name[0].toLowerCase()+name.slice(1);const listeners=new Map();
 const canvas={addEventListener:(t,f)=>listeners.set(t,f),removeEventListener:(t,f)=>{if(listeners.get(t)===f)listeners.delete(t);},hasPointerCapture:()=>false};
 const {value:Class}=load('three/games/'+file+'.ts',name,{CAR_COLORS:{},performance:{now:()=>1},releaseGameBase:(callbacks)=>{for(const f of callbacks)f();callbacks.length=0;}});
 const game=new Class();game.context={world:{renderer:{domElement:canvas}}};game.dragged={dragging:true};game.pointerId=8;
 game.attachMoveAndRelease();assert.equal(listeners.size,4);
 listeners.get('pointerup')({pointerId:99});assert.equal(game.pointerId,8);assert.equal(listeners.size,4);
 game.unmount();assert.equal(listeners.size,0);assert.equal(game.pointerId,null);assert.equal(game.dragged,null);assert.equal(game.moveAttached,false);
});

for(const [file,name,method] of [['bigSmall','bigSmallActivity','finishRound'],['colorGarage','colorGarageActivity','finishRound'],['trace','traceActivity','completeCourse']])test(file+' cancels deferred rounds when leaving',()=>{
 const source=readFileSync(new URL('../src/activities/'+file+'.ts',import.meta.url),'utf8');
 const assets=Object.fromEntries([...source.matchAll(/import (\w+) from ['"][^'"]+\.(?:svg|webp)['"]/g)].map(m=>[m[1],'']));
 const {value:a,tasks}=load('activities/'+file+'.ts',name,assets);
 a.context={notifyTaskComplete(){},sfx:{play(){}},speech:{speak(){}}};a.board={clientWidth:1000,clientHeight:600};a.carGroup={};a.updateCarPosition=()=>{};
 a[method]();assert.equal(tasks.size,1);a.unmount();assert.equal(tasks.size,0);
});

test('3D signal unmount clears previous driving and pending reset state',()=>{
 class Value{dispose(){}}
 const {value:Class}=load('three/games/signalGame.ts','SignalGame',{THREE:{PlaneGeometry:Value,Color:Value,Vector3:Value},releaseGameBase(){}});
 const a=new Class();a.isGo=true;a.distance=30;a.currentSpeed=6;a.resetAt=100;
 a.unmount();assert.equal(a.isGo,false);assert.equal(a.distance,0);assert.equal(a.resetAt,Infinity);assert.equal(a.currentSpeed,0);
});

// Structural CSS regression; real browser hit-testing is a separate QA gate.
test('the replay button opts back into pointer events inside the decorative ending screen',()=>{
 const css=readFileSync(new URL('../src/styles/main.css',import.meta.url),'utf8');
 const rule=css.match(/\.ending-play-again\s*\{([^}]+)\}/)[1];
 assert.match(rule,/pointer-events:\s*auto/);
});
