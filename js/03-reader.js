/* 우리 도서관 — js/03-reader.js
   리더 · EPUB · 형광펜 · 긋기
   ※ 모든 파일이 같은 전역을 나눠 씁니다. index.html 에 적힌 순서(01 → 12)대로 불러와야 합니다. */
/* ── 리더 ── */
let book=null,rend=null,curB=null;
let noMark=false;   // 이 책은 닫을 때까지 읽은 기록을 남기지 않습니다
let KIND='epub';    // 지금 열린 것이 epub / pdf / txt 중 무엇인지
/* v56 — 글꼴. 고를 때만 받아 옵니다 (구글 글꼴은 화면에 나온 글자 조각만 받습니다).
   EPUB 은 책 안쪽(iframe)에도 같은 글꼴 링크를 넣어야 합니다 — fontInto(문서). */
const FONTS={
  nmj:   {n:'나눔명조',   fam:"'Nanum Myeongjo',serif",       css:'https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700&display=swap'},
  nserif:{n:'본명조',     fam:"'Noto Serif KR',serif",        css:'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;600;700&display=swap'},
  gowun: {n:'고운바탕',   fam:"'Gowun Batang',serif",         css:'https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&display=swap'},
  hahm:  {n:'함렛',       fam:"'Hahmlet',serif",              css:'https://fonts.googleapis.com/css2?family=Hahmlet:wght@400;500;600;700&display=swap'},
  pret:  {n:'프리텐다드', fam:"'Pretendard Variable',Pretendard,-apple-system,sans-serif", css:'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css'},
  ngo:   {n:'나눔고딕',   fam:"'Nanum Gothic',sans-serif",    css:'https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700&display=swap'},
  gdodum:{n:'고운돋움',   fam:"'Gowun Dodum',sans-serif",     css:'https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap'},
  mine:  {n:'내 글꼴',    fam:"'EBL Mine',serif"}
};
let MINEURL='', MINEN='';
function fontFam(txt){
  if(P.font==='sans') return txt?'-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR",sans-serif':'-apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif';
  if(P.font==='serif') return txt?'"Apple SD Gothic Neo",AppleMyungjo,"Nanum Myeongjo",serif':'"Apple SD Gothic Neo","Nanum Myeongjo",serif';
  const f=FONTS[P.font]; if(!f) return '';
  if(P.font==='mine'&&!MINEURL) return '';
  return f.fam;
}
function fontInto(doc){
  try{ if(!doc||!doc.head) return;
    const f=FONTS[P.font];
    if(f&&f.css){ let l=doc.getElementById('eblFont');
      if(!l){ l=doc.createElement('link'); l.id='eblFont'; l.rel='stylesheet'; doc.head.appendChild(l); }
      if(l.getAttribute('href')!==f.css) l.setAttribute('href',f.css); }
    if(P.font==='mine'&&MINEURL&&!doc.getElementById('eblMine')){
      const st=doc.createElement('style'); st.id='eblMine';
      st.textContent=`@font-face{font-family:'EBL Mine';src:url(${MINEURL});font-display:swap}`;
      doc.head.appendChild(st); }
  }catch(e){}
}
function fontAll(){ fontInto(document); try{ if(rend) rend.getContents().forEach(c=>fontInto(c.document)); }catch(e){} }
async function mineLoad(){
  try{ const v=await DB.get('kv','font:mine'); if(!v||!v.buf) return false;
    if(MINEURL) URL.revokeObjectURL(MINEURL);
    MINEURL=URL.createObjectURL(new Blob([v.buf],{type:v.type||'font/ttf'})); MINEN=v.name||'';
    $$('#eblMine').forEach(x=>x.remove());
    return true; }catch(e){ return false; }
}
function paintFontUi(){
  const sel=$('#selFont'); if(!sel) return;
  sel.value=FONTS[P.font]?P.font:'';
  const om=$('#optMine'); if(om){ om.disabled=!MINEURL; om.textContent=MINEURL?('내 글꼴 — '+(MINEN||'파일')):'내 글꼴 (아직 없음)'; }
  const d=$('#fontMineDel'); if(d) d.style.display=MINEURL?'':'none';
}
function paperCss(){
  const c={light:{bg:'#ffffff',fg:'#16181c',a:'#1a56b8'},
           sepia:{bg:'#f6efe2',fg:'#3b3228',a:'#8a5a1f'},
           night:{bg:'#15181c',fg:'#c7ccd4',a:'#7fb3ff'},
           eink:{bg:'#ffffff',fg:'#000000',a:'#000000'}}[P.theme]
         ||{bg:'#ffffff',fg:'#16181c',a:'#1a56b8'};
  const fam = fontFam(false);
  // 좌우 여백은 바깥 틀(#page)에서 줍니다. 여기서 padding 을 주면 단 나누기가 어긋납니다.
  const body={ background:c.bg+' !important', color:c.fg+' !important',
    'padding-left':'0 !important', 'padding-right':'0 !important',
    'margin-left':'0 !important', 'margin-right':'0 !important',
    'line-height':(P.lh/100)+' !important' };
  if(fam) body['font-family']=fam+' !important';
  const txt={ color:c.fg+' !important', 'line-height':(P.lh/100)+' !important' };
  if(P.ls){ body['letter-spacing']=(P.ls/100)+'em !important'; txt['letter-spacing']=(P.ls/100)+'em !important'; }
  if(fam) txt['font-family']=fam+' !important';
  if(P.fw){ body['font-weight']=P.fw+' !important'; txt['font-weight']=P.fw+' !important'; }
  return { 'html, body':{background:c.bg+' !important'}, body,
    'p, div, span, li, td, th, dd, dt, blockquote':txt,
    '::selection':{background:'rgba(110,168,254,0.32)'},
    'img, svg':{'max-width':'100% !important',height:'auto !important'},
    'a':{color:c.a+' !important'} };
}
function applyRead(){
  try{ if(FONTS[P.font]) fontAll(); }catch(e){}
  document.body.classList.remove('sepia','night','eink');
  if(P.theme!=='light')document.body.classList.add(P.theme);
  document.body.classList.toggle('nofoot',!!P.nofoot);
  document.documentElement.style.setProperty('--tap',P.tap+'%');
  document.documentElement.style.setProperty('--pv',P.pv+'px');
  document.documentElement.style.setProperty('--ph',P.pd+'%');
  $('#tapL').style.display=$('#tapR').style.display=
    (KIND==='epub'&&P.nav!=='swipe')?'block':'none';
  // TXT 도 글자 설정을 그대로 따릅니다
  const tb=$('#txt .body');
  // v38 — 글자 크기·자간·줄 간격을 바꿔도 읽던 자리(비율)를 지킵니다
  const th=$('#txt'), tmax0=th?th.scrollHeight-th.clientHeight:0, tpos=tmax0>0?th.scrollTop/tmax0:-1;
  if(tb){ tb.style.letterSpacing=P.ls?(P.ls/100)+'em':'';
    tb.style.fontSize=(15*P.fs/100).toFixed(1)+'px';
    tb.style.lineHeight=(P.lh/100);
    tb.style.fontFamily=fontFam(true);
    tb.style.fontWeight=P.fw?String(P.fw):'';
    if(KIND==='txt'&&tpos>=0){ const m1=th.scrollHeight-th.clientHeight; if(m1>0)th.scrollTop=tpos*m1; } }
  $('#vZoom').textContent=P.zoom+'%'; $('#rgZoom').value=P.zoom;
  segSet('#segPnav',P.pnav);
  if(rend){ rend.themes.register('paper',paperCss()); rend.themes.select('paper');
    rend.themes.fontSize(P.fs+'%');
    // 틀 크기가 바뀌었으니 다시 계산 (안 하면 글이 잘립니다)
    // 슬라이더를 미는 동안 수십 번 불리므로 잠깐 모아서 한 번만
    clearTimeout(applyRead._r);
    applyRead._r=setTimeout(()=>{ requestAnimationFrame(()=>{
      try{ rend.resize(); }catch(e){}
      setTimeout(paintEpubHl,160); }); }, 120);
  }
  $('#vFs').textContent=P.fs+'%'; $('#vLh').textContent=(P.lh/100).toFixed(2);
  $('#vLs').textContent=P.ls?(P.ls>0?'+':'')+(P.ls/100).toFixed(2)+'em':'보통'; $('#rgLs').value=P.ls||0;
  $('#vPd').textContent=P.pd+'%'; $('#vPv').textContent=P.pv+'px'; $('#vTap').textContent=P.tap+'%';
  segSet('#segTheme',P.theme); segSet('#segFont',P.font); segSet('#segNav',P.nav);
  try{ paintFontUi(); segSet('#segBkp',BKG?1:0); $('#bkpNote').textContent=BKG?'· 지금 이 책만의 설정입니다':'· 종이색·글자 설정'; }catch(e){}
  segSet('#segFw',P.fw||''); segSet('#segFoot',P.nofoot||0); segSet('#segClean',P.tclean||0); segSet('#segJunk',P.junk||0); segSet('#segResume',P.resume||0); segSet('#segWheel',P.wheel||'page'); segSet('#segSideBtn',P.sidebtn||'page'); paintJunkN();
  $('#rgFs').value=P.fs; $('#rgLh').value=P.lh; $('#rgPd').value=P.pd;
  $('#rgPv').value=P.pv; $('#rgTap').value=P.tap;
  try{ if(P.ruler)applyRuler(); }catch(e){}
}
let EPLOC=null;     // EPUB 에서 지금 펼친 쪽의 처음·끝 (책갈피가 씁니다)
/* v55.4 — EPUB 진도
   epub.js 는 책 전체 '위치표'(locations)가 있어야 % 를 셉니다. 예전엔 위치표를 만들지 않아 늘 0% 였습니다.
   ① 위치표가 있으면 그것으로 정확하게  ② 없으면 장 순서로 어림: (지금 장 번호 + 장 안 쪽 비율) ÷ 전체 장 수
   위치표는 책을 연 뒤 뒤에서 만들고, 기기 저장소(kv 'loc:책ID')에 남겨 다음부터는 바로 씁니다 (최근 80권까지) */
