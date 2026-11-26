/* 우리 도서관 — js/02-books.js
   책 정보 · 읽은 기록 · 분류 · 목록 · 열기
   ※ 모든 파일이 같은 전역을 나눠 씁니다. index.html 에 적힌 순서(01 → 12)대로 불러와야 합니다. */
/* ══════════ 책 정보 — 믿을 만한 것만 보여주기 (v34.2) ══════════
   색인의 제목·표지·저자·분류는 Apps Script 가 알라딘(·국중도)에서 찾아 붙입니다.
   짝을 얼마나 믿을 수 있는지가 n(신뢰도) 칸에 있습니다: 높음 · 중간 · 낮음 · 의심 · 실패.
   '낮음·의심' 은 엉뚱한 책이 붙은 경우가 많아, 폴더에 없는 책처럼 보였습니다.

     P.meta = 'sure'   (처음 값) 높음·중간만 알라딘 값. 나머지는 원제(파일명 제목), 표지·저자·출판사·출간일·분류 비움
              'aladin' 색인 그대로
              'file'   늘 원제(파일명 제목), 표지 없음

   ★ 찾는 데는 그대로 씁니다. 화면에서 내린 알라딘 제목도 검색어(HAY)에는 남습니다.
   ★ Apps Script v15 색인(BUILD_INDEX 교체본)은 이미 이 기준으로 정리돼 옵니다.
     그 경우 r='1' 이 '알라딘 결과를 안 쓴 책' 이고, h 가 검색용 알라딘 제목입니다.
   원래 값은 b._0 에 한 번만 담아 두고, 고를 때마다 거기서 다시 만듭니다. */
/* 책 속 진짜 표지 — COVERS[ID]=작은 JPEG(data:). 이 기기에만 (v36) */
var COVERS={};
const META_KEYS=['t','a','v','p','d','c','b','m','s'];
/* 사람이 '정보가 틀림' 으로 표시한 책 — WRONG[ID]={v:1|0,t:시각}. 기기끼리 맞춥니다 (v36) */
var WRONG={}; try{ WRONG=JSON.parse(localStorage.getItem('ebl_wrong')||'{}')||{}; }catch(e){ WRONG={}; }
const isWrong=id=>!!(WRONG&&WRONG[id]&&WRONG[id].v);
function metaTrust(b){
  if(b.r)return false;                         // v15 색인: 이미 정리된 책
  const n=String(b.n||'');
  // 신뢰도가 없거나 '실패' 면 알라딘 값이 아예 없는 책 — EPUB·파일명 정보라 그대로 둡니다
  return !n||n==='실패'||n==='높음'||n==='중간';
}
/* v54.3 — 파일 이름에서 온 제목을 보기 좋게: '[가와바타 야스나리] 설국 - 우리시대의 세계문학 065' → 제목 '설국' · 저자 '가와바타 야스나리'
   (Apps Script v18.19 parseName_ 와 같은 규칙. 화면에서만 — 찾기에는 원래 이름도 그대로 씁니다) */
