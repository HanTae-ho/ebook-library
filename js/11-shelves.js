/* 우리 도서관 — js/11-shelves.js
   달력 · 조건 서가 · 보기 설정·목차 · 폴더 탐색기 · 책갈피 · 오늘의 밑줄
   ※ 모든 파일이 같은 전역을 나눠 씁니다. index.html 에 적힌 순서(01 → 12)대로 불러와야 합니다. */
/* ══════════ v33 — 읽은 시간 · 독서 달력 ══════════
   DAYS['2026-11-06'] = { '책ID|기기': 초 }
   기기마다 따로 세어 두고, 볼 때 더합니다. 그래야 기기끼리 맞출 때 겹쳐 세지 않습니다.
   각자 자기 드라이브 숨은 칸에만 갑니다 — 식구 것은 안 보입니다. */
var DAYS={}; try{ DAYS=JSON.parse(localStorage.getItem('ebl_days')||'{}')||{}; }catch(e){ DAYS={}; }   // var: 시작 순서와 상관없이 쓰이도록
const DEV=(()=>{ let d=localStorage.getItem('ebl_dev');
  if(!d){ d=Math.random().toString(36).slice(2,8); try{ localStorage.setItem('ebl_dev',d); }catch(e){} } return d; })();
const saveDAYS=(()=>{ let t=null;
  const flush=()=>{ t=null;
    const keys=Object.keys(DAYS).sort(); while(keys.length>800)delete DAYS[keys.shift()];   // 2년 남짓만
    try{ localStorage.setItem('ebl_days',JSON.stringify(DAYS)); }catch(e){} };
  const f=()=>{ if(!t)t=setTimeout(flush,5000); }; f.now=()=>{ if(t)clearTimeout(t); flush(); };
  return f; })();
