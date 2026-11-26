/* 우리 도서관 — js/06-panels.js
   위 막대 꾸미기 · 설정판 · 책 손질 · 상태 탭 · 홈 바탕 · 모임 화면
   ※ 모든 파일이 같은 전역을 나눠 씁니다. index.html 에 적힌 순서(01 → 12)대로 불러와야 합니다. */
/* ══════════ v56 — 읽기 화면 위 막대 꾸미기 ══════════
   P.rbar = {order:[키], hide:{키:1}} — 이 기기만. '‹ 서재' 와 'Aa' 는 늘 보입니다 (Aa 에서 다시 켤 수 있게). */
const RBK=[ {k:'pen',id:'btnPen',n:'펜 (PDF 필기)'}, {k:'draw',id:'btnDraw',n:'긋기'}, {k:'tts',id:'btnTts',n:'🔊 읽어주기'},
  {k:'find',id:'btnFind',n:'🔍 이 책에서 찾기'}, {k:'toc',id:'btnToc',n:'목차'}, {k:'bm',id:'btnBm',n:'🔖 책갈피'}, {k:'hl',id:'btnHl',n:'메모 목록'} ];
function rbarCfg(){ const b=P.rbar||{}, known=RBK.map(x=>x.k);
  const order=(b.order||[]).filter(k=>known.includes(k)); known.forEach(k=>{ if(!order.includes(k))order.push(k); });
  return {order, hide:Object.assign({},b.hide||{})}; }
function applyRbar(){
  const bar=$('#rbar'), aa=$('#btnAa'); if(!bar||!aa)return; const c=rbarCfg();
  c.order.forEach(k=>{ const h=RBK.find(x=>x.k===k), el=h&&$('#'+h.id); if(!el)return;
    bar.insertBefore(el,aa); el.classList.toggle('rb-off',!!c.hide[k]); });
}
function rbarSave(c){ P.rbar={order:c.order,hide:c.hide}; savePref(); applyRbar(); paintRbarList(); }
function paintRbarList(){
  const L=$('#rbarList'); if(!L)return; L.innerHTML=''; const c=rbarCfg();
  c.order.forEach((k,idx)=>{ const h=RBK.find(x=>x.k===k); if(!h)return; const off=!!c.hide[k];
    const r=document.createElement('div'); r.className='hr'+(off?' off':'');
    r.innerHTML=`<span class="nm">${esc(h.n)}</span>`;
    const up=document.createElement('button'); up.className='mv'; up.textContent='↑'; up.disabled=idx===0; up.setAttribute('aria-label',h.n+' 앞으로');
    up.onclick=()=>{ c.order.splice(idx,1); c.order.splice(idx-1,0,k); rbarSave(c); };
    const dn=document.createElement('button'); dn.className='mv'; dn.textContent='↓'; dn.disabled=idx===c.order.length-1; dn.setAttribute('aria-label',h.n+' 뒤로');
    dn.onclick=()=>{ c.order.splice(idx,1); c.order.splice(idx+1,0,k); rbarSave(c); };
    const tg=document.createElement('button'); tg.className='tg'+(off?'':' on'); tg.textContent=off?'숨김':'보임';
    tg.onclick=()=>{ if(off)delete c.hide[k]; else c.hide[k]=1; rbarSave(c); };
    r.append(up,dn,tg); L.appendChild(r); });
}

/* ── 설정판 ── */
function segSet(sel,v){ $$(sel+' button').forEach(b=>b.classList.toggle('on',b.dataset.v===String(v))); }
function seg(sel,key,after){ $$(sel+' button').forEach(b=>b.onclick=()=>{
  P[key]=b.dataset.v==='' ? '' : (isNaN(b.dataset.v)?b.dataset.v:Number(b.dataset.v));
  savePref(); segSet(sel,P[key]); after&&after(); }); }
const PANS=['#panRead','#panView','#panBook','#panHl','#panMemo','#panFind'];
function pan(id,on){ $(id).classList.toggle('on',on); $('#bd').classList.toggle('on',on); }
function panOff(){ PANS.forEach(p=>$(p).classList.remove('on')); $('#bd').classList.remove('on'); }
$('#bd').onclick=panOff;
$$('.pan [data-close]').forEach(b=>b.onclick=panOff);

