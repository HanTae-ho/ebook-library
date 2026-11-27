/* 우리 도서관 — js/12-app.js
   모은 형광펜 · 설정·관리 · 새 목록 · 홈 화면 추가 · 새 버전
   ※ 모든 파일이 같은 전역을 나눠 씁니다. index.html 에 적힌 순서(01 → 12)대로 불러와야 합니다. */
/* ══════════ 모은 형광펜 · 책갈피 ══════════
   모든 책에 그은 것을 한곳에서 찾고, 누르면 그 책 그 자리로 갑니다.
   읽은 기록처럼 각자의 것만 보입니다 (식구 것은 안 보입니다). */
const HA={ kind:'hl', col:'', sort:'new', q:'', show:150 };
function hlAllRows(){
  const byId=new Map(BOOKS.map(b=>[b.i,b]));
  const q=HA.q?norm(HA.q):'';
  const out=[];
  Object.entries(HL).forEach(([bk,arr])=>{
    const b=byId.get(bk);
    const title=(b&&b.t)||'';
    (arr||[]).forEach(o=>{
      if(HA.kind==='bm'){ if(!isBm(o))return; }
      else { if(isBm(o))return; if(HA.kind==='memo'&&!o.n)return; if(HA.col&&(o.col||'y')!==HA.col)return; }
      const bt=title||o.bt||'(목록에 없는 책)';
      if(q&&!norm([o.t,o.n,bt].filter(Boolean).join('|')).includes(q))return;
      out.push({o,bk,b,bt});
    });
  });
  if(HA.sort==='book')
    out.sort((x,y)=>x.bt.localeCompare(y.bt,'ko')||((x.o.pos||0)-(y.o.pos||0)));
  else out.sort((x,y)=>(y.o.up||y.o.at||0)-(x.o.up||x.o.at||0));
  return out;
}
function paintHlAll(){
  $$('#hlKind button').forEach(x=>x.classList.toggle('on',x.dataset.v===HA.kind));
  $$('#hlCol button').forEach(x=>x.classList.toggle('on',x.dataset.v===HA.col));
  $$('#hlSort button').forEach(x=>x.classList.toggle('on',x.dataset.v===HA.sort));
  $('#hlCol').style.display = HA.kind==='bm' ? 'none' : '';
  const rows=hlAllRows(), el=$('#hlAll');
  const nb=new Set(rows.map(r=>r.bk)).size;
  $('#hlAllN').textContent = rows.length
    ? `${nb}권에서 ${rows.length}개` + (rows.length>HA.show?`  ·  앞의 ${HA.show}개만 보입니다`:'')
    : (HA.q||HA.col||HA.kind==='memo' ? '맞는 것이 없습니다.' :
       HA.kind==='bm' ? '아직 꽂은 책갈피가 없습니다. 책을 읽다가 위 막대의 🔖 를 누르세요.'
                      : '아직 그은 형광펜이 없습니다. 책을 읽다가 글을 그으면 여기에 모입니다.');
  el.innerHTML='';
  const f=document.createDocumentFragment();
  let lastBk='';
  rows.slice(0,HA.show).forEach(({o,bk,b,bt})=>{
    if(HA.sort==='book'&&bk!==lastBk){
      const h=document.createElement('div'); h.className='hd'; h.textContent=bt; f.appendChild(h); lastBk=bk; }
    const d=document.createElement('div'); d.className='it';
    const col=isBm(o)?'var(--acc)':(COLS[o.col]||COLS.y);
    d.innerHTML=(HA.sort==='book'?'':`<div class="bk">${esc(bt)}</div>`)
      +`<div class="q" style="border-left-color:${col}">${isBm(o)?'🔖 ':''}${esc(o.t||whereOf(o))}</div>`
      +(o.n?`<div class="m">${esc(o.n)}</div>`:'')
      +`<div class="w"><span>${esc([whereOf(o),dayOf(o.up||o.at)].filter(Boolean).join('  ·  '))}</span><span></span></div>`;
    d.onclick=()=>hlAllGo(o,bk,b);
    f.appendChild(d);
  });
  if(rows.length>HA.show){
    const m=document.createElement('button'); m.className='more';
    m.textContent=`더 보기 (${rows.length-HA.show}개 남음)`;
    m.onclick=()=>{ HA.show+=150; paintHlAll(); };
    f.appendChild(m);
  }
  el.appendChild(f);
}
async function hlAllGo(o,bk,b){
  if(!b){ toast('이 책이 지금 목록에 없어 열 수 없습니다.\n관리 → [목록 새로 받기] 를 해 보세요',4500); return; }
  $('#hlSheet').classList.remove('on');
  try{ await openBook(b); }catch(e){ return; }
  if(!curB||curB.i!==bk)return;
  setTimeout(()=>{ isBm(o)?gotoBm(o):gotoHl(o); },350);
}
function openHlAll(){ HA.q=''; HA.show=150; $('#hlQ').value=''; paintHlAll();
  $('#hlSheet').classList.add('on'); }
function paintLkHl(){
  const el=$('#lkHlN'); if(!el)return;
  let n=0, m=0; Object.values(HL).forEach(a=>(a||[]).forEach(o=>isBm(o)?m++:n++));
  el.textContent=(n||m)?`${n}개${m?` · 🔖${m}`:''} ›`:'›';
}
$('#lkHl').onclick=openHlAll;
$('#hlAllClose').onclick=()=>$('#hlSheet').classList.remove('on');
$('#hlSheet').addEventListener('click',e=>{ if(e.target.id==='hlSheet')$('#hlSheet').classList.remove('on'); });
$$('#hlKind button').forEach(x=>x.onclick=()=>{ HA.kind=x.dataset.v; HA.show=150; paintHlAll(); });
$$('#hlCol button').forEach(x=>x.onclick=()=>{ HA.col=x.dataset.v; HA.show=150; paintHlAll(); });
$$('#hlSort button').forEach(x=>x.onclick=()=>{ HA.sort=x.dataset.v; paintHlAll(); });
{ let t=null; $('#hlQ').addEventListener('input',()=>{ clearTimeout(t);
    t=setTimeout(()=>{ HA.q=$('#hlQ').value.trim(); HA.show=150; paintHlAll(); },200); }); }