addEventListener('pagehide',()=>saveDAYS.now());
const dkey=t=>{ const d=new Date(t||Date.now());
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
let ACT=0;
['pointerdown','keydown','wheel','touchstart'].forEach(k=>addEventListener(k,()=>{ ACT=Date.now(); },{passive:true,capture:true}));
const TICK=15, IDLE=5*60*1000;
setInterval(()=>{
  if(!curB||!readerOn()||document.hidden||noMark)return;
  const r=RD[curB.i], last=Math.max(ACT,(r&&r.t)||0);     // 쪽을 넘기거나 굴리면 RD 시각이 바뀝니다
  if(Date.now()-last>IDLE)return;                          // 자리를 뜬 것으로 봅니다
  const m=DAYS[dkey()]||(DAYS[dkey()]={}), k=curB.i+'|'+DEV;
  m[k]=(m[k]||0)+TICK; saveDAYS();
},TICK*1000);
/* 그날 책마다 몇 초 */
function dayBooks(d){ const o={};
  Object.entries(DAYS[d]||{}).forEach(([k,v])=>{ const id=k.split('|')[0]; o[id]=(o[id]||0)+v; });
  return o; }
const fmtDur=sec=>{ const m=Math.round(sec/60); if(m<1)return '1분 안';
  return m<60?m+'분':Math.floor(m/60)+'시간'+(m%60?' '+(m%60)+'분':''); };
let CALY=0, CALM=0, CALSEL='';
function paintCal(){
  $('#calT').textContent=`${CALY}년 ${CALM+1}월`;
  const g=$('#calGrid'); g.innerHTML='';
  ['일','월','화','수','목','금','토'].forEach(x=>g.insertAdjacentHTML('beforeend',`<div class="wd">${x}</div>`));
  const first=new Date(CALY,CALM,1).getDay(), days=new Date(CALY,CALM+1,0).getDate();
  const today=dkey(), map=byId();
  let tot=0, nd=0; const books=new Set();
  for(let i=0;i<first;i++)g.insertAdjacentHTML('beforeend','<div class="dc x"></div>');
  for(let d=1;d<=days;d++){
    const key=`${CALY}-${String(CALM+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const bk=dayBooks(key), ids=Object.keys(bk).sort((x,y)=>bk[y]-bk[x]);
    const sec=ids.reduce((a,i)=>a+bk[i],0);
    const c=document.createElement('button'); c.className='dc'+(key===today?' today':'')+(key===CALSEL?' sel':'');
    if(sec>=60){ tot+=sec; nd++; ids.forEach(i=>books.add(i));
      const b=map.get(ids[0]);
      c.innerHTML=(b&&b.v?`<img loading="lazy" src="${esc(b.v)}" onerror="this.remove()">`:'<div class="ph2"></div>')
        +`<b>${d}</b><i>${esc(fmtDur(sec))}</i>`;
      c.onclick=()=>{ CALSEL=key; paintCal(); };
    } else c.innerHTML=`<b style="color:var(--dim)">${d}</b>`;
    g.appendChild(c);
  }
  const mm=`${CALY}-${String(CALM+1).padStart(2,'0')}`;
  let done=0; Object.values(RD).forEach(r=>{ if(r&&r.f&&r.t&&dkey(r.t).startsWith(mm))done++; });
  $('#calSum').textContent = nd
    ? `${nd}일 · ${fmtDur(tot)} · 책 ${books.size}권`+(done?` · 다 읽은 책 ${done}권`:'')
    : '이달에는 아직 기록이 없습니다.'+(done?` 다 읽은 책 ${done}권`:'');
  // 고른 날
  const el=$('#calDay'); el.innerHTML='';
  if(CALSEL&&CALSEL.startsWith(mm)){
    const bk=dayBooks(CALSEL), ids=Object.keys(bk).filter(i=>bk[i]>=60).sort((x,y)=>bk[y]-bk[x]);
    const [y,m,d]=CALSEL.split('-').map(Number);
    el.insertAdjacentHTML('beforeend',`<div class="dh">${m}월 ${d}일 (${'일월화수목금토'[new Date(y,m-1,d).getDay()]})</div>`);
    ids.forEach(i=>{ const b=map.get(i);
      const x=document.createElement('button');
      x.innerHTML=`<span>${esc((b&&b.t)||'(목록에 없는 책)')}</span><span>${esc(fmtDur(bk[i]))}</span>`;
      x.onclick=()=>{ if(!b){ toast('지금 목록에 없는 책입니다'); return; }
        $('#calSheet').classList.remove('on'); openBook(b); };
      el.appendChild(x); });
  }
}
function openCal(){ const d=new Date(); CALY=d.getFullYear(); CALM=d.getMonth(); CALSEL=dkey();
  saveDAYS.now(); paintCal(); $('#calSheet').classList.add('on'); }
function paintLkCal(){
  const el=$('#lkCalN'); if(!el||!DAYS)return;
  const mm=dkey().slice(0,7); let tot=0, nd=0;
  Object.keys(DAYS).forEach(d=>{ if(!d.startsWith(mm))return;
    const s=Object.values(DAYS[d]).reduce((a,v)=>a+v,0); if(s>=60){ tot+=s; nd++; } });
  el.textContent = nd?`이달 ${nd}일 · ${fmtDur(tot)} ›`:'›';
}
$('#lkCal').onclick=openCal;
$('#calClose').onclick=()=>$('#calSheet').classList.remove('on');
$('#calSheet').addEventListener('click',e=>{ if(e.target.id==='calSheet')$('#calSheet').classList.remove('on'); });
$('#calPrev').onclick=()=>{ if(--CALM<0){ CALM=11; CALY--; } paintCal(); };
$('#calNext').onclick=()=>{ if(++CALM>11){ CALM=0; CALY++; } paintCal(); };

/* ══════════ v33 — 조건 서가 (스마트 서가) ══════════
   지금 보고 있는 목록의 조건을 통째로 저장해 둡니다.
     q 검색어 · tab 상태 칸 · pin/sel/path/cat 분류 · sort/rev 정렬
   홈의 '내 서가' 줄에 ⚡ 로 뜨고, 누르면 그 조건 그대로 목록이 열립니다.
   기기끼리 맞춥니다. 8개까지. */
if(!Array.isArray(P.smart))P.smart=[];
var SORTN={t:'제목',a:'저자',d:'출간일',r:'최근 읽음',z:'크기',g:'담긴 날짜'};
var TABN={'':'전체',recent:'최근 본 책',reading:'읽는 중',done:'다 읽음',saved:'받아둔 책',new:'새로 담긴 책'};
function smartSum(o){
  return [o.q?`"${o.q}"`:'', TABN[o.tab]||'', o.pin||o.sel||(o.path||[]).join(' › '),
          (SORTN[o.sort]||'')+(o.rev?' 거꾸로':'')].filter(Boolean).join(' · ');
}
const stampSmart=()=>{ savePref(); try{ localStorage.setItem('ebl_smartat',String(Date.now())); }catch(e){} syncSoon(); };
$('#smartSave').onclick=async()=>{
  if(TAB==='home'||TAB==='folder'){ toast('전체·읽는 중 같은 목록 칸에서 저장할 수 있습니다'); return; }
  const o={ q:$('#q').value.trim(), tab:TAB, pin:PIN, sel:SEL, path:PATH.slice(), cat:P.cat,
            sort:P.sort, rev:P.rev?1:0 };
  if(!o.q&&!o.tab&&!o.pin&&!o.sel&&!o.path.length){ toast('검색어를 넣거나 분류·상태를 먼저 골라 주세요'); return; }
  if(P.smart.length>=8){ toast('조건 서가는 8개까지입니다.\n홈 → 내 서가 [고치기] 에서 지우고 다시 해 주세요',4000); return; }
  panOff();
  const nm=await ask('조건 서가 이름',smartSum(o),o.q||o.pin||o.sel||TABN[o.tab]||'');
  if(nm==null||!nm.trim())return;
  o.i=Date.now().toString(36); o.n=nm.trim().slice(0,20);
  P.smart.push(o); stampSmart(); toast(`'${o.n}' 을 홈의 내 서가에 담았습니다`);
};
function openSmart(o){
  $('#q').value=o.q||''; backTab=null;
  if(o.cat)P.cat=o.cat; if(o.sort)P.sort=o.sort; P.rev=o.rev?1:0; savePref();
  TAB=o.tab||''; try{ localStorage.setItem('ebl_tab',TAB); }catch(e){}
  PIN=o.pin||''; SEL=o.sel||''; PATH=(o.path||[]).slice();
  paintTabs(); buildChips(); render(true);
}
/* 서가에 맞는 권수 — 잠깐 그 조건으로 바꿔 세고 되돌립니다 */
function smartCount(o){
  const keep={q:$('#q').value,TAB,PIN,SEL,PATH,cat:P.cat,sort:P.sort,rev:P.rev};
  $('#q').value=o.q||''; TAB=o.tab||''; PIN=o.pin||''; SEL=o.sel||''; PATH=o.path||[]; P.cat=o.cat||P.cat;
  let n=0; try{ n=filter0().length; }catch(e){}
  $('#q').value=keep.q; TAB=keep.TAB; PIN=keep.PIN; SEL=keep.SEL; PATH=keep.PATH; P.cat=keep.cat;
  return n;
}
function paintSmartHome(){
  const pe=$('#hPin'); if(!pe)return;
  const add=pe.querySelector('.chip.add');
  (P.smart||[]).forEach(o=>{ const b=document.createElement('button');
    b.className='chip mine'; b.textContent='⚡ '+o.n+' '+smartCount(o).toLocaleString();
    b.title=smartSum(o); b.onclick=()=>openSmart(o);
    pe.insertBefore(b,add); });
  if(add&&P.smart.length&&!P.pins.length)add.textContent='＋';
}
function paintSmartMgr(){
  const el=$('#smartList'); el.innerHTML='';
  $('#smartWrap').style.display=P.smart.length?'':'none';
  P.smart.forEach((o,k)=>{ const b=document.createElement('button');
    b.innerHTML=`<span>⚡ ${esc(o.n)}<span class="sm">${esc(smartSum(o))}</span></span><span class="del">지우기</span>`;
    b.onclick=()=>{ if(!confirm(`'${o.n}' 조건 서가를 지웁니다.`))return;
      P.smart.splice(k,1); stampSmart(); paintSmartMgr(); };
    el.appendChild(b); });
}
{ const op=$('#hPinEdit').onclick; $('#hPinEdit').onclick=()=>{ op(); paintSmartMgr(); }; }
seg('#segRev','rev',()=>render(true));
{ const ov=$('#btnView').onclick; $('#btnView').onclick=()=>{ ov(); segSet('#segRev',P.rev||0); segSet('#segMerge',P.merge===0?0:1); }; }
seg('#segMerge','merge',()=>{ try{ paintTabs(); render(true); if($('#home').style.display!=='none')buildHome(); }catch(e){} });

/* ══════════ v32 — 보기 설정 더하기 · 목차 ══════════ */
seg('#segFw','fw',applyRead);
seg('#segFoot','nofoot',applyRead);
seg('#segClean','tclean',()=>{
  if(KIND!=='txt')return;
  const h=$('#txt'), m0=h.scrollHeight-h.clientHeight, p=m0>0?h.scrollTop/m0:0;
  paintTxtHl(); TOCS=null;
  const m1=h.scrollHeight-h.clientHeight; h.scrollTop=p*m1;
  toast(P.tclean?'끊긴 줄을 이어서 보여 드립니다\n(원본 파일은 그대로입니다)':'원문 그대로 보여 드립니다');
});

/* ── 목차 ──
   TOCS = [{t:제목, d:깊이, go:어디로, at:진도(0~1, 아는 경우)}]
     EPUB  책에 든 목차.  go = href
     PDF   PDF 책갈피(개요). go = 쪽
     TXT   '제1장 · 1화 · 프롤로그 · Chapter 1 · [3화]' 같은 짧은 줄. go = 글자 위치 */
let TOCS=null;
const TOC_RE=new RegExp('^[ \\t\\u3000]*(?:'
  +'(?:제\\s*)?[0-9０-９一二三四五六七八九十百]+\\s*(?:장|화|부|권|편|절|막|話|章)(?:\\s|$|[.:)\\]-])'
  +'|(?:chapter|part|episode|ep\\.?)\\s*[0-9ivx]+'
  +'|(?:프롤로그|에필로그|외전|후기|작가의\\s*말|작가\\s*후기|서문|서장|종장|prologue|epilogue)'
  +'|#{1,3}\\s+\\S'
  +'|[<\\[【〈《][^\\]>】〉》\\n]{0,20}(?:[0-9]|화|장|외전|프롤로그|에필로그)[^\\]>】〉》\\n]{0,20}[>\\]】〉》]\\s*$'
  +'|[-=]{1,5}\\s*[0-9]+\\s*[-=]{1,5}\\s*$'
  +')','i');
/* v56 — 목차 손보기 (TXT)
   TCE[책ID] = {at:고친 때, a:[넣은 줄의 시작 글자 위치], r:[뺀 줄의 시작 글자 위치]}
   TXTRAW 의 글자 위치는 줄 잇기·쓰레기 문구 지우기를 해도 변하지 않으므로 그대로 이름표로 씁니다.
   기기끼리 맞춥니다 (책마다 나중에 고친 쪽). */
let TCE={}; try{ TCE=JSON.parse(localStorage.getItem('ebl_tce')||'{}')||{}; }catch(e){ TCE={}; }
const saveTCE=()=>{ try{ localStorage.setItem('ebl_tce',JSON.stringify(TCE)); }catch(e){} };
let TOCED=false;      // 목차 창이 손보기 모드인가
function txtLineAt(ls){ const T=TXTRAW; let e=T.indexOf('\n',ls); if(e<0)e=T.length;
  return T.slice(ls,e).replace(/[\r\u200B]/g,'').trim(); }
function txtToc(withGone){
  const T=TXTRAW, out=[]; let off=0;
  const ed=(curB&&TCE[curB.i])||null, rm=new Set((ed&&ed.r)||[]), ad=new Set((ed&&ed.a)||[]);
  const lines=T.split('\n');
  for(const ln of lines){
    const t=ln.replace(/[\r\u200B]/g,'').trim();
    if(t&&t.length<=50&&TOC_RE.test(t)&&!ad.has(off)){
      const x={t, d:0, ls:off, go:off+ln.indexOf(t.charAt(0)), at:T.length?off/T.length:0};
      if(rm.has(off)){ if(withGone){ x.gone=1; out.push(x); } }
      else out.push(x);
      if(out.length>=3000)break;
    }
    off+=ln.length+1;
  }
  ad.forEach(ls=>{ if(ls<0||ls>=T.length)return; const t=txtLineAt(ls); if(!t)return;
    const raw=T.slice(ls,ls+200), k=raw.indexOf(t.charAt(0));
    const x={t:t.length>50?t.slice(0,50)+'…':t, d:0, ls, go:ls+(k<0?0:k), at:T.length?ls/T.length:0, man:1};
    if(rm.has(ls)){ if(withGone){ x.gone=1; out.push(x); } } else out.push(x); });
  out.sort((a,b)=>a.ls-b.ls);
  return out;
}
function tceSet(fn){
  if(!curB)return; const id=curB.i, e=TCE[id]||{a:[],r:[]};
  fn(e); e.a=[...new Set(e.a)]; e.r=[...new Set(e.r)]; e.at=Date.now();
  if(!e.a.length&&!e.r.length){ TCE[id]={a:[],r:[],at:e.at}; } else TCE[id]=e;
  saveTCE(); TOCS=null; syncSoon(); paintToc();
}
/* 지금 화면 맨 위(위 막대 바로 아래)에 보이는 줄의 시작 글자 위치.
   글자 마디를 차례로 재어, 아랫변이 그 높이를 처음 넘는 글자를 찾습니다 (화면 위에 덮인 창에 휘둘리지 않게 좌표로 찍지 않음). */
function txtTopLine(){
  const host=$('#txt'), body=$('#txt .body'); if(!host||!body)return -1;
  const hb=host.getBoundingClientRect(), bar=$('#rbar'), br=bar?bar.getBoundingClientRect():null;
  let y0=hb.top+4;
  if(br&&br.height&&getComputedStyle(bar).display!=='none'&&br.bottom>hb.top) y0=Math.max(y0,br.bottom+2);
  const rg=document.createRange(), w=document.createTreeWalker(body,NodeFilter.SHOW_TEXT);
  const bot=(c,i,j)=>{ rg.setStart(c,i); rg.setEnd(c,j); const r=rg.getBoundingClientRect(); return r.height?r.bottom:-1e9; };
  let n=0, c, off=-1;
  while(c=w.nextNode()){
    const L=c.nodeValue.length; if(!L)continue;
    if(bot(c,0,L)<y0){ n+=L; continue; }
    let lo=0, hi=L-1;                       // 아랫변이 y0 이상인 첫 글자
    while(lo<hi){ const m=(lo+hi)>>1; if(bot(c,m,m+1)>=y0) hi=m; else lo=m+1; }
    off=n+lo; break;
  }
  if(off<0){ const m=host.scrollHeight-host.clientHeight; off=Math.floor((m>0?host.scrollTop/m:0)*TXTRAW.length); }
  const T=TXTRAW; let ls=T.lastIndexOf('\n',Math.max(0,off-1))+1;
  // 빈 줄이면 아래로 내려가 첫 글줄
  for(let k=0;k<30&&ls<T.length&&!txtLineAt(ls);k++){ const e=T.indexOf('\n',ls); if(e<0)break; ls=e+1; }
  return ls;
}
async function epubToc(){
  try{
    const nav=await book.loaded.navigation;
    const out=[];
    const walk=(arr,d)=>(arr||[]).forEach(it=>{
      out.push({t:String(it.label||'').trim()||'(제목 없음)', d:Math.min(d,2), go:it.href});
      if(it.subitems&&it.subitems.length)walk(it.subitems,d+1); });
    walk(nav&&nav.toc,0);
    return out;
  }catch(e){ return []; }
}
async function pdfToc(){
  try{
    const ol=await pdfDoc.getOutline(); if(!ol)return [];
    const out=[];
    const walk=async(arr,d)=>{ for(const it of arr||[]){
      let p=0;
      try{ let dest=it.dest; if(typeof dest==='string')dest=await pdfDoc.getDestination(dest);
           if(dest&&dest[0])p=(await pdfDoc.getPageIndex(dest[0]))+1; }catch(e){}
      out.push({t:String(it.title||'').trim()||'(제목 없음)', d:Math.min(d,2), go:p,
                at:p&&pdfDoc.numPages?p/pdfDoc.numPages:null});
      if(it.items&&it.items.length)await walk(it.items,d+1);
      if(out.length>=3000)return; } };
    await walk(ol,0);
    return out;
  }catch(e){ return []; }
}
async function getToc(){
  if(TOCS)return TOCS;
  TOCS = KIND==='txt' ? txtToc(false) : KIND==='pdf' ? await pdfToc() : await epubToc();
  return TOCS;
}
/* 지금 읽는 자리에 해당하는 목차 줄 */
function tocNow(a){
  if(!a.length)return -1;
  let k=-1;
  if(KIND==='txt'){
    const h=$('#txt'), m=h.scrollHeight-h.clientHeight, p=m>0?h.scrollTop/m:0, off=p*TXTRAW.length;
    a.forEach((x,i)=>{ if(x.go<=off+40)k=i; });
  } else if(KIND==='pdf'){
    a.forEach((x,i)=>{ if(x.go&&x.go<=pdfPg)k=i; });
  } else if(EPLOC&&EPLOC.start){
    const here=String(EPLOC.start.href||'').split('#')[0];
    a.forEach((x,i)=>{ if(String(x.go||'').split('#')[0]===here&&k<0)k=i; });
  }
  return k;
}
/* TXT 에서 글자 위치로 가기 — 그 글자가 화면 위쪽에 오도록 */
function txtScrollTo(off){
  const host=$('#txt'), body=$('#txt .body'); if(!host||!body)return;
  const w=document.createTreeWalker(body,NodeFilter.SHOW_TEXT); let n=0, c;
  while(c=w.nextNode()){
    const L=c.nodeValue.length;
    if(n+L>off){
      try{ const r=document.createRange(); r.setStart(c,off-n); r.setEnd(c,Math.min(L,off-n+1));
           const rc=r.getBoundingClientRect(), hb=host.getBoundingClientRect();
           if(rc&&(rc.top||rc.height)){ host.scrollTop+=rc.top-hb.top-14; return; } }catch(e){}
      break;
    }
    n+=L;
  }
  const m=host.scrollHeight-host.clientHeight;
  host.scrollTop=(TXTRAW.length?off/TXTRAW.length:0)*m;
}
function tocGo(x){
  panOff();
  if(KIND==='txt') txtScrollTo(x.go);
  else if(KIND==='pdf'){ if(x.go)goPdfPage(x.go); else toast('이 목차는 쪽을 알 수 없습니다'); }
  else if(rend&&x.go){ try{ rend.display(x.go); }catch(e){ toast('그 자리를 찾지 못했습니다'); } }
}
async function paintToc(){
  const list=$('#tocList'), none=$('#tocNone');
  const te=$('#tocEdit'); if(te){ te.style.display=KIND==='txt'?'':'none'; te.textContent=TOCED?'다 고침':'손보기'; te.classList.toggle('good',TOCED); }
  if(KIND!=='txt')TOCED=false;
  $('#tocEdBar').classList.toggle('on',TOCED);
  list.innerHTML=''; none.style.display='block'; none.textContent='목차를 찾는 중…';
  const a=TOCED?txtToc(true):await getToc();
  $('#tocTitle').textContent=a.length?`목차 (${a.length})`:'목차';
  if(!a.length){
    none.textContent = KIND==='txt'
      ? '목차로 삼을 줄을 찾지 못했습니다.\n「제1장 · 1화 · 프롤로그 · Chapter 1 · [3화]」 같은 짧은 줄이 있으면 목차가 됩니다.\n위의 [손보기]로 장 제목 줄을 직접 넣을 수 있습니다.'
      : KIND==='pdf' ? '이 PDF 에는 목차(책갈피)가 들어 있지 않습니다.\n위 막대의 🔖 로 직접 표시해 두실 수 있습니다.'
      : '이 책에는 목차가 들어 있지 않습니다.';
    return;
  }
  none.style.display='none';
  const now=tocNow(a), f=document.createDocumentFragment();
  a.forEach((x,i)=>{
    const b=document.createElement('button');
    b.className=(x.d?'d'+x.d:'')+(i===now?' on':'');
    const w = KIND==='pdf' ? (x.go?x.go+'쪽':'') : (x.at!=null?Math.round(x.at*100)+'%':'');
    b.innerHTML=`<span>${esc(x.t)}</span><span class="p">${esc(w)}</span>`;
    if(TOCED){ if(x.gone)b.classList.add('gone'); if(x.man)b.classList.add('man');
      const k=document.createElement('span'); k.className='x'; k.textContent=x.gone?'넣기':'빼기';
      k.onclick=ev=>{ ev.stopPropagation(); const ls=x.ls;
        tceSet(e=>{ if(x.gone){ e.r=e.r.filter(v=>v!==ls); }
                    else if(x.man){ e.a=e.a.filter(v=>v!==ls); }
                    else e.r.push(ls); }); };
      b.appendChild(k); }
    b.onclick=()=>tocGo(x);
    f.appendChild(b);
  });
  list.appendChild(f);
  const on=list.querySelector('.on'); if(on&&on.scrollIntoView)setTimeout(()=>on.scrollIntoView({block:'center'}),30);
}
PANS.push('#panToc');
$('#btnToc').onclick=()=>{ pan('#panToc',true); paintToc(); };
$('#tocClose').onclick=panOff;
$('#tocEdit').onclick=()=>{ TOCED=!TOCED; paintToc(); };
$('#tocAddTop').onclick=()=>{ if(KIND!=='txt')return; const ls=txtTopLine();
  if(ls<0){ toast('줄을 찾지 못했습니다'); return; }
  const t=txtLineAt(ls); if(!t){ toast('빈 줄입니다 — 장 제목 줄이 화면 맨 위에 오게 해 주세요'); return; }
  const auto=t.length<=50&&TOC_RE.test(t);       // 원래 목차로 잡히는 줄이면 '뺀 표시'만 지우면 됩니다
  tceSet(e=>{ e.r=e.r.filter(v=>v!==ls); if(!auto)e.a.push(ls); });
  toast('목차에 넣었습니다\n「'+(t.length>30?t.slice(0,30)+'…':t)+'」'); };
$('#tocReset').onclick=()=>{ if(!curB)return; if(!confirm('이 책의 목차를 처음 찾은 대로 되돌립니다.'))return;
  tceSet(e=>{ e.a=[]; e.r=[]; }); };

/* ══════════ 탐색기 (폴더 보기) ══════════
   드라이브에 정리해 둔 폴더를 그대로 둘러봅니다.
   보기와 열기만 합니다 — 옮기거나 이름을 바꾸거나 지우지 않습니다.

     실시간  드라이브에 그때그때 물어봅니다. 새로 넣은 책이 바로 보입니다.
             한 번 연 폴더는 기억해 두었다가 먼저 보여주고, 뒤에서 새로 물어 고칩니다.
     색인    받아 둔 책 목록의 폴더 경로로 나무를 짜 맞춥니다. 빠르고 인터넷 없이도 됩니다.

   인터넷이 없거나 로그인 전이면 실시간이 저절로 색인으로 넘어갑니다.
   형식을 가르지 않고 폴더에 있는 그대로 보여줍니다 (만화·소설이 섞여 있어도).
   폴더를 묻는 길은 DIRSRC 로 나눠 둡니다. 나중에 NAS 는 여기에 하나 더하면 됩니다. */
if(P.exp!=='index'&&P.exp!=='live')P.exp='live';
const EXCOLL=new Intl.Collator('ko',{numeric:true,sensitivity:'base'});
// 지금 있는 곳 — 한 칸에 {n:이름, i:드라이브 폴더ID}. ID 는 실시간에서만 압니다.
let EXPATH=[]; try{ EXPATH=JSON.parse(localStorage.getItem('ebl_exppath')||'[]'); }catch(e){ EXPATH=[]; }
if(!Array.isArray(EXPATH))EXPATH=[];
const saveExPath=()=>{ try{ localStorage.setItem('ebl_exppath',JSON.stringify(EXPATH)); }catch(e){} };
let EXNOTE='', EXSEQ=0, LASTEX=null;
const exKey=()=>P.exp+'|'+EXPATH.map(c=>c.n).join('/');
function rootId(){
  const f=String(cfg('fol')||'').trim();
  const m=f.match(/folders\/([\w-]+)/)||f.match(/[?&]id=([\w-]+)/);
  return m?m[1]:(/^[\w-]{20,}$/.test(f)?f:'');
}

/* ── 색인으로 나무 짜기 ── */
let IXT=null, IXKEY='', BYIDM=null, BYIDK='';
function byId(){ const k=BOOKS.length+'|'+UPDATED;
  if(!BYIDM||BYIDK!==k){ BYIDM=new Map(BOOKS.map(b=>[b.i,b])); BYIDK=k; } return BYIDM; }
function idxTree(){
  const key=BOOKS.length+'|'+UPDATED; if(IXT&&IXKEY===key)return IXT;
  const mk=n=>({n,kids:new Map(),books:[],tot:0});
  const root=mk('');
  BOOKS.forEach(b=>{
    const segs=String(b.f||'').split('/').map(x=>x.trim()).filter(Boolean);
    const last=segs[segs.length-1];
    if(last&&b.x&&last.toLowerCase().endsWith('.'+String(b.x).toLowerCase()))segs.pop();  // 경로 끝이 파일 이름이면 뗍니다
    let nd=root; nd.tot++;
    segs.forEach(x=>{ let k=nd.kids.get(x); if(!k){ k=mk(x); nd.kids.set(x,k); } nd=k; nd.tot++; });
    nd.books.push(b);
  });
  // 모든 책이 한 폴더 아래 있으면 그 폴더가 곧 도서 폴더입니다. 한 겹만 벗깁니다.
  let r=root;
  if(root.kids.size===1&&!root.books.length)r=[...root.kids.values()][0];
  IXT=r; IXKEY=key; return r;
}
function listIndex(){
  let nd=idxTree(); const ok=[];
  for(const c of EXPATH){ const k=nd.kids.get(c.n); if(!k)break; ok.push(c); nd=k; }
  if(ok.length!==EXPATH.length){ EXPATH=ok; saveExPath(); }
  return { mode:'index', root:nd===idxTree()?nd.n:idxTree().n,
    folders:[...nd.kids.values()].map(k=>({n:k.n, sub:k.tot.toLocaleString()+'권'})),
    books:nd.books.slice() };
}

/* ── 실시간: 폴더를 묻는 길 ── */
let DIRS={}; try{ DIRS=JSON.parse(localStorage.getItem('ebl_dirs')||'{}')||{}; }catch(e){ DIRS={}; }
function saveDirs(){
  const ks=Object.keys(DIRS).sort((a,b)=>(DIRS[b].at||0)-(DIRS[a].at||0));
  let str=JSON.stringify(DIRS);
  while(str.length>1500000&&ks.length>20){ delete DIRS[ks.pop()]; str=JSON.stringify(DIRS); }
  try{ localStorage.setItem('ebl_dirs',str); }catch(e){}
}
const DIRSRC={
  drive:{
    // 폴더 하나의 바로 아래만 받습니다 → {f:[[ID,이름]], b:[[ID,파일이름,바이트]]}
    async list(id,at){
      const fo=[], fi=[]; let pt='';
      do{
        const q=encodeURIComponent(`'${id}' in parents and trashed=false`);
        const fl=encodeURIComponent('nextPageToken,files(id,name,mimeType,size,createdTime,shortcutDetails)');
        const u=`https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fl}&pageSize=1000`
          +`&supportsAllDrives=true&includeItemsFromAllDrives=true`+(pt?`&pageToken=${encodeURIComponent(pt)}`:'');
        const r=await fetch(u,{headers:{Authorization:'Bearer '+at}});
        if(r.status===401){ TOKEN=''; AUTH.drop(); markLogin(false);
          throw Object.assign(new Error('로그인이 풀렸습니다'),{auth:true}); }
        if(r.status===403||r.status===404)throw Object.assign(new Error('이 폴더를 볼 권한이 없습니다'),{perm:true});
        if(!r.ok)throw new Error('드라이브 응답 '+r.status);
        const d=await r.json(); pt=d.nextPageToken||'';
        (d.files||[]).forEach(f=>{
          let fid=f.id, mt=f.mimeType;
          if(mt==='application/vnd.google-apps.shortcut'&&f.shortcutDetails){
            fid=f.shortcutDetails.targetId; mt=f.shortcutDetails.targetMimeType; }
          if(mt==='application/vnd.google-apps.folder')fo.push([fid,f.name]);
          else if(!/^application\/vnd\.google-apps\./.test(mt||''))fi.push([fid,f.name,Number(f.size||0),f.createdTime||'']);
        });
      }while(pt);
      return {f:fo,b:fi};
    },
    async name(id,at){
      const r=await fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=name&supportsAllDrives=true`,
        {headers:{Authorization:'Bearer '+at}});
      if(!r.ok)return ''; const d=await r.json(); return d.name||'';
    }
  }
  /* dav:{ async list(경로){ ... PROPFIND ... }, async name(){ ... } }   ← 나중에 NAS */
};
function liveBook(id,name,size){
  const b=byId().get(id); if(b)return b;
  const m=String(name).match(/^(.*)\.([^.\s]{1,8})$/);
  return { i:id, t:m?m[1]:name, x:m?m[2].toLowerCase():'', z:size?Math.round(size/104857.6)/10:0, _new:1 };
}
function fromDir(d){
  return { mode:'live', root:localStorage.getItem('ebl_rootname')||'도서 폴더', at:d.at,
    folders:d.f.map(([i,n])=>({n,i,sub:(DIRS[i]?(DIRS[i].f.length+DIRS[i].b.length)+'칸':'')})),
    books:d.b.map(([i,n,z,ct])=>Object.assign(liveBook(i,n,z),{_fn:n,_ct:ct||''})) };
}
/* 이름만 아는 길(색인에서 넘어왔을 때)을 폴더ID 로 바꿉니다. 못 찾으면 거기까지만. */
async function liveResolve(at,seq){
  let id=rootId(); const ok=[];
  for(const c of EXPATH){
    let kid=c.i;
    if(!kid){
      let d=DIRS[id];
      if(!d){ d=await DIRSRC.drive.list(id,at); d.at=Date.now(); DIRS[id]=d; }
      const hit=d.f.find(x=>x[1]===c.n); if(!hit)break; kid=hit[0];
    }
    ok.push({n:c.n,i:kid}); id=kid;
    if(seq!==EXSEQ)return null;
  }
  EXPATH=ok; saveExPath(); return id;
}
const tokenNow=()=>(TOKEN&&tokenLive())?TOKEN:'';

