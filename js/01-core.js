/* 우리 도서관 — js/01-core.js
   설정 담기 · 로그인 · 저장소 · 색인 · 같은 책 묶기
   ※ 모든 파일이 같은 전역을 나눠 씁니다. index.html 에 적힌 순서(01 → 12)대로 불러와야 합니다. */
/* ============================================================
   전자책 서재 (v4)
   v4 — 읽기 설정(Aa) · 보기 설정(☰) 을 판으로 분리
        종이색 / 글자크기 / 줄간격 / 여백 / 글꼴 / 넘김방식·폭
        표지크기 / 목록·격자 / 정렬 / 분류 기준(계층·대·중·소·폴더)
   ============================================================ */
const BUILD='v57';

/* 이 파일은 깃허브에 공개돼 있습니다.
   그래서 주소·토큰·폴더는 여기 두지 않습니다.
   초대 링크가 실어다 주거나, 서재를 차린 사람이 🛠 관리 에 한 번 넣습니다.
   클라이언트 ID 는 원래 공개되는 값이라 편의를 위해 남겨둡니다. */
const DEF={
  url:'',     // Apps Script 웹앱 주소
  tok:'',     // 토큰
  cid:'552041627002-sd7fu1457pgd3bd2k2biicpoqqf12tlm.apps.googleusercontent.com',
  fol:'',     // 도서 폴더 링크 — 승인 요청을 보낼 자리
  adm:''      // 관리자 열쇠 — 서재를 차린 사람 기기에만
};
/* drive.appdata — 구글이 앱마다 하나씩 내주는, 눈에 안 보이는 칸입니다.
   기기끼리 기록을 맞추는 데만 씁니다. 사용자의 다른 파일은 못 봅니다. */
const SCOPE='https://www.googleapis.com/auth/drive.readonly '
          + 'https://www.googleapis.com/auth/drive.appdata';
const PAGE=60;

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const cfg=k=>localStorage.getItem('ebl_'+k)||DEF[k];
const setCfg=(k,v)=>localStorage.setItem('ebl_'+k,v);

/* ══════════ 설정을 구글 계정에 함께 담기 ══════════
   기기를 바꿀 때마다 주소·토큰을 손으로 넣는 것은 번거롭고,
   오늘처럼 하나를 빠뜨리면 알아보기 힘든 오류가 납니다.

   읽은 기록을 담는 그 숨은 칸에 설정도 같이 넣습니다.
   새 기기에서는 구글 로그인만 하면 설정이 내려옵니다.

   숨은 칸은 구글 계정마다 따로입니다.
   모임원이 로그인해도 그분 칸에는 팀장님 열쇠가 없습니다. */
const CFGK=['url','tok','cid','fol','adm'];
const cfgBundle=()=>{ const o={}; CFGK.forEach(k=>{ const v=cfg(k); if(v)o[k]=v; }); return o; };
const cfgAt=()=>Number(localStorage.getItem('ebl_cfgat')||0);
const stampCfg=()=>localStorage.setItem('ebl_cfgat',String(Date.now()));
let CFGNEW=false;                       // 이번 맞추기에 설정이 바뀌었나

/* 내려온 설정을 기기에 적습니다. 주소와 토큰이 다 있을 때만 받습니다. */
function takeCfg(c,at){
  if(!c||!c.url||!c.tok)return false;
  if((at||0)<=cfgAt())return false;     // 이 기기 것이 더 새것이면 그대로 둡니다
  let changed=false;
  CFGK.forEach(k=>{ const v=c[k]||''; if(v&&v!==cfg(k)){ setCfg(k,v); changed=true; } });
  localStorage.setItem('ebl_cfgat',String(at));
  return changed;
}