/* ── 책 하나 손질하기 ── */
let panB=null;
function clearRead(id){
  delete RD[id]; RDEL[id]=Date.now(); saveDEL(); saveRD();
  try{ localStorage.removeItem('ebl_pos_'+id); }catch(e){}
}
function openPanBook(b){
  panB=b;
  $('#pbT').textContent=b.t||'제목 없음';
  const st=stOf(b), pc=pctOf(b);
  $('#pbS').textContent=[b.a, (b.x||'').toUpperCase(),
    st==='done'?'다 읽음':st==='stop'?'중단 · '+Math.round(pc*100)+'%':(st==='reading'?(pc>0?Math.round(pc*100)+'% 읽음':'읽는 중'):''),
    saved.has(b.i)?'받아둠':''].filter(Boolean).join(' · ');

  paintPbRv(b);
  const el=$('#pbActs'); el.innerHTML='';
  const add=(label,hint,fn,cls)=>{ const x=document.createElement('button');
    if(cls)x.className=cls;
    x.innerHTML=esc(label)+(hint?`<span class="h">${esc(hint)}</span>`:'');
    x.onclick=()=>{ panOff(); fn(); }; el.appendChild(x); };

  add(st?'이어서 읽기':'읽기',(b._alt&&b._alt.length&&P.merge!==0)?(b.x||'').toUpperCase():'',()=>openBook(b));
  if(P.merge!==0&&b._alt&&b._alt.length) b._alt.forEach(y=>{ const ys=stOf(y), yp=pctOf(y);
    add((y.x||'?').toUpperCase()+' 로 읽기',[y.f,y.z?Math.round(y.z)+'MB':'',ys==='done'?'다 읽음':(ys==='reading'&&yp>0?Math.round(yp*100)+'%':'')].filter(Boolean).join(' · '),()=>openBook(y)); });
  if(st!=='done') add('다 읽음으로 표시','',()=>{ markRead(b.i,1,true);
    toast('다 읽음으로 표시했습니다'); paintTabs(); render(true); });
  else add('읽는 중으로 되돌리기','',()=>{ markRead(b.i,null,false,true);
    toast('읽는 중으로 되돌렸습니다'); paintTabs(); render(true); });
  if(st==='reading') add('중단으로 표시','읽다가 그만둔 책 — 읽는 중에서 빠집니다',()=>{ markStop(b.i);
    toast('중단으로 표시했습니다'); paintTabs(); render(true); });
  else if(st==='stop') add('중단 풀기 (읽는 중으로)','',()=>{ markRead(b.i,null,false,true);
    toast('읽는 중으로 되돌렸습니다'); paintTabs(); render(true); });
  if(RD[b.i]) add('읽은 기록 지우기','이 책만. 목록에서 빠지고 진도도 사라집니다',
    ()=>{ clearRead(b.i); toast('읽은 기록을 지웠습니다'); paintTabs(); render(true); },'warn');
  if(saved.has(b.i)) add('받아둔 파일 지우기','읽은 기록은 그대로 남습니다',
    async()=>{ try{ await DB.del('books',b.i); saved.delete(b.i); }catch(e){}
      toast('파일을 지웠습니다'); paintTabs(); render(true); },'warn');
  add(rvOf(b.i)?'별점 · 한 줄 평 고치기':'별점 · 한 줄 평 남기기','',()=>openRv(b));
  if(hlOf(b.i).length) add('형광펜·메모를 옵시디언으로','이 책에 그은 것을 노트로',()=>openOb(b));
  if(b.u) add('드라이브에서 열기','',()=>window.open(b.u,'_blank','noopener'));
  // v37.1 — 책 정보가 YES24 에서 왔으면 출처와 상품 링크 (YES24 약관)
  if(b.y&&!isWrong(b.i)) add('YES24 에서 보기','이 책의 제목·저자·표지는 YES24 에서 가져왔습니다',
    ()=>window.open('https://www.yes24.com/Product/Goods/'+encodeURIComponent(b.y),'_blank','noopener'));
  if(kindOf(b)!=='comic'&&cfg('url')) add('책 소개 (YES24)','소개·목차를 그때그때 받아 봅니다. 쌓아 두지 않습니다',()=>showY24(b));
  if(isWrong(b.i)) add('책 정보 되돌리기','찾은 책 정보(제목·표지)를 다시 보입니다',()=>setWrong(b,0));
  else if(b._0&&(b._0.v||b._0.a||b._0.b)) add('책 정보가 틀림','이 책만 파일 이름으로 보이고, 엉뚱한 표지·저자·분류를 감춥니다',()=>setWrong(b,1),'warn');

  pan('#panBook',true);
}
$('#btnAa').onclick=()=>{ if(KIND==='comic'){ paintComicPan(); pan('#panComic',true); return; }
  applyRead(); pan('#panRead',true); };
function segFmtPaint(){ $$('#segFmt button').forEach(b=>b.classList.toggle('on',!!P.fmt[b.dataset.v])); }
$$('#segFmt button').forEach(b=>b.onclick=()=>{
  const k=b.dataset.v;
  // 마지막 하나까지 끄면 빈 목록이 되니 막습니다
  if(P.fmt[k] && Object.values(P.fmt).filter(Boolean).length===1){
    toast('하나는 켜져 있어야 합니다'); return; }
  P.fmt[k]=!P.fmt[k]; savePref(); segFmtPaint(); buildChips(); render(true);
});
$('#btnView').onclick=()=>{ segSet('#segMode',P.mode); segSet('#segSize',P.size);
  segSet('#segSort',P.sort); segSet('#segCat',P.cat); segFmtPaint(); pan('#panView',true); };

seg('#segTheme','theme',applyRead);
seg('#segFont','font',()=>{ paintFontUi(); applyRead(); });
/* v56 — 보기 설정을 이 책만 따로 */
$$('#segBkp button').forEach(x=>x.onclick=()=>{
  if(!curB)return; const on=x.dataset.v==='1';
  if(on&&!BKG){ BKP[curB.i]=bkpPick(P); saveBKP(); BKG=bkpPick(P); BKID=curB.i;
    toast('이 책만 따로 기억합니다\n지금부터 바꾸는 종이색·글자는 이 책에만 남습니다',3500); }
  else if(!on&&BKG){ delete BKP[curB.i]; saveBKP(); Object.assign(P,BKG); BKG=null; savePref();
    toast('모든 책 공통 설정으로 돌아갑니다'); }
  applyRead(); });