const LOC_KEEP=80;
function epPct(loc){
  const s=loc&&loc.start; if(!s) return null;
  if(loc.atEnd) return 1;
  try{ if(book&&book.locations&&book.locations.length()>0&&s.cfi){
    const v=book.locations.percentageFromCfi(s.cfi); if(v!=null&&!isNaN(v)) return Math.max(0,Math.min(1,v)); } }catch(e){}
  let n=0; try{ n=(book&&book.spine&&(book.spine.length||(book.spine.spineItems||[]).length))||0; }catch(e){}
  if(!n||s.index==null) return null;
  const d=s.displayed||{}, inCh=d.total>0?Math.max(0,(d.page||1)-1)/d.total:0;
  return Math.max(0,Math.min(1,(s.index+inCh)/n));
}
function epFoot(b,loc,p){
  if(curB!==b) return;
  const st=stOf(b);
  $('#rfoot').textContent=(p!=null?Math.round(p*100)+'%  ·  ':'')
    +(noMark?'기록 안 함  ·  ':(st==='done'?'다 읽음  ·  ':''))+leftStr(loc)+(b.t||'');
}
async function epLocations(b,bk){
  const live=()=>book===bk&&curB===b&&rend;
  try{
    await bk.ready; if(!live()) return;
    let sv=null; try{ sv=await DB.get('kv','loc:'+b.i); }catch(e){}
    if(!live()) return;
    if(sv&&sv.v===1&&sv.l){ bk.locations.load(sv.l); }
    else{
      await new Promise(r=>setTimeout(r,1500));        // 첫 쪽을 먼저 그린 뒤에
      if(!live()) return;
      await bk.locations.generate(1600);
      if(!live()) return;
      const saved=bk.locations.save();
      DB.put('kv','loc:'+b.i,{v:1,l:saved,t:Date.now()}).catch(()=>{});
      try{ let q=JSON.parse(localStorage.getItem('ebl_locs')||'[]').filter(x=>x!==b.i); q.push(b.i);
        while(q.length>LOC_KEEP){ const old=q.shift(); DB.del('kv','loc:'+old).catch(()=>{}); }
        localStorage.setItem('ebl_locs',JSON.stringify(q)); }catch(e){}
    }
    const loc=EPLOC; if(!live()||!loc||!loc.start) return;
    const p=epPct(loc);
    if(!noMark&&p!=null) markRead(b.i,p,loc.atEnd);
    epFoot(b,loc,p);
  }catch(e){ try{ log('위치표 만들기 실패: '+(e.message||e)); }catch(_){} }
}
async function showReader(b,buf){
  curB=b; noMark=false; KIND='epub'; EPLOC=null;
  openShell(b);
  book=ePub(buf);
  rend=book.renderTo('page',{width:'100%',height:'100%',flow:'paginated',spread:'none'});
  try{ rend.hooks.content.register(c=>fontInto(c.document)); }catch(e){}   // v56 — 고른 글꼴을 책 안쪽에도
  try{ book.coverUrl().then(u=>{ if(u)saveCover(b.i,u); }).catch(()=>{}); }catch(e){}
  applyRead();
  const cfi=(RD[b.i]&&RD[b.i].c)||localStorage.getItem('ebl_pos_'+b.i);   // v55.5 — 다른 기기에서 읽던 자리
  const myBook=book;
  rend.on('relocated',loc=>{
    EPLOC=loc; paintBmBtn();
    if(TTS.on&&!TTS.turning&&TTS.playing&&KIND==='epub')ttsManualTurn();
    const p=epPct(loc);
    if(!noMark){
      if(loc?.start?.cfi){ localStorage.setItem('ebl_pos_'+b.i,loc.start.cfi);
        const r=RD[b.i]||(RD[b.i]={}); if(r.c!==loc.start.cfi){ r.c=loc.start.cfi; r.pt=Date.now(); } }
      markRead(b.i, p, loc&&loc.atEnd);
    }
    try{ pageTick(loc); rulerTop(); }catch(e){}
    epFoot(b,loc,p);
  });
  try{ await rend.display(cfi||undefined); }catch(e){ await rend.display(); }
  markRead(b.i,null);            // 연 것만으로 '읽는 중'에 들어갑니다
  epLocations(b,myBook);         // v55.4 — 뒤에서 위치표를 만들어 정확한 % 로 바꿉니다
  // 책 안쪽(iframe)에만 붙입니다. 바깥 문서는 아래에서 한 번만 붙여둡니다.
  rend.on('rendered',(s,i)=>{ try{ bindGestures(i.document); bindDrawEpub(i); }catch(e){} try{ bindNotes(i); }catch(e){} });
  bindEpubSelect();
  paintHlBadge();
  // 쪽을 그릴 때·넘길 때·글자 크기를 바꿀 때 모두 다시 칠합니다
  rend.on('rendered', ()=>setTimeout(paintEpubHl,60));
  rend.on('relocated',()=>setTimeout(paintEpubHl,60));
  setTimeout(paintEpubHl,120);
}