/* 사용자 설정 (기기에 저장) */
const P = Object.assign({
  theme:'light', fs:110, lh:170, pd:6, pv:16, font:'', nav:'both', tap:30,
  mode:'g', size:104, sort:'t', cat:'tree', zoom:100, pnav:'scroll', draw:false,
  fmt:{ epub:true, pdf:true, etc:false },    // 보여줄 형식 (그 외는 기본 감춤)
  pins:[]                                    // 홈에 고정한 분류 (내 서가)
}, JSON.parse(localStorage.getItem('ebl_pref')||'{}'));
if(!P.fmt) P.fmt={ epub:true, pdf:true, etc:false };
if(P.fmt.comic===undefined) P.fmt.comic=true;   // v36 — 만화·ZIP 은 처음부터 보입니다
if(!Array.isArray(P.pins)) P.pins=[];
/* v56 — 책마다 보기 설정
   BKP[책ID] = {theme,fs,lh,ls,pd,pv,font,fw} — 이 기기에만 (보기 설정은 기기끼리 맞추지 않습니다).
   따로 기억하는 책을 여는 동안 P 에는 그 책 값이 들어가고, 모든 책 공통 값은 BKG 에 잠시 맡깁니다.
   저장할 때는 공통 값만 ebl_pref 에 적고, 바뀐 책 값은 BKP 에 적습니다. */
const BKPK=['theme','fs','lh','ls','pd','pv','font','fw'];
let BKP={}; try{ BKP=JSON.parse(localStorage.getItem('ebl_bkp')||'{}')||{}; }catch(e){ BKP={}; }
let BKG=null, BKID='';
const bkpPick=o=>{ const r={}; BKPK.forEach(k=>{ if(o[k]!==undefined)r[k]=o[k]; }); return r; };
const saveBKP=()=>{ try{ localStorage.setItem('ebl_bkp',JSON.stringify(BKP)); }catch(e){} };
const savePref=()=>{
  let o=P;
  if(BKG&&BKID&&BKP[BKID]){ BKP[BKID]=bkpPick(P); saveBKP(); o=Object.assign({},P,BKG); }
  localStorage.setItem('ebl_pref',JSON.stringify(o));
};
function bkpEnter(id){
  if(BKG){ Object.assign(P,BKG); BKG=null; }
  BKID=id||'';
  if(BKID&&BKP[BKID]){ BKG=bkpPick(P); Object.assign(P,BKP[BKID]); }
}
function bkpLeave(){ if(BKG){ Object.assign(P,BKG); BKG=null; } BKID=''; }

/* 최근 검색어 — 같은 말을 되풀이해 치지 않도록 */
let RQ=[]; try{ RQ=JSON.parse(localStorage.getItem('ebl_rq')||'[]'); }catch(e){ RQ=[]; }
function pushRQ(q){
  q=String(q||'').trim(); if(q.length<2) return;
  RQ=[q].concat(RQ.filter(x=>x!==q)).slice(0,8);
  try{ localStorage.setItem('ebl_rq',JSON.stringify(RQ));
        localStorage.setItem('ebl_rqat',String(Date.now())); }catch(e){}
}

/* 가나다 정렬 — 글자를 한 자 칠 때마다 3.7만 권을 다시 줄 세우면
   아이패드에서 0.5초씩 멈춥니다. 정렬 순서를 한 번만 만들어 두고
   그다음부터는 그 순서대로 훑기만 합니다. (494ms → 17ms) */
const COLL=new Intl.Collator('ko');
const ORD={};
function order(s){
  if(ORD[s]) return ORD[s];
  const idx=BOOKS.map((_,i)=>i);
  if(s==='g'||s==='d')      idx.sort((a,b)=>String(BOOKS[b][s]||'').localeCompare(String(BOOKS[a][s]||'')));
  else if(s==='z')          idx.sort((a,b)=>(BOOKS[b].z||0)-(BOOKS[a].z||0));
  else                      idx.sort((a,b)=>COLL.compare(String(BOOKS[a][s]||''),String(BOOKS[b][s]||'')));
  return ORD[s]=idx;
}

let BOOKS=[],HAY=[],UPDATED='',shown=0,rows=[];
let HSIDE=localStorage.getItem('ebl_hside')||'me';   // 나 / 모임번호
let TAB=localStorage.getItem('ebl_tab')||'home';   // 상태 탭 (기본은 홈)
let PIN='';                               // 내 서가에서 고른 분류
let PATH=[];                              // 계층 탐색 경로 [대,중]
let TOKEN='',tokenClient=null,gisReady=false,saved=new Set();

