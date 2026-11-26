/* 우리 도서관 — js/04-group-sync.js
   모임 · 기기끼리 맞추기
   ※ 모든 파일이 같은 전역을 나눠 씁니다. index.html 에 적힌 순서(01 → 12)대로 불러와야 합니다. */
/* ══════════ 모임 칸 — 함께 보는 자리 ══════════
   각자의 읽은 기록·밑줄은 그대로 각자 구글 드라이브에 둡니다.
   여기에는 '나누기로 한 것' 만 오갑니다.

     shelf      서가 (칸 이름)
     shelfbook  그 칸에 담긴 책
     rec        권하기
     req        책 요청
     note       한 줄 평 · 별점                                */
let FAM=[], FAMAT=0;
try{ FAM=JSON.parse(localStorage.getItem('ebl_fam')||'[]'); }catch(e){ FAM=[]; }
FAMAT=Number(localStorage.getItem('ebl_famat')||0);
const saveFAM=()=>{ try{ localStorage.setItem('ebl_fam',JSON.stringify(FAM));
  localStorage.setItem('ebl_famat',String(FAMAT)); }catch(e){} };

function famUrl(mode,extra,gOver){
  let u=cfg('url')+(cfg('url').includes('?')?'&':'?')+'token='+encodeURIComponent(cfg('tok'))
    +'&mode='+mode+'&uid='+encodeURIComponent(ME.id)+'&name='+encodeURIComponent(ME.name||'');
  if(cfg('adm')){ u+='&admin='+encodeURIComponent(cfg('adm'));
    // 팀장님은 모임과 상관없이 드나듭니다. 쓸 때만 어느 모임인지 지정합니다.
    u+='&g='+encodeURIComponent(gOver!=null?gOver:(VIEWG||'*')); }
  if(extra)u+=extra;
  return u;
}
/* 공용 칸 읽어오기 */
async function famLoad(){
  if(!cfg('url'))return FAM;
  try{
    const r=await fetch(famUrl('fam'));
    const d=await r.json();
    if(d.error){ if(d.error==='blocked')showCut(); throw new Error(d.error); }
    FAM=d.rows||[]; FAMAT=Date.now(); saveFAM();
    if(d.groups){ GROUPS=Object.keys(d.groups).map(id=>({id:id,name:d.groups[id]}));
      saveGroups(); paintSeg(); }
    if(d.me&&d.me!=='*'){ setMyGroup(d.me,d.gname||ME.grpN); paintSeg(); }
    log('모임 칸 '+FAM.length+'줄'+(d.me&&d.me!=='*'?' ('+(d.gname||'')+')':''));
    try{ kidSync(); }catch(e){}
    try{ readPush(false); }catch(e){}
  }catch(e){ log('모임 칸 못 받음: '+(e.message||e)); }
  return FAM;
}
/* 한 줄 올리기 */
async function famPut(o,g){
  if(!cfg('url')){ toast('먼저 ⚙ 에서 주소를 넣어주세요'); return null; }
  try{
    const r=await fetch(famUrl('famput','&d='+encodeURIComponent(JSON.stringify(o)),g));
    const d=await r.json();
    if(d.error){ toast(d.error,5000); return null; }
    // 받아둔 것에도 바로 반영해 화면이 늦지 않게
    const k=FAM.findIndex(x=>x.id===d.row.id);
    if(k>=0)FAM[k]=d.row; else FAM.push(d.row);
    saveFAM();
    return d.row;
  }catch(e){ toast('올리지 못했습니다\n'+(e.message||e),5000); return null; }
}
/* 한 줄 지우기 */
async function famDel(id,g){
  try{
    const r=await fetch(famUrl('famdel','&fid='+encodeURIComponent(id),g));
    const d=await r.json();
    if(d.error){ toast(d.error,5000); return false; }
    FAM=FAM.filter(x=>x.id!==id); saveFAM();
    return true;
  }catch(e){ toast('지우지 못했습니다',4000); return false; }
}
/* ══════════ 모임 ══════════
   원가족과 지금 가족은 다릅니다. 형제자매에게 보일 것과
   아내·아이에게 보일 것이 같을 수 없어 모임으로 나눕니다.

     우리집     아내 · 지수 · 지우
     형제자매   남동생 · 누나

   시트에는 손대지 않았습니다. 각 줄의 '값' 칸에 모임 번호를 함께 적어
   앱이 걸러냅니다. Apps Script 는 그대로 둬도 됩니다. */