/* ══════════ 형광펜 · 메모 ══════════
   HL[책ID] = [ {i:번호, k:'epub'|'pdf', c:CFI 또는 {p:쪽,r:[상자들]},
                 t:'그은 글', n:'메모', col:'y', at:시각, pos:진도} ] */
let HL={}; try{ HL=JSON.parse(localStorage.getItem('ebl_hl')||'{}'); }catch(e){ HL={}; }
const saveHL=(()=>{ let t=null;
  const flush=()=>{ t=null; try{ localStorage.setItem('ebl_hl',JSON.stringify(HL)); }
    catch(e){ toast('메모를 저장하지 못했습니다. 저장 공간이 모자랍니다',5000); } };
  const f=()=>{ if(!t)t=setTimeout(flush,500); }; f.now=()=>{ if(t)clearTimeout(t); flush(); };
  return f; })();
addEventListener('pagehide',()=>saveHL.now());
const COLS={ y:'#ffe14d', g:'#8ef0a0', b:'#8ec8ff', p:'#ffa8c8' };
const hlOf=id=>HL[id]||[];
/* 책갈피도 HL 안에 k:'bm' 으로 함께 삽니다.
   그래야 기기끼리 맞추기·지운 표시(DEL)를 따로 만들지 않고 그대로 씁니다.
   대신 형광펜만 다루는 곳에서는 반드시 hlOnly 를 씁니다. */
const isBm=o=>!!o&&o.k==='bm';
const hlOnly=id=>hlOf(id).filter(o=>!isBm(o));
const bmOf=id=>hlOf(id).filter(isBm);
function hlAdd(o){
  if(!curB)return null;
  const a=HL[curB.i]||(HL[curB.i]=[]);
  o.i=Date.now()+'-'+Math.random().toString(36).slice(2,7);
  o.at=Date.now();
  if(typeof o.t==='string')o.t=o.t.replace(/\u200B/g,'');
  if(curB.t)o.bt=curB.t;          // 모아보기에서 목록에 없는 책도 이름이 나오도록
  a.push(o); saveHL(); return o;
}
function hlDel(id){
  if(!curB)return;
  const a=HL[curB.i]||[]; const k=a.findIndex(x=>x.i===id);
  if(k<0)return;
  const o=a[k]; a.splice(k,1);
  if(!a.length)delete HL[curB.i];
  DEL[o.i]=Date.now(); saveDEL(); saveHL();
  if(isBm(o)) paintBmBtn();
  else if(o.k==='epub') paintEpubHl();
  else if(o.k==='pdf') paintPdfHl();
  else paintTxtHl();
  paintHlBadge();
}
function repaintHl(o){
  if(o.k==='epub')paintEpubHl(); else if(o.k==='pdf')paintPdfHl(); else paintTxtHl();
}
function hlGet(id){ return (curB&&HL[curB.i]||[]).find(x=>x.i===id); }

/* 그은 글 위에 뜨는 막대 */
let PICK=null;  // {k, c, t, pos} — 그었지만 아직 저장 전
let PICKBOX=null;  // 그은 글이 화면에서 차지하는 자리
/* 막대 자리 잡기
   사파리 기본 메뉴는 고른 글 '위'에 붙는 것이 보통이고,
   위에 자리가 없을 때만 아래로 내려옵니다. 그 눈치를 보고 비킵니다. */
const MENU_H=52;          // 사파리 메뉴가 차지하는 높이쯤
function selbarAt(){
  const b=$('#selbar'); b.classList.add('on');
  $('#selpv').textContent = PICK&&PICK.t ? '"'+PICK.t.replace(/\s+/g,' ').slice(0,40)+'"' : '';
  try{ selHanjaPv(); }catch(e){}
  b.style.bottom='auto';
  const h=b.offsetHeight||44;
  const bx=PICKBOX;
  if(!bx){ b.style.top=(innerHeight-h-70)+'px'; return; }
  // 고른 글이 화면 위쪽이면 사파리 메뉴가 '아래'로 내려옵니다 → 우리는 더 아래로
  const gap = bx.top < MENU_H+40 ? MENU_H+14 : 12;
  let T = bx.bottom + gap;
  const pagerH = $('#drawPager').classList.contains('on') ? 64 : 8;
  if(T + h > innerHeight - pagerH){          // 아래가 모자라면 위로
    T = bx.top - h - (bx.top < MENU_H+40 ? 12 : MENU_H+14);
  }
  b.style.top = Math.max(8, Math.min(innerHeight-h-8, T)) + 'px';
}
function selbarOff(){ $('#selbar').classList.remove('on'); PICK=null; PICKBOX=null; lastSel=''; }
$$('#selbar .col').forEach(x=>x.onclick=()=>{
  if(!PICK)return;
  const o=hlAdd(Object.assign({col:x.dataset.c},PICK));
  if(o)repaintHl(o);
  clearSel(); clearOv(); selbarOff(); paintHlBadge(); toast('형광펜을 그었습니다');
});
$('#selCopy').onclick=()=>{
  if(!PICK)return;
  const t=PICK.t;
  try{ navigator.clipboard.writeText(t); toast('복사했습니다'); }
  catch(e){ toast('복사하지 못했습니다'); }
  clearSel(); clearOv(); selbarOff();
};
$('#selMemo').onclick=()=>{
  if(!PICK)return;
  const o=hlAdd(Object.assign({col:'y',n:''},PICK));
  if(o){ repaintHl(o); paintHlBadge(); openMemo(o.i); }
  clearSel(); clearOv(); selbarOff();
};
function clearSel(){
  try{ getSelection().removeAllRanges(); }catch(e){}
  try{ const f=$('#page iframe'); f&&f.contentWindow.getSelection().removeAllRanges(); }catch(e){}
}

/* 메모 쓰기 */
let memoId=null;
function openMemo(id){
  const o=hlGet(id); if(!o)return;
  memoId=id;
  $('#memoQ').textContent=o.t||'';
  $('#memoTx').value=o.n||'';
  pan('#panMemo',true);
  setTimeout(()=>$('#memoTx').focus(),260);
}
$('#memoOk').onclick=()=>{
  const o=hlGet(memoId);
  if(o){ o.n=$('#memoTx').value.trim(); o.up=Date.now(); saveHL.now(); repaintHl(o); }
  panOff(); paintHl(); toast('메모를 저장했습니다');
};
$('#memoDel').onclick=()=>{
  if(memoId&&confirm('이 형광펜과 메모를 지웁니다.')){ hlDel(memoId); panOff(); paintHl(); }
};