$('#hlAllCopy').onclick=()=>{
  const rows=hlAllRows(); if(!rows.length)return;
  const groups=new Map();
  rows.forEach(r=>{ if(!groups.has(r.bk))groups.set(r.bk,{bt:r.bt,a:(r.b&&r.b.a)||'',list:[]});
                    groups.get(r.bk).list.push(r.o); });
  const txt=[...groups.values()].map(g=>
    [`# ${g.bt}`, g.a].filter(Boolean).join('\n')+'\n\n'
    + g.list.sort((x,y)=>(x.pos||0)-(y.pos||0)).map(o=>{
        const w=whereOf(o);
        if(isBm(o))return `- 🔖 ${w}${o.t?` — ${o.t}`:''}`;
        return `> ${o.t||''}\n${w?`— ${w}`:''}`+(o.n?`\n\n${o.n}`:'');
      }).join(HA.kind==='bm'?'\n':'\n\n---\n\n')
  ).join('\n\n\n');
  try{ navigator.clipboard.writeText(txt);
       toast(`${groups.size}권 ${rows.length}개를 복사했습니다.\n옵시디언에 붙여넣으시면 됩니다`,4000); }
  catch(e){ toast('복사하지 못했습니다'); }
};

/* 내 서가 고르기 */
function openPin(){ $('#pinQ').value=''; paintPin(); $('#pinSheet').classList.add('on'); }
$('#hPinEdit').onclick=openPin;
/* 화면을 돌리거나 창을 늘리면 PDF 를 다시 잽니다 */
addEventListener('resize',()=>{ clearTimeout(window._rz);
  window._rz=setTimeout(()=>{ if(readerOn()){ redrawPdf(); paintEpubHl(); paintAllInk(); } },260); });
$('#pinClose').onclick=()=>{ $('#pinSheet').classList.remove('on'); buildHome(); };
$('#pinQ').addEventListener('input',()=>{clearTimeout($('#pinQ')._t);
  $('#pinQ')._t=setTimeout(paintPin,140);});
function paintPin(){
  const q=norm($('#pinQ').value);
  const c={},lv={};
  BOOKS.forEach(b=>{ if(!P.fmt[fmtKey(b)])return;
    [[b.b,'대'],[b.m,'중'],[b.s,'소']].forEach(([k,l])=>{
      if(!k)return; c[k]=(c[k]||0)+1; if(!lv[k])lv[k]=l; }); });
  let keys=Object.keys(c);
  if(q) keys=keys.filter(k=>norm(k).indexOf(q)>=0);
  keys.sort((a,b)=>c[b]-c[a]);
  // 이미 고른 것은 위로
  keys=P.pins.filter(k=>keys.indexOf(k)>=0).concat(keys.filter(k=>P.pins.indexOf(k)<0));
  const el=$('#pinList'); el.innerHTML='';
  if(!keys.length){ el.innerHTML='<button><span>맞는 분류가 없습니다</span></button>'; return; }
  const f=document.createDocumentFragment();
  keys.slice(0,150).forEach(k=>{
    const on=P.pins.indexOf(k)>=0;
    const b=document.createElement('button');
    if(on)b.className='on';
    b.innerHTML=`<span>${on?'✓ ':''}${esc(k)}<i class="lv">${lv[k]}</i></span>`
      +`<span class="cnt">${c[k].toLocaleString()}</span>`;
    b.onclick=()=>{
      const i=P.pins.indexOf(k);
      if(i>=0)P.pins.splice(i,1);
      else{ if(P.pins.length>=8){ toast('서가는 8개까지 담을 수 있습니다'); return; }
            P.pins.push(k); }
      savePref(); try{localStorage.setItem('ebl_pinsat',String(Date.now()));}catch(e){}
      paintPin();
    };
    f.appendChild(b);
  });
  el.appendChild(f);
}
$('#mkDone').onclick=()=>{ if(!curB)return; markRead(curB.i,1,true);
  toast('다 읽음으로 표시했습니다'); };
$('#mkStop').onclick=()=>{ if(!curB)return; markStop(curB.i); panOff(); toast('중단으로 표시했습니다\n다시 읽어 나가면 저절로 읽는 중이 됩니다',3500); };
$('#mkReading').onclick=()=>{ if(!curB)return; markRead(curB.i,null,false,true);
  toast('읽는 중으로 되돌렸습니다'); };
/* 내용만 확인하려고 열어본 책을 목록에서 빼는 자리 */
$('#mkClear').onclick=()=>{ if(!curB)return;
  clearRead(curB.i); noMark=true;
  toast('읽은 기록을 지웠습니다.\n이 책은 닫을 때까지 다시 기록되지 않습니다'); };

/* ── 이벤트 ── */
/* 검색 — 홈에서 글자를 넣으면 목록으로 넘어갑니다.
   지우면 원래 있던 자리로 돌아옵니다. */
let backTab=null;
$('#q').addEventListener('input',()=>{
  const v=$('#q').value.trim();
  if(v && TAB==='home'){ backTab='home'; TAB=''; PIN=''; SEL=''; PATH=[]; paintTabs(); buildChips(); }
  else if(!v && backTab){ TAB=backTab; backTab=null; paintTabs(); }
  clearTimeout($('#q')._t); $('#q')._t=setTimeout(()=>render(true),130);
});
$('#q').addEventListener('change',()=>{ pushRQ($('#q').value); });
$('#q').addEventListener('blur',()=>{ pushRQ($('#q').value); });
$('#grid').addEventListener('scroll',()=>{const g=$('#grid');
  if(shown<rows.length&&g.scrollTop+g.clientHeight>g.scrollHeight-400)render(false);});
/* ── 막혔을 때 ──
   구글은 명단에 없는 계정을 자기 화면에서 막습니다. 팀장님께 알림도 안 갑니다.
   그래서 앱이 대신 길을 알려줍니다 — 도서 폴더에서 '액세스 요청' 을 누르면
   팀장님 메일에 승인 버튼과 그 사람의 주소가 함께 도착합니다. */