/* ══════════ 로그인 이어가기 ══════════
   전에는 sessionStorage 에 담았습니다. 창을 닫으면 브라우저가 버리므로
   완전히 닫았다 열 때마다 처음부터였습니다.

   이제 localStorage 에 담습니다. 담는 것은 셋입니다.
     t  받은 표
     e  언제까지 쓸 수 있나 (구글이 한 시간쯤 줍니다)
     h  어느 구글 계정이었나

   h 가 있어야 계정이 여럿일 때 구글이 '골라달라' 하지 않고
   조용히 새 표를 내줍니다. 화면도 안 뜨고 누를 것도 없습니다.

   갱신 표(refresh token)는 브라우저에 주지 않는 것이 구글 방침이라,
   '한 시간마다 조용히 다시 받는' 것이 웹에서 할 수 있는 최선입니다. */
const AUTH={
  get(){ try{ return JSON.parse(localStorage.getItem('ebl_auth')||'{}'); }catch(e){ return {}; } },
  set(o){ try{ localStorage.setItem('ebl_auth',JSON.stringify(o||{})); }catch(e){} },
  /* 표만 버리고 계정은 남깁니다 — 다음에 조용히 받으려면 계정을 알아야 합니다 */
  drop(){ const a=AUTH.get(); delete a.t; delete a.e; AUTH.set(a); }
};
const tokenLive = () => { const a=AUTH.get(); return !!(a.t&&a.e&&Date.now()<a.e); };

/* 담아둔 표를 곧바로 되살립니다.
   구글 스크립트가 오든 말든 상관없이, 앱이 뜨는 즉시 합니다.
   (전에는 구글 모듈이 준비된 뒤에야 되살려서, 모듈이 늦거나
    막히면 표가 멀쩡한데도 로그인이 풀린 것처럼 보였습니다) */
let AUTHWHY='';
(function resume(){
  const a=AUTH.get();
  if(!a.t&&!a.h){ AUTHWHY='아직 로그인한 적이 없습니다'; return; }
  if(!a.t){ AUTHWHY='표가 없습니다 — 조용히 다시 받습니다'; return; }
  if(!a.e||Date.now()>=a.e){ AUTHWHY='표가 만료됐습니다 — 조용히 다시 받습니다'; return; }
  TOKEN=a.t;
  AUTHWHY='이어감 · '+Math.round((a.e-Date.now())/60000)+'분 남음';
})();

/* 시작하다 죽으면 '시작하는 중…' 에서 굳습니다.
   무슨 일인지 화면에 띄워 원인을 바로 알 수 있게 합니다. */
addEventListener('error',e=>{
  const el=document.getElementById('stat');
  if(el&&/시작하는 중/.test(el.textContent)){
    el.textContent='시작하지 못했습니다\n'+(e.message||e)
      +(e.filename?'\n'+String(e.lineno||'')+'줄':'');
    el.className='err';
  }
});
addEventListener('unhandledrejection',e=>{
  const el=document.getElementById('stat');
  if(el&&/시작하는 중/.test(el.textContent)){
    el.textContent='시작하지 못했습니다\n'+((e.reason&&e.reason.message)||e.reason||'');
    el.className='err';
  }
});

const LOG=[];
function log(m){ const s=new Date().toTimeString().slice(0,8)+'  '+m;
  LOG.push(s); if(LOG.length>60)LOG.shift();
  const el=$('#log'); if(el)el.textContent=LOG.join('\n'); console.log(s); }
function stat(m,bad){ $('#stat').textContent=m; $('#stat').classList.toggle('err',!!bad); }
function toast(m,ms=2600){ const t=$('#toast'); t.textContent=m; t.style.display='block';
  clearTimeout(toast._t); toast._t=setTimeout(()=>t.style.display='none',ms); }