/* 목록 */
$('#btnHl').onclick=()=>{ paintHl(); pan('#panHl',true); };
$('#hlWipe').onclick=()=>{
  if(!curB)return;
  const n=hlOnly(curB.i).length; if(!n)return;
  if(!confirm(`이 책의 형광펜·메모 ${n}개를 모두 지웁니다.\n(책갈피는 남습니다)\n되돌릴 수 없습니다.`))return;
  const now=Date.now();
  hlOnly(curB.i).forEach(o=>DEL[o.i]=now); saveDEL();
  const keep=bmOf(curB.i);
  if(keep.length)HL[curB.i]=keep; else delete HL[curB.i];
  saveHL.now();
  if(KIND==='pdf')paintPdfHl(); else if(KIND==='txt')paintTxtHl(); else paintEpubHl();
  paintHlBadge(); paintHl(); toast(`${n}개를 지웠습니다`);
};
$('#hlCopyAll').onclick=()=>{
  if(!curB)return;
  const a=hlOnly(curB.i).slice().sort((x,y)=>(x.pos||0)-(y.pos||0));
  if(!a.length)return;
  const txt=[`# ${curB.t||''}`, curB.a?`${curB.a}`:'', ''].filter(x=>x!=='').join('\n')+'\n\n'
    + a.map(o=>{
        const w=o.k==='pdf'?`${o.c.p}쪽`:(o.pos?Math.round(o.pos*100)+'%':'');
        return `> ${o.t}\n${w?`— ${w}`:''}`+(o.n?`\n\n${o.n}`:'');
      }).join('\n\n---\n\n');
  try{ navigator.clipboard.writeText(txt); toast(`${a.length}개를 복사했습니다.\n옵시디언에 붙여넣으시면 됩니다`,4000); }
  catch(e){ toast('복사하지 못했습니다'); }
};
function paintHlBadge(){
  const n=curB?hlOnly(curB.i).length:0;
  $('#btnHl').textContent = n? '메모 '+n : '메모';
}
let HLTAB='hl';
function paintHl(){
  if(!curB)return;
  const nb=bmOf(curB.i).length;
  $$('#hlTab button').forEach(x=>{ x.classList.toggle('on',x.dataset.v===HLTAB);
    if(x.dataset.v==='bm')x.textContent=nb?`책갈피 ${nb}`:'책갈피'; });
  if(HLTAB==='bm'){ paintBmList(); return; }
  const a=hlOnly(curB.i).slice().sort((x,y)=>(x.pos||0)-(y.pos||0));
  $('#hlTitle').textContent=`형광펜 · 메모 (${a.length})`;
  const none=$('#hlNone'), el=$('#hlList');
  none.style.display=a.length?'none':'block';
  $('#hlTools').style.display=a.length?'flex':'none';
  none.textContent='아직 없습니다.\n글을 손가락이나 펜슬로 그으면 형광펜·메모 막대가 뜹니다.'
    +(KIND==='pdf'?'\n\n스캔한 PDF 는 글자가 아니라 그림이라 그을 수 없습니다.':'');
  el.innerHTML='';
  const f=document.createDocumentFragment();
  a.forEach(o=>{
    const d=document.createElement('div'); d.className='it';
    const where = o.k==='pdf' ? `${o.c.p}쪽` : (o.pos?Math.round(o.pos*100)+'%':'');
    d.innerHTML=`<div class="q" style="border-left-color:${COLS[o.col]||COLS.y}">${esc(o.t||'')}</div>`
      +(o.n?`<div class="m">${esc(o.n)}</div>`:'')
      +`<div class="w"><span>${esc(where)}</span><span></span></div>`;
    const w=d.querySelector('.w');
    const bm=document.createElement('button'); bm.textContent=o.n?'메모 고치기':'메모 달기';
    bm.style.color='var(--acc)';
    bm.onclick=e=>{ e.stopPropagation(); panOff(); setTimeout(()=>openMemo(o.i),240); };
    const bd=document.createElement('button'); bd.textContent='지우기';
    bd.onclick=e=>{ e.stopPropagation(); if(confirm('이 형광펜을 지웁니다.')){ hlDel(o.i); paintHl(); } };
    w.lastChild.append(bm,bd);
    d.onclick=()=>{ panOff(); gotoHl(o); };
    f.appendChild(d);
  });
  el.appendChild(f);
}
function gotoHl(o){
  if(o.k==='epub'&&rend){
    const go=o.c||(o.q&&o.q.h);
    if(go){ try{ rend.display(go); }catch(e){ toast('그 자리를 찾지 못했습니다'); } } }
  else if(o.k==='pdf'){ goPdfPage(o.c.p); }
  else { const m=$(`#txt mark[data-id="${o.i}"]`);
         if(m)m.scrollIntoView({block:'center'}); }
}

/* ── EPUB 쪽 ── */
/* 지금 펼쳐진 쪽에서 저장해 둔 글을 찾아, 그 글 위에 그대로 칠합니다.
   쪽을 넘기거나 글자 크기를 바꾸면 다시 찾아 다시 칠합니다. */
function paintEpubHl(){
  const host=$('#epubov'); if(!host)return;
  host.innerHTML='';
  if(KIND!=='epub'||!curB||!epubC)return;
  const doc=epubC.document; if(!doc||!doc.body)return;
  const f=$('#page iframe'); if(!f)return;
  const fb=f.getBoundingClientRect(), vb=$('#view').getBoundingClientRect();
  const ox=fb.left-vb.left, oy=fb.top-vb.top;
  const frag=document.createDocumentFragment();
  hlOf(curB.i).filter(o=>o.k==='epub').forEach(o=>{
    const r=findQuote(o,doc); if(!r)return;
    [...r.getClientRects()].forEach(c=>{
      if(c.width<0.5||c.height<0.5)return;
      // 다른 단이나 아직 안 넘긴 쪽에 있는 것은 그리지 않습니다
      if(c.right<0||c.left>fb.width||c.bottom<0||c.top>fb.height)return;
      const i=document.createElement('i');
      i.style.left=(ox+c.left)+'px'; i.style.top=(oy+c.top)+'px';
      i.style.width=c.width+'px'; i.style.height=c.height+'px';
      i.style.background=COLS[o.col]||COLS.y;
      i.dataset.id=o.i;
      frag.appendChild(i);
    });
  });
  host.appendChild(frag);
}
$('#epubov').onclick=e=>{ const id=e.target&&e.target.dataset&&e.target.dataset.id;
  if(id)openMemo(id); };
const drawEpubHl=()=>paintEpubHl();
const restoreEpubHl=()=>paintEpubHl();
function bindEpubSelect(){
  // 책 안쪽에서 글을 고르면 epub.js 가 알려줍니다
  rend.on('selected',()=>{ if(!drawMode)selSoon(); });
}

/* ── PDF 쪽 ── */
async function addTextLayer(d,pg,vp){
  try{
    const tc=await pg.getTextContent();
    const tl=document.createElement('div'); tl.className='textLayer';
    const v=pg.getViewport({scale:d.clientWidth/pg.getViewport({scale:1}).width});
    tl.style.width=v.width+'px'; tl.style.height=v.height+'px';
    await pdfjsLib.renderTextLayer(
      {textContent:tc,textContentSource:tc,container:tl,viewport:v,textDivs:[]}).promise;
    d.appendChild(tl);
    d._txt=true;
  }catch(e){ log('글자층 실패 '+d.dataset.n+': '+(e.message||e)); }
}
/* ══════════ 긋기 모드 ══════════
   아이패드 사파리는 글을 선택하면 제 나름의 메뉴(복사·찾아보기·번역)를 띄우고,
   애플펜슬로 끄는 것은 선택이 아니라 화면 넘기기로 받아들입니다.
   그래서 브라우저의 선택 기능을 쓰지 않고, 훑은 자리를 직접 잡습니다. */