/* v56 — 글꼴 고르기 */
$('#selFont').onchange=async()=>{ const v=$('#selFont').value;
  if(!v){ paintFontUi(); return; }
  if(v==='mine'&&!MINEURL){ if(!(await mineLoad())){ toast('내 글꼴 파일을 먼저 넣어 주세요'); paintFontUi(); return; } }
  P.font=v; savePref(); segSet('#segFont',P.font); applyRead();
  if(FONTS[v]&&FONTS[v].css&&!navigator.onLine) toast('인터넷이 없어 글꼴을 받지 못할 수 있습니다\n한 번 받은 글꼴은 다음부터 됩니다',4000); };
$('#fontMine').onclick=()=>$('#fontFile').click();
$('#fontFile').onchange=async e=>{ const f=e.target.files&&e.target.files[0]; e.target.value=''; if(!f)return;
  if(f.size>30*1024*1024){ toast('글꼴 파일이 너무 큽니다 (30MB 까지)'); return; }
  try{ const buf=await f.arrayBuffer();
    // 정말 글꼴인지 먼저 확인합니다
    try{ const ff=new FontFace('EBL Test',buf); await ff.load(); }catch(x){ toast('글꼴 파일로 읽지 못했습니다\nTTF · OTF · WOFF 파일을 골라 주세요',4500); return; }
    await DB.put('kv','font:mine',{buf,name:f.name.replace(/\.[^.]+$/,''),type:f.type||'font/ttf',at:Date.now()});
    await mineLoad(); P.font='mine'; savePref(); segSet('#segFont',P.font); applyRead();
    toast('내 글꼴을 넣었습니다\n「'+MINEN+'」 · 이 기기에만 담깁니다',3500);
  }catch(x){ toast('글꼴을 담지 못했습니다\n'+(x.message||x),5000); } };
$('#fontMineDel').onclick=async()=>{ if(!confirm('이 기기에 넣은 내 글꼴을 지웁니다.'))return;
  try{ await DB.del('kv','font:mine'); }catch(e){}
  if(MINEURL)URL.revokeObjectURL(MINEURL); MINEURL=''; MINEN=''; $$('#eblMine').forEach(x=>x.remove());
  if(P.font==='mine'){ P.font=''; savePref(); segSet('#segFont',P.font); }
  applyRead(); toast('내 글꼴을 지웠습니다'); };
mineLoad().then(ok=>{ try{ paintFontUi(); if(ok&&P.font==='mine'&&readerOn())applyRead(); }catch(e){} });
/* v56 — 위 막대 꾸미기 */
try{ applyRbar(); paintRbarList(); }catch(e){}
$('#rbarReset').onclick=()=>{ P.rbar={order:RBK.map(x=>x.k),hide:{}}; savePref(); applyRbar(); paintRbarList(); toast('위 막대를 처음 상태로 되돌렸습니다'); };
seg('#segNav','nav',applyRead);
seg('#segPnav','pnav',()=>{ if(KIND==='pdf'&&pdfDoc)buildPdf(); });
seg('#segMode','mode',()=>render(true));
seg('#segSize','size',()=>render(true));
seg('#segSort','sort',()=>render(true));
seg('#segCat','cat',()=>{ SEL=''; PATH=[]; buildChips(); render(true); });
['#rgFs:fs','#rgLs:ls','#rgLh:lh','#rgPd:pd','#rgPv:pv','#rgTap:tap'].forEach(x=>{
  const [sel,key]=x.split(':');
  $(sel).addEventListener('input',()=>{ P[key]=Number($(sel).value); savePref(); applyRead(); });
});

/* ── PDF 조작 ── */
$('#rgZoom').addEventListener('input',()=>{
  P.zoom=Number($('#rgZoom').value); savePref(); $('#vZoom').textContent=P.zoom+'%';
  if(KIND!=='pdf')return;
  clearTimeout($('#rgZoom')._t);
  $('#rgZoom')._t=setTimeout(()=>{ redrawPdf(); setTimeout(paintAllInk,120); },180);
});
$('#pgPrev').onclick=()=>{ if(KIND==='pdf')gotoPg(Math.max(1,pdfPg-1)); };
$('#pgNext').onclick=()=>{ if(KIND==='pdf'&&pdfDoc)gotoPg(Math.min(pdfDoc.numPages,pdfPg+1)); };
$('#pgGo').onclick=()=>{ if(KIND!=='pdf'||!pdfDoc)return;
  const s=prompt(`몇 쪽으로 갈까요? (1 ~ ${pdfDoc.numPages})`, String(pdfPg));
  const n=Math.round(Number(s));
  if(n>=1&&n<=pdfDoc.numPages){ panOff(); gotoPg(n); }
};