const nfc=s=>{try{return String(s??'').normalize('NFC')}catch(e){return String(s??'')}};
const norm=s=>nfc(s).toLowerCase().replace(/\s+/g,'');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ── 저장소 ── */
const DB=(()=>{ let db;
  const open=()=>new Promise((ok,ng)=>{ if(db)return ok(db);
    const r=indexedDB.open('ebl',1);
    r.onupgradeneeded=e=>{const d=e.target.result;
      if(!d.objectStoreNames.contains('kv'))d.createObjectStore('kv');
      if(!d.objectStoreNames.contains('books'))d.createObjectStore('books');};
    r.onsuccess=e=>{db=e.target.result;ok(db)};
    r.onerror=()=>ng(r.error||new Error('저장소를 열지 못했습니다'));
    r.onblocked=()=>ng(new Error('저장소가 다른 탭에 잡혀 있습니다'));
    setTimeout(()=>ng(new Error('저장소 응답 없음')),8000); });
  /* onabort 를 빠뜨리면 — 저장 공간이 모자라 취소됐을 때 —
     성공도 실패도 아닌 채로 영영 멈춥니다. 예전에 '책을 받는 중'에서
     멈춰 있던 원인이 이것이었습니다. */
  const tx=async(s,m,fn)=>{const d=await open();
    return new Promise((ok,ng)=>{
      let done=false;
      const fin=(f,v)=>{ if(!done){ done=true; f(v); } };
      let t,o,q;
      try{ t=d.transaction(s,m); o=t.objectStore(s); q=fn(o); }
      catch(e){ return fin(ng,e); }
      t.oncomplete=()=>fin(ok,q&&q.result);
      t.onerror   =()=>fin(ng,t.error||new Error('저장소 오류'));
      t.onabort   =()=>fin(ng,t.error||new Error('저장소가 가득 찼습니다'));
      setTimeout(()=>fin(ng,new Error('저장소 시간 초과')),20000);
    });};
  return{ get:(s,k)=>tx(s,'readonly',o=>o.get(k)), put:(s,k,v)=>tx(s,'readwrite',o=>o.put(v,k)),
    del:(s,k)=>tx(s,'readwrite',o=>o.delete(k)),
    keys:s=>tx(s,'readonly',o=>o.getAllKeys()), clear:s=>tx(s,'readwrite',o=>o.clear()) };
})();

/* ── 로그인 ──
   구글 모듈은 async 로 실려 옵니다. 우리 코드보다 먼저 도착하면
   onload="onGis()" 가 아직 없는 함수를 부르게 되어 그냥 지나갑니다.
   그래서 도착했는지 스스로도 살펴봅니다. */
function onGis(){
  if(gisReady)return;                       // 두 번 불려도 한 번만
  if(!(window.google&&google.accounts&&google.accounts.oauth2)){
    log('로그인 모듈이 아직 안 왔습니다'); return; }
  gisReady=true; log('로그인 모듈 준비');
  try{ tokenClient=google.accounts.oauth2.initTokenClient({
    client_id:cfg('cid'), scope:SCOPE,
    callback:r=>{ if(r.error){ AUTHWHY='조용히 받기 실패 · '+r.error;
        log('로그인 실패: '+r.error); markLogin(false); paintLogin();
        (needToken._ng||(()=>{}))(new Error(r.error)); return; }
      TOKEN=r.access_token;
      const a=AUTH.get();
      a.t=TOKEN;
      // 2분 일찍 만료로 봅니다 — 쓰는 도중에 죽지 않게
      a.e=Date.now()+(Math.max(60,Number(r.expires_in)||3600)-120)*1000;
      AUTH.set(a);
      AUTHWHY='이어감 · '+Math.round((a.e-Date.now())/60000)+'분 남음';
      log('로그인 성공'); markLogin(true); whoAmI(); paintLogin();
      (needToken._ok||(()=>{}))(TOKEN); }});
  }catch(e){ gisReady=false; log('로그인 모듈 시작 실패: '+e.message); }

  const a=AUTH.get();
  log('로그인 상태: '+AUTHWHY);
  if(tokenLive()){
    TOKEN=a.t; markLogin(true);
  }else{
    if(a.t)AUTH.drop();            // 시간이 다 된 표는 그 자리에서 버립니다
    markLogin(false);
    // 전에 들어온 적이 있으면 조용히 새 표를 받아둡니다
    if(a.h||a.t){ log('조용히 다시 받는 중… (계정 '+(a.h||'모름')+')'); quietLogin(); }
  }
  paintLogin();
}
/* 화면도 안 뜨고 누를 것도 없는 재발급 */
function quietLogin(){
  if(!tokenClient||TOKEN)return;
  const req={prompt:''}; const h=AUTH.get().h; if(h)req.hint=h;
  try{ tokenClient.requestAccessToken(req); }
  catch(e){ log('조용히 받기 실패: '+(e.message||e)); }
}
/* 어느 계정으로 들어왔는지 한 번만 알아둡니다.
   드라이브가 알려주므로 권한을 더 받을 필요가 없습니다. */