const SERW=/(시리즈|세계문학|문학전집|전집|문고|총서|명시|클래식|클라우드|선집|컬렉션|에디션|라이브러리|민음사|문학동네|열린책들|을유|펭귄|창비|우리시대|살면서|꼭 읽어야|필독|베스트셀러|특별판|개정판|합본|세트|완역|원서|영한대역|오디오북|큰글자)/;
function authorLike(s){ s=String(s||'').trim(); if(!s||s.length>30||/[\d()（）:!?~]/.test(s)||SERW.test(s))return false;
  const tk=s.replace(/\s*(외|등|지음|저|역|옮김|글|그림|편저?|엮음|공저)\s*$/,'').split(/[\s,·]+/).filter(Boolean);
  if(!tk.length||tk.length>4)return false;
  if(tk.some(t=>t.length>=3&&/(에서|까지|으로|부터|에게|하는|하기|하라|한다|합니다|입니다|이다|위한|대한|처럼|보다|없이|있는|없는|라는|이라는|하다|되는|되다)$/.test(t)))return false;   // 부제
  if(/[가-힣]/.test(s))return tk.every(t=>t.length<=6); return /^[A-Za-z.\-' ]+$/.test(s); }
function seriesLike(s){ s=String(s||'').trim(); return /\d{2,}\s*$/.test(s)||/^\D{0,20}\s\d{2,}\b/.test(s)||SERW.test(s); }
function tidyName(b){
  const fromFile=b.o?b.t===b.o:!(b.n==='높음'||b.n==='중간');
  if(!fromFile||!b.t)return;
  let t=String(b.t).trim(), m;
  if((m=t.match(/^\[([^\]]{1,40})\]\s*(.+)$/))){ if(authorLike(m[1])&&!b.a)b.a=m[1].trim(); t=m[2].trim(); }
  const parts=t.split(/\s+[-–—]\s+/).map(x=>x.trim()).filter(Boolean);
  if(parts.length>=2){ const keep=parts.filter(x=>!(seriesLike(x)&&!authorLike(x)));
    if(keep.length){ if(keep.length>=2&&authorLike(keep[keep.length-1])&&!authorLike(keep[0])){ if(!b.a)b.a=keep[keep.length-1]; t=keep.slice(0,-1).join(' - '); }
      else if(keep.length>=2&&/\s/.test(keep[0])&&authorLike(keep[0])&&!authorLike(keep[keep.length-1])){ if(!b.a)b.a=keep[0]; t=keep.slice(1).join(' - '); }
      else t=keep.join(' - '); } }
  if((m=t.match(/^(.*\S)\s*-\s*([^-]+)$/))&&seriesLike(m[2])&&!authorLike(m[2]))t=m[1];
  if(t&&t!==b.t)b.t=t;
}
const EDRE=/^\s*\[(큰글자도서|큰글자책|큰글씨책|큰글자|eBook|ebook|전자책|POD|오디오북|특별판|한정판|리커버|개정판)\]\s*/;
/* v54.1 — 파일 이름(대개 맞음)과 짝지어진 책 제목이 딴판이면 그 짝은 믿지 않습니다.
   ① 서로 품지 않고 글자 짝(2글자씩)이 절반도 안 겹침  예) '20대에 하지 않으면 안될 50가지' ↔ '20대에 꼭 만나야 할 50인'
   ② 권 번호가 다름                                   예) '5분 뚝딱 철학 (생각의 역사)' ↔ '5분 뚝딱 철학 : 생각의 역사 2'
   (029·010 처럼 0 으로 시작하는 숫자는 시리즈 번호라 권 번호로 보지 않습니다) */
function coreT(s){ return String(s||'').normalize('NFC').replace(/\(.*?\)|\[.*?\]|【.*?】/g,' ').replace(/[^0-9A-Za-z가-힣]/g,'').toLowerCase(); }
function volOf(s){ const m=String(s||'').normalize('NFC').replace(/\(.*?\)|\[.*?\]|【.*?】/g,' ').replace(/\d+\s*[-~]\s*\d+\s*(화|권|부)?\s*(完|완결|완)?\s*$/,'').replace(/[\s._\-–:]+$/,'').match(/(?:^|[^\d])(\d{1,3})\s*(권|부|편|화)?\s*$/); return m&&(!/^0\d/.test(m[1])||m[2])?String(Number(m[1])):''; }
function dice(a,b){ const g=s=>{ const m=new Map(); for(let i=0;i<s.length-1;i++){ const k=s.slice(i,i+2); m.set(k,(m.get(k)||0)+1); } return m; };
  const A=g(a), B=g(b); let n=0, ta=0, tb=0; A.forEach(v=>ta+=v); B.forEach(v=>tb+=v); A.forEach((v,k)=>{ n+=Math.min(v,B.get(k)||0); }); return ta+tb?2*n/(ta+tb):0; }
function nameNums(t){ const o={}; t=String(t||'').normalize('NFC'); (t.match(/\d+/g)||[]).forEach(x=>o[String(Number(x))]=1);
  const R={I:1,II:2,III:3,IV:4,V:5,VI:6,VII:7,VIII:8,IX:9,X:10,'Ⅰ':1,'Ⅱ':2,'Ⅲ':3,'Ⅳ':4,'Ⅴ':5};
  (t.match(/(?:^|[\s(])(I{1,3}|IV|VI{0,3}|IX|X|[ⅠⅡⅢⅣⅤ])(?=$|[\s).,])/g)||[]).forEach(x=>{ const k=x.replace(/[\s(]/g,''); if(R[k])o[String(R[k])]=1; });
  return o; }
/* v55.2 — Apps Script v18.27 nameOff_ 와 같은 판정 */
const NAME_SEP=/\s+[-–—]\s*|\s*[-–—]\s+|\s*[:;]\s+|\s+[:;]\s*/;
const nameC=t=>coreT(t).replace(/0+(?=\d)/g,'');
function nameHit(x,y){ if(x===y)return true; if(y.includes(x))return x.length>=3;
  if(x.includes(y)){ if((y.length>=3&&x.endsWith(y))||y.length>=x.length*0.6)return true;
    return y.length>=3&&x.startsWith(y)&&/^[a-z0-9]+$/.test(x.slice(y.length)); }
  if(dice(x,y)>=(Math.min(x.length,y.length)<=4?0.67:0.5))return true; const a=x.replace(/\d/g,''), b=y.replace(/\d/g,'');   // v55.6 — 짧은 이름은 더 엄하게 ('단편1' ↔ '진단편')
  if(a.length>=4&&b.includes(a))return true;
  return a.length>=3&&b.length>=3&&dice(a,b)>=0.5; }
/* v55.6 — 스크립트 v19.11 과 같은 판정
   · 시리즈 꼬리말 ('23분만에 독파하는 고전 멘토링' 처럼 여러 책이 똑같이 단 부제) 은 빼고 견줌
   · '1984.0' (시트가 숫자로 바꾼 제목) 은 '.0' 을 떼고 · 영어 제목 파일 ↔ 한글 번역 제목은 견줄 수 없으니 딴 책으로 보지 않음 */
const NAME_TAG_SEED=['23분만에 독파하는 고전 멘토링'];
let NAME_TAGS=null;
function nameTags(){
  if(NAME_TAGS)return NAME_TAGS;
  const T={}; NAME_TAG_SEED.forEach(x=>T[nameC(x)]=1); const by={};
  BOOKS.forEach(b=>{ const t=(b._0&&b._0.t)||b.t; const ps=String(t||'').split(NAME_SEP).map(x=>nameC(x)).filter(Boolean); if(ps.length<2)return;
    for(let k=1;k<ps.length;k++){ if(ps[k].length<4)continue; (by[ps[k]]=by[ps[k]]||new Set()).add(ps[0].replace(/\d+/g,'')); } });
  Object.keys(by).forEach(k=>{ if(by[k].size>=3)T[k]=1; });
  return (NAME_TAGS=T);
}
function latinTitle(fn){ const t=String(fn||'').replace(/\.[A-Za-z0-9]{2,5}$/,''); if(/[가-힣]/.test(t))return false;
  const w=t.split(/[\s_\-.,]+/).filter(x=>/^[A-Za-z']{2,}$/.test(x)); return w.length>=2&&w.join('').length>=8; }
function nameOff(matched,file){
  const whole0=String(matched||'').replace(/^(\d+)\.0$/,'$1');
  if(latinTitle(file)&&/[가-힣]/.test(whole0))return false;
  const y=nameC(file); if(nameC(whole0).length<2||y.length<2)return false;
  const TAG=nameTags();
  let parts=whole0.split(NAME_SEP).map(x=>x.trim()).filter(Boolean);
  if(parts.length>1){ const keep=parts.filter(x=>!TAG[nameC(x)]); if(keep.length)parts=keep; }
  const whole=parts.join(' - ');
  const V={}; let subVol=false;
  parts.forEach((x,k)=>{ const v=volOf(x); if(!v)return; if(k===0)V[v]=1;
    else if(Number(v)<=12&&coreT(x).replace(/\d/g,'').length<=6){ V[v]=1; subVol=true; } });
  if(!subVol&&parts.slice(1).some(x=>nameC(x)===y))return false;
  const vs=Object.keys(V);
  if(vs.length&&!(vs.length===1&&vs[0]==='1'&&!volOf(file))){ const N=nameNums(file); if(!vs.some(v=>N[v]))return true; }
  return ![...parts.map(nameC),nameC(whole)].filter(x=>x.length>=2).some(x=>nameHit(x,y));
}
const SETRE=/^\s*\[세트\]|\[세트\]|세트\s*\]|\(전\s*\d+\s*권\)|전\s*\d+\s*권\s*(세트)?\s*$|\s세트\s*$/;
function metaApply(){
  if(!P.meta)P.meta='sure';
  NAME_TAGS=null;   // v55.6 — 새 목록이면 꼬리말을 다시 셈
  let hid=0;
  BOOKS.forEach(b=>{
    if(!b._0){ const o={}; META_KEYS.forEach(k=>{ if(b[k]!=null)o[k]=b[k]; }); b._0=o; }
    const o=b._0;
    META_KEYS.forEach(k=>{ if(k in o)b[k]=o[k]; else delete b[k]; });   // 원래대로 되돌린 뒤
    // v54 — 낱권 파일에 '[세트] ○○ + ○○' 처럼 묶음 상품이 짝지어진 경우: 믿지 않고 파일 이름 제목으로
    const nameBad=!!b.o&&nameOff(o.t,b.o), setBad=nameBad||(SETRE.test(o.t||'')&&!!b.o&&!SETRE.test(b.o)); b._sb=setBad?1:0;
    const ok=metaTrust(b)&&!isWrong(b.i)&&!setBad;
    // 딴 책이 붙었으면 분류도 그 책 것이라 함께 뺍니다 (세트는 같은 갈래라 분류는 남김)
    if(setBad&&P.meta!=='aladin'){ b.t=b.o; (nameBad?['a','v','p','d','c','b','m','s']:['a','v','p','d']).forEach(k=>delete b[k]); hid++; return; }
    // v54 — '[큰글자도서] ○○' 처럼 판(版) 머리표가 붙은 제목은 머리표만 떼어 보입니다 (파일은 보통 일반판)
    if(P.meta!=='aladin'&&b.t&&EDRE.test(b.t)&&!(b.o&&EDRE.test(b.o)))b.t=b.t.replace(EDRE,'').trim();
    if(isWrong(b.i)){ if(b.o)b.t=b.o; ['a','v','p','d','c','b','m','s'].forEach(k=>delete b[k]); hid++; return; }
    if(P.meta==='file'){
      if(b.o)b.t=b.o; delete b.v;
      if(!ok&&!b.r){ ['a','p','d','c','b','m','s'].forEach(k=>delete b[k]); hid++; }
    } else if(P.meta==='sure'&&!ok&&!b.r){
      if(b.o)b.t=b.o;
      ['a','v','p','d','c','b','m','s'].forEach(k=>delete b[k]);
      hid++;
    }
  });
  metaApply.hid=hid;
  if(P.meta!=='aladin')BOOKS.forEach(b=>{ try{ tidyName(b); }catch(e){} });
  // v55.1 — 찾은 제목에 권 번호가 없는데 파일은 '장미의 이름 2' 면 번호를 붙여 보입니다
  if(P.meta!=='aladin')BOOKS.forEach(b=>{ try{ if(b.o&&b.t&&b.t!==b.o&&!b._sb){ const v=volOf(b.o); if(v&&!volOf(b.t)&&!nameNums(b.t)[v])b.t=b.t+' '+v; } }catch(e){} });
  // 찾기는 보이는 것 + 원래 것 + 원제 + 검색용(h) 모두로
  HAY=BOOKS.map(b=>norm([b.t,b.o,b._0&&b._0.t,b.h,b.a,b._0&&b._0.a,b.p,b.c].filter(Boolean).join('|')));
  Object.keys(ORD).forEach(k=>delete ORD[k]);
  try{ IXT=null; }catch(e){}
}
function metaCount(){
  let ok=0,low=0,none=0,cleaned=0,y24=0;
  BOOKS.forEach(b=>{ const n=String(b.n||'');
    if(b.y)y24++;
    if(b.r)cleaned++; else if(!n||n==='실패')none++; else if(n==='높음'||n==='중간')ok++; else low++; });
  return {ok,low,none,cleaned,y24};
}

/* ── 읽은 기록 ──
   { 파일ID: { p:진도(0~1), t:마지막 읽은 시각, f:1이면 다 읽음 } }        */
let RD = JSON.parse(localStorage.getItem('ebl_read')||'{}');
/* PDF·TXT 는 손가락을 굴릴 때마다 진도가 바뀝니다.
   그때마다 통째로 저장하면 1초에 수십 번이 되므로 0.7초에 한 번만 씁니다. */
const saveRD = (()=>{
  let t=null;
  const flush=()=>{ t=null; try{ localStorage.setItem('ebl_read',JSON.stringify(RD)); }catch(e){} };
  const f=()=>{ if(!t) t=setTimeout(flush,700); };
  f.now=()=>{ if(t)clearTimeout(t); flush(); };
  return f;
})();
addEventListener('pagehide',()=>saveRD.now());
addEventListener('visibilitychange',()=>{ if(document.hidden){ saveRD.now(); syncSoon(); }
  else if(Date.now()-(typeof SYNCAT==='number'?SYNCAT:0)>60000){ try{ syncSoon(); }catch(e){} } });   // v55.5 — 다른 기기에서 읽고 돌아왔을 때
const DONE_AT = 0.985;                       // 이 이상 읽으면 '다 읽음'

function markRead(id,p,forceDone,forceReading){
  const r = RD[id] || (RD[id]={});
  const wasDone=!!r.f;
  if(p!=null && !isNaN(p)){ const np=Math.max(0,Math.min(1,p)); if(np!==r.p||forceDone||forceReading) r.pt=Date.now(); r.p=np; }
  r.t = Date.now();
  if(forceDone){ r.f=1; r.pt=Date.now(); delete r.s; delete r.sp; }
  if(forceReading){ r.f=0; r.pt=Date.now(); if(r.p>=DONE_AT) r.p=0.99; delete r.s; delete r.sp; }
  else if(r.s && (r.p||0) > (r.sp||0)+0.03){ delete r.s; delete r.sp; }   // v56 — 중단한 책을 3% 넘게 더 읽어 나가면 '읽는 중'으로 (열기만 해서는 그대로)
  else if((r.p||0) >= DONE_AT) r.f=1;
  saveRD();
  if(r.f&&!forceReading&&NEXTVOL){ try{ nextVolOffer(id); }catch(e){} }
  if(r.f&&!forceReading&&!wasDone&&curB&&curB.i===id){ try{ rvAsk(id); }catch(e){} }
}
const stOf = b => { const r=RD[b.i]; if(!r) return ''; return r.f ? 'done' : r.s ? 'stop' : 'reading'; };
/* v56 — 읽다가 그만둔 책. '읽는 중'에서 빠지고 '중단' 칸에 모입니다 */
function markStop(id){ const r=RD[id]||(RD[id]={}); r.s=1; r.sp=r.p||0; r.f=0; r.t=r.pt=Date.now(); saveRD(); syncSoon(); }
const pctOf = b => { const r=RD[b.i]; return r&&r.p ? r.p : 0; };

/* 예전 버전에서 남긴 '읽던 위치'를 읽은 기록으로 옮깁니다 */
(function migrate(){
  let n=0;
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(k && k.startsWith('ebl_pos_')){
      const id=k.slice(8);
      if(!RD[id]){ RD[id]={p:0.01,t:Date.now(),f:0}; n++; }
    }
  }
  if(n) saveRD();
})();

/* ── 분류 · 형식 ── */
const folderOf=b=>String(b.f||'').split('/')[1]||'';
// 형식을 세 갈래로 묶습니다: EPUB / PDF / 그 외(txt·mobi·cbz…)
const COMIC_EXT=['zip','cbz','cbr','rar','7z','cb7'];
function fmtKey(b){ const x=(b.x||'').toLowerCase();
  return x==='epub'?'epub' : x==='pdf'?'pdf' : COMIC_EXT.indexOf(x)>=0?'comic' : 'etc'; }
function chipSource(){
  // 현재 기준으로 [값 → 권수] 집계
  const c={};
  BOOKS.forEach(b=>{
    if(!P.fmt[fmtKey(b)]) return;          // 감춘 형식은 분류 집계에서도 제외
    let k='';
    if(P.cat==='f') k=folderOf(b);
    else if(P.cat==='tree') k = PATH.length===0? b.b : PATH.length===1? (b.b===PATH[0]?b.m:'') : (b.m===PATH[1]?b.s:'');
    else k=b[P.cat]||'';
    if(k) c[k]=(c[k]||0)+1;
  });
  return c;
}
function buildChips(){
  if(TAB==='folder'){ paintCrumbs(); return; }   // 폴더 탭에서는 이 줄이 '지금 있는 곳' 입니다
  const c=chipSource();
  const keys=Object.keys(c).sort((a,b)=>c[b]-c[a]).slice(0,40);
  const el=$('#chips'); el.innerHTML='';
  const add=(label,fn,cls)=>{ const b=document.createElement('button');
    b.className='chip'+(cls?' '+cls:''); b.textContent=label; b.onclick=fn; el.appendChild(b); };

  // 내 서가로 들어와 있으면 분류 칩 대신 '나가기' 하나만 둡니다
  if(PIN){ add('✕ '+PIN, ()=>{ PIN=''; buildChips(); render(true); }, 'on'); return; }

  if(P.cat==='tree'){
    if(PATH.length) add('‹ '+(PATH[PATH.length-1]), ()=>{PATH.pop();buildChips();render(true);},'up');
    else add('전체',()=>{PATH=[];buildChips();render(true);}, SEL?'':'on');
    keys.forEach(k=>add(k+' '+c[k],()=>{ if(PATH.length<2){PATH.push(k);buildChips();render(true);} },
      PATH[PATH.length-1]===k?'on':''));
  } else {
    add('전체',()=>{SEL='';buildChips();render(true);}, SEL?'':'on');
    keys.forEach(k=>add(k,()=>{SEL=(SEL===k?'':k);buildChips();render(true);}, SEL===k?'on':''));
  }
}
let SEL='';

/* ── 목록 ── */
function match(b){
  if(!P.fmt[fmtKey(b)]) return false;
  if(dupHide(b)&&TAB!=='saved') return false;                  // v54 — 같은 책은 한 장만
  if(TAB==='recent'  && !RD[b.i])            return false;   // 한 번이라도 연 책
  if(TAB==='reading' && stOf(b)!=='reading') return false;
  if(TAB==='done'    && stOf(b)!=='done')    return false;
  if(TAB==='stop'    && stOf(b)!=='stop')    return false;
  if(TAB==='saved'   && !saved.has(b.i))     return false;
  if(TAB==='new'     && !b.g)                return false;   // 담긴 날이 있는 것만
  // 내 서가 — 대·중·소 어느 칸에 있든 이름이 같으면 걸립니다
  if(PIN && b.b!==PIN && b.m!==PIN && b.s!==PIN) return false;
  if(PIN) return true;
  if(P.cat==='tree'){
    if(PATH[0]&&b.b!==PATH[0])return false;
    if(PATH[1]&&b.m!==PATH[1])return false;
    return true;
  }
  if(!SEL)return true;
  return (P.cat==='f'? folderOf(b) : (b[P.cat]||'')) === SEL;
}
function filter0(){
  try{ markDups(); }catch(e){}
  const k=norm($('#q').value), out=[];
  // 최근·읽는 중·다 읽음 칸은 최근 읽은 순, 새로 담긴 책은 담긴 순
  const s = TAB==='new' ? 'g'
          : (TAB==='recent'||TAB==='reading'||TAB==='done'||TAB==='stop') ? 'r' : P.sort;
  // '최근 읽은 순'은 읽을 때마다 바뀌므로 미리 만들어 둘 수 없습니다.
  // 대신 대상이 몇십 권뿐이라 그때그때 줄 세워도 빠릅니다.
  if(s==='r'){
    for(let i=0;i<BOOKS.length;i++){ const b=BOOKS[i];
      if(!match(b))continue;
      if(k&&HAY[i].indexOf(k)<0)continue;
      out.push(b); }
    out.sort((x,y)=>((RD[y.i]&&RD[y.i].t)||0)-((RD[x.i]&&RD[x.i].t)||0));
    return out;
  }
  const ord=order(s);
  for(let j=0;j<ord.length;j++){ const i=ord[j], b=BOOKS[i];
    if(!match(b))continue;
    if(k&&HAY[i].indexOf(k)<0)continue;
    out.push(b); }
  return out;
}
/* 거꾸로 — 어느 정렬이든 뒤집습니다 (v33) */
function filter(){ const o=filter0(); return P.rev?o.reverse():o; }
function render(reset){
  if(HSIDE!=='me'){ setView(); buildFam(); return; }
  if(TAB==='home'){ setView(); buildHome(); return; }
  if(TAB==='folder'){ setView(); expRender(); return; }
  setView();
  const g=$('#grid');
  g.className=P.mode;
  if(reset){ rows=filter(); shown=0; g.innerHTML=''; g.scrollTop=0; }
  const TN={ '':'전체', recent:'최근 본 책', reading:'읽는 중', done:'다 읽은 책',
             saved:'받아둔 책', new:'새로 담긴 책' };
  stat((PIN?PIN+'  ·  ':(TAB?TN[TAB]+'  ·  ':''))
    +`${rows.length.toLocaleString()}권`
    +(TAB||PIN?'':` / ${(BOOKS.length-(P.merge!==0?DUPN:0)).toLocaleString()}권`)
    +(UPDATED?`  ·  갱신 ${UPDATED}`:'')+`  ·  ${BUILD}`);
  const o=$('#more'); if(o)o.remove();
  const f=document.createDocumentFragment();
  const end=Math.min(shown+PAGE,rows.length);
  for(let i=shown;i<end;i++)f.appendChild(card(rows[i]));
  shown=end; g.appendChild(f);
  if(shown<rows.length){ const m=document.createElement('div'); m.id='more';
    m.textContent=`더 보기 (${(rows.length-shown).toLocaleString()}권 남음)`;
    m.onclick=()=>render(false); g.appendChild(m); }
}
/* 표지 없는 책에 씌울 종이 — 눈에 편한 열 가지 색 */
const PAL=[['#3c5c8e','#223651'],['#6b4a7c','#3d2a48'],['#2f6b5f','#1c423a'],
           ['#8a5b3d','#4d3324'],['#4a5c8a','#2a3450'],['#7c4a54','#452a30'],
           ['#3d6b8c','#233f53'],['#5c6b3a','#333f22'],['#6a4a8c','#3c2a50'],
           ['#8a6a3b','#4e3d23']];
function phHtml(b){
  const k=(b.t||'')+'|'+(b.a||'');
  let h=2166136261;
  for(let i=0;i<k.length;i++){ h^=k.charCodeAt(i); h=Math.imul(h,16777619)>>>0; }
  h=(h^(h>>>15))>>>0;      // 이 한 줄이 없으면 열 색 중 다섯 가지만 쓰입니다
  const c=PAL[h%PAL.length];
  return `<div class="ph" style="background:linear-gradient(155deg,${c[0]},${c[1]})">`
    +`<b>${esc(b.t||'제목 없음')}</b>`
    +(b.a?`<i>${esc(b.a)}</i>`:'')+`</div>`;
}
function card(b){
  const d=document.createElement('div'); d.className='card';
  const w=document.createElement('div'); w.className='cvw';
  const cvu=(COVERS&&COVERS[b.i])||b.v;            // v36 — 책 속 진짜 표지를 먼저
  if(cvu){ const im=document.createElement('img'); im.loading='lazy'; im.decoding='async'; im.src=cvu;
    im.onerror=()=>{im.remove(); w.insertAdjacentHTML('afterbegin',phHtml(b));};
    w.appendChild(im); }
  else w.innerHTML=phHtml(b);
  if(saved.has(b.i))w.insertAdjacentHTML('beforeend','<div class="tag dl">저장됨</div>');
  const x=(b.x||'').toUpperCase();
  const alt=(P.merge!==0&&b._alt&&b._alt.length)?[...new Set([b,...b._alt].map(y=>(y.x||'?').toUpperCase()))]:null;
  if(alt)w.insertAdjacentHTML('beforeend',`<div class="tag fm alt" title="같은 책 ${b._alt.length+1}개 — 길게 눌러 고르기">${alt.length>1?alt.join('·'):(b._alt.length+1)+'개'}</div>`);
  else if(x&&x!=='EPUB')w.insertAdjacentHTML('beforeend',`<div class="tag fm">${x}</div>`);
  const st=stOf(b), pc=pctOf(b);
  if(st==='done'){ w.classList.add('fin');
    w.insertAdjacentHTML('beforeend','<div class="tag done">다 읽음</div>'); }
  else if(st==='stop') w.insertAdjacentHTML('beforeend','<div class="tag stop">중단</div>');
  else if(st==='reading'&&pc>0)
    w.insertAdjacentHTML('beforeend',`<div class="pbar"><i style="width:${Math.round(pc*100)}%"></i></div>`);
  const t=document.createElement('div'); t.className='ti'; t.textContent=b.t||'';
  const a=document.createElement('div'); a.className='au'; a.textContent=b.a||'';
  if(P.mode==='l'){
    const m=document.createElement('div'); m.className='meta';
    const s=document.createElement('div'); s.className='sub';
    const mark = st==='done' ? '다 읽음' : st==='stop' ? '중단 '+Math.round(pc*100)+'%' : (st==='reading'&&pc>0 ? Math.round(pc*100)+'%' : '');
    s.textContent=[mark,b.p,String(b.d||'').slice(0,4),b.s||b.m||b.b,x].filter(Boolean).join(' · ');
    m.append(t,a,s); d.append(w,m);
  } else d.append(w,t,a);
  d.addEventListener('click',()=>{ if(d._hold){ d._hold=false; return; } openBook(b); });
  hold(d,b);
  return d;
}

/* 길게 누르기 — 0.5초.
   손가락이 10px 넘게 움직이면 넘기기로 보고 취소합니다. */
function hold(el,b){
  let t=null;
  const stop=()=>{ if(t)clearTimeout(t); t=null; el.classList.remove('held'); };
  el.addEventListener('pointerdown',e=>{
    if(e.button&&e.button!==0) return;
    el._hold=false; const sx=e.clientX, sy=e.clientY;
    el._mv=ev=>{ if(Math.abs(ev.clientX-sx)>10||Math.abs(ev.clientY-sy)>10) stop(); };
    el.addEventListener('pointermove',el._mv);
    stop();
    t=setTimeout(()=>{ el._hold=true; el.classList.add('held');
      setTimeout(()=>el.classList.remove('held'),160); openPanBook(b); },500);
  });
  ['pointerup','pointercancel','pointerleave'].forEach(k=>el.addEventListener(k,()=>{
    stop(); if(el._mv){ el.removeEventListener('pointermove',el._mv); el._mv=null; } }));
  el.addEventListener('contextmenu',e=>{ e.preventDefault(); stop(); el._hold=true; openPanBook(b); });
}

/* ── 열기 ── */
let abort=null;
function busy(on,t,s,p){ $('#busy').style.display=on?'flex':'none';
  if(t!=null)$('#busyT').textContent=t; if(s!=null)$('#busyS').textContent=s;
  $('#busyB').style.width=((p||0)*100)+'%'; }
$('#busyX').onclick=()=>{ if(abort)abort.abort(); busy(false); };

const TXT_EXT=['txt','text','md','markdown','log','csv'];
function kindOf(b){
  const x=(b.x||'').toLowerCase();
  if(x==='epub')return 'epub';
  if(x==='pdf') return 'pdf';
  if(TXT_EXT.indexOf(x)>=0) return 'txt';
  if(x==='cbz'||x==='zip'||x==='cbr'||x==='rar'||x==='7z'||x==='cb7') return 'comic';   // v35 — 만화·스캔본 (안에 TXT·EPUB 가 든 ZIP 도 여기서 갈라집니다)
  return '';
}
async function openBook(b){
  const k=kindOf(b);
  if(!k){ if(b.u)window.open(b.u,'_blank');
          else toast(b.x?`${String(b.x).toUpperCase()} 파일은 아직 앱에서 열 수 없습니다`:'링크가 없습니다');
          return; }
  if(k==='comic'){   // 통째로 받지 않습니다 — 보는 장만
    try{ await showComic(b); }
    catch(e){ busy(false); log('만화 열기 실패: '+(e.message||e)); toast('열지 못했습니다\n'+(e.message||e),6000); }
    return; }
  try{ busy(true,'책을 준비하는 중…','',0);
    const buf=await getBook(b);
    busy(true,'화면을 구성하는 중…','',1);
    if(k==='epub')      await showReader(b,buf);
    else if(k==='pdf')  await showPdf(b,buf);
    else                await showTxt(b,buf);
    busy(false);
  }catch(e){ busy(false); log('열기 실패: '+(e.message||e));
    toast('열지 못했습니다\n'+(e.message||e),6000); }
}
/* ══════════ 책이 사는 곳 ══════════
   지금은 구글 드라이브 하나뿐입니다. 나중에 NAS(WebDAV) 를 붙일 자리입니다.
   책에 src 가 없으면 드라이브로 봅니다 — 그래야 지금까지의 읽은 곳·형광펜이 그대로 이어집니다.
   다른 곳의 책은 이름표를 'dav:/폴더/책.epub' 처럼 붙여 드라이브 ID 와 겹치지 않게 합니다.
   open(b, 끊는신호) 은 fetch 응답(Response)을 돌려주기만 하면 됩니다. 받는 과정 표시는 getBook 이 합니다. */
const SRC={
  drive:{ name:'구글 드라이브',
    async open(b,sig){
      busy(true,'구글 로그인 확인 중…','',0);
      const at=await needToken(false).catch(()=>needToken(true));
      busy(true,'책을 받는 중…',b.z?b.z+'MB':'',0);
      const url=`https://www.googleapis.com/drive/v3/files/${b.i}?alt=media&supportsAllDrives=true`;
      const res=await fetch(url,{headers:{Authorization:'Bearer '+at},signal:sig});
      if(res.status===401||res.status===403){ TOKEN=''; AUTH.drop();
        markLogin(false); setTimeout(()=>showBlocked('drive'),400);
        throw new Error('아직 이 책을 볼 권한이 없습니다'); }
      if(!res.ok)throw new Error('드라이브 응답 '+res.status);
      return res; } }
  /* dav:{ name:'NAS', async open(b,sig){ ... WebDAV 주소 + b.p 로 받기 ... } }   ← 나중에 */
};
/* v54.4 — 사는 곳은 b.src 로 봅니다. 예전엔 b.s 였는데 s 는 색인의 '소분류' 칸이라,
   소분류가 붙은 책(예: 심리/정신분석)을 '모르는 곳'으로 알고 못 열었습니다 */
const srcOf=b=>SRC[(b&&b.src)||'drive'];
async function getBook(b){
  const hit=await DB.get('books',b.i); if(hit){ sizeTouch(b.i); return hit; }
  const src=srcOf(b);
  if(!src)throw new Error('이 책이 있는 곳('+b.src+')은 아직 열 수 없습니다');
  abort=new AbortController();
  const res=await src.open(b,abort.signal);
  const total=Number(res.headers.get('content-length')||0)||(b.z?b.z*1048576:0);
  let buf;
  if(res.body&&res.body.getReader){
    const rd=res.body.getReader(),parts=[]; let got=0;
    for(;;){ const{done,value}=await rd.read(); if(done)break; parts.push(value); got+=value.length;
      busy(true,null,(got/1048576).toFixed(1)+'MB'+(total?' / '+(total/1048576).toFixed(1)+'MB':''),
        total?got/total:0); }
    buf=await new Blob(parts).arrayBuffer();
  } else buf=await res.arrayBuffer();
  /* 기기에 담아두는 일은 읽기와 상관없습니다.
     기다리지 않고 뒤에서 처리해, 저장이 실패해도 책은 열립니다. */
  DB.put('books',b.i,buf).then(()=>{ saved.add(b.i); sizeTouch(b.i,buf.byteLength||buf.length||0); setTimeout(()=>capClean(b.i),500); })
    .catch(e=>{ log('받아두기 실패: '+(e.message||e));
      toast('책은 열지만 기기에 담아두지는 못했습니다\n'+(e.message||e),5000); });
  return buf;
}