/* ── 상태 탭 ── */
function counts(){
  const n={ '':0, recent:0, reading:0, done:0, stop:0, saved:0, new:0 };
  try{ markDups(); }catch(e){}
  BOOKS.forEach(b=>{
    if(!P.fmt[fmtKey(b)]) return;
    if(dupHide(b)){ if(saved.has(b.i))n.saved++; return; }
    n['']++;
    if(RD[b.i])n.recent++;
    const s=stOf(b); if(s)n[s]++;
    if(saved.has(b.i))n.saved++;
    if(b.g)n.new++;
  });
  return n;
}
function paintTabs(){
  const n=counts();
  $$('#tabs button').forEach(x=>{
    const v=x.dataset.v;
    x.classList.toggle('on',TAB===v);
    const base=x.dataset.lb||(x.dataset.lb=x.textContent.trim());
    x.innerHTML = base + (v&&n[v]!=null ? ` <span class="n">${n[v].toLocaleString()}</span>` : '');
  });
  const ts=$('#tabStop'); if(ts) ts.style.display=(n.stop||TAB==='stop')?'':'none';   // v56 — 중단한 책이 있을 때만
}
function goTab(v){
  TAB=v; localStorage.setItem('ebl_tab',TAB);
  SEL=''; PATH=[]; PIN='';
  paintTabs(); buildChips(); render(true);
}
$$('#tabs button').forEach(x=>x.onclick=()=>goTab(x.dataset.v));

/* ── 홈 ── */
function setView(){
  // 표지 크기는 앱 전체가 이 값 하나를 따릅니다.
  document.documentElement.style.setProperty('--cw',P.size+'px');
  const fam  = HSIDE!=='me';
  const home = TAB==='home';
  $$('#hseg button').forEach(b=>b.classList.toggle('on',b.dataset.v===HSIDE));
  $('#famPane').style.display = fam?'block':'none';
  $('#tabs').style.display    = fam?'none':'flex';
  $('#home').style.display    = (!fam&&home)?'block':'none';
  $('#grid').style.display    = (!fam&&!home)?'':'none';
  $('#chips').style.display   = (!fam&&!home)?'flex':'none';
  $('#stat').style.display    = (!fam&&!home)?'block':'none';
  $('#exbar').style.display   = (!fam&&TAB==='folder')?'flex':'none';
}
function goList(tab,pin){
  TAB=tab; localStorage.setItem('ebl_tab',TAB);
  SEL=''; PATH=[]; PIN=pin||'';
  paintTabs(); buildChips(); render(true);
}
/* 오늘의 책 — 날짜를 씨앗으로 삼아 하루 동안은 같은 책이 나옵니다 */
let todayN=0;
function pickToday(pool){
  if(!pool.length) return null;
  const d=new Date(), seed=d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();
  let h=(seed+todayN*7919)>>>0;
  h=(h^(h>>>15))*2246822507>>>0; h=(h^(h>>>13))*3266489909>>>0;
  h=(h^(h>>>16))>>>0;                      // >>>0 를 빠뜨리면 음수가 나와 책이 안 잡힙니다
  return pool[h%pool.length];
}
function hcards(el,arr){
  // 홈의 가로줄은 목록 보기 설정과 상관없이 늘 표지로 그립니다
  const m=P.mode; P.mode='g';
  el.innerHTML='';
  const f=document.createDocumentFragment();
  arr.forEach(b=>f.appendChild(card(b)));
  el.appendChild(f);
  P.mode=m;
}
/* ── 모임 화면 ── */
function buildFam(){
  VIEWG = (HSIDE==='me') ? VIEWG : HSIDE;
  /* 서가 */
  const sh=shelves();
  const se=$('#hShelf'); se.innerHTML='';
  sh.forEach(o=>{
    const cnt=shelfBooks(o.id).length;
    const b=document.createElement('button');
    b.className='chip'+(o['누가']===ME.id?' mine':'');
    b.textContent=(o['제목']||'이름 없는 칸')+' '+cnt;
    b.onclick=()=>goShelf(o);
    if(isOwner())b.oncontextmenu=e=>{ e.preventDefault(); editShelf(o); };
    se.appendChild(b);
  });
  se.style.display=sh.length?'flex':'none';
  $('#hShelfNone').style.display=sh.length?'none':'block';
  $('#hShelfNew').style.display=isOwner()?'':'none';
  $('#hsShelf').style.display=(sh.length||isOwner())?'':'none';

  /* 서로 권한 책 — 모임원끼리 오간 것 */
  const rc=$('#hRec'); rc.innerHTML='';
  const recs=famOf('rec').slice().sort((x,y)=>String(y['언제']).localeCompare(String(x['언제'])));
  const mine=recs.filter(o=>o['대상']===ME.id);
  const rest=recs.filter(o=>o['대상']!==ME.id);

  /* ① 나에게 온 것 — 권한 사람별로 */
  const byWho={};
  mine.forEach(o=>{ const k=o['이름']||nameOf(o['누가']);
    (byWho[k]=byWho[k]||[]).push(o); });
  Object.keys(byWho).forEach(who=>{
    const list=byWho[who];
    const arr=list.map(o=>bookOf(o['책ID'])).filter(Boolean);
    if(!arr.length)return;
    hsec(rc, who+'가 권한 책', 'rec', arr, arr.length, '');
    const words=list.filter(o=>o['내용']).slice(0,3);
    if(words.length){
      const p=document.createElement('div'); p.className='recmsg';
      p.innerHTML=words.map(o=>`<div>“${esc(o['내용'])}” <i>${esc(o['제목']||'')}</i></div>`).join('');
      rc.lastChild.appendChild(p);
    }
  });

  /* ② 모임원끼리 오간 것 */
  if(rest.length){
    const d=document.createElement('div'); d.className='hs';
    d.innerHTML='<div class="hh"><b>서로 권한 책 ('+rest.length+')</b></div>';
    const box=document.createElement('div'); box.className='reclist';
    rest.slice(0,20).forEach(o=>{
      const bk=bookOf(o['책ID']);
      const r=document.createElement('div'); r.className='recrow';
      r.innerHTML=`<span class="who">${esc(o['이름']||nameOf(o['누가']))}`
        +` <b>→</b> ${esc(unpackVal(o['값']).n||nameOf(o['대상']))}</span>`
        +`<span class="ti">${esc(o['제목']||'')}</span>`
        +(o['내용']?`<span class="ms">“${esc(o['내용'])}”</span>`:'');
      if(bk)r.onclick=()=>openBook(bk);
      box.appendChild(r);
    });
    d.appendChild(box); rc.appendChild(d);
  }

  $('#hRecNone').style.display = $('#hRec').children.length?'none':'block';
  try{ paintFamRead(); }catch(e){ log('식구 서재 그리기 실패: '+(e.message||e)); }

  const rq=famOf('req').length;
  $('#lkReqN').textContent = (isOwner()&&rq) ? rq+'건 ›' : '›';
  const sb=famOf('shelfbook').length, rn=famOf('rec').length;
  $('#famstat').textContent = FAM.length
    ? `서가 ${shelves().length}칸 · ${sb}권  ·  권한 책 ${rn}권`
    : '아직 나눈 것이 없습니다';
}