async function whoAmI(){
  const a=AUTH.get(); if(a.h||!TOKEN)return;
  try{
    const r=await fetch('https://www.googleapis.com/drive/v3/about?fields=user',
      {headers:{Authorization:'Bearer '+TOKEN}});
    if(!r.ok)return;
    const d=await r.json();
    if(d.user&&d.user.emailAddress){
      const b=AUTH.get(); b.h=d.user.emailAddress; AUTH.set(b);
      log('계정을 기억했습니다: '+b.h);
    }
  }catch(e){}
}
/* 모듈이 늦게 오거나 onload 를 놓쳤을 때를 위해 30초 동안 살핍니다 */
(function waitGis(n){
  if(gisReady)return;
  if(window.google&&google.accounts&&google.accounts.oauth2){ onGis(); return; }
  if(n>60){ log('로그인 모듈을 30초 동안 못 받았습니다'); return; }
  setTimeout(()=>waitGis(n+1),500);
})(0);
function markLogin(ok){ const b=$('#btnLogin');
  b.classList.toggle('good',ok); b.classList.toggle('warn',!ok); }
/* 지금 로그인이 어떤 상태인지 그대로 보여줍니다.
   '풀렸다' 싶을 때 여기를 보시면 까닭이 적혀 있습니다. */
function paintLogin(){
  const el=$('#loginInfo'); if(!el)return;
  const a=AUTH.get();
  el.textContent='  ·  '+(a.h||'계정 모름')+'  ·  '+(AUTHWHY||'—');
}
function needToken(inter){ return new Promise((ok,ng)=>{
  // 시간이 다 된 표는 미리 버립니다. 들고 있다가 401 을 맞느니 낫습니다.
  if(TOKEN&&!tokenLive()){ TOKEN=''; AUTH.drop(); markLogin(false); }
  if(TOKEN)return ok(TOKEN);
  if(!cfg('cid'))return ng(new Error('구글 클라이언트 ID 가 비어 있습니다.\n🛠 관리 에서 넣어주세요.'));
  if(!gisReady||!tokenClient)return ng(new Error('로그인 모듈이 아직 안 왔습니다.\n인터넷을 확인하고 잠시 후 🔑 를 눌러주세요.'));
  needToken._ok=ok; needToken._ng=ng;
  const req={prompt:inter?'consent':''};
  const h=AUTH.get().h; if(h)req.hint=h;      // 계정이 여럿이어도 안 물어봅니다
  tokenClient.requestAccessToken(req); }); }

/* ── 색인 ── */
/* 아직 아무것도 없는 기기에서, 구글 계정만으로 설정을 가져옵니다.
   목록도 모임도 필요 없습니다. 숨은 칸 파일 하나만 읽으면 됩니다. */