function showBlocked(why){
  const fol=cfg('fol');
  $('#blkT').textContent = why==='drive' ? '책을 열 수 없습니다' : '로그인이 막혔습니다';
  $('#blkM').innerHTML = why==='drive'
    ? '로그인은 됐지만 <b>도서 폴더를 볼 권한이 아직 없습니다.</b><br>'
      + '아래에서 액세스를 요청하시면 승인 요청이 갑니다.'
    : '아직 <b>명단에 없는 계정</b>입니다.<br>'
      + '아래에서 액세스를 요청하시면, 승인과 함께 명단에도 올라갑니다.';
  $('#blkAsk').style.display = fol ? '' : 'none';
  $('#blkSheet').dataset.why=why;
  $('#blkSheet').classList.add('on');
}
$('#blkClose').onclick=()=>$('#blkSheet').classList.remove('on');
$('#blkAsk').onclick=()=>{
  const fol=cfg('fol'); if(!fol)return;
  window.open(fol,'_blank','noopener');
  toast('[액세스 요청] 을 누르시면 승인 요청이 갑니다',6000);
};
$('#blkSend').onclick=async()=>{
  const msg=`${ME.name||'저'} 입니다. 서재에 로그인이 안 돼요.\n`
    + `제가 쓰는 구글 계정 주소는 아래와 같습니다.\n\n`
    + `(여기에 본인 지메일 주소를 적어 보내세요)`;
  if(navigator.share){ try{ await navigator.share({title:'서재 로그인',text:msg}); return; }
    catch(e){ if(e&&e.name==='AbortError')return; } }
  try{ await navigator.clipboard.writeText(msg); toast('문구를 복사했습니다.\n주소를 적어 보내주세요',5000); }
  catch(e){ prompt('이 내용을 보내주세요', msg); }
};
$('#btnLogin').onclick=async()=>{
  if(!gisReady)onGis();                     // 눌렀을 때 한 번 더
  // 조용히 되면 화면을 안 띄웁니다. 안 될 때만 동의 화면으로.
  try{ await needTokenAny(); toast('로그인됐습니다'); }
  catch(e){ const m=e.message||String(e); log('로그인 실패: '+m);
    if(TOKEN&&tokenLive()){ toast('로그인됐습니다'); return; }          // v57.2 — 이미 들어와 있으면 막힘 창을 띄우지 않음
    if(e&&e.oauth&&/access_denied|unauthorized|admin_policy|org_internal/i.test(e.oauth)) showBlocked('login');   // 구글이 실제로 거부했을 때만
    else toast(m,5000); }
};
$('#btnClose').onclick=closeReader;
/* 좌우 넘기기 — EPUB 이든 '한 쪽씩 보는' PDF 든 같은 손놀림 */
function pageBack(){ if(!readerOn()||penDrag||Date.now()-penAt<500)return;
  clearSel(); clearOv(); selbarOff();
  if(KIND==='epub'&&rend)rend.prev();
  else if(KIND==='pdf'&&P.pnav==='page')goPdfPage(pdfPg-1); }
function pageFwd(){ if(!readerOn()||penDrag||Date.now()-penAt<500)return;
  clearSel(); clearOv(); selbarOff();
  if(KIND==='epub'&&rend)rend.next();
  else if(KIND==='pdf'&&P.pnav==='page')goPdfPage(pdfPg+1); }
$('#tapL').onclick=pageBack;
$('#tapR').onclick=pageFwd;
document.addEventListener('keydown',e=>readerKey(e));
window.addEventListener('resize',()=>{ if(rend)try{rend.resize()}catch(e){} });

/* ⚙ 설정 — 누구나 쓰는 것 */
/* ══════════ 설정 · 관리 · 모임관리 오가기 ══════════
   전에는 장마다 닫기 하나뿐이라, 설정에서 관리로 갔다가 돌아오려면
   닫고 처음부터 다시 들어와야 했습니다.
   이제 세 장 아래에 같은 줄이 붙어 그 자리에서 건너뜁니다.

   관리자 열쇠가 없는 분에게는 '관리'·'모임관리' 가 아예 안 보입니다.
   그분들 줄은 [뒤로] [기본설정] [닫기] 뿐입니다. */
/* own:true 는 관리자 열쇠가 있어야 보이는 자리입니다.

   ★ '관리' 를 막으면 안 됩니다.
     열쇠를 넣는 칸이 바로 그 안에 있어서,
     막는 순간 열쇠 없는 기기는 열쇠를 넣으러 갈 수가 없습니다.
     v28 에서 이걸로 PC 가 잠겼습니다. */
const SPG={
  set:{ id:'setSheet', name:'기본설정', own:false },
  adm:{ id:'admSheet', name:'관리',     own:false },
  grp:{ id:'grpSheet', name:'모임관리', own:true  }
};
let PGNOW='', PGBACK=[];

/* 장을 열 때 그 장이 필요로 하는 것을 채웁니다 */
function fillPage(k){
  if(k==='set'){
    $('#sMe').value=ME.name;
    useInfo(); paintSync(); paintSyncAuto(); paintLogin();
  }
  if(k==='adm'){
    $('#sUrl').value=cfg('url'); $('#sTok').value=cfg('tok');
    $('#sCid').value=cfg('cid'); $('#sFol').value=cfg('fol'); $('#sAdm').value=cfg('adm');
    $('#log').textContent=LOG.join('\n');
    paintFam();
    // 열쇠가 없으면 왜 '모임관리' 가 안 보이는지 알려줍니다
    const hint=$('#admHint');
    if(hint)hint.innerHTML = isOwner()
      ? '이 설정은 구글 계정의 숨은 칸에도 함께 담깁니다.'
        +'<br>다른 기기에서는 로그인만 하면 저절로 내려옵니다. 옮겨 적으실 것 없습니다.'
      : '주소와 토큰은 앱 파일에 들어 있지 않습니다. 이 기기에만 저장됩니다.'
        +'<br><b>관리자 열쇠가 비어 있어 [모임관리] 가 안 보입니다.</b>'
        +' 넣고 저장하시면 아래 줄에 나타납니다.'
        +'<br>열쇠를 잊으셨으면 Apps Script 에서 <b>SHOW_KEYS()</b> 를 실행해 보세요.';
  }
  if(k==='grp'){
    paintGrps(); paintMates(); loadCut(); loadMembers();
  }
}