/* 홈의 표지 줄 하나 — 제목(권수) + 모두 보기 + 표지 12권 */
const HN=12;
function hsec(host,title,tab,arr,total,none,cnt){
  const d=document.createElement('div'); d.className='hs';
  const hh=document.createElement('div'); hh.className='hh';
  const t=document.createElement('b');
  t.textContent=`${title} (${(total||0).toLocaleString()}권)`;
  hh.appendChild(t);
  if(total){ const m=document.createElement('button'); m.textContent='모두 보기 ›';
    m.onclick=()=>goList(tab); hh.appendChild(m); }
  d.appendChild(hh);
  if(total){ const s=document.createElement('div'); s.className='hscr';
    d.appendChild(s); hcards(s,arr.slice(0,cnt||HN)); }
  else if(none){ const e=document.createElement('div'); e.className='hnone';
    e.textContent=none; d.appendChild(e); }
  host.appendChild(d);
}
function buildHome(){
  try{ markDups(); }catch(e){}
  const vis = BOOKS.filter(b=>P.fmt[fmtKey(b)]&&!dupHide(b));
  const n = counts();
  try{ paintGoal(); }catch(e){}
  $('#hRow1').innerHTML='';

  /* 최근 검색어 */
  const qw=$('#hqWrap'), qe=$('#hq');
  qw.style.display = RQ.length?'block':'none';
  if(RQ.length){
    qe.innerHTML='';
    RQ.forEach(q=>{ const b=document.createElement('button');
      b.className='chip'; b.textContent=q;
      b.onclick=()=>{ $('#q').value=q; goList(''); };
      qe.appendChild(b); });
  }

  /* 표지 줄 — 최근 읽은 순으로 앞 12권만 */
  const byRead = a => a.sort((x,y)=>((RD[y.i]&&RD[y.i].t)||0)-((RD[x.i]&&RD[x.i].t)||0));
  hsec($('#hRow1'), '이어 읽기', 'reading',
    byRead(vis.filter(b=>stOf(b)==='reading')), n.reading,
    BOOKS.length ? '아직 읽는 중인 책이 없습니다. 아래에서 한 권 골라 보세요.'
      : '책 목록이 이 기기에 없습니다. ⚙ → 관리 → [목록 새로 받기] 를 눌러주세요.', homeSize('reading'));

  /* 내 서가 */
  const pe=$('#hPin'); pe.innerHTML='';
  const cnt={};
  if(P.pins.length) vis.forEach(b=>{
    [b.b,b.m,b.s].forEach(k=>{ if(k&&P.pins.indexOf(k)>=0)cnt[k]=(cnt[k]||0)+1; }); });
  P.pins.forEach(k=>{ const b=document.createElement('button');
    b.className='chip'; b.textContent=k+' '+(cnt[k]||0);
    b.onclick=()=>goList('',k); pe.appendChild(b); });
  const ad=document.createElement('button');
  ad.className='chip add'; ad.textContent=P.pins.length?'＋':'＋ 자주 여는 분류 고르기';
  ad.onclick=openPin; pe.appendChild(ad);

  /* 오늘의 책 — 아직 안 연 책 중에서 */
  const pool = vis.filter(b=>!RD[b.i]&&b.t);
  const tb = pickToday(pool);
  const te=$('#hToday');
  if(tb&&paintToday3(pool)){ $('#hsToday').style.display=''; }
  else if(tb){
    te.innerHTML='';
    const w=document.createElement('div'); w.className='cvw';
    if(tb.v){ const im=document.createElement('img'); im.loading='lazy'; im.src=tb.v;
      im.onerror=()=>{im.remove(); w.insertAdjacentHTML('afterbegin',phHtml(tb));};
      w.appendChild(im); }
    else w.innerHTML=phHtml(tb);
    const m=document.createElement('div'); m.className='meta';
    m.innerHTML=`<div class="ti">${esc(tb.t)}</div>`
      +`<div class="au">${esc(tb.a||'')}</div>`
      +`<div class="sub">${esc([tb.s||tb.m||tb.b,(tb.x||'').toUpperCase()].filter(Boolean).join(' · '))}</div>`;
    te.append(w,m);
    te.onclick=()=>openBook(tb);
    $('#hsToday').style.display='';
  } else $('#hsToday').style.display='none';

  /* 나머지 표지 줄 */
  const r2=$('#hRow2'); r2.innerHTML='';
  hsec(r2, '최근 본 책', 'recent', byRead(vis.filter(b=>RD[b.i])), n.recent,
    '아직 열어본 책이 없습니다.', homeSize('recent'));
  $('#hSaved').innerHTML=''; $('#hDone').innerHTML='';
  hsec($('#hSaved'), '받아둔 책', 'saved', byRead(vis.filter(b=>saved.has(b.i))), n.saved,
    '받아둔 책이 없습니다. 책을 열면 그 기기에 자동으로 담깁니다.', homeSize('saved'));
  hsec($('#hDone'), '다 읽은 책', 'done', byRead(vis.filter(b=>stOf(b)==='done')), n.done,
    '아직 다 읽은 책이 없습니다.', homeSize('done'));
  try{ paintHomeHl(); }catch(e){ log('오늘의 밑줄 실패: '+(e.message||e)); }
  // v48 — '새로 담긴 책' 은 위의 분야 태그 칸(#hNewB)으로 옮겼습니다
  try{ paintLibHome(vis,n); }catch(e){ log('도서관 홈 그리기 실패: '+(e.message||e)); }
  try{ applyHomeLayout(); }catch(e){ log('홈 배치 실패: '+(e.message||e)); }

  $('#lkAll').textContent = n[''].toLocaleString()+'권 ›';
  paintLkHl(); paintLkCal(); paintSmartHome();


  /* 올해 */
  const yr=new Date().getFullYear();
  let dy=0; Object.keys(RD).forEach(k=>{ const r=RD[k];
    if(r&&r.f&&r.t&&new Date(r.t).getFullYear()===yr)dy++; });
  $('#hstat').textContent =
    `${yr}년 · 다 읽음 ${dy}권 · 읽는 중 ${n.reading}권`
    + (UPDATED?`\n갱신 ${UPDATED} · ${BUILD}`:`\n${BUILD}`);

}
/* 최상위 탭 — 나 · 모임들
   모임원은 자기 모임 하나만, 만든 이는 모든 모임이 보입니다. */