/* ── 그리기 ── */
function expRender(){
  if(LASTEX&&LASTEX.key===exKey()){ drawExp(LASTEX.data); return; }
  buildExp(false);
}
async function buildExp(inter){
  if(kidRule()&&P.exp==='live')P.exp='index';      // v44 — 아이 칸이면 드라이브를 바로 보지 않고 거른 목록으로
  const seq=++EXSEQ;
  EXNOTE='';
  if(P.exp==='live'){
    let why='';
    if(!rootId()) why='관리 → 도서 폴더 링크가 비어 있어 색인으로 보여 드립니다';
    else if(navigator.onLine===false) why='인터넷이 없어 색인으로 보여 드립니다';
    if(!why){
      let at=tokenNow();
      if(!at&&inter){ try{ at=await needTokenAny(); }catch(e){ at=''; } }
      if(seq!==EXSEQ)return;
      // 기억해 둔 목록이 있으면 먼저 보여줍니다
      const ids=EXPATH.every(c=>c.i);
      const curId=ids?(EXPATH.length?EXPATH[EXPATH.length-1].i:rootId()):'';
      if(curId&&DIRS[curId]){ showEx(fromDir(DIRS[curId]),'기억해 둔 목록 · 새로 확인하는 중…'); }
      if(!at){
        if(curId&&DIRS[curId]){ showEx(fromDir(DIRS[curId]),'로그인 전이라 기억해 둔 목록입니다 · 🔑 를 누르면 새로 봅니다'); return; }
        why='로그인 전이라 색인으로 보여 드립니다 · 🔑 로 로그인하면 실시간으로 봅니다';
      } else {
        try{
          if(!localStorage.getItem('ebl_rootname')){
            const nm=await DIRSRC.drive.name(rootId(),at); if(nm)localStorage.setItem('ebl_rootname',nm); }
          const id=await liveResolve(at,seq); if(seq!==EXSEQ||!id)return;
          const d=await DIRSRC.drive.list(id,at); d.at=Date.now();
          if(seq!==EXSEQ)return;
          DIRS[id]=d; saveDirs();
          showEx(fromDir(d),'');
          return;
        }catch(e){
          if(seq!==EXSEQ)return;
          log('탐색기: '+(e.message||e));
          if(curId&&DIRS[curId]){ showEx(fromDir(DIRS[curId]),'새로 받지 못해 기억해 둔 목록입니다 · '+(e.message||e)); return; }
          why=(e.perm||e.auth?(e.message+' · '):'드라이브에 닿지 못해 ')+'색인으로 보여 드립니다';
        }
      }
    }
    EXNOTE=why;
  }
  if(seq!==EXSEQ)return;
  showEx(listIndex(),EXNOTE);
}
function showEx(data,note){
  data.note=note||'';
  LASTEX={key:exKey(),data};
  if(TAB==='folder'&&$('#reader').style.display!=='flex')drawExp(data);
}
function paintCrumbs(){
  const el=$('#chips'); el.innerHTML='';
  const add=(label,fn,cls)=>{ const b=document.createElement('button');
    b.className='chip'+(cls?' '+cls:''); b.textContent=label; b.onclick=fn; el.appendChild(b); };
  const rn=(LASTEX&&LASTEX.data.root)||(P.exp==='live'?(localStorage.getItem('ebl_rootname')||'도서 폴더'):'도서 폴더');
  if(EXPATH.length) add('‹',()=>exGo(EXPATH.length-1),'up');
  add('📁 '+rn,()=>exGo(0),EXPATH.length?'':'on');
  EXPATH.forEach((c,k)=>add(c.n,()=>exGo(k+1),k===EXPATH.length-1?'on':''));
  setTimeout(()=>{ el.scrollLeft=el.scrollWidth; },0);
}
function exGo(depth){ if(depth===EXPATH.length&&LASTEX&&LASTEX.key===exKey())return;
  EXPATH=EXPATH.slice(0,depth); saveExPath(); $('#q').value=''; paintCrumbs(); buildExp(true); }