let drawMode=!!P.draw, dragOn=false, dragA=null, dragR=null, dragDoc=null, dragOff={x:0,y:0};
let epubC=null;                       // 지금 그려진 EPUB 쪽 (cfiFromRange 를 씁니다)

function caretAt(x,y,doc){
  try{
    if(doc.caretRangeFromPoint){ const r=doc.caretRangeFromPoint(x,y); if(r)return r; }
    if(doc.caretPositionFromPoint){
      const p=doc.caretPositionFromPoint(x,y);
      if(p){ const r=doc.createRange(); r.setStart(p.offsetNode,p.offset); r.collapse(true); return r; } }
  }catch(e){}
  return caretHunt(x,y,doc);
}
/* 브라우저가 '이 자리가 몇 번째 글자냐'에 답하지 않을 때 직접 찾습니다.
   책이 아이프레임 안에 있으면 사파리가 종종 답을 거릅니다.
   요소 짚기는 늘 되므로, 그 안에서 글자를 반씩 좁혀 들어갑니다. */
function caretHunt(x,y,doc){
  let el=null; try{ el=doc.elementFromPoint(x,y); }catch(e){}
  if(!el||!el.childNodes)return null;
  const rr=doc.createRange();
  const hit=(n,i)=>{ try{ rr.setStart(n,i); rr.setEnd(n,Math.min(n.nodeValue.length,i+1));
      return rr.getBoundingClientRect(); }catch(e){ return null; } };
  const w=doc.createTreeWalker(el,NodeFilter.SHOW_TEXT);
  let n,best=null,bestD=Infinity;
  while(n=w.nextNode()){
    const len=n.nodeValue.length; if(!len)continue;
    // 이 마디가 점 근처에 있나
    let box=null; try{ rr.selectNodeContents(n); box=rr.getBoundingClientRect(); }catch(e){}
    if(!box||(!box.width&&!box.height))continue;
    const near = y>=box.top-2 && y<=box.bottom+2;
    if(!near){
      const dy=Math.max(box.top-y,0,y-box.bottom);
      if(dy*dy<bestD){ bestD=dy*dy; best=[n,0]; }
      continue;
    }
    // 줄 안에서 반씩 좁혀 들어갑니다 (수백 글자여도 열 번이면 닿습니다)
    let lo=0,hi=len-1,ans=0;
    for(let k=0;k<14&&lo<=hi;k++){
      const mid=(lo+hi)>>1, c=hit(n,mid);
      if(!c){ lo=mid+1; continue; }
      if(y<c.top-1){ hi=mid-1; continue; }
      if(y>c.bottom+1){ lo=mid+1; continue; }
      if(x<c.left){ hi=mid-1; ans=mid; }
      else if(x>c.right){ lo=mid+1; ans=mid+1; }
      else { ans=(x>c.left+c.width/2)?mid+1:mid; lo=hi+1; }
    }
    const r=doc.createRange(); r.setStart(n,Math.max(0,Math.min(len,ans))); r.collapse(true);
    return r;
  }
  if(best){ const r=doc.createRange(); r.setStart(best[0],best[1]); r.collapse(true); return r; }
  return null;
}
function spanRange(a,b,doc){
  const r=doc.createRange();
  const fwd = a.compareBoundaryPoints(0,b) <= 0;   // 0 = START_TO_START
  const s=fwd?a:b, e=fwd?b:a;
  r.setStart(s.startContainer,s.startOffset);
  r.setEnd(e.startContainer,e.startOffset);
  return r;
}
function paintOv(r,off){
  const el=$('#selov'); el.innerHTML='';
  if(!r||r.collapsed){ el.classList.remove('on'); return; }
  const f=document.createDocumentFragment();
  [...r.getClientRects()].filter(c=>c.width>0.5&&c.height>0.5).forEach(c=>{
    const i=document.createElement('i');
    i.style.left=(c.left+off.x)+'px'; i.style.top=(c.top+off.y)+'px';
    i.style.width=c.width+'px'; i.style.height=c.height+'px';
    f.appendChild(i);
  });
  el.appendChild(f); el.classList.add('on');
}
function clearOv(){ const el=$('#selov'); el.innerHTML=''; el.classList.remove('on'); }

function setDrawMode(on){
  drawMode=on; P.draw=on; savePref();
  $('#btnDraw').classList.toggle('good',on);
  document.body.classList.toggle('drawing',on);
  $('#drawTip').classList.toggle('on',on);
  if(on)setTimeout(()=>$('#drawTip').classList.remove('on'),2600);
  // 긋는 동안에도 쪽을 넘길 수 있어야 합니다
  $('#drawPager').classList.toggle('on', on&&readerOn());
  // EPUB 은 책 안쪽(iframe)에도 걸어줘야 합니다
  try{ const d=$('#page iframe').contentDocument.documentElement;
    d.style.webkitTouchCallout=on?'none':'';
    d.style.touchAction=on?'none':''; }catch(e){}
  // 그을 때는 쪽 넘김 영역을 치웁니다
  $('#tapL').style.display=$('#tapR').style.display=
    (!on&&(KIND==='epub'||(KIND==='pdf'&&P.pnav==='page'))&&P.nav!=='swipe')?'block':'none';
  if(!on){ clearOv(); selbarOff(); }
}
$('#btnDraw').onclick=()=>setDrawMode(!drawMode);
$('#dpOff').onclick=()=>setDrawMode(false);
$('#dpPrev').onclick=()=>{ clearOv(); selbarOff(); pageBack(); };
$('#dpNext').onclick=()=>{ clearOv(); selbarOff(); pageFwd(); };