function paintSeg(){
  const el=$('#hseg'); el.innerHTML='';
  const gl=grpList();
  const add=(v,label)=>{ const b=document.createElement('button');
    b.dataset.v=v; b.textContent=label;
    b.classList.toggle('on',HSIDE===v);
    b.onclick=()=>{
      HSIDE=v; localStorage.setItem('ebl_hside',HSIDE);
      if(HSIDE!=='me'){ VIEWG=(HSIDE==='all'?'':HSIDE);
        localStorage.setItem('ebl_viewg',VIEWG);
        buildFam(); famLoad().then(buildFam); }
      else render(true);
      paintSeg(); setView();
      $('#home').scrollTop=0; $('#famPane').scrollTop=0;
    };
    el.appendChild(b); };
  add('me','나');
  gl.forEach(g=>add(g.id,g.name));
  // 모임이 하나도 없으면 탭 줄 자체를 숨깁니다
  el.style.display = gl.length ? 'flex' : 'none';
  if(!gl.length && HSIDE!=='me'){ HSIDE='me'; localStorage.setItem('ebl_hside','me'); }
}
function paintGrps(){
  const el=$('#grpList'); if(!el)return;
  el.innerHTML='';
  if(!GROUPS.length){ el.innerHTML='<div class="hnone" style="padding:6px 2px">'
    +'아직 만든 모임이 없습니다.</div>'; return; }
  const f=document.createDocumentFragment();
  GROUPS.forEach(g=>{
    const n=MATES.filter(m=>m.grp===g.id).length;
    const d=document.createElement('div'); d.className='it';
    d.innerHTML=`<span>${esc(g.name)}<i class="n">${n?n+'명':'아직 없음'}</i></span>`;
    const w=document.createElement('span'); w.className='b';
    const r=document.createElement('button'); r.textContent='이름';
    r.onclick=()=>editGrp(g.id);
    const x=document.createElement('button'); x.textContent='지우기'; x.className='warn';
    x.onclick=()=>delGrp(g.id);
    w.append(r,x); d.appendChild(w); f.appendChild(d);
  });
  el.appendChild(f);
}
/* 모임 지우기
   예전 '내리기' 는 이 기기 목록에서만 뺐습니다. 서버는 그대로였으니
   새로고침 한 번에 되살아났습니다. 이제 서버에 제대로 알립니다.

   사람은 지우지 않습니다. 명단에 남긴 채 '모임 없음' 으로 돌려보냅니다.
   시트도 남깁니다. 이름만 '지운모임_' 으로 바뀝니다. */