async function pullCfg(inter){
  try{
    const at=await needToken(!!inter);
    const f=await findState(at);
    if(!f)return '이 계정에 저장된 설정이 없습니다';
    const r=await dv(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`,at);
    const d=await r.json();
    if(!d||!d.cfg||!d.cfg.url||!d.cfg.tok)return '저장된 설정에 주소나 토큰이 없습니다';
    CFGK.forEach(k=>{ if(d.cfg[k])setCfg(k,d.cfg[k]); });
    localStorage.setItem('ebl_cfgat',String(d.cfgAt||Date.now()));
    return true;
  }catch(e){ return e.message||String(e); }
}

async function boot(){
  /* 주소와 토큰은 소스에 두지 않습니다.
     초대 링크가 실어다 주거나, 서재를 차린 사람이 🛠 관리 에 한 번 넣습니다.
     저장소를 열기 전에 먼저 봅니다 — 저장소가 말썽이어도 안내는 떠야 하니까요. */
  if(!cfg('url')||!cfg('tok')){
    /* 전에 이 기기에서 구글에 들어온 적이 있으면, 조용히 설정을 찾아봅니다.
       구글 계정의 숨은 칸에 담아두었기 때문입니다. */
    if(AUTH.get().h||AUTH.get().t){
      stat('구글 계정에서 설정을 찾는 중…');
      const r=await pullCfg(false);
      if(r===true){ log('설정을 받았습니다. 새로 시작합니다'); location.reload(); return; }
      log('설정 가져오기: '+r);
    }
    stat('아직 서재에 연결되지 않았습니다.\n\n'
        +'· 전에 쓰시던 기기가 있으면 [구글 계정에서 설정 가져오기]\n'
        +'· 초대 링크를 받으셨다면 그 링크로 열어주세요\n'
        +'· 처음 차리시는 것이라면 [관리] 에 주소와 토큰을');
    setTimeout(()=>{ try{ pgOpen('adm'); }catch(e){} },700);
    return;
  }
  try{ (await DB.keys('books')||[]).forEach(k=>saved.add(k)); }catch(e){}
  let c=null; try{ c=await DB.get('kv','index'); }catch(e){ log('저장소를 열지 못했습니다: '+(e.message||e)); }
  if(c){ apply(c); render(true); log('저장된 색인 ('+BOOKS.length+'권)'); setTimeout(resumeOffer,300); }
  else{ stat('처음이라 서재를 받아옵니다. 30초쯤 걸립니다…');
    try{ await fetchIndex(); render(true); setTimeout(resumeOffer,300); }
    catch(e){
      // 화면 글은 창에 가려 안 보일 때가 있어, 기록에도 반드시 남깁니다
      log('★ 목록을 못 받았습니다: '+(e.message||e));
      log('   주소 '+(cfg('url')?'있음':'비어 있음')
         +' · 토큰 '+(cfg('tok')?cfg('tok').slice(0,8)+'…':'비어 있음'));
      stat('목록을 못 받았습니다.\n'+e.message
        +'\n\n관리 → 주소와 토큰을 확인해 주세요.',true);
    } }
}
/* 주소가 비어 있으면 fetch 가 '나 자신'을 부릅니다.
   그러면 JSON 대신 이 페이지의 HTML 이 돌아와
   "Unexpected token '<'" 라는 알아먹기 힘든 말이 나옵니다.
   부르기 전에 막고 사람 말로 알려줍니다. */
function checkUrl(){
  const u=cfg('url');
  if(!u) throw new Error('Apps Script 웹앱 주소가 비어 있습니다.\n관리 → 맨 위 칸에 넣어주세요.');
  if(!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/.test(u))
    throw new Error('웹앱 주소 모양이 아닙니다.\n'
      +'.../macros/s/AKfycb.../exec 이어야 합니다.\n'
      +'지금: '+u.slice(0,60));
  if(!cfg('tok')) throw new Error('토큰이 비어 있습니다.\n관리에서 넣어주세요.');
  return u;
}
async function fetchIndex(){
  // 자기 번호를 같이 보냅니다 — 끊긴 사람은 여기서 걸러집니다
  const base=checkUrl();
  const u=base+(base.includes('?')?'&':'?')+'token='+encodeURIComponent(cfg('tok'))
    +'&uid='+encodeURIComponent(ME.id);
  const r=await fetch(u); if(!r.ok)throw new Error('서버 응답 '+r.status);
  const t=await r.text();
  let d; try{ d=JSON.parse(t); }
  catch(e){ throw new Error(/^\s*</.test(t)
    ? '서버가 JSON 이 아니라 웹페이지를 보냈습니다.\n주소가 맞는지 확인해 주세요.'
    : '서버 응답을 읽지 못했습니다: '+t.slice(0,60)); }
  if(d.error==='blocked'){ showCut(); throw new Error('이 기기는 더 이상 쓸 수 없습니다'); }
  if(d.error)throw new Error(d.error);
  await DB.put('kv','index',d); apply(d); log('색인 '+d.count+'권');
}
function apply(d){
  { const seen=new Set(); d.books=(d.books||[]).filter(b=>{ if(!b||!b.i)return true; if(seen.has(b.i))return false; seen.add(b.i); return true; }); }  // v54 — 같은 파일은 한 번만
  BOOKS_ALL=d.books||[]; BOOKS=kidFilter(BOOKS_ALL); UPDATED=d.updated||'';
  /* ★ 목록이 바뀌면 만들어 둔 정렬 순서를 버립니다.
     (v31 까지는 안 버려서, 기기에 둔 목록 → 새 목록으로 바뀔 때
      옛 순서표가 새 목록에 덮여 엉뚱한 순서로 보이고 새 책이 빠지기도 했습니다) */
  Object.keys(ORD).forEach(k=>delete ORD[k]);
  BOOKS.forEach(b=>{ if(b.a)b.a=b.a.replace(/\s*\([^)]*\)/g,'').trim(); });
  metaApply();
  try{ buildGroups(); }catch(e){ GRP=[]; }
}
/* ══════════ v54 — 같은 책 하나로 묶기 ══════════
   제목(파일 이름 쪽 제목의 알맹이)이 같고 저자가 어긋나지 않으면 한 묶음.
   카드는 묶음에서 한 권만 — 최근에 읽은 파일 → 받아둔 파일 → EPUB → PDF → 그 밖 순서로 고릅니다.
   읽은 기록은 파일마다 따로 (RD[파일ID]). 폴더 보기·받아둔 책 칸은 묶지 않습니다. */
var GRP=[], DUPN=0;
function gkT(b){ return String((b.o||(b._0&&b._0.t)||b.t||'')).normalize('NFC').replace(/\(.*?\)|\[.*?\]|【.*?】/g,'').replace(/[^0-9A-Za-z가-힣]/g,'').toLowerCase(); }
function gkA(b){ return String((b._0&&b._0.a)||b.a||'').normalize('NFC').replace(/\(.*?\)|\[.*?\]/g,'').replace(/(지음|저|옮김|역|글|그림|편저?|외)\b/g,'').replace(/[^0-9A-Za-z가-힣]/g,'').toLowerCase(); }
function buildGroups(){
  /* 두 가지로 잇습니다 — ① 파일 이름 제목이 같고 저자가 어긋나지 않음
     ② 믿을 만한(높음·중간) YES24 상품번호나 ISBN 이 같음 → 파일 이름이 달라도
        ('클래식 클라우드 029 - 가르시아 마르케스' 와 '가르시아 마르케스') 같은 책 */
  const par=new Map(), up=b=>{ let r=b; while(par.get(r)!==r)r=par.get(r); let x=b; while(par.get(x)!==r){ const n=par.get(x); par.set(x,r); x=n; } return r; };
  const join=(a,b)=>{ const ra=up(a), rb=up(b); if(ra!==rb)par.set(rb,ra); };
  BOOKS.forEach(b=>{ b._dup=0; b._alt=null; par.set(b,b); });
  const by=new Map();
  BOOKS.forEach(b=>{ const k=gkT(b); if(k.length<2)return; let a=by.get(k); if(!a)by.set(k,a=[]); a.push(b); });
  by.forEach(arr=>{ if(arr.length<2)return;
    const cl=[];   // 저자가 맞는 것끼리 (한쪽이 비었거나 한쪽이 다른 쪽을 품으면 같은 사람)
    arr.forEach(b=>{ const a=gkA(b); const c=cl.find(c=>!a||!c.a||c.a.includes(a)||a.includes(c.a)); if(c){ c.m.push(b); if(!c.a)c.a=a; } else cl.push({a,m:[b]}); });
    cl.forEach(c=>{ for(let i=1;i<c.m.length;i++)join(c.m[0],c.m[i]); }); });
  const idk=new Map();
  BOOKS.forEach(b=>{ const o=b._0||b, n=String(o.n||b.n||'');
    if(b._sb||b.r||isWrong(b.i)||!(n==='높음'||n==='중간'))return;
    [o.y||b.y?'y'+(o.y||b.y):'', (o.k||b.k)&&String(o.k||b.k).length>=10?'k'+String(o.k||b.k).replace(/[^0-9X]/gi,''):''].forEach(k=>{
      if(!k)return; k+='|'+volOf(b.o||''); const f=idk.get(k); if(f)join(f,b); else idk.set(k,b); }); });
  const g=new Map(); BOOKS.forEach(b=>{ const r=up(b); let a=g.get(r); if(!a)g.set(r,a=[]); a.push(b); });
  GRP=[]; g.forEach(a=>{ if(a.length>1)GRP.push(a); });
  markDups();
}
const FMTRANK={epub:0,pdf:1,txt:2};
function markDups(){
  DUPN=0;
  GRP.forEach(g=>{
    let rep=null, best=-1;
    g.forEach(b=>{ const r=RD[b.i]; const t=r&&r.t?r.t:0; if(t>best){ best=t; rep=b; } });
    if(!best||best<=0){ rep=g.find(b=>saved.has(b.i))||g.slice().sort((x,y)=>((FMTRANK[(x.x||'').toLowerCase()]??5)-(FMTRANK[(y.x||'').toLowerCase()]??5)))[0]; }
    g.forEach(b=>{ b._dup=b===rep?0:1; b._alt=null; });
    rep._alt=g.filter(b=>b!==rep); DUPN+=g.length-1; });
}
const dupHide=b=>P.merge!==0&&b._dup===1;