/* 손가락·펜슬·마우스에서 좌표 하나 뽑기 */
function ptOf(e){
  if(e.touches&&e.touches.length)      return e.touches[0];
  if(e.changedTouches&&e.changedTouches.length) return e.changedTouches[0];
  return e;
}
let caretWarned=false;
function drawStart(e,doc,off){
  if(!drawMode||!readerOn())return;
  if(e.pointerType==='mouse'&&e.button)return;
  if(e.touches&&e.touches.length>1)return;          // 두 손가락은 확대·넘김에 양보
  const p=ptOf(e);
  if(e.cancelable)e.preventDefault();     // 사파리가 제 방식으로 고르기 전에 가져옵니다
  const r=caretAt(p.clientX-off.x,p.clientY-off.y,doc);
  if(!r){
    if(!caretWarned){ caretWarned=true; log('글자 자리를 못 짚음');
      toast('글자 위에서 시작해 보세요',2600); }
    return;
  }
  dragOn=true; dragA=r; dragR=null; dragDoc=doc; dragOff=off;
  selbarOff(); clearOv();
}
function drawMove(e){
  if(!dragOn)return;
  const p=ptOf(e);
  const r=caretAt(p.clientX-dragOff.x,p.clientY-dragOff.y,dragDoc);
  if(r){ dragR=spanRange(dragA,r,dragDoc); paintOv(dragR,dragOff); }
  if(e.cancelable)e.preventDefault();
}
function drawEnd(){
  if(!dragOn)return; dragOn=false; lastSel='그음';
  if(!dragR||dragR.collapsed||!String(dragR).trim()){ clearOv(); return; }
  takeRange(dragR,dragDoc,dragOff);
}
/* 훑은 자리를 형광펜 자료로 바꿉니다 */
function takeRange(r,doc,off,below){
  const t=String(r).trim();
  if(!t){ log('고른 글이 비어 있습니다'); return clearOv(); }
  const rc=[...r.getClientRects()].filter(c=>c.width>0.5&&c.height>0.5);
  if(!rc.length){ log('고른 글의 자리를 재지 못했습니다'); return clearOv(); }
  PICKBOX={ top:Math.min(...rc.map(c=>c.top))+off.y,
            bottom:Math.max(...rc.map(c=>c.bottom))+off.y };
  if(KIND==='epub'){
    // 넘겨받은 것 대신, 고른 글이 실제로 들어 있는 문서를 씁니다
    const d2=(r.startContainer&&r.startContainer.ownerDocument)||doc;
    const q=quoteOf(r,d2);
    if(!q){ log('EPUB 자리잡기 실패 — doc='+(!!d2)+' body='+(!!(d2&&d2.body)));
      toast('이 자리를 잡지 못했습니다'); return clearOv(); }
    if(d2&&(!epubC||epubC.document!==d2)) epubC={document:d2};
    PICK={k:'epub',c:cfiFrom(r),q:q,t:t.slice(0,600),pos:pctOf(curB)};
  }else if(KIND==='pdf'){
    const el=r.startContainer.nodeType===1?r.startContainer:r.startContainer.parentElement;
    const d=el&&el.closest?el.closest('.pg'):null; if(!d)return clearOv();
    const pb=d.getBoundingClientRect();
    const rects=[...r.getClientRects()].filter(c=>c.width>1&&c.height>1).map(c=>({
      x:(c.left-pb.left)/pb.width, y:(c.top-pb.top)/pb.height,
      w:c.width/pb.width, h:c.height/pb.height }));
    if(!rects.length)return clearOv();
    PICK={k:'pdf',c:{p:Number(d.dataset.n),r:rects},t:t.slice(0,600),
          pos:pdfDoc?Number(d.dataset.n)/pdfDoc.numPages:0};
  }else{
    const body=$('#txt .body'); if(!body)return clearOv();
    const a=txtOffset(r.startContainer,r.startOffset,body);
    const b=txtOffset(r.endContainer,r.endOffset,body);
    if(b<=a)return clearOv();
    PICK={k:'txt',c:{s:a,e:b},t:t.slice(0,600),pos:TXTRAW.length?a/TXTRAW.length:0};
  }
  selbarAt();
}
/* 바깥 화면(PDF·TXT)에 걸기 */
(function(){
  const off={x:0,y:0};
  ['#pdf','#txt'].forEach(sel=>{
    const el=$(sel);
    el.addEventListener('pointerdown',e=>drawStart(e,document,off));
    el.addEventListener('touchstart', e=>drawStart(e,document,off),{passive:false});
  });
  addEventListener('pointermove',drawMove,{passive:false});
  addEventListener('touchmove',  drawMove,{passive:false});
  addEventListener('pointerup',drawEnd);
  addEventListener('touchend', drawEnd);
  addEventListener('pointercancel',()=>{ dragOn=false; clearOv(); });
  addEventListener('touchcancel', ()=>{ dragOn=false; clearOv(); });
})();
/* ── EPUB 자리 잡기 ──
   주소(CFI)만 믿지 않습니다. 판이 바뀌거나 못 얻는 경우가 있어서,
   '그은 글 + 앞뒤 문장'을 함께 저장해 두고 다시 글로 찾아냅니다.
   책 내용은 안 바뀌므로 이 방법이 오히려 더 튼튼합니다. */
const CTX=40;
function quoteOf(r,doc){
  try{
    const root=doc.body, full=root.textContent;
    const a=txtOffset(r.startContainer,r.startOffset,root);
    const b=txtOffset(r.endContainer,r.endOffset,root);
    return { p:full.slice(Math.max(0,a-CTX),a), s:full.slice(b,b+CTX),
             o:full.length?Math.round(a/full.length*10000)/10000:0,     // v43 — 장 안에서 어디쯤 (후보가 여럿일 때)
             h:(rend&&rend.location&&rend.location.start&&rend.location.start.href)||'' };
  }catch(e){ return null; }
}
function rangeAt(root,a,b){
  const doc=root.ownerDocument;
  const w=doc.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let n=0,c,sN=null,sO=0,eN=null,eO=0;
  while(c=w.nextNode()){
    const len=c.nodeValue.length;
    if(sN===null && n+len>=a){ sN=c; sO=a-n; }
    if(n+len>=b){ eN=c; eO=b-n; break; }
    n+=len;
  }
  if(!sN||!eN)return null;
  const r=doc.createRange(); r.setStart(sN,sO); r.setEnd(eN,eO); return r;
}
/* 저장해 둔 글을 지금 펼쳐진 쪽에서 찾아냅니다 */
function findQuote(o,doc){
  if(!o.t)return null;
  const root=doc&&doc.body; if(!root)return null;
  const full=root.textContent;
  /* v43 — 다른 장에 그은 것은 이 장에서 찾지 않습니다 (같은 글귀가 여러 장에 있을 때 엉뚱한 데 칠하던 문제) */
  if(o.q&&o.q.h){ const cur=String((rend&&rend.location&&rend.location.start&&rend.location.start.href)||'').split('#')[0];
    if(cur&&String(o.q.h).split('#')[0]!==cur)return null; }
  let i=-1;
  if(o.q&&(o.q.p||o.q.s)){                   // 앞뒤까지 맞는 자리가 딱 하나면 그것
    const want=(o.q.p||'')+o.t+(o.q.s||'');
    const j=full.indexOf(want);
    if(j>=0&&full.indexOf(want,j+1)<0) i=j+(o.q.p||'').length;
  }
  if(i<0) i=pickQuote(full,o);               // 없으면 글만으로 — 후보가 여럿이면 가장 그럴듯한 것
  if(i<0) return null;
  return rangeAt(root,i,i+o.t.length);
}
/* 후보 고르기: 앞뒤 글이 얼마나 닮았나 + 장 안의 자리(q.o)에 얼마나 가까운가 */
function pickQuote(full,o){
  const t=o.t, L=t.length, q=o.q||{}, P0=q.p||'', S0=q.s||'';
  const at=[]; let k=-1; while((k=full.indexOf(t,k+1))>=0){ at.push(k); if(at.length>200)break; }
  if(at.length<=1)return at.length?at[0]:-1;
  const suf=(a,b)=>{ let n=0; while(n<a.length&&n<b.length&&a[a.length-1-n]===b[b.length-1-n])n++; return n; };
  const pre=(a,b)=>{ let n=0; while(n<a.length&&n<b.length&&a[n]===b[n])n++; return n; };
  const want=q.o!=null?q.o*full.length:null;
  let best=at[0], bs=-1e9;
  at.forEach(i=>{ let sc=suf(full.slice(Math.max(0,i-P0.length),i),P0)+pre(full.slice(i+L,i+L+S0.length),S0);
    if(want!=null)sc-=Math.abs(i-want)/Math.max(1,full.length)*20;      // 가까울수록 조금 더
    if(sc>bs){ bs=sc; best=i; } });
  return best;
}