async function delGrp(id){
  const g=GROUPS.find(x=>x.id===id); if(!g)return;
  if(!isOwner()){ toast('관리자 열쇠가 필요합니다'); return; }

  let d=await admin2('famgroupdel','&g='+encodeURIComponent(id),true);
  if(!d)return;

  if(d.error==='has_members'){
    const nm=(d.who||[]).map(u=>{
      const m=MATES.find(x=>x.id===u); return '  · '+(m?m.name:u);
    }).join('\n');
    const go=confirm(
      `'${g.name}' 에 아직 ${d.n}명이 있습니다.\n\n${nm}\n\n`
      +`[취소] 그만두고 이분들을 먼저 다른 모임으로 옮깁니다  (권합니다)\n`
      +`[확인] 이분들을 '모임 없음' 으로 빼고 지웁니다\n\n`
      +`어느 쪽이든 사람이 명단에서 지워지지는 않습니다.`);
    if(!go)return;
    d=await admin2('famgroupdel','&g='+encodeURIComponent(id)+'&force=1',true);
    if(!d||d.error){ if(d&&d.error)toast(d.error,5000); return; }
  }else if(d.error){ toast(d.error,5000); return; }

  GROUPS=GROUPS.filter(x=>x.id!==id); saveGroups();
  MATES.forEach(m=>{ if(m.grp===id)m.grp=''; }); saveMates();
  if(HSIDE===id){ HSIDE='me'; localStorage.setItem('ebl_hside','me'); }
  if(VIEWG===id){ VIEWG=''; localStorage.setItem('ebl_viewg',''); }
  paintGrps(); paintSeg(); paintMates(); paintInvGrp(); setView();
  toast(d.n?`'${g.name}' 을 지웠습니다.\n${d.n}명은 명단에 남아 '모임 없음' 입니다`
           :`'${g.name}' 을 지웠습니다.\n시트는 '지운모임_' 으로 남아 있습니다`,5000);
}
async function newGrp(){
  if(!isOwner()){ toast('관리자 열쇠가 필요합니다'); return; }
  const nm=(await ask('새 모임 이름','예) 우리집 · 형제자매'))||'';
  if(!nm.trim())return;
  const g={id:newId(),name:nm.trim()};
  toast('모임을 만드는 중…');
  const d=await admin2('famgroup','&g='+encodeURIComponent(g.id)
    +'&gname='+encodeURIComponent(g.name));
  if(!d)return;
  GROUPS.push(g); saveGroups();
  VIEWG=g.id; localStorage.setItem('ebl_viewg',VIEWG);
  paintGrps(); paintSeg(); paintInvGrp();
  toast(`'${g.name}' 모임을 만들었습니다.\n맨 위 탭에 붙었습니다`,4500);
}
/* 팀장님 전용 통로 */
async function admin2(mode,extra,raw){
  const adm=cfg('adm');
  if(!adm){ toast('먼저 ⚙ 에 관리자 열쇠를 넣어주세요',5000); return null; }
  let u=cfg('url')+(cfg('url').includes('?')?'&':'?')+'token='+encodeURIComponent(cfg('tok'))
    +'&mode='+mode+'&uid='+encodeURIComponent(ME.id)
    +'&admin='+encodeURIComponent(adm)+(extra||'');
  try{
    const r=await fetch(u); const d=await r.json();
    // raw 를 주면 오류도 그대로 돌려줍니다 — 부른 쪽이 직접 다루려 할 때
    if(d.error&&!raw){ toast(d.error==='admin_required'?'관리자 열쇠가 맞지 않습니다':d.error,5000); return null; }
    return d;
  }catch(e){ toast('서버에 닿지 못했습니다\n'+(e.message||e),5000); return null; }
}
async function editGrp(id){
  const g=GROUPS.find(x=>x.id===id); if(!g)return;
  const nm=await ask('모임 이름 고치기','',g.name);
  if(nm===null||!nm.trim())return;
  const d=await admin2('famrename','&g='+encodeURIComponent(id)
    +'&gname='+encodeURIComponent(nm.trim()));
  if(!d)return;
  g.name=nm.trim(); saveGroups();
  paintGrps(); paintSeg(); paintMates(); paintInvGrp();
  toast('이름을 바꿨습니다. 시트 이름도 함께 바뀌었습니다',4000);
}
$('#btnNewGrp').onclick=newGrp;
$('#hShelfNew').onclick=newShelf;
/* 서가 칸 들어가기 */
function goShelf(o){
  SHELF=o.id; SHELFNM=o['제목']||'';
  TAB='shelf'; localStorage.setItem('ebl_tab','');
  SEL=''; PATH=[]; PIN='';
  paintTabs(); buildChips(); render(true);
}
async function editShelf(o){
  const nm=await ask('칸 이름 고치기','',o['제목']||'');
  if(nm===null)return;
  if(!nm.trim()){
    if(confirm(`'${o['제목']}' 칸을 지웁니다.\n담긴 책 표시도 함께 사라집니다.`)){
      const gg=grpOf(o);
      for(const x of shelfBooks(o.id)) await famDel(x.id,gg);
      await famDel(o.id,gg); toast('칸을 지웠습니다'); render(true);
    }
    return;
  }
  await famPut({kind:'shelf',id:o.id,title:nm.trim()});
  toast('이름을 바꿨습니다'); render(true);
}
/* 이 책을 어느 칸에 담을까 */
async function pickShelf(b){
  const sh=shelves();
  if(!sh.length){ toast('먼저 홈에서 칸을 만들어 주세요',4000); return; }
  const inIt=id=>shelfBooks(id).some(x=>x['책ID']===b.i);
  const el=$('#pbActs'); el.innerHTML='';
  $('#pbT').textContent='어느 칸에 담을까요?';
  $('#pbS').textContent=b.t||'';
  sh.forEach(o=>{
    const on=inIt(o.id);
    const x=document.createElement('button');
    x.innerHTML=(on?'✓ ':'')+esc(o['제목']||'')+`<span class="h">${shelfBooks(o.id).length}권`
      +(on?' · 누르면 뺍니다':'')+`</span>`;
    if(on)x.style.color='var(--acc)';
    x.onclick=async()=>{
      panOff();
      const gg=grpOf(o)||curGrp();
      if(on){ const hit=shelfBooks(o.id).find(y=>y['책ID']===b.i);
        if(hit&&await famDel(hit.id,gg))toast('칸에서 뺐습니다'); }
      else{ if(await famPut({kind:'shelfbook',to:o.id,book:b.i,title:b.t||'',
            val:packVal({g:gg})},gg))
        toast(`'${o['제목']}' 에 담았습니다`); }
      render(true);
    };
    el.appendChild(x);
  });
  pan('#panBook',true);
}
/* 이 책을 누구에게 권할까 */
async function pickWho(b){
  const who=roster();
  if(!who.length){ toast('아직 모임원이 없습니다',4000); return; }
  const el=$('#pbActs'); el.innerHTML='';
  $('#pbT').textContent='누구에게 권할까요?';
  $('#pbS').textContent=b.t||'';
  who.forEach(m=>{
    const x=document.createElement('button');
    x.textContent=m.name;
    x.onclick=async()=>{
      panOff();
      const msg=await ask(`'${m.name}' 에게 한마디`,'안 적으셔도 됩니다');
      if(msg===null)return;
      const gg=m.grp||await targetGrp(); if(gg===null)return;
      if(await famPut({kind:'rec',to:m.id,book:b.i,title:b.t||'',
            text:(msg||'').trim(),val:packVal({g:gg,n:m.name})},gg))
        toast(`${m.name} 에게 권했습니다`);
    };
    el.appendChild(x);
  });
  pan('#panBook',true);
}
/* 없는 책 요청 */
$('#lkReq').onclick=()=>{ $('#reqT').value=''; $('#reqM').value='';
  paintReq(); $('#reqSheet').classList.add('on'); setTimeout(()=>$('#reqT').focus(),250); };