function exInto(f){ EXPATH.push({n:f.n,i:f.i||''}); saveExPath(); $('#q').value=''; paintCrumbs(); buildExp(true); }
/* 폴더 안 책 정렬 — ☰ 의 정렬을 따릅니다.
   '제목' 은 폴더에서는 파일 이름순입니다 (1권 · 2권 · 10권이 숫자대로).
   '담긴 날짜' 는 실시간이면 드라이브에 넣은 날, 색인이면 색인에 담긴 날. */
function exSort(a){
  const nm=(x,y)=>EXCOLL.compare(x._fn||x.t||'',y._fn||y.t||'');
  const s=P.sort; let f=nm;
  if(s==='a') f=(x,y)=>EXCOLL.compare(x.a||'\uffff',y.a||'\uffff')||nm(x,y);
  else if(s==='d') f=(x,y)=>String(y.d||'').localeCompare(String(x.d||''))||nm(x,y);
  else if(s==='r') f=(x,y)=>(((RD[y.i]&&RD[y.i].t)||0)-((RD[x.i]&&RD[x.i].t)||0))||nm(x,y);
  else if(s==='z') f=(x,y)=>((y.z||0)-(x.z||0))||nm(x,y);
  else if(s==='g') f=(x,y)=>String(y._ct||y.g||'').localeCompare(String(x._ct||x.g||''))||nm(x,y);
  a.sort(f); if(P.rev)a.reverse(); return a;
}
const exSortName=()=>(P.sort==='t'?'이름순':((SORTN||{})[P.sort]||'')+'순')+(P.rev?' 거꾸로':'');
/* ★ 폴더 탭에서는 '폴더에 실제로 있는 그대로' 보여 드립니다 (v34.1)
   색인의 제목·표지는 Apps Script 가 알라딘에서 찾아 붙인 것이라,
   웹소설처럼 짝을 잘못 지은 책은 폴더에 없는 다른 책처럼 보였습니다.
     실시간  제목 = 실제 파일 이름, 표지 없음, 저자 없음
     색인    제목 = 색인 제목 (경로 끝에 파일 이름이 있으면 그것), 표지 없음, '색인 정보' 표시
   책을 열면 이 이름이 읽기 화면 제목이 됩니다. 읽은 기록·형광펜은 파일 ID 로 붙으므로 그대로입니다. */