/* EPUB 에서 '이 자리'를 나타내는 주소(CFI)를 얻습니다.
   epub.js 는 판마다 넘겨주는 물건이 달라(View 인지 Contents 인지)
   한 가지 길만 두면 조용히 실패합니다. 그래서 세 갈래로 시도합니다. */
function cfiFrom(r){
  const try1=o=>{ try{ return o&&typeof o.cfiFromRange==='function'?o.cfiFromRange(r):null; }
                  catch(e){ return null; } };
  let v=try1(epubC); if(v)return v;
  v=try1(epubC&&epubC.contents); if(v)return v;
  try{ const cs=rend&&rend.getContents&&rend.getContents();
    for(const c of ([].concat(cs||[]))){ v=try1(c); if(v)return v; } }catch(e){}
  try{ const h=rend&&rend.location&&rend.location.start&&rend.location.start.href;
    const sec=h&&book&&book.spine&&book.spine.get(h); v=try1(sec); if(v)return v; }catch(e){}
  return null;
}
/* 책 안쪽(EPUB iframe)에 걸기 — 쪽이 새로 그려질 때마다 */
function bindDrawEpub(view){
  // 넘어온 것이 View 면 그 안의 Contents 를 씁니다
  epubC = (view&&view.contents) ? view.contents : view;
  const doc = (view&&view.document) || (epubC&&epubC.document);
  if(!doc)return;
  const offOf=()=>{ const f=$('#page iframe');
    const b=f?f.getBoundingClientRect():{left:0,top:0}; return {x:b.left,y:b.top}; };
  // 책 안쪽 좌표는 아이프레임 기준입니다. 바깥과 셈이 맞도록 자리를 더해 넘깁니다.
  const fwd=e=>{ const p=ptOf(e);
    return { clientX:p.clientX+dragOff.x, clientY:p.clientY+dragOff.y,
             cancelable:e.cancelable, preventDefault:()=>{ try{e.preventDefault();}catch(x){} } }; };
  bindSelEpub(doc); bindDismissEpub(doc);
  const dn=e=>drawStart(e,doc,offOf());
  doc.addEventListener('pointerdown',dn);
  doc.addEventListener('touchstart',dn,{passive:false});
  doc.addEventListener('pointermove',e=>{ if(dragOn)drawMove(fwd(e)); },{passive:false});
  doc.addEventListener('touchmove', e=>{ if(dragOn)drawMove(fwd(e)); },{passive:false});
  doc.addEventListener('pointerup',drawEnd);
  doc.addEventListener('touchend',drawEnd);
  if(drawMode){ const d=doc.documentElement;
    d.style.webkitTouchCallout='none'; d.style.touchAction='none'; }
}

/* ── 긋기 모드가 아닐 때 ──
   아이패드의 기본 선택 메뉴(복사·찾아보기·번역)는 웹에서 없앨 수 없습니다.
   그래서 없애려 들지 않고, 우리 색 막대를 그 아래에 나란히 띄웁니다.
   손가락으로 꾹 눌러 고르는 평소 방식 그대로 쓰시면 됩니다. */
function selDone(){
  if(dragOn)return;                   // 훑는 중에는 그쪽이 맡습니다
  if(!readerOn())return;
  let doc=document, off={x:0,y:0};
  if(KIND==='epub'){
    const f=$('#page iframe'); if(!f)return selbarOff();
    try{ doc=f.contentDocument; }catch(e){ return selbarOff(); }
    if(!doc)return selbarOff();
    const b=f.getBoundingClientRect(); off={x:b.left,y:b.top};
  }
  const sel=doc.getSelection?doc.getSelection():null;
  if(!sel||sel.isCollapsed||!sel.rangeCount)return selbarOff();
  if(!String(sel).trim())return selbarOff();
  takeRange(sel.getRangeAt(0),doc,off,true);
}
/* 고른 글이 바뀔 때마다 — 손을 뗀 뒤 잠깐 기다렸다 띄웁니다 */
let selT=null;
function selSoon(){ clearTimeout(selT); selT=setTimeout(selDone,240); }
function bindSelEpub(doc){
  try{ doc.addEventListener('selectionchange',selSoon); }catch(e){}
}
document.addEventListener('selectionchange',selSoon);

/* ── 마지막 보루 ──
   아이패드에서는 선택 신호가 아이프레임 벽에 막히거나 아예 안 오는 일이 잦습니다.
   그래서 신호를 기다리지 않고, 0.35초마다 '지금 고른 글이 있는지' 직접 봅니다.
   글이 그대로면 아무 일도 하지 않으므로 부담이 없습니다. */
function grabSel(){
  const cand=[];
  const f=$('#page iframe');
  if(f){ try{ const d=f.contentDocument, b=f.getBoundingClientRect();
    if(d)cand.push([d,{x:b.left,y:b.top}]); }catch(e){} }
  cand.push([document,{x:0,y:0}]);
  for(const [d,off] of cand){
    let sel=null; try{ sel=d.getSelection&&d.getSelection(); }catch(e){}
    if(!sel||sel.isCollapsed||!sel.rangeCount)continue;
    const t=String(sel).trim(); if(!t)continue;
    return {r:sel.getRangeAt(0),doc:d,off:off,t:t};
  }
  return null;
}
let lastSel='';
/* 다른 곳을 누르면 막대를 바로 내립니다.
   아이패드는 딴 데를 눌러도 고른 글이 그대로 남아 있는 일이 잦아,
   가만두면 막대가 계속 붙어 있습니다. */
function dismissSel(e){
  if(!$('#selbar').classList.contains('on'))return;
  const t=e&&e.target;
  if(t&&t.closest&&t.closest('#selbar, .pan, .sheet, #drawPager'))return;
  clearSel(); clearOv(); selbarOff();
}
addEventListener('pointerdown',dismissSel,true);
addEventListener('touchstart',dismissSel,{capture:true,passive:true});
/* 책 안쪽(EPUB)에서도 */
function bindDismissEpub(doc){
  try{ doc.addEventListener('pointerdown',()=>dismissSel({}),true);
       doc.addEventListener('touchstart',()=>dismissSel({}),{capture:true,passive:true}); }catch(e){}
}
setInterval(()=>{
  if(!readerOn()){ if(lastSel){ lastSel=''; selbarOff(); } return; }
  if(dragOn||penDrag||inkOn)return;        // 훑거나 그리는 중에는 건드리지 않습니다
  const g=grabSel();
  const key=g?(g.t.length+'|'+g.t.slice(0,50)):'';
  if(key===lastSel)return;
  lastSel=key;
  if(!g){ selbarOff(); return; }
  takeRange(g.r,g.doc,g.off,true);
},350);
/* 글 전체에서 몇 번째 글자인지 — 형광펜을 그으면 태그가 끼어들어
   글자 마디가 쪼개지므로, 늘 처음부터 세어야 자리가 어긋나지 않습니다 */
