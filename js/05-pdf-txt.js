/* 우리 도서관 — js/05-pdf-txt.js
   펜슬 필기 · PDF · TXT
   ※ 모든 파일이 같은 전역을 나눠 씁니다. index.html 에 적힌 순서(01 → 12)대로 불러와야 합니다. */
/* ══════════ 펜슬 필기 ══════════
   INK[쪽번호] = [ {c:색, w:굵기, h:형광펜인가, p:[[x,y,힘],…] } ]
   x·y·굵기는 모두 '쪽 크기에 대한 비율'로 저장합니다.
   그래야 배율을 바꾸거나 화면을 돌려도 글씨가 제자리에 있습니다.
   원본 PDF 는 건드리지 않습니다. */
let INK={}, inkKey='', inkOn=false;
const PEN={ c:'#e8453c', w:2, erase:false, finger:false };
const PENW=[0,0.0016,0.0030,0.0058];      // 쪽 너비에 대한 비율

const saveINK=(()=>{ let t=null;
  const flush=()=>{ t=null; if(!inkKey)return;
    const k=inkKey; DB.put('kv','ink:'+k,INK).then(()=>inkStamp(k)).catch(e=>{
      log('필기 저장 실패: '+(e.message||e));
      toast('필기를 저장하지 못했습니다\n'+(e.message||e),4500); }); };
  const f=()=>{ if(!t)t=setTimeout(flush,600); }; f.now=()=>{ if(t)clearTimeout(t); flush(); };
  return f; })();
/* v55.5 — 펜슬 필기 기기끼리 맞추기
   필기는 크기가 커서 읽은 기록과 따로 드라이브 앱 전용 칸의 'ebl-ink.json' 에 책마다 {at, d} 로 둡니다.
   책 하나 안에서는 나중에 쓴 기기가 이깁니다 (두 기기에서 같은 책에 동시에 쓰면 먼저 쓴 쪽이 사라질 수 있음).
   ebl_inkat = 이 기기에서 책마다 마지막으로 쓴 시각 · ebl_inksent = 드라이브에 올린 시각 · ebl_inkmt = 마지막으로 본 파일 시각 */