let GROUPS=[]; try{ GROUPS=JSON.parse(localStorage.getItem('ebl_groups')||'[]'); }catch(e){}
const saveGroups=()=>{ try{ localStorage.setItem('ebl_groups',JSON.stringify(GROUPS)); }catch(e){} };
/* 내가 속한 모임 (초대 링크로 받습니다)
   ME 는 아래쪽에서 만들어지므로 여기서 값을 넣으면 안 됩니다.
   넣는 순간 앱이 통째로 멈춥니다. */
function setMyGroup(id,name){
  ME.grp=id||''; ME.grpN=name||'';
  localStorage.setItem('ebl_megrp',ME.grp);
  localStorage.setItem('ebl_megrpn',ME.grpN);
}
/* 팀장님이 지금 보고 있는 모임 */
let VIEWG=localStorage.getItem('ebl_viewg')||'';

/* '값' 칸에 모임 번호와 상대 이름을 함께 담습니다 */
function packVal(o){ try{ return JSON.stringify(o); }catch(e){ return ''; } }
function unpackVal(v){
  if(!v)return {};
  const s=String(v);
  if(s.charAt(0)!=='{')return {n:s};        // 예전에 이름만 적힌 줄
  try{ return JSON.parse(s); }catch(e){ return {n:s}; }
}
const grpOf = row => String(row['모임']||unpackVal(row['값']).g||'');
/* 지금 보고 있는 모임 */
function curGrp(){ return HSIDE==='me' ? (isOwner()?VIEWG:ME.grp) : HSIDE; }
function grpName(id){
  if(!id)return '모두';
  const g=GROUPS.find(x=>x.id===id); if(g)return g.name;
  return (id===ME.grp&&ME.grpN)?ME.grpN:'모임';
}
/* 이 줄을 지금 화면에서 보여줄까 */
function inGrp(row){
  if(!isOwner())return true;                 // 서버가 이미 걸러 보냈습니다
  if(!VIEWG)return true;                     // 팀장님이 '모두' 를 보는 중
  return String(row['모임']||'')===VIEWG;
}
/* 화면에 보이는 모임 목록 */
function grpList(){
  if(isOwner())return GROUPS;
  return ME.grp ? [{id:ME.grp,name:ME.grpN||'우리 모임'}] : [];
}

/* ── 서가 · 권하기 · 요청 ── */
const isOwner = () => !!cfg('adm');            // 관리자 열쇠가 있으면 사서
/* 권할 상대 목록 — 만든 이는 명단에서, 모임원은 지금까지 오간 기록에서 */
function roster(){
  const g=curGrp(), m={};
  MATES.forEach(x=>{ if(x.id===ME.id)return;
    if(g&&x.grp&&x.grp!==g)return;             // 다른 모임 사람은 뺍니다
    m[x.id]={id:x.id,name:x.name}; });
  FAM.forEach(o=>{ const id=o['누가'], nm=o['이름'];
    if(!id||id===ME.id||m[id])return;
    if(g&&grpOf(o)&&grpOf(o)!==g)return;
    m[id]={id:id,name:nm||'모임원'}; });
  return Object.values(m);
}
async function newShelf(){
  const nm=(await ask('새 칸 이름','예) 아빠의 추천 · 이번 방학에 읽을 책'))||'';
  if(!nm.trim())return;
  const g=await targetGrp('이 칸을 어느 모임에 만들까요?');
  if(g===null)return;
  const r=await famPut({kind:'shelf',title:nm.trim(),val:packVal({g:g})},g);
  if(r){ toast(`'${nm.trim()}' 칸을 만들었습니다`); render(true); }
}
/* 쓸 때 넣을 모임 — 팀장님이 '모두' 를 보고 있으면 물어봅니다 */
async function targetGrp(title){
  if(!isOwner())return ME.grp||'';
  if(VIEWG)return VIEWG;
  if(!GROUPS.length){ toast('먼저 모임을 하나 만들어 주세요',4500); return null; }
  if(GROUPS.length===1)return GROUPS[0].id;
  return await pickGrp(title||'어느 모임에 넣을까요?');
}
/* 모임 고르기 */
function pickGrp(title){
  return new Promise(ok=>{
    const el=$('#pbActs'); el.innerHTML='';
    $('#pbT').textContent=title; $('#pbS').textContent='';
    const add=(id,name,hint)=>{ const x=document.createElement('button');
      x.innerHTML=esc(name)+(hint?`<span class="h">${esc(hint)}</span>`:'');
      x.onclick=()=>{ panOff(); ok(id); }; el.appendChild(x); };
    GROUPS.forEach(g=>add(g.id,g.name,''));
    add('','모두','모임을 안 나눈 것 — 누구에게나 보입니다');
    pan('#panBook',true);
    pickGrp._no=()=>ok(null);
  });
}
/* 앱 안쪽 입력창 — 사파리에서 prompt 를 쓰면 그 뒤 동작이 막힙니다 */
function ask(title,ph,val){
  return new Promise(ok=>{
    $('#askT').textContent=title; $('#askI').placeholder=ph||''; $('#askI').value=val||'';
    $('#askSheet').classList.add('on');
    setTimeout(()=>$('#askI').focus(),250);
    ask._ok=v=>{ $('#askSheet').classList.remove('on'); ok(v); };
  });
}
$('#askOk').onclick=()=>ask._ok&&ask._ok($('#askI').value);
$('#askNo').onclick=()=>ask._ok&&ask._ok(null);
$('#bd').addEventListener('click',()=>{ if(pickGrp._no){ const f=pickGrp._no; pickGrp._no=null; f(); } });
$('#askI').addEventListener('keydown',e=>{ if(e.key==='Enter')$('#askOk').click(); });

