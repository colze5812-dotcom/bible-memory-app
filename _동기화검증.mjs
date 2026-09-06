import fs from 'fs';
const h=fs.readFileSync('index.html','utf8');
const block=[...h.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)][0][1];

let cloud={answers:{},memos:{}}, committed=0;
const mkColl=n=>({
  doc:id=>({__c:n,__id:id}),
  get:async()=>({size:Object.keys(cloud[n]).length,
    forEach:f=>Object.entries(cloud[n]).forEach(([id,v])=>f({id,data:()=>({v})}))})
});
const db={
  collection:()=>({doc:()=>({collection:mkColl})}),
  batch:()=>{const ops=[];return{set:(d,o)=>ops.push([d,o]),
    commit:async()=>{ops.forEach(([d,o])=>{cloud[d.__c][d.__id]=o.v;});committed++;}};}
};
const store={};
globalThis.localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v;}};
globalThis.firebase={apps:[],initializeApp(){},firestore:()=>db,auth:()=>({signInAnonymously:async()=>{}})};
globalThis.document={getElementById:()=>null};
globalThis.window=globalThis;
globalThis.bsAnswers={}; globalThis.bsMemos={};
globalThis.render=()=>{};

const M=new Function(block+'; return {fbLoad, setSync:v=>{_syncId=v}};')();

let fail=0;
const eq=(a,b,m)=>{const ok=JSON.stringify(a)===JSON.stringify(b);if(!ok)fail++;
  console.log((ok?'PASS':'*** FAIL')+' — '+m+(ok?'':`\n   got ${JSON.stringify(a)}\n   want ${JSON.stringify(b)}`));};

M.setSync('chanyoung1225');
bsAnswers={'b1l1_0':'첫 답','b1l1_1':'둘째 답','b1l1_2':'   '};
bsMemos={'b1l1':'묵상 메모'};
let r=await M.fbLoad();
eq([r.down,r.up],[0,3],'노트북: 로컬 3개(공백 제외)가 올라간다');
eq(cloud.answers,{'b1l1_0':'첫 답','b1l1_1':'둘째 답'},'  공백 답변은 안 올라감');
eq(cloud.memos,{'b1l1':'묵상 메모'},'  메모도 올라감');

bsAnswers={}; bsMemos={};
r=await M.fbLoad();
eq([r.down,r.up],[3,0],'태블릿: 3개를 내려받는다');
eq(bsAnswers['b1l1_0'],'첫 답','  답변이 실제로 들어옴');
eq(bsMemos['b1l1'],'묵상 메모','  메모도 들어옴');

r=await M.fbLoad();
eq([r.down,r.up],[0,0],'재실행: 이미 최신이면 아무것도 안 함');

bsAnswers={'b1l1_0':'로컬이 고친 것','b1l2_0':'로컬에만 있는 것'};
r=await M.fbLoad();
eq(bsAnswers['b1l1_0'],'첫 답','충돌: 클라우드가 이긴다');
eq(cloud.answers['b1l2_0'],'로컬에만 있는 것','  로컬에만 있던 건 올라간다');

eq(JSON.parse(store['nav_bible_answers'])['b1l1_0'],'첫 답','localStorage에도 저장된다');

cloud={answers:{},memos:{}}; committed=0;
bsAnswers={}; bsMemos={};
for(let i=0;i<950;i++) bsAnswers['k'+i]='v'+i;
r=await M.fbLoad();
eq(r.up,950,'950개: 전부 올라간다');
eq(committed,3,'  배치가 3번으로 쪼개진다 (400+400+150)');

M.setSync('');
r=await M.fbLoad();
eq([r.down,r.up],[0,0],'코드 없으면 통신하지 않는다');

console.log(fail? `\n실패 ${fail}건` : '\n전부 통과');
process.exit(fail?1:0);