function paintNav(){
  document.querySelectorAll('.navbar').forEach(bar=>{
    const here=bar.dataset.nav;
    bar.innerHTML='';
    const add=(txt,fn,cls)=>{
      const b=document.createElement('button');
      b.textContent=txt; if(cls)b.className=cls; b.onclick=fn; bar.appendChild(b);
    };
    add('뒤로',pgBack);
    Object.keys(SPG).forEach(k=>{
      if(SPG[k].own&&!isOwner())return;
      add(SPG[k].name,()=>pgGo(k),k===here?'here':'');
    });
    add('닫기',pgClose,'pri');
    // 갈 곳이 없으면 '뒤로' 는 흐리게 둡니다
    bar.firstChild.disabled=!PGBACK.length;
    bar.firstChild.style.opacity=PGBACK.length?'':'0.4';
  });
}

function pgShow(k){
  Object.keys(SPG).forEach(x=>{
    const e=$('#'+SPG[x].id); if(e)e.classList.toggle('on',x===k);
  });
  PGNOW=k; fillPage(k); paintNav();
}
/* 새 장으로 — 지금 있던 곳을 기억해 둡니다 */
function pgGo(k){
  if(k===PGNOW)return;
  if(SPG[k].own&&!isOwner()){ toast('관리자 열쇠가 필요합니다'); return; }
  if(PGNOW)PGBACK.push(PGNOW);
  if(PGBACK.length>12)PGBACK.shift();
  pgShow(k);
}
function pgBack(){
  const k=PGBACK.pop();
  if(!k){ pgClose(); return; }
  pgShow(k);
}
function pgClose(){
  Object.keys(SPG).forEach(x=>{ const e=$('#'+SPG[x].id); if(e)e.classList.remove('on'); });
  PGNOW=''; PGBACK=[];
}
/* 처음 여는 것은 언제나 기본설정입니다 */
function pgOpen(k){ PGBACK=[]; PGNOW=''; pgShow(k||'set'); }

$('#btnSet').onclick=()=>{ pgOpen('set'); try{ paintVer(); }catch(e){} try{ segSet('#segIdx',P.idxAuto==null?1:P.idxAuto); }catch(e){} };
$('#setSave').onclick=()=>{
  const adm=$('#sAdm').value.trim();
  // 열쇠가 들어 있었는데 칸이 비었다면, 지우려는 것인지 한 번 여쭙습니다
  if(cfg('adm')&&!adm&&!confirm('관리자 열쇠 칸이 비어 있습니다.\n'
    +'이대로 저장하면 이 기기에서 [모임관리] 가 사라집니다.\n\n'
    +'그래도 저장할까요?'))return;
  const url=$('#sUrl').value.trim();
  if(url&&!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/.test(url)
     &&!confirm('웹앱 주소 모양이 아닙니다.\n'
       +'.../macros/s/AKfycb.../exec 이어야 합니다.\n\n그래도 저장할까요?'))return;
  pgClose();
  setCfg('url',url); setCfg('tok',$('#sTok').value.trim());
  setCfg('cid',$('#sCid').value.trim()); setCfg('fol',$('#sFol').value.trim());
  setCfg('adm',adm); stampCfg(); location.reload(); };
/* ══════════ v55 — 새 목록 저절로 받기 ══════════
   서버에 '색인이 언제 만들어졌나'(mode=ping, 몇십 바이트)만 묻고, 지금 것과 다를 때만 색인(13MB)을 받습니다.
   P.idxAuto: 1 저절로(처음 값) · 2 와이파이일 때만 · 0 직접. 확인은 한 시간에 한 번, 책 읽는 중엔 닫은 뒤에. */
var IDX={busy:0,pending:0};
function idxCell(){ const c=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  return !!(c&&(c.saveData||c.type==='cellular')); }
async function idxCheck(force){
  const mode=P.idxAuto==null?1:P.idxAuto;
  if(!mode||IDX.busy||!cfg('url')||!cfg('tok')||!BOOKS.length||!navigator.onLine)return;
  if(mode===2&&idxCell())return;
  if(curB){ IDX.pending=1; return; }
  const last=Number(localStorage.getItem('ebl_idxchk')||0);
  if(!force&&Date.now()-last<3600000)return;
  IDX.busy=1;
  try{
    try{ localStorage.setItem('ebl_idxchk',String(Date.now())); }catch(e){}
    const d=await gasGet({mode:'ping'},'웹앱이 응답하지 않습니다');
    IDX.pending=0;
    if(!d||!d.updated||d.updated===UPDATED)return;
    if(curB||document.querySelector('.sheet.on')){ IDX.pending=1; try{ localStorage.removeItem('ebl_idxchk'); }catch(e){} return; }
    const before=new Set(BOOKS_ALL.map(b=>b.i)), nb=BOOKS_ALL.length;
    log('새 색인이 있습니다 ('+d.updated+') — 받는 중');
    await fetchIndex();
    let add=0; BOOKS_ALL.forEach(b=>{ if(!before.has(b.i))add++; });
    try{ buildChips(); paintTabs(); render(true); }catch(e){}
    toast(add?`새 책 ${add.toLocaleString()}권이 들어왔습니다`:(BOOKS_ALL.length<nb?`목록을 새로 받았습니다 · ${(nb-BOOKS_ALL.length).toLocaleString()}권 빠짐`:'책 정보를 새로 받았습니다'),4000);
  }catch(e){ log('새 목록 확인 실패: '+(e.message||e)); }
  finally{ IDX.busy=0; }
}
seg('#segIdx','idxAuto',()=>{ if(P.idxAuto)idxCheck(true); });
try{ segSet('#segIdx',P.idxAuto==null?1:P.idxAuto); }catch(e){}
document.addEventListener('visibilitychange',()=>{ if(!document.hidden)setTimeout(()=>idxCheck(),2500); });
setTimeout(()=>idxCheck(),8000);
$('#btnSync2').onclick=async()=>{ try{ toast('목록을 새로 받는 중…'); await fetchIndex();
  buildChips(); render(true); toast('갱신했습니다'); }catch(e){ toast(e.message,5000); } };
/* ── 저장 공간 ──
   파일(IndexedDB)과 읽은 기록(localStorage)은 원래 따로 삽니다.
   버튼도 따로 두어 무엇이 지워지는지 분명히 합니다. */