function exShow(b,mode){
  let t=b.t||'';
  if(mode==='live'&&b._fn) t=b._fn;
  else if(mode==='index'){
    const last=String(b.f||'').split('/').pop()||'';
    if(b.x&&last.toLowerCase().endsWith('.'+String(b.x).toLowerCase()))t=last;
    else if(b.o)t=b.o;                       // 원제 = 파일명에서 뽑은 제목
  }
  return Object.assign({},b,{t, a:mode==='index'?'색인 정보':'', v:''});
}
function exIndexTime(){
  const u=String(UPDATED||'').trim(); if(!u)return 0;
  const t=Date.parse(u.replace(/^(\d{4})[.\/](\d{1,2})[.\/](\d{1,2})/,'$1-$2-$3').replace(' ','T'));
  return isNaN(t)?0:t;
}
function folderCard(f){
  const d=document.createElement('div'); d.className='card fold';
  const w=document.createElement('div'); w.className='cvw'; w.innerHTML='<div class="fd">📁</div>';
  const t=document.createElement('div'); t.className='ti'; t.textContent=f.n;
  const a=document.createElement('div'); a.className='au'; a.textContent=f.sub||'';
  if(P.mode==='l'){ const m=document.createElement('div'); m.className='meta'; m.append(t,a); d.append(w,m); }
  else d.append(w,t,a);
  d.onclick=()=>exInto(f);
  return d;
}
function drawExp(data){
  $$('#exMode button').forEach(x=>x.classList.toggle('on',x.dataset.v===P.exp));
  paintCrumbs();
  const k=norm($('#q').value||'');
  const fs=data.folders.filter(f=>!k||norm(f.n).includes(k)).sort((x,y)=>EXCOLL.compare(x.n,y.n));
  const bs=exSort(data.books.filter(b=>!k||norm([b.t,b.a,b._fn].filter(Boolean).join('|')).includes(k)));
  data.view=bs;
  const g=$('#grid'); g.className=P.mode; g.innerHTML='';
  const f=document.createDocumentFragment();
  fs.forEach(x=>f.appendChild(folderCard(x)));
  const upd=exIndexTime();
  bs.forEach(b=>{ const c=card(exShow(b,data.mode));
    // '새로' 는 색인을 만든 뒤에 드라이브에 들어온 파일에만 붙입니다
    if(b._new&&b._ct&&upd&&Date.parse(b._ct)>upd){ const w=c.querySelector('.cvw');
      if(w&&!saved.has(b.i))w.insertAdjacentHTML('beforeend','<div class="tag nw">새로</div>'); }
    f.appendChild(c); });
  if(!fs.length&&!bs.length){ const e=document.createElement('div'); e.id='more';
    e.textContent=k?'이 폴더에 맞는 것이 없습니다':'빈 폴더입니다'; f.appendChild(e); }
  g.appendChild(f);
  const when=data.at?'  ·  '+new Date(data.at).toTimeString().slice(0,5)+' 기준':'';
  const can=bs.filter(b=>kindOf(b)&&!saved.has(b.i)).length;
  $('#exGet').textContent=can?`받아두기 ${can}`:'받아두기';
  $('#exGet').disabled=!can; $('#exGet').style.opacity=can?'':'0.45';
  stat(`폴더 ${fs.length}  ·  책 ${bs.length}`
    +`  ·  ${data.mode==='live'?'실시간':'색인'}${when}  ·  ${exSortName()}  ·  ${BUILD}`
    +(data.note?'\n'+data.note:'')
    +(data.mode==='index'?'\n색인 방식은 색인에 적힌 제목입니다 · 실제 파일 이름은 [실시간] 에서 보입니다':''), false);
}
$$('#exMode button').forEach(x=>x.onclick=()=>{
  if(P.exp===x.dataset.v)return;
  P.exp=x.dataset.v; savePref(); LASTEX=null; buildExp(true); });