const IFILE='ebl-ink.json';
const jget=(k,d)=>{ try{ return JSON.parse(localStorage.getItem(k)||'')||d; }catch(e){ return d; } };
function inkStamp(id){ if(!id)return; const m=jget('ebl_inkat',{}); m[id]=Date.now(); try{ localStorage.setItem('ebl_inkat',JSON.stringify(m)); }catch(e){} }
async function inkSync(at){
  try{ saveINK.now(); }catch(e){}
  const loc=jget('ebl_inkat',{}), sent=jget('ebl_inksent',{}), seen=localStorage.getItem('ebl_inkmt')||'';
  const dirty=Object.keys(loc).filter(id=>(loc[id]||0)>(sent[id]||0));
  const q=encodeURIComponent(`name='${IFILE}' and trashed=false`);
  const fr=await dv(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime)&pageSize=1`,at);
  const f=((await fr.json()).files||[])[0]||null;
  if(!dirty.length&&(!f||f.modifiedTime===seen)) return 0;          // 양쪽 다 그대로
  let remote={v:1,b:{}};
  if(f){ try{ remote=await (await dv(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`,at)).json()||remote; }catch(e){ throw new Error('필기 받기 실패'); } }
  remote.b=remote.b||{};
  let got=0, up=0;
  for(const id of Object.keys(remote.b)){
    const e=remote.b[id]; if(!e||(e.at||0)<=(loc[id]||0))continue;
    await DB.put('kv','ink:'+id,e.d||{}); loc[id]=e.at; sent[id]=e.at; got++;
    if(inkKey===id){ INK=e.d||{}; try{ paintAllInk(); paintPenBadge(); }catch(x){} }
  }
  for(const id of dirty){
    if((loc[id]||0)<=((remote.b[id]||{}).at||0))continue;
    let d={}; try{ d=(await DB.get('kv','ink:'+id))||{}; }catch(e){ continue; }
    remote.b[id]={at:loc[id],d}; up++;
  }
  let mt=f?f.modifiedTime:'';
  if(up){
    const body=JSON.stringify(remote);
    if(f){ const r=await dv(`https://www.googleapis.com/upload/drive/v3/files/${f.id}?uploadType=media&fields=modifiedTime`,at,
        {method:'PATCH',headers:{'Content-Type':'application/json'},body}); mt=(await r.json()).modifiedTime||''; }
    else{ const B='ebi'+Date.now(), meta=JSON.stringify({name:IFILE,parents:['appDataFolder']});
      const multi=`--${B}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${B}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${B}--`;
      const r=await dv(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime`,at,
        {method:'POST',headers:{'Content-Type':'multipart/related; boundary='+B},body:multi}); mt=(await r.json()).modifiedTime||''; }
    Object.keys(remote.b).forEach(id=>{ if(loc[id]&&remote.b[id].at===loc[id])sent[id]=loc[id]; });
  }
  try{ localStorage.setItem('ebl_inkat',JSON.stringify(loc)); localStorage.setItem('ebl_inksent',JSON.stringify(sent));
       localStorage.setItem('ebl_inkmt',mt); }catch(e){}
  if(got||up) log('필기 맞추기 — 받음 '+got+' · 올림 '+up+'권');
  return got+up;
}
async function loadINK(id){
  inkKey=id; INK={};
  try{ INK=(await DB.get('kv','ink:'+id))||{}; }catch(e){ INK={}; }
}
function inkOf(n){ return INK[n]||(INK[n]=[]); }
function inkCount(){ let n=0; Object.values(INK).forEach(a=>n+=a.length); return n; }

/* 쪽마다 투명 종이 한 장 */
function inkCanvas(d,make){
  let cv=d.querySelector('canvas.ink');
  if(!cv&&make){ cv=document.createElement('canvas'); cv.className='ink'; d.appendChild(cv); }
  return cv;
}
function drawInk(d){
  const n=Number(d.dataset.n), list=INK[n];
  const w=d.clientWidth, h=d.clientHeight;
  if(!w||!h)return;
  let cv=inkCanvas(d,!!(list&&list.length));
  if(!cv)return;
  if(!list||!list.length){ cv.remove(); return; }
  const dpr=Math.min(2,window.devicePixelRatio||1);
  cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr);
  const g=cv.getContext('2d',{desynchronized:true});
  g.scale(dpr,dpr);
  list.forEach(st=>strokeOn(g,st,w,h));
}
/* 점을 곧게 잇지 않고 곡선으로 이어야 매끄럽습니다.
   사파리는 촘촘한 좌표 묶음을 안 주므로 이 처리가 특히 중요합니다. */
function strokeOn(g,st,w,h){
  const p=st.p; if(!p||!p.length)return;
  g.save();
  g.lineCap='round'; g.lineJoin='round';
  g.strokeStyle=st.c;
  g.globalAlpha=st.h?0.34:1;
  if(st.h)g.globalCompositeOperation='multiply';
  const base=st.w*w;
  if(p.length===1){
    g.fillStyle=st.c; g.beginPath();
    g.arc(p[0][0]*w,p[0][1]*h,base/2,0,6.284); g.fill(); g.restore(); return;
  }
  for(let i=1;i<p.length;i++){
    const a=p[i-1], b=p[i];
    // 형광펜은 굵기를 고르게, 펜은 필압을 따릅니다
    g.lineWidth = st.h ? base : base*(0.45+0.85*((a[2]+b[2])/2||0.5));
    g.beginPath();
    if(i===1) g.moveTo(a[0]*w,a[1]*h);
    else { const q=p[i-2];
      g.moveTo((q[0]+a[0])/2*w,(q[1]+a[1])/2*h);
      g.quadraticCurveTo(a[0]*w,a[1]*h,(a[0]+b[0])/2*w,(a[1]+b[1])/2*h); }
    if(i===1) g.lineTo(b[0]*w,b[1]*h);
    g.stroke();
  }
  g.restore();
}
function paintAllInk(){
  if(KIND!=='pdf')return;
  [...$('#pdf').children].forEach(d=>{ if(d.classList.contains('pg'))drawInk(d); });
  paintPenBadge();
}
function paintPenBadge(){
  const n=inkCount();
  $('#btnPen').textContent = n? '펜 '+n : '펜';
  $('#btnPen').classList.toggle('good',inkOn);
}

/* 손끝 자리를 쪽 안의 비율로 바꿉니다 */
function inkPt(e,d){
  const b=d.getBoundingClientRect();
  const cl=v=>v<-0.05?-0.05:v>1.05?1.05:v;
  return [ cl((e.clientX-b.left)/b.width), cl((e.clientY-b.top)/b.height),
           (e.pressure!=null&&e.pressure>0)?e.pressure:0.5 ];
}
/* 어느 쪽 위인지 '좌표'로 찾습니다.
   눌린 것이 무엇이냐로 찾으면, 쪽 넘김 탭 영역이 좌우를 덮고 있어
   가운데에서만 글씨가 써집니다. */
function pgAt(x,y){
  const ch=$('#pdf').children;
  for(let i=0;i<ch.length;i++){
    const d=ch[i]; if(!d.classList||!d.classList.contains('pg'))continue;
    const b=d.getBoundingClientRect();
    if(x>=b.left&&x<=b.right&&y>=b.top&&y<=b.bottom)return d;
  }
  return null;
}
let penDrag=null, penAt=0;
function penStart(e){
  if(KIND!=='pdf'||!readerOn())return;
  const pen = e.pointerType==='pen';
  if(!pen && !(inkOn&&PEN.finger))return;        // 손가락은 그대로 통과 → 굴리기·글 고르기 유지
  if(e.target&&e.target.closest&&e.target.closest('#penbar, .pan, .sheet, #rbar, #rfoot'))return;
  const d=pgAt(e.clientX,e.clientY);
  if(!d)return;
  penAt=Date.now();
  if(e.cancelable)e.preventDefault();
  e.stopPropagation();
  if(!inkOn)setPen(true);
  const n=Number(d.dataset.n), pt=inkPt(e,d);
  if(PEN.erase){ penDrag={erase:true,d:d,n:n}; eraseAt(n,pt,d); return; }
  const st={ c:PEN.c, w:PENW[PEN.w]*(PEN.c==='#ffd400'?3.2:1), h:PEN.c==='#ffd400', p:[pt] };
  inkOf(n).push(st);
  penDrag={st:st,d:d,n:n};
}
function penMove(e){
  if(!penDrag)return;
  if(e.cancelable)e.preventDefault();
  const pt=inkPt(e,penDrag.d);
  if(penDrag.erase){ eraseAt(penDrag.n,pt,penDrag.d); return; }
  const p=penDrag.st.p, last=p[p.length-1];
  // 너무 촘촘한 점은 버립니다 (저장 크기와 매끄러움 둘 다 좋아집니다)
  const dx=pt[0]-last[0], dy=pt[1]-last[1];
  if(dx*dx+dy*dy < 4e-6) return;
  p.push([Math.round(pt[0]*1e4)/1e4, Math.round(pt[1]*1e4)/1e4, Math.round(pt[2]*100)/100]);
  drawInk(penDrag.d);
}
function penEnd(){
  if(!penDrag)return;
  const d=penDrag.d; penDrag=null;
  drawInk(d); saveINK(); paintPenBadge();
}
/* 지우개 — 지나간 자리만 지웁니다.
   획을 통째로 없애지 않고, 닿은 데를 잘라 앞뒤를 남깁니다. */
const ERW=[0,0.016,0.028,0.045];          // 굵기 단추에 따른 지우개 크기
function segDist(a,b,p,ar){
  const ax=a[0],ay=a[1]*ar, bx=b[0],by=b[1]*ar, px=p[0],py=p[1]*ar;
  const dx=bx-ax, dy=by-ay, L=dx*dx+dy*dy;
  let t = L ? ((px-ax)*dx+(py-ay)*dy)/L : 0;
  t = t<0?0 : t>1?1 : t;
  const qx=ax+t*dx, qy=ay+t*dy;
  return Math.hypot(px-qx, py-qy);
}
function eraseAt(n,pt,d){
  const list=INK[n]; if(!list||!list.length)return;
  const ar=d.clientHeight/d.clientWidth;   // 세로를 가로 잣대에 맞춥니다
  const r=ERW[PEN.w]||0.028;
  const out=[]; let changed=false;
  list.forEach(st=>{
    const p=st.p, m=p.length;
    const cut=new Array(m).fill(false);
    for(let i=0;i<m;i++){
      const dx=p[i][0]-pt[0], dy=(p[i][1]-pt[1])*ar;
      if(dx*dx+dy*dy < r*r) cut[i]=true;
    }
    // 점 사이를 스쳐 지나가도 잘리도록 — 점만 보면 사이가 안 끊깁니다
    for(let i=1;i<m;i++){
      if(cut[i-1]&&cut[i])continue;
      if(segDist(p[i-1],p[i],pt,ar) < r){ cut[i-1]=true; cut[i]=true; }
    }
    if(!cut.some(Boolean)){ out.push(st); return; }
    changed=true;
    let run=[];
    for(let i=0;i<m;i++){
      if(cut[i]){ if(run.length>1)out.push({c:st.c,w:st.w,h:st.h,p:run}); run=[]; }
      else run.push(p[i]);
    }
    if(run.length>1)out.push({c:st.c,w:st.w,h:st.h,p:run});
  });
  if(!changed)return;
  INK[n]=out; if(!out.length)delete INK[n];
  drawInk(d); saveINK(); paintPenBadge();
}
function setPen(on){
  inkOn=on;
  $('#penbar').classList.toggle('on',on&&KIND==='pdf');
  $('#btnPen').classList.toggle('good',on);
  if(on){ setDrawMode(false); selbarOff(); }
  paintPenBadge();
}
$('#btnPen').onclick=()=>{
  if(KIND!=='pdf')return toast('PDF 에서만 쓸 수 있습니다');
  setPen(!inkOn);
};
$('#penOff').onclick=()=>setPen(false);
$$('#penbar .col').forEach(b=>b.onclick=()=>{
  PEN.c=b.dataset.c; PEN.erase=false; paintPenBar(); });
$$('#penbar .wd').forEach(b=>b.onclick=()=>{ PEN.w=Number(b.dataset.w); PEN.erase=false; paintPenBar(); });
$('#penErase').onclick=()=>{ PEN.erase=!PEN.erase; paintPenBar(); };
$('#penFinger').onclick=()=>{ PEN.finger=!PEN.finger; paintPenBar();
  toast(PEN.finger?'손가락으로도 그립니다 (굴리기는 두 손가락)':'펜슬로만 그립니다'); };
$('#penUndo').onclick=()=>{
  const n=(KIND==='pdf'&&pdfPg)||1;
  // 지금 쪽에 없으면 가장 최근에 그린 쪽에서 되돌립니다
  let k=INK[n]&&INK[n].length?n:null;
  if(!k){ Object.keys(INK).forEach(x=>{ if(INK[x]&&INK[x].length)k=x; }); }
  if(!k)return toast('되돌릴 것이 없습니다');
  INK[k].pop(); if(!INK[k].length)delete INK[k];
  saveINK(); paintAllInk();
};
function paintPenBar(){
  $$('#penbar .col').forEach(b=>b.classList.toggle('on',!PEN.erase&&PEN.c===b.dataset.c));
  $$('#penbar .wd').forEach(b=>b.classList.toggle('on',!PEN.erase&&PEN.w===Number(b.dataset.w)));
  $('#penErase').classList.toggle('on',PEN.erase);
  $('#penFinger').classList.toggle('on',PEN.finger);
}
(function(){
  const rd=$('#reader');
  // 내려가는 길(capture)에서 먼저 잡습니다 — 탭 영역보다 앞서야 합니다
  rd.addEventListener('pointerdown',penStart,true);
  // 그리는 중에는 손이 쪽 밖으로 나가도 이어지도록 창 전체에서 받습니다
  addEventListener('pointermove',penMove,{passive:false});
  ['pointerup','pointercancel'].forEach(k=>addEventListener(k,penEnd));
  // 스크리블이 펜슬 신호를 가로채지 못하게 막습니다
  addEventListener('touchmove',e=>{ if(penDrag&&e.cancelable)e.preventDefault(); },{passive:false});
})();

/* ══════════ PDF ══════════ */
let pdfDoc=null, pdfIO=null, pdfPg=1, pdfBusy=new Set();
function loadPdfJs(){
  if(window.pdfjsLib) return Promise.resolve();
  if(loadPdfJs._p) return loadPdfJs._p;
  const B='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  return loadPdfJs._p=new Promise((ok,ng)=>{
    const s=document.createElement('script'); s.src=B+'pdf.min.js';
    s.onload=()=>{ try{ pdfjsLib.GlobalWorkerOptions.workerSrc=B+'pdf.worker.min.js'; }catch(e){}
      ok(); };
    s.onerror=()=>{ loadPdfJs._p=null; ng(new Error('PDF 모듈을 받지 못했습니다')); };
    document.head.appendChild(s);
  });
}
/* 왜 열리지 않는지 사람 말로 알려줍니다 */
function pdfWhy(e){
  const n=(e&&e.name)||'', m=(e&&e.message)||String(e);
  if(n==='PasswordException')  return '암호가 걸린 PDF 입니다.';
  if(n==='InvalidPDFException')return '파일이 깨졌거나 PDF 가 아닙니다.\n드라이브에서 열어 확인해 보세요.';
  if(n==='MissingPDFException')return '파일을 받지 못했습니다.';
  if(/worker/i.test(m))        return 'PDF 모듈을 받지 못했습니다.\n인터넷 연결을 확인해 주세요.';
  if(/memory|allocat/i.test(m))return '이 PDF 가 기기에 비해 너무 큽니다.\n배율을 낮춰 보세요.';
  return m;
}
async function openPdfDoc(buf){
  // getDocument 는 넘긴 버퍼를 가져가 버립니다. 원본은 그대로 둬야
  // 다시 열 때 문제가 없으므로 복사해서 넘깁니다.
  const data=new Uint8Array(buf.slice(0));
  try{ return await pdfjsLib.getDocument({data}).promise; }
  catch(e){
    if(e&&e.name==='PasswordException'){
      const pw=prompt('암호가 걸린 PDF 입니다. 암호를 넣어 주세요.');
      if(pw==null) throw new Error('암호를 넣지 않았습니다');
      return await pdfjsLib.getDocument({data:new Uint8Array(buf.slice(0)),password:pw}).promise;
    }
    throw e;
  }
}
async function showPdf(b,buf){
  curB=b; noMark=false; KIND='pdf';
  openShell(b);
  busy(true,'PDF 를 여는 중…','',1);
  try{
    await loadPdfJs();
    pdfDoc=await openPdfDoc(buf);
    const p1=await pdfDoc.getPage(1), v1=p1.getViewport({scale:1});
    $('#pdf')._ratio=v1.height/v1.width;
  }catch(e){ throw new Error(pdfWhy(e)); }
  await loadINK(b.i);
  const p=pctOf(b);
  pdfPg = p>0 ? Math.max(1,Math.min(pdfDoc.numPages,Math.round(p*pdfDoc.numPages))) : 1;
  buildPdf(); paintHlBadge(); paintPenBadge(); paintPenBar();
  markRead(b.i,null);
}
/* 두 가지 보기를 다시 차립니다 (설정이 바뀔 때도 이걸 부릅니다) */
function buildPdf(){
  const host=$('#pdf'); if(!pdfDoc)return;
  try{ pdfIO&&pdfIO.disconnect(); }catch(e){} pdfIO=null;
  pdfBusy.clear(); host.innerHTML='';
  const one = P.pnav==='page';
  host.classList.toggle('one',one);
  if(one){
    const d=document.createElement('div'); d.className='pg'; d.dataset.n=pdfPg;
    host.appendChild(d); host.onscroll=null;
    drawPdf(d); showPdfFoot();
  }else{
    for(let i=1;i<=pdfDoc.numPages;i++){
      const d=document.createElement('div'); d.className='pg'; d.dataset.n=i;
      d.innerHTML=`<div class="pn">${i}</div>`; host.appendChild(d);
    }
    layoutPdf();
    // 화면 가까이 온 쪽만 그리고, 멀어진 쪽은 그림을 버립니다
    pdfIO=new IntersectionObserver(es=>{
      es.forEach(e=>{ const d=e.target;
        if(e.isIntersecting) drawPdf(d); else freePdf(d); });
    },{root:host,rootMargin:'600px 0px'});
    [...host.children].forEach(d=>pdfIO.observe(d));
    host.onscroll=onPdfScroll;
    setTimeout(()=>{ gotoPg(pdfPg); onPdfScroll(); },40);
  }
  $('#tapL').style.display=$('#tapR').style.display=
    (one&&P.nav!=='swipe')?'block':'none';
}
function freePdf(d){
  if(!d._cv)return;
  const cv=d.querySelector('canvas:not(.ink)');
  if(cv){ cv.width=cv.height=0; }      // 사파리는 이렇게 해줘야 메모리를 돌려줍니다
  d.innerHTML=`<div class="pn">${d.dataset.n}</div>`; d._cv=false;
  const w=pdfWidth(), r=$('#pdf')._ratio||1.414;
  d.style.width=w+'px'; d.style.height=Math.round(w*r)+'px';
}
/* 100% 가 '화면에 맞춤'. 그보다 키우면 밀어서 봅니다. */
function pdfWidth(){
  const host=$('#pdf'), z=P.zoom/100;
  const w=Math.max(160,host.clientWidth-16);
  if(P.pnav!=='page') return Math.round(w*z);
  // 한 쪽씩 볼 때는 세로도 화면 안에 들어와야 합니다
  const h=Math.max(160,host.clientHeight-16), r=host._ratio||1.414;
  return Math.round(Math.min(w, h/r)*z);
}
function layoutPdf(){
  const host=$('#pdf'), w=pdfWidth(), r=host._ratio||1.414;
  [...host.children].forEach(d=>{
    d.style.width=w+'px';
    if(!d._cv) d.style.height=Math.round(w*r)+'px';
  });
}
async function drawPdf(d){
  if(d._cv||pdfBusy.has(d)||!pdfDoc)return;
  pdfBusy.add(d);
  try{
    const n=Number(d.dataset.n), pg=await pdfDoc.getPage(n);
    const v0=pg.getViewport({scale:1});
    const w=pdfWidth();
    // 확대해서 볼 때는 이미 커진 상태라 화면 배율까지 곱할 필요가 없습니다.
    const dpr=Math.min(window.devicePixelRatio||1, Math.max(1, 2/(P.zoom/100)));
    let scale=(w/v0.width)*dpr, vp=pg.getViewport({scale});
    // 그래도 넘치면 여기서 자릅니다. 아이패드가 메모리를 못 견딥니다.
    const MAXPIX=6e6, pix=vp.width*vp.height;
    if(pix>MAXPIX){ scale*=Math.sqrt(MAXPIX/pix); vp=pg.getViewport({scale}); }
    const cv=document.createElement('canvas');
    cv.width=Math.round(vp.width); cv.height=Math.round(vp.height);
    await pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
    d.style.width=w+'px'; d.style.height='auto';
    d.innerHTML=`<div class="pn">${n}</div>`;
    d.insertBefore(cv,d.firstChild); d._cv=true;
    // 글자층을 얹어야 글을 그을 수 있습니다 (스캔본은 글자가 없어 비어 있습니다)
    await addTextLayer(d,pg,vp);
    paintPdfHl();
    drawInk(d);
    trimPdf(d);
  }catch(e){
    log('쪽 그리기 실패 '+d.dataset.n+': '+(e.message||e));
    d.innerHTML=`<div class="pn">${d.dataset.n}</div>`
      +`<div class="perr">이 쪽을 그리지 못했습니다<br><small>${esc(pdfWhy(e))}</small></div>`;
  }
  finally{ pdfBusy.delete(d); }
}
/* 그려둔 쪽이 너무 많이 쌓이지 않게 — 멀리 있는 것부터 버립니다 */
const KEEP=5;
function trimPdf(cur){
  const host=$('#pdf');
  const live=[...host.children].filter(d=>d._cv);
  if(live.length<=KEEP)return;
  const c=Number(cur.dataset.n);
  live.sort((a,b)=>Math.abs(Number(b.dataset.n)-c)-Math.abs(Number(a.dataset.n)-c));
  live.slice(0,live.length-KEEP).forEach(freePdf);
}
function gotoPg(n){
  const host=$('#pdf'), d=host.querySelector(`.pg[data-n="${n}"]`);
  if(d) host.scrollTop=d.offsetTop-host.offsetTop-6;
}
/* 한 쪽씩 보기에서 쪽 옮기기 */
function goPdfPage(n){
  if(!pdfDoc)return;
  n=Math.max(1,Math.min(pdfDoc.numPages,n));
  if(n===pdfPg && P.pnav==='page' && $('#pdf').firstChild && $('#pdf').firstChild._cv)return;
  pdfPg=n;
  if(P.pnav==='page'){
    redrawPdf();
    if(!noMark) markRead(curB.i, n/pdfDoc.numPages, n>=pdfDoc.numPages);
    showPdfFoot();
  } else gotoPg(n);
}
/* 배율·화면 크기가 바뀌면 지금 쪽을 다시 그립니다 */
function redrawPdf(){
  if(KIND!=='pdf'||!pdfDoc)return;
  const host=$('#pdf');
  if(P.pnav==='page'){
    host.innerHTML=''; host.scrollTop=0; host.scrollLeft=0;
    const d=document.createElement('div'); d.className='pg'; d.dataset.n=pdfPg;
    const w=pdfWidth(), r=host._ratio||1.414;
    d.style.width=w+'px'; d.style.height=Math.round(w*r)+'px';
    host.appendChild(d); drawPdf(d);
  }else{
    [...host.children].forEach(freePdf);
    layoutPdf(); gotoPg(pdfPg);
  }
}
function showPdfFoot(){
  if(!pdfDoc||!curB)return;
  paintBmBtn();
  try{ pageTick(null); if(P.pnav==='page')rulerTop(); }catch(e){}
  $('#rfoot').textContent=`${pdfPg} / ${pdfDoc.numPages}`
    +(noMark?'  ·  기록 안 함':(stOf(curB)==='done'?'  ·  다 읽음':''))
    +'  ·  '+leftStr(null)+(curB.t||'');
}
function onPdfScroll(){
  const host=$('#pdf'); if(!pdfDoc||P.pnav==='page')return;
  if(!dragOn&&$('#selbar').classList.contains('on')&&!PICK)selbarOff();
  const y=host.scrollTop+host.clientHeight*0.35;
  let n=1; const ch=host.children;
  for(let i=0;i<ch.length;i++){ if(ch[i].offsetTop-host.offsetTop<=y)n=i+1; else break; }
  pdfPg=n;
  const atEnd=host.scrollTop+host.clientHeight>=host.scrollHeight-8;
  if(!noMark) markRead(curB.i, n/pdfDoc.numPages, atEnd);
  showPdfFoot();
}

/* ══════════ TXT ══════════ */
function decodeText(buf){
  const u=new Uint8Array(buf);
  if(u[0]===0xEF&&u[1]===0xBB&&u[2]===0xBF)return new TextDecoder('utf-8').decode(u.subarray(3));
  if(u[0]===0xFF&&u[1]===0xFE)return new TextDecoder('utf-16le').decode(u);
  if(u[0]===0xFE&&u[1]===0xFF)return new TextDecoder('utf-16be').decode(u);
  // 국내 txt 는 상당수가 EUC-KR 입니다. UTF-8 로 읽다 깨지면 넘어갑니다.
  try{ return new TextDecoder('utf-8',{fatal:true}).decode(u); }
  catch(e){ try{ return new TextDecoder('euc-kr').decode(u); }
            catch(e2){ return new TextDecoder('utf-8').decode(u); } }
}
async function showTxt(b,buf){
  curB=b; noMark=false; KIND='txt';
  openShell(b);
  const host=$('#txt');
  TXTRAW=decodeText(buf); TXTC='';
  const d=document.createElement('div'); d.className='body';
  host.innerHTML=''; host.appendChild(d);
  paintTxtHl(); paintHlBadge();
  applyRead();
  host.onscroll=onTxtScroll;
  const p=pctOf(b);
  if(p>0) setTimeout(()=>{ host.scrollTop=p*(host.scrollHeight-host.clientHeight); },60);
  else onTxtScroll();
  markRead(b.i,null);
}
function onTxtScroll(){
  const host=$('#txt');
  const max=host.scrollHeight-host.clientHeight;
  const p=max>0?host.scrollTop/max:1, atEnd=max<=0||host.scrollTop>=max-4;
  if(!noMark) markRead(curB.i,p,atEnd);
  paintBmBtn();
  $('#rfoot').textContent=Math.round(p*100)+'%'
    +(noMark?'  ·  기록 안 함':(stOf(curB)==='done'?'  ·  다 읽음':''))
    +'  ·  '+leftStr(null)+(curB.t||'');
}

/* 리더 껍데기 — 어떤 형식이든 공통 */
function openShell(b){
  try{ bkpEnter(b&&b.i); }catch(e){}                 // v56 — 이 책만 따로 기억한 보기 설정
  setTimeout(()=>{ try{ applyRuler(); }catch(e){} },80);
  selbarOff(); clearOv(); $('#resumeBar')&&$('#resumeBar').classList.remove('on');
  $('#library').style.display='none'; $('#reader').style.display='flex';
  $('#rtitle').textContent=b.t||'';
  $('#page').style.display = KIND==='epub'?'block':'none';
  $('#pdf').style.display  = KIND==='pdf' ?'block':'none';
  $('#txt').style.display  = KIND==='txt' ?'block':'none';
  if(typeof comicFree==='function')comicFree();
  $('#comic').style.display= KIND==='comic'?'block':'none';
  if(KIND!=='comic')$('#comic').innerHTML='';
  ['#btnDraw','#btnTts','#btnToc'].forEach(x=>{ const e=$(x); if(e)e.style.display=KIND==='comic'?'none':''; });
  const tap = KIND==='epub' && P.nav!=='swipe';
  $('#tapL').style.display=$('#tapR').style.display=tap?'block':'none';
  $$('#panRead .k-pdf').forEach(x=>x.style.display=KIND==='pdf'?'':'none');
  $$('#panRead .k-text').forEach(x=>x.style.display=KIND==='pdf'?'none':'');
  $$('#panRead .k-epub').forEach(x=>x.style.display=KIND==='epub'?'':'none');
  $$('#panRead .k-txt').forEach(x=>x.style.display=KIND==='txt'?'':'none');
  TOCS=null;
  $('#btnDraw').classList.toggle('good',drawMode);
  document.body.classList.toggle('drawing',drawMode);
  $('#drawPager').classList.toggle('on',drawMode);
  $('#btnPen').style.display = KIND==='pdf' ? '' : 'none';
  HLTAB='hl'; $('#btnBm').classList.remove('good');
  if(typeof ttsStop==='function')ttsStop();
  if(KIND!=='pdf')setPen(false);
  $('#page').innerHTML=''; if(KIND!=='pdf')$('#pdf').innerHTML='';
  if(KIND!=='txt')$('#txt').innerHTML='';
}

const readerOn = () => $('#reader').style.display==='flex';
function canPage(e){
  // EPUB, 그리고 '한 쪽씩 보는' PDF 만 넘깁니다.
  if(!readerOn() || drawMode) return false;
  if(KIND==='epub'){ if(!rend)return false; }
  else if(!(KIND==='pdf'&&P.pnav==='page')) return false;
  const t = e.target;
  if(t && t.closest && t.closest('.pan, #rbar, #rfoot, .sheet, #busy')) return false;
  return true;
}
/* PDF·TXT 에서는 가운데를 눌러 막대를 여닫습니다
   (좌우 끝은 tapL·tapR 이 먼저 받으므로 여기까지 오지 않습니다) */
['#pdf','#txt'].forEach(sel=>$(sel).addEventListener('click',e=>{
  if(!readerOn()||KIND==='epub')return;
  if(e.target&&e.target.closest&&e.target.closest('.pan, #rbar, #rfoot, .sheet, #busy'))return;
  // 글을 긋고 있었다면 막대를 여닫지 않습니다
  const s=getSelection(); if(s&&!s.isCollapsed&&s.toString().trim())return;
  if($('#selbar').classList.contains('on')){ selbarOff(); return; }
  toggleBars();
}));
/* 손을 뗐을 때 그은 글이 있으면 막대를 띄웁니다 */
['#pdf','#txt'].forEach(sel=>{
  const el=$(sel);
  el.addEventListener('pointerup',()=>setTimeout(selDone,10));
  el.addEventListener('touchend',()=>setTimeout(selDone,10),{passive:true});
});
addEventListener('keydown',e=>{ if(e.key==='Escape'){ selbarOff(); panOff(); } });
function bindGestures(doc){
  try{ doc.addEventListener('keydown',e=>readerKey(e));
       doc.addEventListener('wheel',e=>readerWheel(e),{passive:false});
       doc.addEventListener('mouseup',e=>readerSide(e)); }catch(e){}
  doc.addEventListener('click',e=>{
    if(!canPage(e)) return;
    if(P.nav==='swipe'){ toggleBars(); return; }
    const w=window.innerWidth,x=e.clientX,t=P.tap/100;
    if(x<w*t)rend.prev(); else if(x>w*(1-t))rend.next(); else toggleBars();
  });
  bindSwipe(doc);
}
function bindSwipe(doc){
  let sx=0,sy=0,st=0;
  doc.addEventListener('touchstart',e=>{ const t=e.changedTouches[0];
    sx=t.clientX; sy=t.clientY; st=Date.now(); },{passive:true});
  doc.addEventListener('touchend',e=>{
    if(P.nav==='tap'||!canPage(e))return;
    const t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;
    if(Date.now()-st<600&&Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.6){
      dx<0?pageFwd():pageBack(); }
  },{passive:true});
}
/* 바깥 문서에는 '밀어서 넘기기'만, 시작할 때 한 번만 붙입니다 */
bindSwipe(document);
function toggleBars(){ $('#rbar').classList.toggle('hide'); $('#rfoot').classList.toggle('hide'); }
function closeReader(){ try{ autoOff(); }catch(e){} try{ setTimeout(()=>readPush(false),1500); }catch(e){} try{ $('#ruler').classList.remove('on'); document.body.classList.remove('rfocus'); }catch(e){} ttsStop(); comicFree(); $('#comic').innerHTML=''; $('#comic').style.display='none'; saveRD.now(); saveHL.now(); saveINK.now(); saveDAYS.now(); setPen(false); syncSoon();
  selbarOff(); clearOv();
  $('#drawPager').classList.remove('on'); $('#drawTip').classList.remove('on');
  TXTRAW=''; TXTC=''; TOCS=null; epubC=null; EPLOC=null; caretWarned=false; INK={}; inkKey=''; penDrag=null;
  $('#reader').style.display='none'; $('#library').style.display='flex';
  try{ book&&book.destroy&&book.destroy(); }catch(e){}
  try{ pdfIO&&pdfIO.disconnect(); }catch(e){}
  try{ pdfDoc&&pdfDoc.destroy&&pdfDoc.destroy(); }catch(e){}
  pdfIO=null; pdfDoc=null; pdfBusy.clear();
  $('#pdf').innerHTML=''; $('#pdf').onscroll=null;
  $('#txt').innerHTML=''; $('#txt').onscroll=null;
  book=null; rend=null; curB=null; try{ bkpLeave(); }catch(e){} TOCED=false; paintTabs(); render(true);
  try{ rpopOff(); }catch(e){}
  try{ if(IDX.pending)setTimeout(()=>idxCheck(true),1500); }catch(e){}
  try{ if(UPD.pending)setTimeout(updApply,800); }catch(e){} }