/* 골라 보기 */
const famOf   = k => FAM.filter(o=>o['종류']===k&&inGrp(o));
/* 서버가 이미 그 사람 모임 것만 보냅니다. 아래는 팀장님이 '모두' 로 볼 때만 씁니다. */
const shelves = () => famOf('shelf').sort((a,b)=>String(a['언제']).localeCompare(String(b['언제'])));
const shelfBooks = sid => famOf('shelfbook').filter(o=>o['대상']===sid);
const recsToMe   = () => famOf('rec').filter(o=>o['대상']===ME.id);
const bookOf  = id => BOOKS.find(b=>b.i===id);
/* 번호로 이름 찾기 — 지금까지 오간 기록과 명단에서 */
function nameOf(id){
  if(!id)return '';
  if(id===ME.id)return ME.name||'나';
  const m=MATES.find(x=>x.id===id); if(m)return m.name;
  const f=FAM.find(o=>o['누가']===id&&o['이름']); if(f)return f['이름'];
  const t=FAM.find(o=>o['대상']===id&&unpackVal(o['값']).n); if(t)return unpackVal(t['값']).n;
  return '모임원';
}

/* ══════════ 기기끼리 맞추기 ══════════
   각자의 구글 드라이브 '앱 전용 칸'에 기록을 둡니다.
   여럿이 함께 써도 계정이 다르니 서로 섞이지 않습니다.

   맞추는 것 : 읽은 기록 · 형광펜 · 메모 · 내 서가 · 최근 검색어
   안 맞추는 것 : 펜슬 필기(무거움) · 받아둔 파일(기기마다 다름) · 보기 설정(화면이 다름)

   지운 것이 되살아나지 않도록 '지웠다'는 표시를 따로 남깁니다.
   안 그러면 한쪽에서 지워도 다른 기기가 도로 밀어 넣습니다. */
const SFILE='ebl-state.json';
let DEL={}, RDEL={};          // 지운 형광펜 / 지운 읽은 기록
try{ DEL=JSON.parse(localStorage.getItem('ebl_del')||'{}'); }catch(e){}
try{ RDEL=JSON.parse(localStorage.getItem('ebl_rdel')||'{}'); }catch(e){}
const saveDEL=()=>{ try{
  localStorage.setItem('ebl_del',JSON.stringify(DEL));
  localStorage.setItem('ebl_rdel',JSON.stringify(RDEL)); }catch(e){} };
let SYNCAT=Number(localStorage.getItem('ebl_syncat')||0);