function txtOffset(node,off,root){
  let n=0; const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let c; while(c=w.nextNode()){ if(c===node)return n+off; n+=c.nodeValue.length; }
  return n;
}
let TXTRAW='', TXTC='';
/* TXT 줄바꿈 정리 — 화면에서만 합니다. 원본 파일은 건드리지 않습니다.
   ★ 글자 수를 한 자도 바꾸지 않습니다. 줄바꿈은 빈칸으로, 남는 빈 줄은
     보이지 않는 글자(U+200B)로 바꿉니다. 그래서 형광펜의 글자 위치(c.s~c.e)가
     원문으로 보든 정리본으로 보든 그대로 맞습니다. */
const TXT_END=/[.?!…"'”’」』)\]>〉》~:;。！？]$/;
const TXT_START=/^[\s"“'‘「『\-*=#\[(<〈《【…—―·•※0-9０-９]/;
function txtClean(s){
  s=s.replace(/\r(?=\n)/g,'\u200B');
  // 문장 중간에 끊긴 줄 → 빈칸
  s=s.replace(/([^\n])\n(?=[^\n])/g,(m,ch,off,str)=>{
    const st=str.lastIndexOf('\n',off)+1;
    const line=str.slice(st,off+1).replace(/[\u200B\s]+$/,'');
    if(line.length<15)return m;                         // 제목 같은 짧은 줄은 그대로
    if(TXT_END.test(line))return m;                     // 문장이 끝난 줄
    if(TXT_START.test(str.charAt(off+2)))return m;      // 다음 줄이 대사·들여쓰기·기호로 시작
    return ch+' ';
  });
  // 빈 줄이 셋 이상 이어지면 둘만 남깁니다
  s=s.replace(/\n(?:[ \t\u3000\u200B]*\n){2,}/g,m=>{ let k=0;
    return m.replace(/[\s\S]/g,c=>(c==='\n'&&k++<2)?'\n':'\u200B'); });
  return s;
}
/* v38 — 텍본 쓰레기 문구. 줄 잇기와 같은 약속: 글자 수를 한 자도 바꾸지 않습니다.
   지울 글자는 보이지 않는 글자(U+200B)로 바꿔, 형광펜 자리(c.s~c.e)가 그대로 맞습니다. */
var TXTJN=0;
const JUNK_URL=/^[\s\u3000\u200B\-=*_~·•<>\[\]()【】『』「」|]*(?:https?:\/\/|www\.)\S+|^[\s\u3000\u200B\-=*_~·•<>\[\]()【】『』「」|]*[\w.-]+\.(?:com|net|org|kr|co\.kr|me|io|tv|info|xyz|link|site|club)(?:\/\S*)?[\s\u3000\u200B\-=*_~·•<>\[\]()【】『』「」|]*$/i;
const JUNK_BANNER=/^[\s\u3000]*[★☆◆◇■□▶▷●○◈※♣♠♥♡]{1,}.{0,60}(?:텍본|텍스트본|공유|배포|다운|업로드|출처|제공|무료|토렌트|웹하드).{0,60}[★☆◆◇■□◀◁●○◈※♣♠♥♡]*[\s\u3000]*$/;
function junkPats(){
  return (P.jpat||[]).map(t=>{ const m=/^\/(.+)\/([a-z]*)$/.exec(t);
    if(m){ try{ return {re:new RegExp(m[1],m[2].replace(/g/g,''))}; }catch(e){ return null; } }
    return t?{lit:nfc(t)}:null; }).filter(Boolean);
}
const zw=n=>'\u200B'.repeat(n);
function txtJunk(s){
  const pats=junkPats(); let n=0, out='', off=0;
  const lines=s.split('\n');
  lines.forEach((ln,k)=>{
    const t=ln.replace(/[\r\u200B]/g,'');
    let kill=false;
    if(t.trim()){
      if(JUNK_URL.test(t)||JUNK_BANNER.test(t)) kill=true;
      else if(pats.some(p=>p.re&&p.re.test(t))) kill=true;
    }
    if(kill){ out+=zw(ln.length); n++; }
    else{
      let v=ln;
      pats.forEach(p=>{ if(p.lit&&v.includes(p.lit)){ v=v.split(p.lit).join(zw(p.lit.length)); n++; } });
      out+=v;
    }
    if(k<lines.length-1) out+='\n';
  });
  return {s:out,n};
}
function txtShown(){
  if(!P.tclean&&!P.junk){ TXTJN=0; return TXTRAW; }
  if(TXTC) return TXTC;
  let t=TXTRAW; TXTJN=0;
  if(P.junk){ const r=txtJunk(t); t=r.s; TXTJN=r.n; }
  if(P.tclean) t=txtClean(t);
  return (TXTC=t);
}
/* 이 책에서 되풀이되는 줄 — 광고 후보 */
function junkCands(){
  const cnt=new Map();
  TXTRAW.split('\n').forEach(ln=>{ const t=ln.replace(/[\r\u200B]/g,'').trim();
    if(t.length<4||t.length>80)return;
    if(!/[가-힣A-Za-z]/.test(t))return;
    if(typeof TOC_RE!=='undefined'&&TOC_RE.test(t))return;     // 목차 같은 줄은 뺍니다
    cnt.set(t,(cnt.get(t)||0)+1); });
  const have=new Set((P.jpat||[]).map(nfc));
  return [...cnt.entries()].filter(([t,c])=>c>=5&&!have.has(nfc(t)))
    .sort((a,b)=>b[1]-a[1]).slice(0,12);
}
function paintTxtHl(){
  const el=$('#txt .body'); if(!el||!curB)return;
  const T=txtShown();
  const hs=hlOf(curB.i).filter(o=>o.k==='txt')
    .slice().sort((a,b)=>a.c.s-b.c.s);
  if(!hs.length){ el.textContent=T; return; }
  let html='',last=0;
  hs.forEach(o=>{
    const s=Math.max(last,o.c.s), e=Math.max(s,Math.min(T.length,o.c.e));
    if(e<=s)return;
    html+=esc(T.slice(last,s))
      +`<mark data-id="${o.i}" style="background:${COLS[o.col]||COLS.y};color:inherit;`
      +`border-radius:2px">${esc(T.slice(s,e))}</mark>`;
    last=e;
  });
  html+=esc(T.slice(last));
  el.innerHTML=html;
  el.querySelectorAll('mark').forEach(m=>m.onclick=e=>{ e.stopPropagation(); openMemo(m.dataset.id); });
}
function paintPdfHl(){
  if(KIND!=='pdf'||!curB)return;
  const host=$('#pdf');
  [...host.querySelectorAll('.hlbox')].forEach(x=>x.remove());
  hlOf(curB.i).filter(o=>o.k==='pdf').forEach(o=>{
    const d=host.querySelector(`.pg[data-n="${o.c.p}"]`); if(!d)return;
    o.c.r.forEach(r=>{
      const b=document.createElement('div'); b.className='hlbox';
      b.style.left=(r.x*100)+'%'; b.style.top=(r.y*100)+'%';
      b.style.width=(r.w*100)+'%'; b.style.height=(r.h*100)+'%';
      b.style.background=COLS[o.col]||COLS.y; b.style.opacity='.34';
      b.onclick=e=>{ e.stopPropagation(); openMemo(o.i); };
      d.appendChild(b);
    });
  });
}