$('#reqClose').onclick=()=>$('#reqSheet').classList.remove('on');
$('#reqOk').onclick=async()=>{
  const t=$('#reqT').value.trim();
  if(!t){ toast('책 제목을 적어주세요'); return; }
  const gg=await targetGrp('어느 모임에 요청할까요?'); if(gg===null)return;
  if(await famPut({kind:'req',title:t,text:$('#reqM').value.trim(),
        val:packVal({g:gg})},gg)){
    toast('보냈습니다'); $('#reqT').value=''; $('#reqM').value=''; paintReq(); render(true); }
};
function paintReq(){
  const el=$('#reqList'); el.innerHTML='';
  const rows=famOf('req').slice().reverse();
  const mine=rows.filter(o=>o['누가']===ME.id);
  const show=isOwner()?rows:mine;
  if(!show.length)return;
  const h=document.createElement('div'); h.className='sect';
  h.textContent=isOwner()?`들어온 요청 ${rows.length}건`:'내가 보낸 것';
  el.appendChild(h);
  show.forEach(o=>{
    const d=document.createElement('div'); d.className='it';
    d.innerHTML=`<div>${esc(o['제목']||'')}</div>`
      +(o['내용']?`<div style="color:var(--dim);font-size:12px;margin-top:3px">${esc(o['내용'])}</div>`:'');
    const w=document.createElement('div'); w.className='w';
    w.innerHTML=`<span>${esc(o['이름']||'')} · ${String(o['언제']||'').slice(5,10)}</span>`;
    if(isOwner()||o['누가']===ME.id){
      const x=document.createElement('button'); x.textContent='지우기';
      x.onclick=async()=>{ if(await famDel(o.id,grpOf(o))){ paintReq(); render(true); } };
      w.appendChild(x);
    }
    d.appendChild(w); el.appendChild(d);
  });
}

$$('#home [data-go]').forEach(x=>x.onclick=()=>goList(x.dataset.go));
$$('.hlinks button').forEach(x=>x.onclick=()=>goList(x.dataset.go));
$('#hToday2').onclick=e=>{ e.stopPropagation(); todayN++; buildHome(); };