function localState(){
  return { v:1, at:Date.now(), me:{id:ME.id,name:ME.name,
           at:Number(localStorage.getItem('ebl_menameat')||0)},
           cfg:cfgBundle(), cfgAt:cfgAt(),
           rd:RD, hl:HL, del:DEL, rdel:RDEL,
           days:DAYS, wrong:WRONG, smart:P.smart||[], smartAt:Number(localStorage.getItem('ebl_smartat')||0),
           pins:P.pins||[], rq:RQ, rv:RV,
           goal:P.goal||0, goalY:P.goalY||0, goalAt:Number(localStorage.getItem('ebl_goalat')||0),
           jp:P.jpat||[], jpAt:Number(localStorage.getItem('ebl_jpatat')||0),
           tc:TCE,
           shr:P.shareRead?1:0, shrAt:Number(localStorage.getItem('ebl_shrat')||0),
           mates:MATES, matesAt:Number(localStorage.getItem('ebl_matesat')||0),
           pinsAt:Number(localStorage.getItem('ebl_pinsat')||0),
           rqAt:Number(localStorage.getItem('ebl_rqat')||0) };
}
/* 두 쪽을 합칩니다. 나중 것이 이기되, 지운 표시가 가장 셉니다. */
function mergeState(a,b){
  if(!a)return b; if(!b)return a;
  const out={ v:1, at:Date.now(), rd:{}, hl:{}, del:{}, rdel:{},
              pins:[], rq:[], pinsAt:0, rqAt:0, days:{}, smart:[], smartAt:0 };
  /* 읽은 시간 — 날짜마다 '책|기기' 칸. 기기마다 따로 세므로 큰 쪽을 고르면 됩니다 */
  [a.days,b.days].forEach(D=>Object.entries(D||{}).forEach(([d,m])=>{
    const o=out.days[d]||(out.days[d]={});
    Object.entries(m||{}).forEach(([k,v])=>{ if(!(k in o)||v>o[k])o[k]=v; }); }));
  if((a.goalAt||0)>=(b.goalAt||0)){ out.goal=a.goal; out.goalY=a.goalY; out.goalAt=a.goalAt||0; } else { out.goal=b.goal; out.goalY=b.goalY; out.goalAt=b.goalAt||0; }
  if((a.jpAt||0)>=(b.jpAt||0)){ out.jp=a.jp; out.jpAt=a.jpAt||0; } else { out.jp=b.jp; out.jpAt=b.jpAt||0; }
  out.tc={};   // v56 — 목차 손보기: 책마다 나중에 고친 쪽
  [a.tc,b.tc].forEach(T=>Object.entries(T||{}).forEach(([k,v])=>{ if(v&&(!out.tc[k]||(v.at||0)>(out.tc[k].at||0)))out.tc[k]=v; }));
  if((a.shrAt||0)>=(b.shrAt||0)){ out.shr=a.shr; out.shrAt=a.shrAt||0; } else { out.shr=b.shr; out.shrAt=b.shrAt||0; }
  if((a.matesAt||0)>=(b.matesAt||0)){ out.mates=a.mates; out.matesAt=a.matesAt||0; } else { out.mates=b.mates; out.matesAt=b.matesAt||0; }
  out.rv={};
  [a.rv,b.rv].forEach(R=>Object.entries(R||{}).forEach(([k,v])=>{ if(!out.rv[k]||(v.at||0)>(out.rv[k].at||0))out.rv[k]=v; }));
  out.wrong={};
  [a.wrong,b.wrong].forEach(W=>Object.entries(W||{}).forEach(([k,v])=>{ if(!out.wrong[k]||(v.t||0)>(out.wrong[k].t||0))out.wrong[k]=v; }));
  if((a.smartAt||0)>=(b.smartAt||0)){ out.smart=a.smart||b.smart||[]; out.smartAt=a.smartAt||0; }
  else                              { out.smart=b.smart||[]; out.smartAt=b.smartAt||0; }
  // 이름은 나중에 고친 쪽
  const ma=(a.me||{}), mb=(b.me||{});
  out.me = (ma.at||0)>=(mb.at||0) ? ma : mb;
  // 설정도 나중에 고친 쪽 통째로 (섞으면 주소와 토큰이 엇갈립니다)
  out.cfgAt = Math.max(a.cfgAt||0, b.cfgAt||0);
  out.cfg   = (a.cfgAt||0)>=(b.cfgAt||0) ? (a.cfg||b.cfg) : (b.cfg||a.cfg);
  const maxMap=(x,y)=>{ const m=Object.assign({},x||{});
    Object.entries(y||{}).forEach(([k,v])=>{ if(!(k in m)||v>m[k])m[k]=v; }); return m; };
  out.del =maxMap(a.del ,b.del);
  out.rdel=maxMap(a.rdel,b.rdel);

  // 읽은 기록 — 나중에 읽은 쪽
  const ids=new Set([...Object.keys(a.rd||{}),...Object.keys(b.rd||{})]);
  ids.forEach(id=>{
    const x=(a.rd||{})[id], y=(b.rd||{})[id];
    let pick = !x ? y : !y ? x : ((y.t||0)>(x.t||0) ? y : x);
    if(!pick)return;
    /* v55.5 — 책을 열기만 해도 t 는 새로 찍힙니다. 진도·위치·다 읽음은 실제로 쪽을 넘긴 시각(pt)이 나중인 쪽에서 */
    if(x&&y){ const prog=(y.pt||0)>(x.pt||0)?y:(x.pt||0)>(y.pt||0)?x:pick;
      if(prog!==pick){ pick=Object.assign({},pick); ['p','f','c','cp','pt','s','sp'].forEach(k=>{ if(prog[k]===undefined)delete pick[k]; else pick[k]=prog[k]; }); } }
    const gone=out.rdel[id]||0;
    if(gone && gone>=(pick.t||0))return;      // 지운 뒤로 안 읽었으면 되살리지 않습니다
    out.rd[id]=pick;
  });

  // 형광펜·메모 — 양쪽을 합치고, 같은 것은 나중에 고친 쪽
  const bks=new Set([...Object.keys(a.hl||{}),...Object.keys(b.hl||{})]);
  bks.forEach(bk=>{
    const m={};
    [...((a.hl||{})[bk]||[]),...((b.hl||{})[bk]||[])].forEach(o=>{
      if(!o||!o.i)return;
      if(out.del[o.i])return;                 // 지운 것
      const old=m[o.i];
      if(!old||(o.up||o.at||0)>(old.up||old.at||0))m[o.i]=o;
    });
    const arr=Object.values(m);
    if(arr.length)out.hl[bk]=arr;
  });

  // 내 서가 · 최근 검색어 — 나중에 고친 쪽 통째로
  if((a.pinsAt||0)>=(b.pinsAt||0)){ out.pins=a.pins||[]; out.pinsAt=a.pinsAt||0; }
  else                            { out.pins=b.pins||[]; out.pinsAt=b.pinsAt||0; }
  if((a.rqAt||0)>=(b.rqAt||0)){ out.rq=a.rq||[]; out.rqAt=a.rqAt||0; }
  else                        { out.rq=b.rq||[]; out.rqAt=b.rqAt||0; }
  return out;
}
function applyState(s){
  if(s.me&&s.me.name&&(s.me.at||0)>Number(localStorage.getItem('ebl_menameat')||0)){
    ME.name=s.me.name; localStorage.setItem('ebl_mename',ME.name);
    localStorage.setItem('ebl_menameat',String(s.me.at));
    const el=$('#sMe'); if(el)el.value=ME.name;
  }
  if(takeCfg(s.cfg,s.cfgAt)){ CFGNEW=true; log('설정을 구글 계정에서 받았습니다'); }
  RD=s.rd||{}; HL=s.hl||{}; DEL=s.del||{}; RDEL=s.rdel||{};
  if(s.days){ DAYS=s.days; saveDAYS.now(); }
  if(s.wrong){ const ch=JSON.stringify(s.wrong)!==JSON.stringify(WRONG); WRONG=s.wrong;
    try{ localStorage.setItem('ebl_wrong',JSON.stringify(WRONG)); }catch(e){} if(ch&&BOOKS.length)metaApply(); }
  if(Array.isArray(s.smart)){ P.smart=s.smart;
    try{ localStorage.setItem('ebl_smartat',String(s.smartAt||0)); }catch(e){} }
  P.pins=s.pins||[]; RQ=s.rq||[];
  if(s.tc){ const ch=JSON.stringify(s.tc)!==JSON.stringify(TCE); TCE=s.tc; saveTCE(); if(ch)TOCS=null; }
  if(s.rv){ RV=s.rv; saveRV(); }
  if(s.shrAt&&s.shrAt>Number(localStorage.getItem('ebl_shrat')||0)){ P.shareRead=s.shr?1:0;
    try{ localStorage.setItem('ebl_shrat',String(s.shrAt)); }catch(e){} }
  if(Array.isArray(s.mates)&&(s.matesAt||0)>Number(localStorage.getItem('ebl_matesat')||0)){ MATES=s.mates;
    try{ localStorage.setItem('ebl_mates',JSON.stringify(MATES)); localStorage.setItem('ebl_matesat',String(s.matesAt)); }catch(e){} }
  if((s.goalAt||0)>Number(localStorage.getItem('ebl_goalat')||0)){ P.goal=s.goal||0; P.goalY=s.goalY||0;
    try{ localStorage.setItem('ebl_goalat',String(s.goalAt)); }catch(e){} try{ paintGoal(); }catch(e){} }
  if(Array.isArray(s.jp)&&(s.jpAt||0)>Number(localStorage.getItem('ebl_jpatat')||0)){
    P.jpat=s.jp; try{ localStorage.setItem('ebl_jpatat',String(s.jpAt)); }catch(e){} TXTC=''; }
  saveRD.now(); saveHL.now(); saveDEL(); savePref();
  try{ localStorage.setItem('ebl_rq',JSON.stringify(RQ));
       localStorage.setItem('ebl_pinsat',String(s.pinsAt||0));
       localStorage.setItem('ebl_rqat',String(s.rqAt||0)); }catch(e){}
}

