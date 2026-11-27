/* 우리 도서관 — js/10-comic-tts.js
   만화 뷰어 · 읽어주기 · 읽어주기 2(대사·속마음 목소리, 한자 읽기, 쉼)
   ※ 모든 파일이 같은 전역을 나눠 씁니다. index.html 에 적힌 순서(01 → 12)대로 불러와야 합니다. */
/* ══════════ v35 — 만화 뷰어 (CBZ · ZIP) ══════════
   ★ ZIP 을 통째로 받지 않습니다.
     ZIP 은 맨 끝에 '목차'(중앙 디렉터리)가 있습니다. 그것만 먼저 받고,
     장을 넘길 때마다 그 그림 하나만 드라이브에 '여기서 여기까지' 로 청해 받습니다(Range).
     그래서 수백 MB 짜리도 바로 열리고, 본 만큼만 받습니다.
   ★ 압축: 그림 ZIP 은 대개 '압축 안 함(stored)' 이라 그대로 씁니다.
     눌러 담은 것(deflate)은 브라우저의 DecompressionStream 으로 풉니다. 없으면 JSZip 으로.
   ★ 한글 파일 이름: 옛 압축 프로그램은 CP949(EUC-KR)로 이름을 씁니다. UTF-8 표시가 없으면 그쪽으로 읽습니다.
   ★ 그림이 없고 TXT·EPUB·PDF 가 든 ZIP 은 '안의 책' 목록을 띄웁니다.  */