$('#exRe').onclick=async()=>{
  if(P.exp==='index'){ try{ toast('목록을 새로 받는 중…'); await fetchIndex(); IXT=null; LASTEX=null;
      buildExp(true); toast('갱신했습니다'); }catch(e){ toast(e.message,5000); } return; }
  LASTEX=null; buildExp(true);
};
$('#exGet').onclick=async()=>{
  if(!LASTEX)return;
  // 큰 만화 ZIP 은 기기에 담지 않습니다 (보는 장만 받는 방식이라 그럴 필요도 없습니다)
  const list=(LASTEX.data.view||LASTEX.data.books).filter(b=>kindOf(b)&&!saved.has(b.i)
    &&!(kindOf(b)==='comic'&&(Number(b.z)||0)>150));
  if(!list.length){ toast('이 폴더의 책은 모두 받아두었습니다'); return; }
  const mb=list.reduce((s,b)=>s+(Number(b.z)||0),0);
  if(!confirm(`이 폴더의 책 ${list.length}권을 기기에 받아둡니다`
    +(mb?`\n(약 ${Math.round(mb)}MB)`:'')+'\n\n아래 폴더는 받지 않습니다.'))return;
  let n=0, fail=0;
  for(const b of list){
    try{ await getBook(b); n++; }
    catch(e){ if(abort&&abort.signal.aborted)break; fail++; log('받아두기 실패: '+(b.t||b.i)+' — '+(e.message||e)); }
    $('#busyT').textContent=`받아두는 중 ${n+fail} / ${list.length}`;
  }
  busy(false);
  toast(`${n}권을 받아두었습니다`+(fail?`\n${fail}권은 받지 못했습니다 (관리 → 기록)`:''),4000);
  paintTabs(); drawExp(LASTEX.data);
};