async function useInfo(){
  const el=$('#useInfo'); if(!el) return;
  let s=`  ·  받아둔 책 ${saved.size}권`;
  try{ if(navigator.storage&&navigator.storage.estimate){
    const e=await navigator.storage.estimate();
    if(e&&e.usage) s+=`  ·  약 ${(e.usage/1048576).toFixed(0)}MB`;
  } }catch(e){}
  el.textContent=s;
  try{ const t=sizeTotal(); $('#capInfo').textContent=`· 지금 약 ${(t/1073741824).toFixed(2)}GB`; segSet('#segCap',P.cap||0); }catch(e){}
}
$('#btnClearDone').onclick=async()=>{
  const hit=[...saved].filter(i=>RD[i]&&RD[i].f);
  if(!hit.length){ toast('다 읽고 받아둔 책이 없습니다'); return; }
  if(!confirm(`다 읽은 책 ${hit.length}권의 파일을 지웁니다.\n읽은 기록은 그대로 남습니다.`)) return;
  for(const i of hit){ try{ await DB.del('books',i); saved.delete(i); }catch(e){} }
  toast(`${hit.length}권의 파일을 비웠습니다`); useInfo(); paintTabs(); render(true);
};
$('#btnClearBooks').onclick=async()=>{
  if(!saved.size){ toast('받아둔 파일이 없습니다'); return; }
  if(!confirm(`받아둔 파일 ${saved.size}권을 모두 지웁니다.\n읽은 기록은 그대로 남습니다.`)) return;
  await DB.clear('books'); saved.clear();
  toast('받아둔 파일을 비웠습니다'); useInfo(); paintTabs(); render(true);
};
$('#btnClearRead').onclick=()=>{
  const n=Object.keys(RD).length;
  if(!n){ toast('지울 기록이 없습니다'); return; }
  if(!confirm(`${n}권의 읽은 기록을 지웁니다.\n진도와 '다 읽음' 표시가 사라집니다.\n파일은 그대로 둡니다.`)) return;
  const now=Date.now(); Object.keys(RD).forEach(k=>RDEL[k]=now); saveDEL();
  RD={}; saveRD();
  try{ Object.keys(localStorage).filter(k=>k.indexOf('ebl_pos_')===0)
        .forEach(k=>localStorage.removeItem(k)); }catch(e){}
  TAB=''; localStorage.setItem('ebl_tab','');
  toast('읽은 기록을 지웠습니다'); paintTabs(); render(true);
};
/* ══════════ 홈 화면에 추가 ══════════
   아이패드는 애플이 길을 막아둬 사람이 직접 눌러야 합니다.
   안드로이드·PC 는 브라우저가 신호를 주므로 한 번에 됩니다.

   ★ 아이패드는 사파리와 홈 화면 앱의 저장 공간이 따로입니다.
     사파리에서 로그인하고 나중에 추가하면 처음부터 다시 해야 합니다.
     그래서 로그인 전에 먼저 묻습니다. */
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
function isInstalled(){
  return window.navigator.standalone===true
    || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
}
let addEvt=null;
addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); addEvt=e; });

function askAdd(strong){
  if(isInstalled())return;
  if(!strong && localStorage.getItem('ebl_addno')==='1')return;
  const T=$('#addT'), M=$('#addM'), S=$('#addSteps'), G=$('#addGo');
  S.innerHTML='';
  if(isIOS){
    T.textContent = strong ? '먼저 홈 화면에 추가해 주세요' : '앱처럼 쓰시겠어요?';
    M.innerHTML = strong
      ? '아이패드는 <b>사파리와 홈 화면 앱의 저장 공간이 따로</b>입니다.<br>'
        + '먼저 추가하지 않으면, 나중에 로그인부터 다시 하셔야 합니다.'
      : '홈 화면에 두면 전체 화면으로 열리고, 인터넷이 끊겨도 받아둔 책을 읽을 수 있습니다.';
    S.innerHTML = '<li>아래(또는 위)의 <span class="sh">⬆︎</span> 공유 단추를 누릅니다</li>'
      + '<li>목록을 내려 <b>홈 화면에 추가</b> 를 고릅니다</li>'
      + '<li>오른쪽 위 <b>추가</b> 를 누릅니다</li>'
      + '<li>홈 화면의 <b>서재</b> 아이콘으로 다시 엽니다</li>';
    G.style.display='none';
  }else{
    T.textContent='앱처럼 쓰시겠어요?';
    M.innerHTML='홈 화면(또는 앱 목록)에 두면 전체 화면으로 열리고, '
      +'인터넷이 끊겨도 받아둔 책을 읽을 수 있습니다.';
    if(addEvt){ G.style.display=''; G.textContent='홈 화면에 추가'; }
    else{
      G.style.display='none';
      S.innerHTML='<li>주소창 오른쪽의 <b>설치</b> 아이콘을 누릅니다</li>'
        + '<li>또는 메뉴 → <b>앱 설치</b> 를 고릅니다</li>';
    }
  }
  $('#addLater').textContent = strong ? '그래도 지금 할게요' : '나중에';
  $('#addNever').style.display = strong ? 'none' : '';
  $('#addSheet').classList.add('on');
}
$('#addGo').onclick=async()=>{
  if(!addEvt){ $('#addSheet').classList.remove('on'); return; }
  const e=addEvt; addEvt=null;
  e.prompt();
  try{ const r=await e.userChoice;
    if(r&&r.outcome==='accepted')toast('추가했습니다'); }catch(x){}
  $('#addSheet').classList.remove('on');
};
$('#addLater').onclick=()=>$('#addSheet').classList.remove('on');
$('#addNever').onclick=()=>{ localStorage.setItem('ebl_addno','1');
  $('#addSheet').classList.remove('on'); toast('⚙ 에서 다시 부르실 수 있습니다'); };

/* ── 누구인가 ──
   겉으로는 이름, 속으로는 번호로 다룹니다.
   이름을 바꿔도 번호가 그대로라 읽은 기록이 따라옵니다. */
const newId=()=>Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-3);
let ME={ id:localStorage.getItem('ebl_meid')||'', name:localStorage.getItem('ebl_mename')||'',
         grp:localStorage.getItem('ebl_megrp')||'', grpN:localStorage.getItem('ebl_megrpn')||'' };
if(!ME.id){ ME.id=newId(); localStorage.setItem('ebl_meid',ME.id); }
function setMe(name){
  ME.name=String(name||'').trim().slice(0,20);
  localStorage.setItem('ebl_mename',ME.name);
  localStorage.setItem('ebl_menameat',String(Date.now()));
}
if(!ME.name) setMe('나');