/* ── 드라이브 앱 전용 칸 다루기 ── */
async function dv(url,at,opt){
  const o=Object.assign({headers:{}},opt||{});
  o.headers=Object.assign({Authorization:'Bearer '+at},o.headers||{});
  const r=await fetch(url,o);
  if(!r.ok)throw new Error('드라이브 '+r.status+(r.status===403?' (권한 — 🔑 로 다시 로그인해 주세요)':''));
  return r;
}
async function findState(at){
  const q=encodeURIComponent(`name='${SFILE}' and trashed=false`);
  const r=await dv(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}`
    +`&fields=files(id,modifiedTime)&pageSize=1`,at);
  const j=await r.json();
  return (j.files&&j.files[0])||null;
}
async function putState(file,data,at){
  const body=JSON.stringify(data);
  if(file){
    await dv(`https://www.googleapis.com/upload/drive/v3/files/${file.id}?uploadType=media`,at,
      {method:'PATCH',headers:{'Content-Type':'application/json'},body});
    return file;
  }
  const meta=JSON.stringify({name:SFILE,parents:['appDataFolder']});
  const B='ebl'+Date.now();
  const multi=`--${B}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`
    +`--${B}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${B}--`;
  const r=await dv(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id`,at,
    {method:'POST',headers:{'Content-Type':'multipart/related; boundary='+B},body:multi});
  return await r.json();
}
let syncing=false;
async function syncNow(inter){
  if(syncing)return;
  syncing=true;
  try{
    const at=await needToken(!!inter);
    const f=await findState(at);
    let remote=null;
    if(f){ try{ const r=await dv(
      `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`,at); remote=await r.json(); }
      catch(e){ log('맞추기 — 가져오기 실패: '+(e.message||e)); } }
    const merged=mergeState(remote,localState());
    applyState(merged);
    await putState(f,merged,at);
    try{ await inkSync(at); }catch(e){ log('필기 맞추기 실패: '+(e.message||e)); }
    SYNCAT=Date.now(); localStorage.setItem('ebl_syncat',String(SYNCAT));
    paintSync();
    if(readerOn()){ paintHlBadge(); if(KIND==='epub')paintEpubHl();
      else if(KIND==='pdf')paintPdfHl(); else paintTxtHl(); }
    else { paintTabs(); render(true); }
    if(CFGNEW){ CFGNEW=false;
      toast('다른 기기의 설정을 받았습니다.\n새로 시작합니다…',3000);
      setTimeout(()=>location.reload(),1400); return; }
    if(inter)toast('기기끼리 맞췄습니다');
    log('맞추기 완료 — 책 '+Object.keys(merged.rd||{}).length+'권, 형광펜 '
      +Object.values(merged.hl||{}).reduce((a,x)=>a+x.length,0)+'개');
  }catch(e){
    log('맞추기 실패: '+(e.message||e));
    if(inter)toast('맞추지 못했습니다\n'+(e.message||e),5000);
  }finally{ syncing=false; }
}
function paintSync(){
  const el=$('#syncInfo'); if(!el)return;
  el.textContent = SYNCAT ? '  ·  마지막 '+new Date(SYNCAT).toLocaleString('ko-KR',
    {month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '  ·  아직 안 맞춤';
}
/* 자동으로 맞추는 순간들 */
function syncSoon(){ if(P.sync===false)return;
  clearTimeout(syncSoon._t); syncSoon._t=setTimeout(()=>syncNow(false),1200); }