/* ══════════ 책갈피 ══════════
   형광펜과 달리 글을 긋지 않고 '이 자리'만 표시합니다.
   HL[책ID] 안에 {k:'bm', w:'epub'|'pdf'|'txt', c:자리, pos:진도, t:첫 글귀} 로 둡니다.
     epub  c = CFI         (글자 크기를 바꿔도 같은 글을 찾아갑니다)
     pdf   c = {p:쪽}
     txt   c = {p:0~1}     (스크롤 비율)                                        */
async function hereNow(){
  if(!curB)return null;
  if(KIND==='comic'&&CM.n)return {w:'comic', c:{p:CM.i}, pos:(CM.i+1)/CM.n, t:(CM.i+1)+'쪽'};
  if(KIND==='epub'&&rend){
    const cfi=EPLOC&&EPLOC.start&&EPLOC.start.cfi; if(!cfi)return null;
    let t='';
    try{ const r=await book.getRange(cfi);
         if(r){ const n=r.startContainer;
                t=String(n.textContent||'').slice(r.startOffset||0).replace(/\s+/g,' ').trim().slice(0,60); } }
    catch(e){}
    return {w:'epub', c:cfi, pos:epPct(EPLOC)||pctOf(curB), t};
  }
  if(KIND==='pdf'&&pdfDoc){
    return {w:'pdf', c:{p:pdfPg}, pos:pdfPg/pdfDoc.numPages, t:''};
  }
  if(KIND==='txt'){
    const h=$('#txt'), max=h.scrollHeight-h.clientHeight, p=max>0?h.scrollTop/max:0;
    const s=Math.floor(p*TXTRAW.length);
    return {w:'txt', c:{p}, pos:p, t:TXTRAW.slice(s,s+80).replace(/\s+/g,' ').trim().slice(0,60)};
  }
  return null;
}
function bmIsHere(o){
  if(!o||!o.c)return false;
  if(KIND==='comic') return o.w==='comic'&&o.c.p>=CM.i&&o.c.p<CM.i+(CM.span||1);
  if(KIND==='pdf') return o.w==='pdf'&&o.c.p===pdfPg;
  if(KIND==='txt'){
    if(o.w!=='txt')return false;
    const h=$('#txt'), max=h.scrollHeight-h.clientHeight; if(max<=0)return true;
    const y=o.c.p*max; return y>=h.scrollTop-6 && y<h.scrollTop+h.clientHeight*0.6;
  }
  if(KIND==='epub'){
    if(o.w!=='epub'||!EPLOC||!EPLOC.start)return false;
    const a=EPLOC.start.cfi, z=EPLOC.end&&EPLOC.end.cfi;
    if(o.c===a)return true;
    try{ const C=new ePub.CFI(); return C.compare(o.c,a)>=0 && (!z||C.compare(o.c,z)<=0); }
    catch(e){ return false; }
  }
  return false;
}
const bmHere=()=>curB?bmOf(curB.i).find(bmIsHere):null;
function paintBmBtn(){
  const b=$('#btnBm'); if(!b)return;
  b.classList.toggle('good',!!bmHere());
}
$('#btnBm').onclick=async()=>{
  if(!curB)return;
  const here=bmHere();
  if(here){ hlDel(here.i); paintBmBtn(); toast('책갈피를 뺐습니다'); return; }
  const h=await hereNow();
  if(!h){ toast('지금 자리를 아직 알 수 없습니다.\n한 쪽 넘긴 뒤 다시 눌러 주세요'); return; }
  hlAdd(Object.assign({k:'bm'},h)); saveHL.now(); syncSoon();
  paintBmBtn(); toast('책갈피를 꽂았습니다');
};
function gotoBm(o){
  if(!o||!o.c)return;
  if(o.w==='epub'&&rend){ try{ rend.display(o.c); }catch(e){ toast('그 자리를 찾지 못했습니다'); } }
  else if(o.w==='pdf'){ goPdfPage(o.c.p); }
  else if(o.w==='txt'){ const h=$('#txt'); h.scrollTop=o.c.p*(h.scrollHeight-h.clientHeight); }
  else if(o.w==='comic'){ comicGo(o.c.p); }
}
const whereOf=o=> isBm(o)
  ? (o.w==='pdf'?`${o.c.p}쪽`:(o.pos!=null?Math.round(o.pos*100)+'%':''))
  : (o.k==='pdf'?`${o.c.p}쪽`:(o.pos?Math.round(o.pos*100)+'%':''));