/* 팀장님 기기에만 두는 명단 — 누구에게 링크를 보냈는지 */
let MATES=[]; try{ MATES=JSON.parse(localStorage.getItem('ebl_mates')||'[]'); }catch(e){}
const saveMates=()=>{ try{ localStorage.setItem('ebl_mates',JSON.stringify(MATES));
  localStorage.setItem('ebl_matesat',String(Date.now())); }catch(e){} try{ syncSoon(); }catch(e){} };   // v44 — 명단도 팀장님 기기끼리 맞춤
function addMate(name,grp){
  const m={ id:newId(), name:name, at:Date.now(), grp:grp||'' };
  MATES.push(m); saveMates(); return m;
}

/* ── 초대 링크 ──
   설정 세 칸과 이름·번호를 주소 뒤에 실어 보냅니다.
   받는 쪽은 링크를 누르는 것만으로 준비가 끝납니다. */
const b64=o=>btoa(unescape(encodeURIComponent(JSON.stringify(o))))
  .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64=t=>JSON.parse(decodeURIComponent(escape(
  atob(t.replace(/-/g,'+').replace(/_/g,'/')))));
function inviteLink(m){
  const o={u:cfg('url'),t:cfg('tok'),c:cfg('cid')};
  if(cfg('fol'))o.f=cfg('fol');
  if(m){ o.n=m.name; o.i=m.id;
    if(m.grp){ o.g=m.grp; o.gn=(GROUPS.find(x=>x.id===m.grp)||{}).name||''; } }
  return location.origin+location.pathname+'#s='+b64(o);
}
/* ── 한 사람만 끊기 ──
   토큰을 바꾸면 온 가족이 다시 설정해야 합니다.
   대신 그 사람의 번호를 Apps Script 에 알려 목록부터 막습니다. */
let CUT={};                       // 지금 끊긴 사람들 {번호:{name,at}}
$('#cutClose').onclick=()=>$('#cutSheet').classList.remove('on');
function showCut(){ $('#cutSheet').classList.add('on'); }
async function admin(mode,m){
  const adm=cfg('adm');
  if(!adm){ toast('먼저 ⚙ 에 관리자 열쇠를 넣어주세요',5000); return null; }
  let u=cfg('url')+(cfg('url').includes('?')?'&':'?')+'token='+encodeURIComponent(cfg('tok'))
    +'&mode='+mode+'&admin='+encodeURIComponent(adm);
  if(m) u+='&uid='+encodeURIComponent(m.id)+'&name='+encodeURIComponent(m.name);
  const r=await fetch(u);
  const d=await r.json();
  if(d.error==='admin_required'){ toast('관리자 열쇠가 맞지 않습니다',5000); return null; }
  if(d.error){ toast(d.error,5000); return null; }
  CUT=d.blocked||{};
  return d;
}
async function loadCut(){ if(cfg('adm')){ try{ await admin('blocklist'); paintMates(); }catch(e){} } }
/* 팀장님 명단·모임을 서버에서 받아옵니다 — 기기를 바꿔도 이어집니다 */
async function loadMembers(){
  if(!cfg('adm'))return;
  const d=await admin2('fammembers');
  if(!d)return;
  if(d.groups){ GROUPS=Object.keys(d.groups).map(id=>({id:id,name:d.groups[id]})); saveGroups(); }
  if(d.members){ MATES.forEach(m=>{ if(d.members[m.id])m.grp=d.members[m.id]; }); saveMates(); }
  paintGrps(); paintMates(); paintSeg();
}

function paintMates(){
  const el=$('#mateList'); if(!el)return;
  el.innerHTML='';
  if(!MATES.length)return;
  const f=document.createDocumentFragment();
  MATES.forEach((m,k)=>{
    const off=!!CUT[m.id];
    const d=document.createElement('div'); d.className='mate'+(off?' off':'');
    const gn=m.grp?grpName(m.grp):'';
    const kr=kidOf(m.id), seen=lastSeen(m.id);
    d.innerHTML=`<span>${esc(m.name)}`
      +(gn?` <i style="font-style:normal;color:var(--dim);font-size:11px">${esc(gn)}</i>`:'')
      +(kr?' <i class="seen">🧒 아이 칸</i>':'')
      +(seen?` <i class="seen">· ${esc(seen)}</i>`:'')
      +`${off?' <b>⛔ 끊김</b>':''}</span>`;
    const wrap=document.createElement('span'); wrap.className='b';
    if(!off){
      const send=document.createElement('button'); send.textContent='링크 다시 보내기';
      send.onclick=()=>openInvite(m); wrap.appendChild(send);
    }
    if(!off){ const kb=document.createElement('button'); kb.textContent='아이 칸';
      kb.onclick=()=>openKid(m); wrap.appendChild(kb); }
    const cut=document.createElement('button');
    cut.textContent=off?'풀기':'차단'; if(!off)cut.className='warn';
    cut.onclick=async()=>{
      if(!off && !confirm(`'${m.name}' 의 이용을 끊습니다.\n목록도 책도 못 보게 됩니다.`))return;
      const d2=await admin(off?'unblock':'block',m);
      if(d2){ paintMates(); toast(off?`'${m.name}' 을 풀었습니다`:`'${m.name}' 을 끊었습니다`); }
    };
    if(GROUPS.length&&!off){
      const mv=document.createElement('button'); mv.textContent='모임';
      mv.onclick=async()=>{
        const g=await pickGrp(`'${m.name}' 을 어느 모임으로?`);
        if(g===null)return;
        const d2=await admin2('famjoin','&uid='+encodeURIComponent(m.id)
          +'&g='+encodeURIComponent(g||'-'));
        if(d2){ m.grp=g||''; saveMates(); paintMates();
          toast(g?`'${grpName(g)}' 으로 옮겼습니다`:'모임에서 뺐습니다'); }
      };
      wrap.appendChild(mv);
    }
    const del=document.createElement('button'); del.textContent='지우기'; del.className='warn';
    del.onclick=()=>{ if(confirm(`명단에서 '${m.name}' 을 지웁니다.\n끊은 것은 그대로 남습니다.`)){
      MATES.splice(k,1); saveMates(); paintMates(); } };
    wrap.append(cut,del); d.appendChild(wrap);
    f.appendChild(d);
  });
  el.appendChild(f);
}
/* 아이패드는 브라우저 prompt 가 뜨면 '사용자가 누른 것' 으로 안 칩니다.
   그 뒤로는 공유도 복사도 막히므로, 창을 앱 안쪽 것으로 씁니다. */