const CM={ z:null, b:null, pages:[], n:0, i:0, span:1, urls:new Map(), seq:0, zoom:false, io:null, end:false };
if(!P.cmode)P.cmode='single'; if(!P.cdir)P.cdir='ltr'; if(P.ccover==null)P.ccover=1;
if(!P.cbr)P.cbr=100; if(!P.cct)P.cct=100; if(P.cgs==null)P.cgs=0;
const CIMG=/\.(jpe?g|jpe|jfif|png|gif|webp|avif|bmp)$/i;
const CMIME={jpe:'image/jpeg',jfif:'image/jpeg',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',gif:'image/gif',webp:'image/webp',avif:'image/avif',bmp:'image/bmp'};

/* ── ZIP 읽기 ── */
const u16=(d,o)=>d.getUint16(o,true), u32=(d,o)=>d.getUint32(o,true);
const u64=(d,o)=>u32(d,o)+u32(d,o+4)*4294967296;
function zipName(bytes,utf){
  if(utf)return new TextDecoder('utf-8').decode(bytes);
  try{ return new TextDecoder('utf-8',{fatal:true}).decode(bytes); }
  catch(e){ try{ return new TextDecoder('euc-kr').decode(bytes); }catch(e2){ return new TextDecoder('utf-8').decode(bytes); } }
}
async function zipOpen(src){
  const size=src.size, tl=Math.min(size,65557+22);
  const tail=await src.read(size-tl,size);
  const td=new DataView(tail.buffer,tail.byteOffset,tail.byteLength);
  let e=-1; for(let i=tail.length-22;i>=0;i--){ if(u32(td,i)===0x06054b50){ e=i; break; } }
  if(e<0)throw new Error('ZIP 파일이 아니거나 끝부분이 깨졌습니다');
  let cnt=u16(td,e+10), csz=u32(td,e+12), cof=u32(td,e+16);
  if(cof===0xFFFFFFFF||csz===0xFFFFFFFF||cnt===0xFFFF){          // ZIP64
    const L=e-20; if(L<0||u32(td,L)!==0x07064b50)throw new Error('ZIP64 정보를 찾지 못했습니다');
    const z64=u64(td,L+8); const h=await src.read(z64,z64+56); const hd=new DataView(h.buffer,h.byteOffset,h.byteLength);
    cnt=u64(hd,32); csz=u64(hd,40); cof=u64(hd,48);
  }
  let cd=await src.read(cof,cof+csz), shift=0;
  if(cd.length<4||new DataView(cd.buffer,cd.byteOffset,cd.byteLength).getUint32(0,true)!==0x02014b50){
    // 앞에 다른 것이 붙은 ZIP(자동 풀림 등) — 목차는 '끝 표시 바로 앞' 에 있습니다
    const real=(size-tl+e)-csz;
    if(real>=0&&real!==cof){ cd=await src.read(real,real+csz); shift=real-cof; }
  }
  const cv=new DataView(cd.buffer,cd.byteOffset,cd.byteLength);
  const ents=[]; let p=0;
  for(let k=0;k<cnt&&p+46<=cd.length;k++){
    if(u32(cv,p)!==0x02014b50)break;
    const fl=u16(cv,p+8), me=u16(cv,p+10), nl=u16(cv,p+28), xl=u16(cv,p+30), cl=u16(cv,p+32);
    let cs=u32(cv,p+20), us=u32(cv,p+24), lh=u32(cv,p+42);
    const name=zipName(cd.subarray(p+46,p+46+nl),fl&0x800);
    if(cs===0xFFFFFFFF||us===0xFFFFFFFF||lh===0xFFFFFFFF){         // ZIP64 덧붙임
      let x=p+46+nl; const xe=x+xl;
      while(x+4<=xe){ const id=u16(cv,x), ln=u16(cv,x+2); if(id===1){ let q=x+4;
          if(us===0xFFFFFFFF){ us=u64(cv,q); q+=8; } if(cs===0xFFFFFFFF){ cs=u64(cv,q); q+=8; } if(lh===0xFFFFFFFF){ lh=u64(cv,q); } }
        x+=4+ln; }
    }
    ents.push({name, m:me, cs, us, lh:lh+shift, enc:!!(fl&1), dir:/\/$/.test(name)});
    p+=46+nl+xl+cl;
  }
  return {src, ents};
}
async function zipData(z,en){
  if(en.enc)throw new Error('암호가 걸린 ZIP 은 아직 열 수 없습니다');
  const h=await z.src.read(en.lh,en.lh+30), hd=new DataView(h.buffer,h.byteOffset,h.byteLength);
  if(u32(hd,0)!==0x04034b50)throw new Error('ZIP 안쪽이 깨졌습니다');
  const st=en.lh+30+u16(hd,26)+u16(hd,28);
  const raw=await z.src.read(st,st+en.cs);
  if(en.m===0)return raw;
  if(en.m===8)return inflateRaw(raw,en);
  throw new Error('이 압축 방식('+en.m+')은 아직 열 수 없습니다');
}
async function inflateRaw(u8,en){
  if(typeof DecompressionStream!=='undefined'){
    try{ const out=await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
         return new Uint8Array(out); }catch(e){}
  }
  // 오래된 브라우저 — 이 한 조각만 담은 작은 ZIP 을 지어 JSZip 에 맡깁니다
  if(typeof JSZip==='undefined')throw new Error('이 브라우저는 압축을 풀 수 없습니다');
  const nm=new TextEncoder().encode('a'), L=30+nm.length, C=46+nm.length;
  const buf=new Uint8Array(L+u8.length+C+22), d=new DataView(buf.buffer);
  d.setUint32(0,0x04034b50,true); d.setUint16(8,8,true); d.setUint32(18,u8.length,true); d.setUint32(22,en.us,true); d.setUint16(26,nm.length,true);
  buf.set(nm,30); buf.set(u8,L);
  const c=L+u8.length; d.setUint32(c,0x02014b50,true); d.setUint16(c+10,8,true); d.setUint32(c+20,u8.length,true);
  d.setUint32(c+24,en.us,true); d.setUint16(c+28,nm.length,true); buf.set(nm,c+46);
  const e=c+C; d.setUint32(e,0x06054b50,true); d.setUint16(e+8,1,true); d.setUint16(e+10,1,true); d.setUint32(e+12,C,true); d.setUint32(e+16,c,true);
  const zz=await JSZip.loadAsync(buf); return await zz.file('a').async('uint8array');
}
/* 읽을 곳 — 기기에 담긴 파일이면 그대로, 아니면 드라이브에서 조각으로 */
/* ZIP 안의 ZIP — 압축 안 한 채 들어 있으면 바깥 ZIP 의 그 구간을 그대로 읽습니다 (통째로 안 받음) */
async function innerSrc(z,en){
  if(en.enc)throw new Error('암호가 걸린 ZIP 입니다');
  if(en.m!==0){
    if(en.us>300*1048576)throw new Error('안쪽 ZIP 이 눌러 담겨 있고 너무 큽니다 ('+Math.round(en.us/1048576)+'MB)');
    return memSrc(await zipData(z,en));
  }
  const h=await z.src.read(en.lh,en.lh+30), hd=new DataView(h.buffer,h.byteOffset,h.byteLength);
  if(hd.getUint32(0,true)!==0x04034b50)throw new Error('ZIP 안쪽이 깨졌습니다');
  const st=en.lh+30+hd.getUint16(26,true)+hd.getUint16(28,true);
  return { size:en.cs, read:(a,b)=>z.src.read(st+a,st+b) };
}
function memSrc(ab){ const u=ab instanceof Uint8Array?ab:new Uint8Array(ab); return { size:u.length, mem:u, read:async(a,b)=>u.subarray(a,b) }; }
async function driveSrc(b){
  let at=await needTokenAny();
  const base=`https://www.googleapis.com/drive/v3/files/${b.i}`;
  const m=await fetch(base+'?fields=size&supportsAllDrives=true',{headers:{Authorization:'Bearer '+at}});
  if(m.status===401||m.status===403){ throw new Error('이 파일을 볼 권한이 없습니다'); }
  if(!m.ok)throw new Error('드라이브 응답 '+m.status);
  const size=Number((await m.json()).size||0); if(!size)throw new Error('파일 크기를 알 수 없습니다');
  const read=async(a,z,again)=>{
    if(z<=a)return new Uint8Array(0);
    const ac=new AbortController();
    const r=await fetch(base+'?alt=media&supportsAllDrives=true',{headers:{Authorization:'Bearer '+at,Range:`bytes=${a}-${z-1}`},signal:ac.signal});
    if(r.status===401&&!again){ TOKEN=''; at=await needTokenAny(); return read(a,z,true); }
    if(r.status===206)return new Uint8Array(await r.arrayBuffer());
    if(r.status===200){                      // 부분 받기를 거절하고 통째로 보내려 함
      if(size>40*1048576){ ac.abort(); throw new Error('드라이브가 부분 받기를 거절했습니다'); }
      const all=new Uint8Array(await r.arrayBuffer()); return all.subarray(a,z); }
    throw new Error('드라이브 응답 '+r.status);
  };
  return { size, read };
}

/* ── 열기 ── */
async function showComic(b,srcIn,parent){
  busy(true,'만화를 여는 중…',b.z?b.z+'MB · 보는 장만 받습니다':'',0);
  let src=srcIn||null;
  if(!src){ try{ const hit=await DB.get('books',b.i); if(hit)src=memSrc(hit); }catch(e){} }
  if(!src)src=await driveSrc(b);
  const kind=await sniffArc(src);                       // 이름이 아니라 첫 바이트로
  if(kind==='rar'||kind==='7z')return showArc(b,src,kind,parent);
  const z=await zipOpen(src);
  log('ZIP 열기: '+(b._fn||b.t)+' — '+z.ents.length+'개 ('+zipSummary(z)+')');
  const imgs=z.ents.filter(e=>!e.dir&&CIMG.test(e.name)&&!/(^|\/)(__MACOSX|\.)/.test(e.name))
    .sort((x,y)=>EXCOLL.compare(x.name,y.name));
  busy(false);
  if(!imgs.length)return zipInner(b,z);
  return startComic(b,z,imgs,parent);
}
/* ZIP 이든 RAR·7z 든 장 목록이 나오면 여기서 엽니다 */
function startComic(b,z,imgs,parent){
  busy(false);
  curB=b; noMark=false; KIND='comic';
  openShell(b);
  Object.assign(CM,{z,b,pages:imgs,n:imgs.length,end:false,zoom:false,parent:parent||null});
  const rc=RD[b.i]&&RD[b.i].cp;
  let i=Number(rc!=null?rc:localStorage.getItem('ebl_cpg_'+b.i));   // v55.5 — 다른 기기에서 보던 쪽
  if(isNaN(i)||i<0||i>=CM.n){ const p=pctOf(b); i=p>0&&p<0.99?Math.max(0,Math.round(p*CM.n)-1):0; }
  CM.i=i;
  markRead(b.i,null);
  if(!COVERS[b.i])pageUrl(0).then(u=>{ if(u)saveCover(b.i,u); }).catch(()=>{});
  applyComicLook(); paintHlBadge();
  comicDraw();
}
function comicFree(){
  CM.seq++; CM.urls.forEach(u=>{ try{ URL.revokeObjectURL(u); }catch(e){} }); CM.urls.clear();
  try{ CM.io&&CM.io.disconnect(); }catch(e){} CM.io=null;
  CM.z=null; CM.pages=[]; CM.n=0; CM.end=false; CM.zoom=false;
  const el=document.getElementById('comic'); if(el)el.onscroll=null;
}
/* 한 장 받아 그림 주소로 — 최근 24장만 들고 있습니다 */
async function pageUrl(k){
  if(CM.urls.has(k)){ const u=CM.urls.get(k); CM.urls.delete(k); CM.urls.set(k,u); return u; }
  const z=CM.z, en=CM.pages[k]; if(!z||!en)return '';
  const data=en.blob?en.blob:await zipData(z,en);     // RAR·7z 는 이미 풀어 둔 것
  if(z!==CM.z)return '';
  const ext=(en.name.match(/\.(\w+)$/)||[])[1]||'jpg';
  const u=URL.createObjectURL(new Blob([data],{type:CMIME[ext.toLowerCase()]||'image/jpeg'}));
  CM.urls.set(k,u);
  while(CM.urls.size>24){ const [k0,u0]=CM.urls.entries().next().value;
    if(Math.abs(k0-CM.i)<4)break; CM.urls.delete(k0); try{ URL.revokeObjectURL(u0); }catch(e){} }
  return u;
}
let cmPre=Promise.resolve();
function prefetch(list){ list.forEach(k=>{ if(k>=0&&k<CM.n&&!CM.urls.has(k))cmPre=cmPre.then(()=>pageUrl(k)).catch(()=>{}); }); }

/* 두 장 펼침에서 k 쪽이 들어가는 펼침의 첫 쪽 */
function spreadStart(k){
  if(P.cmode!=='double')return k;
  if(P.ccover){ if(k<=0)return 0; return k-((k-1)%2); }
  return k-(k%2);
}
function spreadLen(st){
  if(P.cmode!=='double')return 1;
  if(P.ccover&&st===0)return 1;
  return Math.min(2,CM.n-st);
}
function applyComicLook(){
  const el=$('#comic');
  el.style.setProperty('--cflt',`brightness(${P.cbr/100}) contrast(${P.cct/100}) grayscale(${P.cgs?1:0})`);
  el.classList.toggle('rtl',P.cdir==='rtl');
}
async function comicDraw(){
  const el=$('#comic'), my=++CM.seq;
  el.classList.toggle('v',P.cmode==='vert'); el.classList.toggle('zoom',CM.zoom&&P.cmode!=='vert');
  try{ CM.io&&CM.io.disconnect(); }catch(e){} CM.io=null; el.onscroll=null;
  if(P.cmode==='vert'){ CM.span=1; return comicVert(my); }
  CM.i=spreadStart(CM.i); CM.span=spreadLen(CM.i);
  const ks=[]; for(let j=0;j<CM.span;j++)ks.push(CM.i+j);
  const sp=document.createElement('div'); sp.className='spread'+(CM.span>1?' two':'');
  sp.innerHTML='<div class="wait">불러오는 중…</div>';
  el.innerHTML=''; el.appendChild(sp);
  comicFoot();
  try{
    const us=await Promise.all(ks.map(pageUrl));
    if(my!==CM.seq)return;
    sp.innerHTML='';
    us.forEach(u=>{ const im=document.createElement('img'); im.src=u; im.draggable=false; sp.appendChild(im); });
    if(CM.zoom)requestAnimationFrame(()=>{ el.scrollLeft=(el.scrollWidth-el.clientWidth)/2; el.scrollTop=0; });
  }catch(e){ if(my!==CM.seq)return; sp.innerHTML=`<div class="wait">이 장을 열지 못했습니다<br>${esc(e.message||e)}</div>`; log('만화 장 실패: '+(e.message||e)); }
  const st=CM.i+CM.span; prefetch([st,st+1,st+2,CM.i-1]);
}
/* 세로(웹툰) — 모든 장을 자리만 깔고, 화면 가까이 온 것부터 받습니다 */
function comicVert(my){
  const el=$('#comic'); el.innerHTML='';
  const f=document.createDocumentFragment();
  for(let k=0;k<CM.n;k++){ const im=document.createElement('img'); im.className='vp'; im.dataset.k=k; im.alt=''; im.draggable=false; f.appendChild(im); }
  el.appendChild(f);
  const load=async im=>{ if(!im||im.src||im._busy)return; im._busy=true;
    try{ const u=await pageUrl(Number(im.dataset.k)); if(my===CM.seq&&u){ im.src=u; im.onload=()=>im.classList.add('ok'); } }catch(e){} };
  if('IntersectionObserver' in window){
    CM.io=new IntersectionObserver(es=>es.forEach(x=>{ if(x.isIntersecting)load(x.target); }),{root:el,rootMargin:'150% 0px'});
    el.querySelectorAll('.vp').forEach(im=>CM.io.observe(im));
  } else el.querySelectorAll('.vp').forEach((im,k)=>{ if(Math.abs(k-CM.i)<6)load(im); });
  const tgt=el.querySelector(`.vp[data-k="${CM.i}"]`);
  load(tgt); setTimeout(()=>{ if(tgt&&my===CM.seq)el.scrollTop=tgt.offsetTop; },60);
  el.onscroll=()=>{ if(P.cmode!=='vert'||KIND!=='comic')return;
    const y=el.scrollTop+el.clientHeight*0.3; let k=0;
    const ims=el.querySelectorAll('.vp'); for(let j=0;j<ims.length;j++){ if(ims[j].offsetTop<=y)k=j; else break; }
    if(k!==CM.i){ CM.i=k; comicFoot(); }
    if(el.scrollTop+el.clientHeight>=el.scrollHeight-6&&!CM.end&&el.scrollHeight>el.clientHeight*1.5){ comicEnd(); } };
  comicFoot();
}
function comicFoot(){
  if(!CM.b)return;
  const last=Math.min(CM.n,CM.i+CM.span);
  try{ localStorage.setItem('ebl_cpg_'+CM.b.i,String(CM.i)); }catch(e){}
  if(!noMark){ const r=RD[CM.b.i]||(RD[CM.b.i]={}); if(r.cp!==CM.i){ r.cp=CM.i; r.pt=Date.now(); } }
  if(!noMark)markRead(CM.b.i, last/CM.n, last>=CM.n);
  $('#rfoot').textContent=`${CM.i+1}${CM.span>1?'-'+(CM.i+CM.span):''} / ${CM.n}`
    +(noMark?'  ·  기록 안 함':(stOf(CM.b)==='done'?'  ·  다 읽음':''))+'  ·  '+(CM.b.t||'');
  paintBmBtn();
}
function comicGo(k){
  if(!CM.n)return;
  CM.end=false; CM.i=Math.max(0,Math.min(CM.n-1,k));
  if(P.cmode==='vert'){ const t=$('#comic').querySelector(`.vp[data-k="${CM.i}"]`); if(t)$('#comic').scrollTop=t.offsetTop; comicFoot(); }
  else comicDraw();
}
function comicNext(){
  if(CM.end||!CM.n)return;
  const nx=CM.i+CM.span;
  if(nx>=CM.n){ comicEnd(); return; }
  CM.i=nx; CM.zoom=false; comicDraw();
}
function comicPrev(){
  if(CM.end){ CM.end=false; comicDraw(); return; }
  if(CM.i<=0){ toast('첫 장입니다'); return; }
  CM.i=spreadStart(CM.i-1); CM.zoom=false; comicDraw();
}
/* 화면 왼쪽·오른쪽 → 앞·뒤 (방향에 따라) */
function comicSide(s){ const fwd = P.cdir==='rtl' ? s==='L' : s==='R'; fwd?comicNext():comicPrev(); }
/* 같은 폴더의 다음 권 */
function nextVol(b){
  let list=null;
  if(LASTEX&&LASTEX.data&&LASTEX.data.view&&LASTEX.data.view.some(x=>x.i===b.i))list=LASTEX.data.view;
  else list=BOOKS.filter(x=>x.f&&x.f===b.f).slice().sort((x,y)=>EXCOLL.compare(x._fn||x.o||x.t||'',y._fn||y.o||y.t||''));
  const k=list.findIndex(x=>x.i===b.i);
  if(k<0)return null;
  for(let j=k+1;j<list.length;j++){ if(kindOf(list[j]))return list[j]; }
  return null;
}
function comicEnd(){
  if(CM.end||!CM.b||!CM.n)return;
  CM.end=true;
  if(!noMark)markRead(CM.b.i,1,true);
  const par=CM.parent;
  const nx=par?(par.list[par.k+1]?{_inner:par.list[par.k+1],_fn:par.list[par.k+1].name.split('/').pop()}:null):nextVol(CM.b), el=$('#comic');
  const d=document.createElement('div'); d.className='end';
  d.innerHTML=`<div style="font-size:15px">끝까지 보셨습니다</div>`
    +(nx?`<div style="font-size:12.5px;color:#aaa">같은 폴더의 다음 권</div>`:'');
  if(nx){ const b=document.createElement('button'); b.className='pri'; b.textContent='▶ '+(nx._fn||nx.t||'다음 권');
    b.onclick=e=>{ e.stopPropagation(); if(nx._inner)zipOpenOne(par.b,par.z,nx._inner,par.list); else openBook(nx); }; d.appendChild(b); }
  const back=document.createElement('button'); back.textContent='‹ 마지막 장으로';
  back.onclick=e=>{ e.stopPropagation(); CM.end=false; d.remove(); }; d.appendChild(back);
  const cls=document.createElement('button'); cls.textContent='서재로';
  cls.onclick=e=>{ e.stopPropagation(); closeReader(); }; d.appendChild(cls);
  if(P.cmode==='vert'){ d.style.position='sticky'; d.style.bottom='0'; d.style.top='auto'; d.style.minHeight='60vh'; }
  el.appendChild(d);
}
/* 누르기 · 두 번 누르기 · 밀기 */
{ const el=$('#comic'); let lastTap=0, sx=0, sy=0, st=0;
  el.addEventListener('click',e=>{
    if(KIND!=='comic'||(e.target.closest&&e.target.closest('.end')))return;
    const w=el.clientWidth, x=e.clientX-el.getBoundingClientRect().left, now=Date.now();
    const mid = x>w*0.3 && x<w*0.7;
    if(mid){ if(now-lastTap<320){ lastTap=0;                  // 두 번 → 확대
        if(P.cmode==='vert'){ toast('세로 보기에서는 두 손가락으로 벌려 확대하세요'); return; }
        CM.zoom=!CM.zoom; toggleBars(); comicDraw();
        if(CM.zoom)toast('확대했습니다 · 밀어서 둘러보세요\n가운데를 두 번 누르면 돌아옵니다',3000); return; }
      lastTap=now; toggleBars(); return; }
    if(CM.zoom||P.cmode==='vert')return;
    comicSide(x<w/2?'L':'R');
  });
  el.addEventListener('touchstart',e=>{ const t=e.changedTouches[0]; sx=t.clientX; sy=t.clientY; st=Date.now(); },{passive:true});
  el.addEventListener('touchend',e=>{
    if(KIND!=='comic'||CM.zoom||P.cmode==='vert'||e.touches.length)return;
    const t=e.changedTouches[0], dx=t.clientX-sx, dy=t.clientY-sy;
    if(Date.now()-st<600&&Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.6)comicSide(dx<0?'R':'L');
  },{passive:true});
}

/* ── 설정 창 ── */
function paintComicPan(){
  segSet('#segCmode',P.cmode); segSet('#segCdir',P.cdir); segSet('#segCcover',P.ccover?1:0);
  $$('#panComic .k-dbl').forEach(x=>x.style.display=P.cmode==='double'?'':'none');
  $('#rgCbr').value=P.cbr; $('#vCbr').textContent=P.cbr+'%';
  $('#rgCct').value=P.cct; $('#vCct').textContent=P.cct+'%';
  $('#cmGray').classList.toggle('on',!!P.cgs);
  $('#rgCpg').max=Math.max(1,CM.n); $('#rgCpg').value=CM.i+1; $('#vCpg').textContent=`${CM.i+1} / ${CM.n}`;
}
seg('#segCmode','cmode',()=>{ CM.zoom=false; CM.end=false; paintComicPan(); comicDraw(); });
seg('#segCdir','cdir',()=>{ applyComicLook(); paintComicPan(); });
seg('#segCcover','ccover',()=>{ comicDraw(); });
$('#rgCbr').oninput=()=>{ P.cbr=Number($('#rgCbr').value); savePref(); applyComicLook(); $('#vCbr').textContent=P.cbr+'%'; };
$('#rgCct').oninput=()=>{ P.cct=Number($('#rgCct').value); savePref(); applyComicLook(); $('#vCct').textContent=P.cct+'%'; };
$('#cmGray').onclick=()=>{ P.cgs=P.cgs?0:1; savePref(); applyComicLook(); paintComicPan(); };
$('#cmReset').onclick=()=>{ P.cbr=100; P.cct=100; P.cgs=0; savePref(); applyComicLook(); paintComicPan(); };
['pointerdown','touchstart'].forEach(k=>$('#cmOrig').addEventListener(k,()=>$('#comic').classList.add('orig'),{passive:true}));
['pointerup','pointerleave','touchend','touchcancel'].forEach(k=>$('#cmOrig').addEventListener(k,()=>$('#comic').classList.remove('orig'),{passive:true}));
$('#rgCpg').oninput=()=>{ $('#vCpg').textContent=`${$('#rgCpg').value} / ${CM.n}`; };
$('#rgCpg').onchange=()=>{ comicGo(Number($('#rgCpg').value)-1); };
$('#cmClose').onclick=panOff;
PANS.push('#panComic');

/* ── 그림 없는 ZIP — 안의 책 ── */
const ZIN_EXT=/\.(txt|epub|pdf|md|zip|cbz)$/i;
/* ZIP 안에 무엇이 들었는지 — 확장자별 개수 */
function zipSummary(z){
  const c={}; z.ents.forEach(e=>{ if(e.dir)return; const x=((e.name.match(/\.([^./]{1,8})$/)||[])[1]||'(확장자 없음)').toLowerCase(); c[x]=(c[x]||0)+1; });
  return Object.keys(c).sort((a,b)=>c[b]-c[a]).map(k=>k+' '+c[k]).join(', ')||'비어 있음';
}
function zipInner(b,z){
  const isArc=e=>/\.(zip|cbz)$/i.test(e.name)?0:1;            // 권 ZIP 을 먼저
  const list=z.ents.filter(e=>!e.dir&&ZIN_EXT.test(e.name)&&!/(^|\/)(__MACOSX|\.)/.test(e.name))
    .sort((x,y)=>(isArc(x)-isArc(y))||EXCOLL.compare(x.name,y.name));
  if(!list.length){
    // 열 수 있는 것이 없으면, 무엇이 들었는지라도 보여 드립니다
    $('#zipT').textContent=b._fn||b.t||'ZIP';
    $('#zipN').innerHTML='<b>이 ZIP 안에는 앱이 열 수 있는 그림이나 책이 없습니다.</b><br>들어 있는 것: '
      +esc(zipSummary(z))+'<br>RAR·7z·ALZ·EGG 같은 다른 압축은 아직 열 수 없습니다.';
    const el=$('#zipList'); el.innerHTML='';
    z.ents.filter(e=>!e.dir).slice(0,30).forEach(en=>{ const x=document.createElement('button'); x.disabled=true;
      x.innerHTML=`<span>${esc(en.name)}</span><span>${(en.us/1048576).toFixed(1)}MB</span>`; el.appendChild(x); });
    $('#zipSheet').classList.add('on'); return; }
  const txts=list.filter(e=>/\.(txt|md)$/i.test(e.name)), tot=txts.reduce((a,e)=>a+e.us,0);
  const all=(txts.length>1&&txts.length===list.length&&tot<40*1048576)
    ? { label:`📚 모두 이어서 한 권으로 열기`, sub:`${txts.length}개 · ${(tot/1048576).toFixed(1)}MB`, go:()=>zipOpenAll(b,z,txts) } : null;
  innerList(b, list.map(en=>({ name:en.name, us:en.us, open:items=>zipOpenOne(b,z,en,list,items) })), all);
}
async function zipOpenOne(b,z,en,list,items){
  $('#zipSheet').classList.remove('on');
  innerMark(b,en.name,items);
  // 안쪽 ZIP·CBZ 는 만화로 — 이어서 볼 수 있게 같은 목록을 넘겨 둡니다
  if(/\.(zip|cbz)$/i.test(en.name)){
    const nm=en.name.split('/').pop();
    const b2={ i:b.i+'#'+en.name, t:nm.replace(/\.\w+$/,''), _fn:nm, x:'zip', f:b.f, z:Math.round(en.cs/104857.6)/10 };
    const vols=(list||[]).filter(x=>/\.(zip|cbz)$/i.test(x.name));
    try{ busy(true,'안쪽 ZIP 을 여는 중…',nm,0);
      await showComic(b2, await innerSrc(z,en), {b,z,list:vols,k:Math.max(0,vols.indexOf(en))}); }
    catch(e){ busy(false); log('안쪽 ZIP 실패: '+(e.message||e)); toast('열지 못했습니다\n'+(e.message||e),6000); }
    return;
  }
  try{ busy(true,'꺼내는 중…',en.name.split('/').pop(),0);
    const d=await zipData(z,en), buf=d.buffer.slice(d.byteOffset,d.byteOffset+d.byteLength);
    const ext=((en.name.match(/\.(\w+)$/)||[])[1]||'txt').toLowerCase();
    const b2={ i:b.i+'#'+en.name, t:en.name.split('/').pop().replace(/\.\w+$/,''), x:ext, f:b.f, z:Math.round(en.us/104857.6)/10 };
    busy(true,'화면을 구성하는 중…','',1);
    if(ext==='epub')await showReader(b2,buf); else if(ext==='pdf')await showPdf(b2,buf); else await showTxt(b2,buf);
    busy(false);
  }catch(e){ busy(false); toast('열지 못했습니다\n'+(e.message||e),5000); }
}
async function zipOpenAll(b,z,txts){
  $('#zipSheet').classList.remove('on');
  try{ const parts=[];
    for(let k=0;k<txts.length;k++){ busy(true,'이어 붙이는 중…',`${k+1} / ${txts.length}`,(k+1)/txts.length);
      const d=await zipData(z,txts[k]);
      parts.push('# '+txts[k].name.split('/').pop().replace(/\.\w+$/,'')+'\n\n'+decodeText(d.buffer.slice(d.byteOffset,d.byteOffset+d.byteLength)).replace(/^﻿/,'')); }
    const all=new TextEncoder().encode(parts.join('\n\n\n'));
    const b2={ i:b.i+'#all', t:(b._fn||b.t||'').replace(/\.\w+$/,''), x:'txt', f:b.f };
    busy(true,'화면을 구성하는 중…','',1);
    await showTxt(b2,all.buffer); busy(false);
    toast('목차에서 각 편으로 바로 갈 수 있습니다',3500);
  }catch(e){ busy(false); toast('열지 못했습니다\n'+(e.message||e),5000); }
}
$('#zipClose').onclick=()=>$('#zipSheet').classList.remove('on');


/* ── v34.2 책 정보 단추 ── */
function paintMetaNote(){
  const el=$('#metaNote'); if(!el)return;
  const c=metaCount();
  const doubt=c.low+c.cleaned;
  el.innerHTML = BOOKS.length
    ? `찾은 책 정보(YES24·국중도)가 믿을 만한 책 ${c.ok.toLocaleString()}권 · <b>믿기 어려운 책 ${doubt.toLocaleString()}권</b>`
      +` · 짝이 없는 책 ${c.none.toLocaleString()}권<br>`
      +(P.meta==='sure'?'믿기 어려운 책은 파일 이름에서 뽑은 제목으로 보이고, 표지·저자·분류를 비웠습니다. 검색은 그대로 됩니다.'
       :P.meta==='file'?'모든 책을 파일 이름에서 뽑은 제목으로 보입니다. 표지는 끕니다.'
       :'색인에 적힌 그대로 보입니다. 엉뚱한 책이 섞여 보일 수 있습니다.')
      +(c.cleaned?'<br>(새 색인 v15 — Apps Script 에서 이미 정리돼 왔습니다)':'')
      +'<br>책 정보 출처: 알라딘(2026년 10월까지) · <b>YES24</b> · 국립중앙도서관'
      +(c.y24?` — YES24 에서 온 책 ${c.y24.toLocaleString()}권 (길게 눌러 'YES24 에서 보기')`:'')
    : '';
}
seg('#segMeta','meta',()=>{ metaApply(); paintTabs(); buildChips(); LASTEX=null; render(true); paintMetaNote();
  toast(P.meta==='sure'?'믿을 만한 책 정보만 보여 드립니다':P.meta==='file'?'파일 이름으로 보여 드립니다':'색인 그대로 보여 드립니다'); });
{ const ov=$('#btnView').onclick; $('#btnView').onclick=()=>{ ov(); segSet('#segMeta',P.meta||'sure'); paintMetaNote(); }; }

/* ══════════ v34 — 읽어주기 (TTS) ══════════
   기기에 들어 있는 목소리(speechSynthesis)로 읽습니다. 돈이 들지 않고 인터넷도 필요 없습니다.

   ★ 한 문장씩 넘겨줍니다. 길게 한 번에 주면 크롬은 15초쯤에서 끊고,
     사파리는 멈췄다 이어 읽기를 잘 못 합니다. 멈춤도 pause() 대신 cancel() 후
     그 문장부터 다시 읽는 식으로 합니다.
   ★ 아이패드는 화면이 꺼지면 읽기를 멈춥니다. 읽는 동안 화면이 꺼지지 않게 잡아 둡니다(Wake Lock).

   읽을 글은 지금 보이는 자리부터 끝까지를 '글자 지도'로 만들어 둡니다.
     TTS.map = [{n:글자노드(없으면 줄바꿈), s:이 노드가 지도에서 시작하는 위치}]
     TTS.chunks = [{s,e,t}]  — 문장(또는 200자 안쪽 토막)
   지도 덕분에 읽는 문장을 화면에 표시하고, 쪽을 넘기고, 멈춘 자리를 압니다.  */
const TTS={ on:false, playing:false, turning:false, dirty:false, gen:0,
  text:'', map:[], chunks:[], k:0, doc:null, until:0, lock:null, pdfPg:0 };
if(!P.ttsRate)P.ttsRate=1;
const synth=window.speechSynthesis||null;
let VOICES=[];
function loadVoices(){
  if(!synth)return;
  const all=synth.getVoices()||[];
  VOICES=all.filter(v=>/^ko/i.test(v.lang||''));
  if(!VOICES.length)VOICES=all.slice();
}
if(synth){ loadVoices(); try{ synth.addEventListener('voiceschanged',loadVoices); }catch(e){ synth.onvoiceschanged=loadVoices; } }
const pickVoice=()=>VOICES.find(v=>v.voiceURI===P.ttsVoice)||VOICES.find(v=>/^ko/i.test(v.lang))||null;

/* ── 글자 지도 ── */
const TTS_BLOCK='p,div,li,h1,h2,h3,h4,h5,h6,blockquote,td,th,dd,dt,section,article,pre,figcaption,tr';
function textMap(root,startNode,startOff){
  const doc=root.ownerDocument;
  const w=doc.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){
    const p=n.parentElement; if(!p)return NodeFilter.FILTER_REJECT;
    if(p.closest('script,style,rt,rp,noscript'))return NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_ACCEPT; }});
  let text='', map=[], lastBlk=null, started=!startNode, n;
  while(n=w.nextNode()){
    let v=n.nodeValue, base=0;
    if(!started){
      if(n===startNode){ started=true; base=startOff||0; v=v.slice(base); }
      else if(startNode.nodeType===1&&startNode.contains(n)){ started=true; }
      else if(startNode.compareDocumentPosition&&(startNode.compareDocumentPosition(n)&Node.DOCUMENT_POSITION_FOLLOWING)
              &&!(startNode.nodeType===3)){ started=true; }
      else continue;
    }
    const blk=n.parentElement&&n.parentElement.closest(TTS_BLOCK);
    if(lastBlk&&blk!==lastBlk&&text&&!/\n$/.test(text)){ map.push({n:null,s:text.length,b:0}); text+='\n'; }
    lastBlk=blk;
    map.push({n,s:text.length,b:base}); text+=v;
  }
  return {text,map};
}
/* 지도 위치 → (노드, 글자) */
function mapPoint(pos){
  const m=TTS.map; let lo=0, hi=m.length-1;
  while(lo<hi){ const mid=(lo+hi+1)>>1; if(m[mid].s<=pos)lo=mid; else hi=mid-1; }
  let e=m[lo]; let k=lo;
  while(e&&!e.n&&k<m.length-1){ e=m[++k]; pos=e.s; }
  if(!e||!e.n)return null;
  return {node:e.n, off:Math.min(e.n.nodeValue.length, e.b+(pos-e.s))};
}
function chunkRange(c){
  const a=mapPoint(c.s), b=mapPoint(Math.max(c.s,c.e-1));
  if(!a||!b)return null;
  try{ const r=a.node.ownerDocument.createRange(); r.setStart(a.node,a.off); r.setEnd(b.node,Math.min(b.node.nodeValue.length,b.off+1)); return r; }
  catch(e){ return null; }
}
/* 문장 나누기 — 마침표·물음표·느낌표·말줄임 뒤, 줄바꿈에서. 200자를 넘으면 쉼표·빈칸에서 한 번 더. */
function splitChunks(text){
  const out=[]; const re=/[^\n.?!。！？…]*(?:[.?!。！？…]+["'”’」』)\]]*|\n|$)/g; let m;
  while((m=re.exec(text))){
    if(m[0]===''){ if(re.lastIndex>=text.length)break; re.lastIndex++; continue; }
    let s=m.index, e=s+m[0].length;
    while(e-s>200){ const seg=text.slice(s,s+200); let cut=Math.max(seg.lastIndexOf(', '),seg.lastIndexOf(' '));
      if(cut<60)cut=200; out.push({s,e:s+cut}); s+=cut; }
    out.push({s,e});
  }
  return splitQuotes(text,out).map(c=>Object.assign(c,{t:text.slice(c.s,c.e).replace(/[​\s]+/g,' ').trim()}))
            .filter(c=>/[0-9A-Za-z가-힣ㄱ-ㅎ一-龥ぁ-んァ-ン]/.test(c.t));
}
/* v40 — 대사 구간 찾기. 여는 따옴표에서 닫는 따옴표까지 (빈 줄을 넘지 않고 600자 안).
   " 는 열고 닫는 모양이 같아 번갈아 셉니다. 영어의 ' (don't) 를 피하려고 ' 는 쓰지 않습니다. */
const QPAIR={'“':'”','「':'」','『':'』','‘':'’','"':'"','《':'》'};
/* v57 — 세 번째 값이 2 면 속마음(‘ ’ · ' '), 1 이면 대사.
   ' 는 속마음 목소리를 켰을 때만, 앞이 빈칸·문장부호이고 안에 한글이 있을 때만 셉니다 (영어 don't 를 피하려고). */
function quoteSpans(text){
  const sp=[]; let i=0;
  while(i<text.length){
    const ch=text[i], cl=QPAIR[ch];
    if(cl&&ch!=='《'){
      let j=i+1, lim=Math.min(text.length,i+600);
      while(j<lim&&text[j]!==cl){ if(text[j]==='\n'&&text[j+1]==='\n')break; j++; }
      if(j<lim&&text[j]===cl){ sp.push([i,j+1,ch==='‘'?2:1]); i=j+1; continue; }
    }
    if(ch==="'"&&P.ttsInner&&(i===0||/[\s(“"「『,.…!?—\-]/.test(text[i-1]))){
      let j=i+1, lim=Math.min(text.length,i+300);
      while(j<lim&&text[j]!=="'"&&text[j]!=='\n')j++;
      if(j<lim&&text[j]==="'"&&j-i>2&&/[가-힣]/.test(text.slice(i+1,j))){ sp.push([i,j+1,2]); i=j+1; continue; }
    }
    i++;
  }
  return sp;
}
function splitQuotes(text,chunks){
  const sp=quoteSpans(text); if(!sp.length)return chunks;
  const out=[]; let k=0;
  chunks.forEach(c=>{
    let s=c.s;
    while(k<sp.length&&sp[k][1]<=s)k++;
    let j=k;
    while(s<c.e){
      const q=sp[j];
      if(!q||q[0]>=c.e){ out.push({s,e:c.e}); break; }
      if(q[0]>s){ out.push({s,e:q[0]}); s=q[0]; continue; }
      const e=Math.min(c.e,q[1]); out.push({s,e,q:q[2]||1}); s=e; if(e>=q[1])j++;
    }
  });
  return out;
}

/* ── 지금 자리부터 읽을 거리 만들기 ── */
async function ttsBuild(){
  TTS.map=[]; TTS.text=''; TTS.chunks=[]; TTS.k=0; TTS.doc=null; TTS.dirty=false;
  if(KIND==='txt'){
    const host=$('#txt'), body=$('#txt .body'); if(!body)return false;
    const hb=host.getBoundingClientRect();
    let r=null; try{ r=caretAt(hb.left+Math.max(20,hb.width*0.15),hb.top+18,document); }catch(e){}
    const st=r&&body.contains(r.startContainer)?r:null;
    const tm=textMap(body, st?st.startContainer:null, st?st.startOffset:0);
    Object.assign(TTS,{text:tm.text,map:tm.map,doc:document});
  } else if(KIND==='epub'){
    const cs=rend&&rend.getContents?rend.getContents():[];
    const c=(cs&&cs[0])||null; if(!c||!c.document)return false;
    let r=null;
    try{ if(EPLOC&&EPLOC.start&&EPLOC.start.cfi)r=c.range(EPLOC.start.cfi); }catch(e){}
    const tm=textMap(c.document.body, r?r.startContainer:null, r?r.startOffset:0);
    Object.assign(TTS,{text:tm.text,map:tm.map,doc:c.document,sec:(EPLOC&&EPLOC.start&&EPLOC.start.index)});
  } else if(KIND==='pdf'){
    if(!pdfDoc)return false;
    TTS.pdfPg=pdfPg;
    const pg=await pdfDoc.getPage(pdfPg); const tc=await pg.getTextContent();
    TTS.text=tc.items.map(it=>(it.str||'')+(it.hasEOL?'\n':'')).join('');
  } else return false;
  TTS.chunks=splitChunks(TTS.text);
  return true;
}
/* 이 장(쪽)을 다 읽으면 다음으로 */
async function ttsNextPart(){
  if(KIND==='epub'){
    const idx=(EPLOC&&EPLOC.start&&EPLOC.start.index!=null)?EPLOC.start.index:TTS.sec;
    const nx=book&&book.spine&&book.spine.get(idx+1);
    if(!nx)return false;
    TTS.turning=true;
    try{ await rend.display(nx.href); }catch(e){ TTS.turning=false; return false; }
    await new Promise(r=>setTimeout(r,250)); TTS.turning=false;
    const cs=rend.getContents(); const c=cs.find(x=>x.sectionIndex===idx+1)||cs[0];
    if(!c||!c.document)return false;
    const tm=textMap(c.document.body,null,0);
    Object.assign(TTS,{text:tm.text,map:tm.map,doc:c.document,sec:idx+1,k:0});
    TTS.chunks=splitChunks(TTS.text);
    return true;
  }
  if(KIND==='pdf'){
    if(!pdfDoc||TTS.pdfPg>=pdfDoc.numPages)return false;
    TTS.turning=true; goPdfPage(TTS.pdfPg+1); setTimeout(()=>TTS.turning=false,400);
    TTS.pdfPg++;
    const pg=await pdfDoc.getPage(TTS.pdfPg); const tc=await pg.getTextContent();
    TTS.text=tc.items.map(it=>(it.str||'')+(it.hasEOL?'\n':'')).join('');
    TTS.chunks=splitChunks(TTS.text); TTS.k=0;
    return true;
  }
  return false;   // TXT 는 한 번에 끝까지 담았습니다
}

/* ── 읽는 문장 보이기 · 쪽 따라가기 ── */
/* 문장 표시가 실패해도 읽기는 이어갑니다 */
function ttsShow(c){ try{ ttsShow0(c); }catch(e){ log('읽는 문장 표시 실패: '+(e.message||e)); } }
function ttsShow0(c){
  const ov=$('#ttsov'); ov.innerHTML='';
  if(KIND==='pdf'||!c)return;
  const r=chunkRange(c); if(!r)return;
  const vb=$('#view').getBoundingClientRect();
  let ox=0, oy=0;
  if(KIND==='epub'){ const f=$('#page iframe'); if(!f)return; const fb=f.getBoundingClientRect(); ox=fb.left-vb.left; oy=fb.top-vb.top; }
  else { ox=-vb.left; oy=-vb.top; }
  let rects=[...r.getClientRects()].filter(x=>x.width>0.5&&x.height>0.5);
  if(!rects.length)return;
  // 쪽 따라가기
  if(KIND==='epub'){
    const x0=ox+rects[0].left;
    if(x0>vb.width-4||x0<-4){
      TTS.turning=true;
      try{ const cfi=TTS.doc&&rend.getContents()[0].cfiFromRange(r); rend.display(cfi); }
      catch(e){ x0>0?rend.next():rend.prev(); }
      setTimeout(()=>{ TTS.turning=false; ttsShow(c); },420);
      return;
    }
  } else if(KIND==='txt'){
    const host=$('#txt'), hb=host.getBoundingClientRect(), t=rects[0].top, b=rects[rects.length-1].bottom;
    if(t<hb.top+30||b>hb.bottom-90){
      TTS.turning=true; host.scrollTop+=t-hb.top-hb.height*0.3;
      setTimeout(()=>{ TTS.turning=false; },200);
      rects=[...r.getClientRects()].filter(x=>x.width>0.5&&x.height>0.5);
    }
  }
  const f=document.createDocumentFragment();
  rects.forEach(x=>{ const L=ox+x.left, T=oy+x.top; if(L>vb.width||L+x.width<0)return;
    const i=document.createElement('i');
    i.style.left=L+'px'; i.style.top=T+'px'; i.style.width=x.width+'px'; i.style.height=x.height+'px';
    f.appendChild(i); });
  ov.appendChild(f);
}

/* ── 말하기 ── */
function ttsSpeak(){
  if(!TTS.playing)return;
  if(TTS.until&&Date.now()>=TTS.until){ ttsPause(); TTS.until=0; paintTts();
    toast('취침 타이머로 읽기를 멈췄습니다'); return; }
  const c=TTS.chunks[TTS.k];
  if(!c){
    ttsNextPart().then(ok=>{ if(!TTS.playing)return;
      if(ok&&TTS.chunks.length){ ttsSpeak(); }
      else { ttsPause(); $('#ttsov').innerHTML=''; toast('끝까지 읽었습니다'); } });
    return;
  }
  ttsShow(c);
  try{ ACT=Date.now(); }catch(e){}
  const my=++TTS.gen;
  const say=(P.ttsHanja??1)&&window.HANJA_EUM ? hanjaRead(c.t) : c.t;
  const u=new SpeechSynthesisUtterance(say);
  u.lang='ko-KR'; u.rate=P.ttsRate||1;
  let v=pickVoice();
  if(c.q===2&&P.ttsInner){                      // v57 — 속마음
    const v3=VOICES.find(x=>x.voiceURI===P.ttsVoice3); if(v3)v=v3;
    u.pitch=(P.ttsPitch3||90)/100;
  } else if(c.q&&P.ttsDual){
    const v2=VOICES.find(x=>x.voiceURI===P.ttsVoice2); if(v2)v=v2;
    u.pitch=(P.ttsPitch2||115)/100;
  }
  if(v){ u.voice=v; u.lang=v.lang; }
  u.onend=()=>{ if(my!==TTS.gen||!TTS.playing)return; TTS.k++;
    // v57 — 쉼: 문단이 바뀌면 문단 쉼, 문장이 끝나면 문장 쉼 (둘 다 0 이면 예전처럼 바로)
    const nx=TTS.chunks[TTS.k]; let gap=0;
    if(nx&&(P.ttsGapS||P.ttsGapP)){ const mid=TTS.text.slice(c.e,nx.s);
      if(/\n/.test(mid)) gap=P.ttsGapP||0; else if(/[.!?。…]["”’」』']?$/.test(c.t)) gap=P.ttsGapS||0; }
    if(!gap){ ttsSpeak(); return; }
    const g=TTS.gen; setTimeout(()=>{ if(g===TTS.gen&&TTS.playing)ttsSpeak(); },gap); };
  u.onerror=e=>{ if(my!==TTS.gen||!TTS.playing)return;
    if(e&&(e.error==='interrupted'||e.error==='canceled'))return;
    log('읽어주기 오류: '+(e&&e.error)); TTS.k++; setTimeout(ttsSpeak,200); };
  try{ synth.speak(u); }catch(e){ log('읽어주기 실패: '+(e.message||e)); ttsPause(); }
}
async function ttsPlay(){
  if(!synth){ toast('이 브라우저는 읽어주기를 지원하지 않습니다',4000); return; }
  if(!TTS.chunks.length||TTS.dirty||TTS.k>=TTS.chunks.length){
    const ok=await ttsBuild();
    if(!ok||!TTS.chunks.length){
      toast(KIND==='pdf'?'이 쪽에서 읽을 글자를 찾지 못했습니다.\n스캔한 PDF 는 그림이라 읽을 수 없습니다'
                        :'읽을 글을 찾지 못했습니다',4500); return; }
  }
  if((P.ttsHanja??1)&&!window.HANJA_EUM&&TTS.chunks.some(c=>HANJA_RE.test(c.t))){
    try{ await hanjaReady(); }catch(e){ log('한자 사전을 못 불러왔습니다: '+(e.message||e)); } }
  TTS.playing=true; try{ synth.cancel(); }catch(e){}
  wakeOn(); paintTts(); mediaOn(); ttsSpeak();
}
function ttsPause(){
  TTS.playing=false; TTS.gen++; try{ synth&&synth.cancel(); }catch(e){}
  wakeOff(); paintTts();
}
function ttsStop(){
  if(!TTS.on&&!TTS.playing)return;
  ttsPause(); TTS.on=false; TTS.chunks=[]; TTS.k=0; TTS.until=0;
  const ov=$('#ttsov'); if(ov)ov.innerHTML='';
  $('#ttsbar').classList.remove('on'); $('#btnTts').classList.remove('good');
}
function ttsJump(d){
  if(!TTS.chunks.length)return;
  TTS.k=Math.max(0,Math.min(TTS.chunks.length-1,TTS.k+d));
  if(TTS.playing){ TTS.gen++; try{ synth.cancel(); }catch(e){} setTimeout(ttsSpeak,60); }
  else ttsShow(TTS.chunks[TTS.k]);
}
function ttsManualTurn(){
  // 읽는 중에 손으로 쪽을 넘기셨으면, 거기서부터 다시 읽을 수 있게 멈춥니다
  ttsPause(); TTS.dirty=true; $('#ttsov').innerHTML='';
  toast('쪽을 넘기셔서 읽기를 멈췄습니다.\n▶ 를 누르면 이 쪽부터 읽습니다',3500);
}
function paintTts(){
  $('#ttsPlay').textContent=TTS.playing?'⏸':'▶';
  $('#ttsRateV').textContent=(P.ttsRate||1).toFixed(1)+'×';
  const left=TTS.until?Math.max(0,Math.ceil((TTS.until-Date.now())/60000)):0;
  $('#ttsTimer').textContent=left?left+'분':'⏱'; $('#ttsTimer').classList.toggle('on',!!left);
  if('mediaSession' in navigator){ try{ navigator.mediaSession.playbackState=TTS.playing?'playing':'paused'; }catch(e){} }
}
setInterval(()=>{ if(TTS.on&&TTS.until)paintTts(); },30000);
function setRate(r){ P.ttsRate=Math.round(Math.max(0.5,Math.min(2.5,r))*10)/10; savePref(); paintTts();
  $('#vTtsRate')&&($('#vTtsRate').textContent=P.ttsRate.toFixed(1)+'×');
  if(TTS.playing){ TTS.gen++; try{ synth.cancel(); }catch(e){} setTimeout(ttsSpeak,60); } }

/* 화면 꺼짐 막기 — 아이패드는 화면이 꺼지면 읽기가 멈춥니다 */
async function wakeOn(){ try{ if(navigator.wakeLock&&!TTS.lock){ TTS.lock=await navigator.wakeLock.request('screen');
  TTS.lock.addEventListener('release',()=>{ TTS.lock=null; }); } }catch(e){} }
function wakeOff(){ try{ TTS.lock&&TTS.lock.release(); }catch(e){} TTS.lock=null; }
document.addEventListener('visibilitychange',()=>{ if(!document.hidden&&TTS.playing)wakeOn(); });
/* 잠금 화면·이어폰 단추 (되는 기기에서만) */
function mediaOn(){
  if(!('mediaSession' in navigator))return;
  try{ navigator.mediaSession.metadata=new MediaMetadata({title:(curB&&curB.t)||'읽어주기',artist:(curB&&curB.a)||'우리 도서관'});
    navigator.mediaSession.setActionHandler('play',()=>ttsPlay());
    navigator.mediaSession.setActionHandler('pause',()=>ttsPause());
    navigator.mediaSession.setActionHandler('nexttrack',()=>ttsJump(1));
    navigator.mediaSession.setActionHandler('previoustrack',()=>ttsJump(-1)); }catch(e){}
}

/* ── 단추 ── */
$('#btnTts').onclick=()=>{
  if(!readerOn())return;
  if(TTS.on){ ttsStop(); return; }
  TTS.on=true; $('#ttsbar').classList.add('on'); $('#btnTts').classList.add('good');
  ttsPlay();
};
$('#ttsPlay').onclick=()=>TTS.playing?ttsPause():ttsPlay();
$('#ttsPrev').onclick=()=>ttsJump(-1);
$('#ttsNext').onclick=()=>ttsJump(1);
$('#ttsSlow').onclick=()=>setRate((P.ttsRate||1)-0.1);
$('#ttsFast').onclick=()=>setRate((P.ttsRate||1)+0.1);
$('#ttsOff').onclick=()=>ttsStop();
$('#ttsTimer').onclick=()=>{
  const steps=[0,15,30,45,60], left=TTS.until?Math.ceil((TTS.until-Date.now())/60000):0;
  const nx=steps.find(x=>x>left)||0;
  TTS.until=nx?Date.now()+nx*60000:0; paintTts(); segSet('#segTimer',nx);
  toast(nx?`${nx}분 뒤에 멈춥니다`:'취침 타이머를 껐습니다');
};
function paintTtsPan(){
  const sel=$('#ttsVoice'); sel.innerHTML='';
  loadVoices();
  if(!VOICES.length) sel.innerHTML='<option value="">기기 기본 목소리</option>';
  VOICES.forEach(v=>{ const o=document.createElement('option'); o.value=v.voiceURI;
    o.textContent=v.name+(v.localService===false?' (온라인)':''); if(v.voiceURI===P.ttsVoice)o.selected=true; sel.appendChild(o); });
  $('#rgTtsRate').value=Math.round((P.ttsRate||1)*100); $('#vTtsRate').textContent=(P.ttsRate||1).toFixed(1)+'×';
  const s2=$('#ttsVoice2'); s2.innerHTML='<option value="">서술과 같은 목소리 (높낮이만 바꿈)</option>';
  VOICES.forEach(v=>{ const o=document.createElement('option'); o.value=v.voiceURI;
    o.textContent=v.name+(v.localService===false?' (온라인)':''); if(v.voiceURI===P.ttsVoice2)o.selected=true; s2.appendChild(o); });
  segSet('#segDual',P.ttsDual||0); $('#dualBox').style.display=P.ttsDual?'':'none';
  try{ ttsPan57(); }catch(e){}
  $('#rgPitch2').value=P.ttsPitch2||115; $('#vPitch2').textContent=((P.ttsPitch2||115)/100).toFixed(2);
  segSet('#segHanja',P.ttsHanja??1);
  const left=TTS.until?Math.ceil((TTS.until-Date.now())/60000):0;
  segSet('#segTimer',[15,30,45,60].includes(left)?left:(left?'':0));
  const ko=VOICES.some(v=>/^ko/i.test(v.lang));
  $('#ttsNote').innerHTML=(ko?'':'<b>이 기기에서 한국어 목소리를 찾지 못했습니다.</b><br>')
    +'아이패드: 설정 → 손쉬운 사용 → 읽기 및 말하기 → 음성 → 한국어 에서 더 좋은 목소리(예: 유나 고품질)를 내려받으면 여기 목록에 나타납니다.'
    +'<br>읽는 동안에는 화면이 꺼지지 않게 잡아 둡니다. 화면을 직접 끄거나 다른 앱으로 가면 멈출 수 있습니다.';
}
$('#ttsSet').onclick=()=>{ paintTtsPan(); pan('#panTts',true); };
$('#ttsClose').onclick=panOff;
PANS.push('#panTts');
$('#ttsVoice').onchange=()=>{ P.ttsVoice=$('#ttsVoice').value; savePref();
  if(TTS.playing){ TTS.gen++; try{ synth.cancel(); }catch(e){} setTimeout(ttsSpeak,60); } };
$('#rgTtsRate').oninput=()=>setRate(Number($('#rgTtsRate').value)/100);
$$('#segTimer button').forEach(b=>b.onclick=()=>{ const m=Number(b.dataset.v);
  TTS.until=m?Date.now()+m*60000:0; segSet('#segTimer',m); paintTts(); });

/* ══════════ v40 — 읽어주기 2: 대사 목소리 · 한자 읽기 ══════════
   한자 음은 hanja-eum.js (npm hanja 1.1.5, MIT) — 처음 필요할 때 한 번만 받습니다.
   화면의 글은 바꾸지 않습니다 (형광펜 자리를 지키려고). 읽어주기와 글 고르기 막대에서만 씁니다. */
const HANJA_RE=/[㐀-䶿一-鿿豈-﫿]/;
function hanjaReady(){
  if(window.HANJA_EUM)return Promise.resolve();
  if(hanjaReady._p)return hanjaReady._p;
  return (hanjaReady._p=new Promise((ok,ng)=>{
    const sc=document.createElement('script'); sc.src='./hanja-eum.js';
    sc.onload=()=>window.HANJA_EUM?ok():ng(new Error('비어 있음'));
    sc.onerror=()=>{ hanjaReady._p=null; ng(new Error('hanja-eum.js 를 불러오지 못했습니다')); };
    document.head.appendChild(sc); }));
}
function hanjaOf(ch){
  const c=ch.codePointAt(0);
  for(const [a,str] of (window.HANJA_EUM||[])){ if(c>=a&&c<a+str.length){ const r=str[c-a]; return r==='·'?'':r; } }
  return '';
}
/* 두음 법칙 — 한자 낱말의 첫 글자, 그리고 모음·ㄴ 받침 뒤의 렬·률 */
function dueum(h,first,prev){
  const code=h.charCodeAt(0)-0xAC00; if(code<0||code>11171)return h;
  let L=Math.floor(code/588), V=Math.floor(code%588/28), T=code%28;
  const mk=()=>String.fromCharCode(0xAC00+L*588+V*28+T);
  if((h==='렬'||h==='률')&&prev){ const pc=prev.charCodeAt(0)-0xAC00; const pt=pc>=0&&pc<=11171?pc%28:-1;
    if(pt===0||pt===4){ L=11; return mk(); } }
  if(!first)return h;
  const iy=[2,6,7,12,17,20];                    // ㅑ ㅕ ㅖ ㅛ ㅠ ㅣ
  if(L===2&&iy.includes(V)){ L=11; return mk(); }               // 녀→여
  if(L===5&&iy.includes(V)){ L=11; return mk(); }               // 려→여
  if(L===5){ L=2; return mk(); }                                // 라→나
  return h;
}
/* 음이 여럿인 글자 가운데 낱말 안에서 거의 늘 다른 음으로 읽는 것 (사전에는 첫 음만 있습니다) */
const HANJA_IN={'率':'률'};                 // 비율·확률·효율 (첫머리 率先 은 솔)
function hanjaRead(t){
  if(!HANJA_RE.test(t)||!window.HANJA_EUM)return t;
  const cs=[...t]; let out='', run=false, prev='';
  for(let i=0;i<cs.length;i++){ const ch=cs[i];
    if(HANJA_RE.test(ch)){ let h=hanjaOf(ch);
      if(run&&HANJA_IN[ch])h=HANJA_IN[ch];
      // 不 은 ㄷ·ㅈ 앞에서 '부' (不足 부족, 不動 부동)
      if(ch==='不'&&i+1<cs.length){ const n=hanjaOf(cs[i+1]); const L=n?Math.floor((n.charCodeAt(0)-0xAC00)/588):-1; if(L===3||L===12)h='부'; }
      if(h){ const r=dueum(h,!run,prev); out+=r; prev=r; run=true; continue; } }
    out+=ch; run=false; prev='';
  }
  return out;
}
/* 괄호 안 한자가 바로 앞 한글과 같은 음이면 겹쳐 읽지 않습니다: 學校(학교) → 학교, 학교(學校) → 학교 */
const _hr=hanjaRead;
hanjaRead=function(t){
  if(!HANJA_RE.test(t))return t;
  t=t.replace(/([가-힣]{1,8})\s*[(（]([㐀-鿿豈-﫿]{1,8})[)）]/g,(m,k,h)=>_hr(h)===k?k:m)
     .replace(/([㐀-鿿豈-﫿]{1,8})\s*[(（]([가-힣]{1,8})[)）]/g,(m,h,k)=>_hr(h)===k?k:m);
  return _hr(t);
};
seg('#segDual','ttsDual',()=>{ $('#dualBox').style.display=P.ttsDual?'':'none'; TTS.dirty=true; });
seg('#segHanja','ttsHanja',()=>{ if(P.ttsHanja)hanjaReady().catch(()=>toast('한자 사전을 받지 못했습니다')); });
$('#ttsVoice2').onchange=()=>{ P.ttsVoice2=$('#ttsVoice2').value; savePref(); };
$('#rgPitch2').oninput=()=>{ P.ttsPitch2=Number($('#rgPitch2').value); savePref(); $('#vPitch2').textContent=(P.ttsPitch2/100).toFixed(2); };
/* v57 — 속마음 목소리 · 쉼 */
function ttsPan57(){
  const s3=$('#ttsVoice3'); if(!s3)return; s3.innerHTML='<option value="">서술과 같은 목소리 (높낮이만 바꿈)</option>';
  VOICES.forEach(v=>{ const o=document.createElement('option'); o.value=v.voiceURI;
    o.textContent=v.name+(v.localService===false?' (온라인)':''); if(v.voiceURI===P.ttsVoice3)o.selected=true; s3.appendChild(o); });
  segSet('#segInner',P.ttsInner||0); $('#innerBox').style.display=P.ttsInner?'':'none';
  $('#rgPitch3').value=P.ttsPitch3||90; $('#vPitch3').textContent=((P.ttsPitch3||90)/100).toFixed(2);
  const gs=P.ttsGapS||0, gp=P.ttsGapP||0;
  $('#rgGapS').value=gs; $('#vGapS').textContent=gs?(gs/1000).toFixed(1)+'초':'없음';
  $('#rgGapP').value=gp; $('#vGapP').textContent=gp?(gp/1000).toFixed(1)+'초':'없음';
}
seg('#segInner','ttsInner',()=>{ $('#innerBox').style.display=P.ttsInner?'':'none'; TTS.dirty=true; });
$('#ttsVoice3').onchange=()=>{ P.ttsVoice3=$('#ttsVoice3').value; savePref(); };
$('#rgPitch3').oninput=()=>{ P.ttsPitch3=Number($('#rgPitch3').value); savePref(); $('#vPitch3').textContent=(P.ttsPitch3/100).toFixed(2); };
$('#rgGapS').oninput=()=>{ P.ttsGapS=Number($('#rgGapS').value); savePref(); ttsPan57(); };
$('#rgGapP').oninput=()=>{ P.ttsGapP=Number($('#rgGapP').value); savePref(); ttsPan57(); };
/* 글 고르기 막대 — 한자를 고르면 음을 함께 보입니다 */
function selHanjaPv(){
  const t=PICK&&PICK.t; if(!t||!HANJA_RE.test(t))return;
  const go=()=>{ if(!PICK||PICK.t!==t)return;
    const r=hanjaRead(t.replace(/\s+/g,' ').slice(0,40)); const el=$('#selpv');
    if(el&&r!==t)el.textContent='"'+t.replace(/\s+/g,' ').slice(0,40)+'"  →  '+r; };
  window.HANJA_EUM?go():hanjaReady().then(go).catch(()=>{});
}