const dayOf=t=>{ if(!t)return''; const d=new Date(t);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`; };
function paintBmList(){
  const a=bmOf(curB.i).slice().sort((x,y)=>(x.pos||0)-(y.pos||0));
  $('#hlTitle').textContent=`책갈피 (${a.length})`;
  const none=$('#hlNone'), el=$('#hlList');
  none.style.display=a.length?'none':'block';
  $('#hlTools').style.display='none';
  none.textContent='아직 없습니다.\n위 막대의 🔖 를 누르면 지금 자리에 책갈피가 꽂힙니다.\n한 번 더 누르면 뺍니다.';
  el.innerHTML='';
  const f=document.createDocumentFragment();
  a.forEach(o=>{
    const d=document.createElement('div'); d.className='it';
    d.innerHTML=`<div class="q" style="border-left-color:var(--acc)">🔖 ${esc(o.t||whereOf(o))}</div>`
      +`<div class="w"><span>${esc(whereOf(o))}  ·  ${dayOf(o.at)}</span><span></span></div>`;
    const bd=document.createElement('button'); bd.textContent='빼기';
    bd.onclick=e=>{ e.stopPropagation(); hlDel(o.i); paintHl(); };
    d.querySelector('.w').lastChild.append(bd);
    d.onclick=()=>{ panOff(); gotoBm(o); };
    f.appendChild(d);
  });
  el.appendChild(f);
}
$$('#hlTab button').forEach(x=>x.onclick=()=>{ HLTAB=x.dataset.v; paintHl(); });

/* ══════════ v56 — 오늘의 밑줄 ══════════
   예전에 그은 형광펜을 날마다 몇 개씩 다시 보여 줍니다 (오래 안 본 것부터 — 간격 두고 다시 보기).
   ebl_hlday = {d:날짜, ids:[오늘 고른 것]} · ebl_hlseen = {형광펜번호: 마지막으로 보여 준 날}  — 이 기기만 */
let HLDAY_N=0;
function paintHomeHl(){
  const host=$('#hHl'); if(!host)return; host.innerHTML='';
  const c=homeCfg(); if(c.hide.hl){ return; }
  const N=homeSize('hl')||3, today=dkey();
  const byId=new Map(BOOKS.map(b=>[b.i,b]));
  const all=[]; Object.entries(HL).forEach(([bk,arr])=>(arr||[]).forEach(o=>{ if(o&&!isBm(o)&&o.t&&String(o.t).trim().length>=4)all.push({o,bk}); }));
  if(!all.length){ host.innerHTML='<div class="hh"><b>오늘의 밑줄</b></div><div class="hlc" style="cursor:default;border-left-color:var(--line)"><div class="b">아직 그은 형광펜이 없습니다. 책을 읽다가 마음에 드는 글을 그으면 여기에 날마다 다시 나옵니다.</div></div>'; return; }
  const lj=(k)=>{ try{ return JSON.parse(localStorage.getItem(k)||'{}')||{}; }catch(e){ return {}; } };
  const seen=lj('ebl_hlseen'), day=lj('ebl_hlday');
  const has=new Set(all.map(x=>x.o.i));
  let ids=(day.d===today&&HLDAY_N===(day.n||0))?(day.ids||[]).filter(i=>has.has(i)):[];
  if(ids.length<Math.min(N,all.length)){
    const cand=all.filter(x=>!ids.includes(x.o.i))
      .sort((a,b)=>((seen[a.o.i]||'')<(seen[b.o.i]||'')?-1:(seen[a.o.i]||'')>(seen[b.o.i]||'')?1:((a.o.at||0)-(b.o.at||0))));
    // 오래 안 본 것 가운데서 조금 섞어 고릅니다 (늘 같은 순서가 되지 않게)
    const pool=cand.slice(0,Math.max(N*4,12)); let seed=0; for(const ch of today+HLDAY_N)seed=(seed*31+ch.charCodeAt(0))>>>0;
    while(ids.length<N&&pool.length){ seed=(seed*1103515245+12345)>>>0; ids.push(pool.splice(seed%pool.length,1)[0].o.i); }
    ids.forEach(i=>seen[i]=today);
    try{ localStorage.setItem('ebl_hlseen',JSON.stringify(seen)); localStorage.setItem('ebl_hlday',JSON.stringify({d:today,n:HLDAY_N,ids})); }catch(e){}
  }
  const hh=document.createElement('div'); hh.className='hh';
  hh.innerHTML='<b>오늘의 밑줄</b>'+(all.length>N?'<button id="hHlMore">다른 밑줄 ›</button>':'');
  host.appendChild(hh);
  ids.slice(0,N).forEach(id=>{ const x=all.find(y=>y.o.i===id); if(!x)return;
    const b=byId.get(x.bk), bt=(b&&b.t)||x.o.bt||'(목록에 없는 책)';
    const d=document.createElement('div'); d.className='hlc'; d.style.borderLeftColor=COLS[x.o.col]||COLS.y;
    d.innerHTML=`<div class="q">${esc(x.o.t)}</div>`+(x.o.n?`<div class="m">${esc(x.o.n)}</div>`:'')
      +`<div class="b">${esc(bt)}${x.o.at?'  ·  '+esc(dayOf(x.o.at)):''}</div>`;
    d.onclick=()=>hlAllGo(x.o,x.bk,b);
    host.appendChild(d); });
  const mb=$('#hHlMore'); if(mb) mb.onclick=e=>{ e.stopPropagation(); HLDAY_N++; paintHomeHl(); };
}