let invM=null;
let invG='';
function paintInvGrp(){
  const w=$('#invGrpWrap'), e=$('#invGrp');
  w.style.display=GROUPS.length?'block':'none';
  if(!GROUPS.length)return;
  e.innerHTML='';
  const add=(id,name)=>{ const b=document.createElement('button');
    b.className='chip'+(invG===id?' on':''); b.textContent=name;
    b.onclick=()=>{ invG=id; paintInvGrp(); }; e.appendChild(b); };
  GROUPS.forEach(g=>add(g.id,g.name));
  add('','모임 없이');
}
function openInvite(m){
  invM=m||null;
  invG = m ? (m.grp||'') : (VIEWG||(GROUPS[0]||{}).id||'');
  paintInvGrp();
  $('#invName').value = m?m.name:'';
  $('#invDone').style.display = m?'block':'none';
  if(m){ $('#invFor').textContent=`'${m.name}' 에게 보낼 링크`;
         $('#invLink').value=inviteLink(m); }
  $('#invSheet').classList.add('on');
  if(!m)setTimeout(()=>$('#invName').focus(),250);
}
$('#btnInvite').onclick=()=>openInvite(null);
$('#invClose').onclick=()=>$('#invSheet').classList.remove('on');
$('#invMake').onclick=()=>{
  const nm=$('#invName').value.trim();
  if(!nm){ toast('이름을 적어주세요'); return; }
  invM=addMate(nm,invG); paintMates();
  if(invG) admin2('famjoin','&uid='+encodeURIComponent(invM.id)
    +'&g='+encodeURIComponent(invG));
  $('#invFor').textContent=`'${nm}' 에게 보낼 링크`;
  $('#invLink').value=inviteLink(invM);
  $('#invDone').style.display='block';
  log('초대 링크('+nm+') 만듦');
};
/* 아래 두 개는 '누른 그 순간' 에 바로 부릅니다. 사이에 기다리는 것을 두면 막힙니다. */
$('#invSend').onclick=()=>{
  if(!invM)return;
  const L=inviteLink(invM);
  const msg=`${invM.name} 우리 서재예요.\n이 링크를 누르면 바로 쓸 수 있어요.\n\n${L}`;
  if(navigator.share){
    navigator.share({title:'우리집 서재',text:msg})
      .catch(e=>{ if(e&&e.name!=='AbortError')toast('보내지 못했습니다.\n[복사] 를 눌러보세요',4000); });
  } else { $('#invCopy').click(); }
};
$('#invCopy').onclick=()=>{
  const el=$('#invLink');
  el.focus(); el.setSelectionRange(0, el.value.length);
  let ok=false;
  try{ ok=document.execCommand('copy'); }catch(e){}
  if(!ok&&navigator.clipboard){
    navigator.clipboard.writeText(el.value)
      .then(()=>toast('복사했습니다'))
      .catch(()=>toast('아래 칸을 눌러 직접 골라 복사해 주세요',5000));
    return;
  }
  toast(ok?'복사했습니다':'아래 칸을 눌러 직접 골라 복사해 주세요',ok?2600:5000);
};
/* 링크를 타고 들어왔으면 설정을 채워 넣습니다 */
(function(){
  const m=location.hash.match(/^#s=(.+)$/); if(!m)return;
  try{
    const o=unb64(m[1]);
    if(o.u)setCfg('url',o.u); if(o.t)setCfg('tok',o.t); if(o.c)setCfg('cid',o.c);
    if(o.f)setCfg('fol',o.f);
    if(o.i){ ME.id=o.i; localStorage.setItem('ebl_meid',o.i); }
    if(o.g){ setMyGroup(o.g,o.gn||''); setTimeout(paintSeg,300); }
    if(o.n) setMe(o.n);
    history.replaceState(null,'',location.pathname);   // 주소창에서 토큰을 지웁니다
    setTimeout(()=>{
      toast((o.n?o.n+' 님, 반갑습니다.\n':'설정을 받았습니다.\n')
        +'🔑 를 눌러 구글에 로그인해 주세요',6000);
      // 로그인보다 먼저 — 아이패드는 사파리와 앱의 저장 공간이 다릅니다
      setTimeout(()=>askAdd(true),1400);
    },900);
  }catch(e){}
})();

$('#sMe').addEventListener('change',()=>{
  const v=$('#sMe').value.trim(); if(!v)return;
  setMe(v); toast(`이제 '${ME.name}' 으로 보입니다`); syncSoon();
});
$('#btnFam').onclick=async()=>{
  toast('모임 칸을 확인하는 중…');
  await famLoad();
  const n={ shelf:0, shelfbook:0, rec:0, req:0, note:0 };
  FAM.forEach(o=>{ if(n[o['종류']]!=null)n[o['종류']]++; });
  paintFam();
  toast(`모임 칸 ${FAM.length}줄\n서가 ${n.shelf} · 담긴 책 ${n.shelfbook}`
    +`\n권함 ${n.rec} · 요청 ${n.req} · 한 줄 평 ${n.note}`,6000);
};
function paintFam(){
  const el=$('#famInfo'); if(!el)return;
  el.textContent = FAMAT ? '  ·  '+FAM.length+'줄 · '+new Date(FAMAT).toLocaleString('ko-KR',
    {month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '  ·  아직 안 받음';
}
$('#btnSync').onclick=()=>syncNow(true);
$('#btnSyncAuto').onclick=()=>{
  P.sync = P.sync===false; savePref(); paintSyncAuto();
  toast(P.sync!==false?'앱을 열고 닫을 때 저절로 맞춥니다':'이제 [지금 맞추기] 를 누르실 때만 맞춥니다');
};
function paintSyncAuto(){
  $('#btnSyncAuto').textContent='자동으로 맞추기: '+(P.sync===false?'끔':'켬');
}

/* 서비스 워커가 옛 화면을 붙들고 있을 때 빠져나오는 길 */
/* 기기를 바꿨을 때 — 손으로 옮겨 적지 않아도 됩니다 */
$('#btnPullCfg').onclick=async()=>{
  if(!gisReady)onGis();
  toast('구글 계정에서 찾는 중…');
  const r=await pullCfg(true);
  if(r===true){ toast('설정을 받았습니다.\n새로 시작합니다…',2500);
    setTimeout(()=>location.reload(),1200); return; }
  toast('가져오지 못했습니다\n'+r,6000);
};
$('#btnLogin2').onclick=async()=>{
  if(!gisReady)onGis();
  try{ await needTokenAny(); toast('로그인됐습니다'); }
  catch(e){ toast(e.message||String(e),5000); }
  paintLogin();
};
$('#btnForget').onclick=()=>{
  if(!confirm('기억해 둔 구글 로그인을 지웁니다.\n다음에 여실 때 한 번 로그인하시면 됩니다.'))return;
  try{ localStorage.removeItem('ebl_auth'); }catch(e){}
  TOKEN=''; AUTHWHY='기억을 지웠습니다'; markLogin(false); paintLogin();
  toast('지웠습니다');
};
$('#btnAdd').onclick=()=>{
  pgClose();
  if(isInstalled()){ toast('이미 홈 화면에서 열고 계십니다'); return; }
  localStorage.removeItem('ebl_addno');
  setTimeout(()=>askAdd(false),260);
};
$('#btnFresh').onclick=async()=>{
  toast('앱 파일을 새로 받는 중…');
  try{ const ks=await caches.keys(); await Promise.all(ks.map(k=>caches.delete(k))); }catch(e){}
  try{ const rs=await navigator.serviceWorker.getRegistrations();
       await Promise.all(rs.map(r=>r.unregister())); }catch(e){}
  setTimeout(()=>location.reload(true),600);
};
$('#btnClearAll').onclick=async()=>{
  if(!confirm('파일·읽은 기록·목록·보기 설정을 모두 지웁니다.\n연결 설정(주소·토큰)은 남겨 둡니다.\n계속할까요?')) return;
  await DB.clear('books'); await DB.clear('kv');
  const keep={url:1,tok:1,cid:1};
  try{ Object.keys(localStorage)
        .filter(k=>k.indexOf('ebl_')===0 && !keep[k.slice(4)])
        .forEach(k=>localStorage.removeItem(k)); }catch(e){}
  sessionStorage.clear(); toast('초기화했습니다'); setTimeout(()=>location.reload(),800); };

window.addEventListener('error',e=>log('오류: '+e.message));
window.addEventListener('unhandledrejection',e=>log('오류(비동기): '+(e.reason?.message||e.reason)));

log('빌드 '+BUILD);
applyRead();
/* 담아둔 표가 살아 있으면 초록으로 시작합니다.
   전에는 여기서 무조건 빨갛게 칠해, 이어온 로그인을 도로 지웠습니다. */
markLogin(tokenLive());
(async()=>{ await boot(); paintSeg(); paintTabs(); buildChips(); render(true);
  setTimeout(()=>syncSoon(),2500);   // 목록이 자리를 잡은 뒤 조용히 맞춥니다
  setTimeout(()=>{ famLoad(); },3200);
  setTimeout(()=>askAdd(false),4000);
})();
/* ══════════ v52 — 저절로 새 버전 ══════════
   새 서비스 워커가 자리를 잡으면(controllerchange) 바로 다시 엽니다.
   단, 책을 읽는 중·창이 떠 있음·글을 쓰는 중이면 기다렸다가 끝나면 바꿉니다. */
var UPD={pending:0,hadCtl:false,reg:null,latest:'',told:0,t:0};
function updSafe(){ return !curB && !document.querySelector('.sheet.on') && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement||{}).tagName||''); }
function updApply(){ if(!UPD.pending)return;
  if(updSafe()){ try{ saveRD.now(); saveHL.now(); saveDAYS.now(); }catch(e){}
    try{ sessionStorage.setItem('ebl_updfrom',BUILD); }catch(e){} location.reload(); return; }
  if(!UPD.told){ UPD.told=1; toast(curB?'새 버전이 왔습니다 — 책을 닫으면 바뀝니다':'새 버전이 왔습니다 — 하던 일을 마치면 바뀝니다',5000); }
  clearTimeout(UPD.t); UPD.t=setTimeout(updApply,20000); }
async function updCheck(){ try{ if(UPD.reg)await UPD.reg.update(); }catch(e){} }
async function updLatest(){ try{ const t=await (await fetch('sw.js?'+Date.now(),{cache:'no-store'})).text();
  const m=/ebl-(v[\w.]+)/.exec(t); UPD.latest=m?m[1]:''; }catch(e){ UPD.latest=''; } return UPD.latest; }
/* v55.7 — 판 번호 크기 비교 ('v55.10' > 'v55.9') */
function verCmp(a,b){ const x=String(a||'').replace(/^v/,'').split('.').map(Number), y=String(b||'').replace(/^v/,'').split('.').map(Number);
  for(let i=0;i<Math.max(x.length,y.length);i++){ const d=(x[i]||0)-(y[i]||0); if(d)return d>0?1:-1; } return 0; }
async function paintVer(){ const el=$('#verLine'); if(!el)return; el.textContent=`지금 ${BUILD} · 새 버전 확인 중…`;
  const v=await updLatest();
  if(!v){ el.textContent=`지금 ${BUILD} · 인터넷이 안 돼 확인하지 못했습니다`; return; }
  if(v===BUILD||verCmp(v,BUILD)<0){ el.textContent=`지금 ${BUILD} · 최신입니다. 새 버전은 저절로 받아 바뀝니다`; return; }   // v55.7 — 서버가 잠깐 예전 판을 줘도 '새 판'이라 하지 않음
  el.textContent=`지금 ${BUILD} · 새 ${v} 를 받는 중 — 설정을 닫으면 바뀝니다`; updCheck(); }
if('serviceWorker' in navigator){
  UPD.hadCtl=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(!UPD.hadCtl){ UPD.hadCtl=true; return; }      // 처음 설치 — 다시 열 필요 없음
    if(UPD.pending)return; UPD.pending=1; updApply(); });
  navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(r=>{ UPD.reg=r; r.update(); }).catch(()=>{});
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden)updCheck(); else if(UPD.pending&&updSafe())updApply(); });
  setInterval(updCheck,3600000);
}
try{ const f=sessionStorage.getItem('ebl_updfrom'); if(f){ sessionStorage.removeItem('ebl_updfrom');
  if(f!==BUILD)setTimeout(()=>toast(`새 버전으로 바뀌었습니다 · ${f} → ${BUILD}`,4000),1500); } }catch(e){}
