/* 우리 도서관 — js/13-engine-plus.js  (v57, 읽기 엔진 쪽)
   자동 넘김 · 책 지도 · 같은 글귀 한꺼번에 칠하기
   ※ 모든 파일이 같은 전역을 나눠 씁니다. index.html 에 적힌 순서(01 → 14)대로 불러와야 합니다. */

/* ══════════ v57 — 자동 넘김 · 자동 스크롤 ══════════
   흘러가는 화면(TXT · 흘려보는 PDF · 세로 만화)은 부드럽게 굴리고, 쪽으로 넘기는 책(EPUB · 쪽 PDF · 만화)은 N초마다 한 쪽.
   P.autoPx = 1초에 몇 점(px) · P.autoSec = 몇 초마다 한 쪽. 화면을 누르면 멈추고, ▶ 로 다시. */
const AUTO={on:false,paused:false,raf:0,tm:0,last:0,acc:0,left:0};
function autoHost(){
  if(KIND==='txt') return $('#txt');
  if(KIND==='pdf'&&P.pnav!=='page') return $('#pdf');
  if(KIND==='comic'&&P.cmode==='vert') return $('#comic');
  return null;                                   // 쪽으로 넘기는 책
}
function autoPaint(){
  const bar=$('#autobar'); if(!bar)return;
  bar.classList.toggle('on',AUTO.on);
  $('#btnAuto').classList.toggle('good',AUTO.on);
  if(!AUTO.on)return;
  $('#autoPlay').textContent=AUTO.paused?'▶':'⏸';
  const h=autoHost();
  $('#autoSpd').textContent=h?('속도 '+Math.round(P.autoPx||40)):((P.autoSec||20)+'초마다'+(AUTO.paused?'':' · '+Math.max(0,AUTO.left)));
}
function autoTick(t){
  if(!AUTO.on||AUTO.paused)return;
  const h=autoHost(); if(!h){ return; }
  if(!AUTO.last)AUTO.last=t;
  const dt=Math.min(0.1,(t-AUTO.last)/1000); AUTO.last=t;
  AUTO.acc+=(P.autoPx||40)*dt;
  const step=Math.floor(AUTO.acc);
  if(step>=1){ AUTO.acc-=step; h.scrollTop+=step; try{ ACT=Date.now(); }catch(e){} }
  if(h.scrollTop+h.clientHeight>=h.scrollHeight-2){ autoOff(); toast('끝까지 왔습니다'); return; }
  AUTO.raf=requestAnimationFrame(autoTick);
}
function autoArm(){
  cancelAnimationFrame(AUTO.raf); clearInterval(AUTO.tm); AUTO.last=0; AUTO.acc=0;
  if(!AUTO.on||AUTO.paused){ autoPaint(); return; }
  if(autoHost()){ AUTO.raf=requestAnimationFrame(autoTick); }
  else { AUTO.left=P.autoSec||20;
    AUTO.tm=setInterval(()=>{ if(!AUTO.on||AUTO.paused)return;
      AUTO.left--; if(AUTO.left<=0){ AUTO.left=P.autoSec||20; try{ ACT=Date.now(); }catch(e){} readNext(); }
      autoPaint(); },1000); }
  autoPaint();
}
function autoOn(){ if(!readerOn())return; AUTO.on=true; AUTO.paused=false; autoArm();
  toast(autoHost()?'자동으로 흘려 봅니다 · 화면을 누르면 멈춤':`${P.autoSec||20}초마다 한 쪽씩 넘깁니다 · 화면을 누르면 멈춤`,2500); }
function autoOff(){ AUTO.on=false; AUTO.paused=false; cancelAnimationFrame(AUTO.raf); clearInterval(AUTO.tm); autoPaint(); }
function autoToggle(){ if(!AUTO.on)autoOn(); else { AUTO.paused=!AUTO.paused; autoArm(); } }
function autoSpeed(d){
  if(autoHost()) P.autoPx=Math.max(8,Math.min(400,Math.round((P.autoPx||40)*(d>0?1.25:0.8))));
  else P.autoSec=Math.max(5,Math.min(120,(P.autoSec||20)+(d>0?-5:5)));
  savePref(); autoArm();
}
$('#btnAuto').onclick=()=>{ AUTO.on?autoOff():autoOn(); };
$('#autoPlay').onclick=e=>{ e.stopPropagation(); AUTO.paused=!AUTO.paused; autoArm(); };
$('#autoSlow').onclick=e=>{ e.stopPropagation(); autoSpeed(-1); };
$('#autoFast').onclick=e=>{ e.stopPropagation(); autoSpeed(1); };
$('#autoStop').onclick=e=>{ e.stopPropagation(); autoOff(); };
// 책 화면을 누르면 멈춤 (자동 막대·위 막대는 빼고)
addEventListener('pointerdown',e=>{
  if(!AUTO.on||AUTO.paused)return;
  const t=e.target; if(!t||!t.closest)return;
  if(t.closest('#autobar')||t.closest('#rbar')||t.closest('.pan')||t.closest('.sheet'))return;
  if(t.closest('#view')||t.closest('#txt')||t.closest('#pdf')||t.closest('#comic')){ AUTO.paused=true; autoArm(); }
},{capture:true,passive:true});
// EPUB 은 책 안쪽(iframe)에서 눌러도 멈춤 (03-reader 의 rend.hooks.content 에서 부름)
function autoIframe(doc){ try{ doc.addEventListener('pointerdown',()=>{ if(AUTO.on&&!AUTO.paused){ AUTO.paused=true; autoArm(); } },{passive:true}); }catch(e){} }

/* ══════════ v57 — 책 지도 ══════════
   목차 창의 [책 지도] — 장마다 한 줄 막대(읽은 만큼 칠함)와 형광펜 · 메모 · 책갈피 점. 누르면 그 자리로.
   목차가 없는 책은 10% 씩 나눕니다. */
let TOCMODE='toc';
function epubAtFrac(href){
  try{
    const sec=book&&book.spine&&book.spine.get(String(href||'').split('#')[0]); if(!sec)return null;
    const L=book.locations&&book.locations._locations;
    if(L&&L.length){ const pre='epubcfi('+sec.cfiBase+'!';
      for(let i=0;i<L.length;i++){ if(String(L[i]).startsWith(pre))return i/L.length; } }
    const n=(book.spine.spineItems||[]).length; return n?sec.index/n:null;
  }catch(e){ return null; }
}
function goFrac(f){
  f=Math.max(0,Math.min(0.9999,f));
  if(KIND==='txt') txtScrollTo(Math.floor(f*TXTRAW.length));
  else if(KIND==='pdf'&&pdfDoc) goPdfPage(Math.max(1,Math.min(pdfDoc.numPages,Math.floor(f*pdfDoc.numPages)+1)));
  else if(KIND==='epub'&&rend){ try{ const L=book.locations; if(L&&L.length&&L.length()){ rend.display(L.cfiFromPercentage(f)); } }catch(e){ toast('그 자리를 찾지 못했습니다'); } }
}
async function paintMap(){
  const host=$('#bookMap'); host.innerHTML='';
  if(!curB){ return; }
  host.innerHTML='<div class="bmS">지도를 그리는 중…</div>';
  let toc=[]; try{ toc=(await getToc())||[]; }catch(e){}
  let rows=toc.filter(x=>(x.d||0)<=1).slice(0,400).map(x=>{
    let at=x.at; if(at==null&&KIND==='epub') at=epubAtFrac(x.go);
    return {t:x.t, at, x}; }).filter(r=>r.at!=null&&!isNaN(r.at));
  rows.sort((a,b)=>a.at-b.at);
  rows=rows.filter((r,i)=>i===0||r.at>rows[i-1].at+1e-6||r.t!==rows[i-1].t);
  if(rows.length<2){ rows=[...Array(10)].map((_,i)=>({t:(i*10)+'–'+((i+1)*10)+'%', at:i/10, x:null})); }
  else if(rows[0].at>0.02) rows.unshift({t:'(앞부분)', at:0, x:null});
  const p=pctOf(curB)||0;
  // EPUB 형광펜에 자리(pos)가 없으면 지금 위치표로 어림 (위치표가 아직이면 빠짐)
  const LC=KIND==='epub'&&book&&book.locations&&book.locations.length&&book.locations.length()?book.locations:null;
  if(LC) hlOf(curB.i).forEach(o=>{ if(typeof o.pos!=='number'&&o.k==='epub'&&o.c){ try{ const v=LC.percentageFromCfi(o.c); if(typeof v==='number'&&!isNaN(v)){ o.pos=v; } }catch(e){} } });
  const all=hlOf(curB.i).filter(o=>typeof o.pos==='number');
  let nh=0,nm=0,nb=0; all.forEach(o=>{ if(isBm(o))nb++; else { nh++; if(o.n)nm++; } });
  host.innerHTML='';
  const sum=document.createElement('div'); sum.className='bmS';
  sum.textContent=`진도 ${Math.round(p*100)}% · 형광펜 ${nh}${nm?' (메모 '+nm+')':''} · 책갈피 ${nb}`+(all.length<hlOf(curB.i).length?' · 자리를 모르는 것은 빠짐':'');
  host.appendChild(sum);
  const f=document.createDocumentFragment();
  rows.forEach((r,i)=>{
    const a=r.at, b=i+1<rows.length?rows[i+1].at:1, w=Math.max(1e-6,b-a);
    const fill=p>=b?1:p<=a?0:(p-a)/w;
    const d=document.createElement('div'); d.className='bmr'+(p>=a&&p<b?' cur':'');
    const dots=all.filter(o=>o.pos>=a&&(o.pos<b||(i===rows.length-1&&o.pos<=1)));
    d.innerHTML=`<div class="t">${esc(r.t)}</div><div class="bar"><i style="width:${(fill*100).toFixed(1)}%"></i></div>`
      +`<div class="n">${dots.length?dots.length:''}</div>`;
    const bar=d.querySelector('.bar');
    dots.slice(0,60).forEach(o=>{ const s=document.createElement('b');
      s.className=isBm(o)?'bm':(o.n?'memo':'');
      s.style.left=Math.max(0,Math.min(100,(o.pos-a)/w*100)).toFixed(1)+'%';
      if(!isBm(o))s.style.background=COLS[o.col]||COLS.y;
      s.title=(isBm(o)?'책갈피 ':'')+String(o.t||o.n||'').slice(0,60);
      s.onclick=ev=>{ ev.stopPropagation(); $('#panToc').classList.remove('on'); $('#bd').classList.remove('on');
        try{ isBm(o)?gotoBm(o):gotoHl(o); }catch(e){ goFrac(o.pos); } };
      bar.appendChild(s); });
    d.onclick=()=>{ if(r.x){ tocGo(r.x); } else { $('#panToc').classList.remove('on'); $('#bd').classList.remove('on'); goFrac(a+0.0001); } };
    f.appendChild(d); });
  host.appendChild(f);
  const cur=host.querySelector('.bmr.cur'); if(cur)setTimeout(()=>{ try{ cur.scrollIntoView({block:'center'}); }catch(e){} },30);
}
const _paintToc57=paintToc;
paintToc=async function(){
  const map=TOCMODE==='map'&&!TOCED;
  $$('#tocMode button').forEach(b=>b.classList.toggle('on',b.dataset.v===(map?'map':'toc')));
  $('#bookMap').style.display=map?'':'none';
  $('#tocList').style.display=map?'none':'';
  if(map){ $('#tocNone').style.display='none'; $('#tocEdBar').classList.remove('on'); $('#tocEdit').style.display='none'; return paintMap(); }
  return _paintToc57();
};
$$('#tocMode button').forEach(b=>b.onclick=()=>{ TOCMODE=b.dataset.v; if(TOCMODE==='map')TOCED=false; paintToc(); });

/* ══════════ v57 — 같은 글귀 한꺼번에 칠하기 ══════════
   짧은 글귀(2~30자)를 고르면 글 고르기 막대에 [모두 칠하기]. 이 책 전체에서 같은 글귀를 찾아 한 번에 칠합니다 (TXT · EPUB, 200곳까지).
   한꺼번에 칠한 것은 grp 번호를 함께 달아, 메모 창에서 [같이 칠한 곳 모두 지우기] 로 한 번에 지울 수 있습니다. */
function selAllShow(){
  const b=$('#selAll'); if(!b)return;
  const t=PICK&&typeof PICK.t==='string'?PICK.t.trim():'';
  b.style.display=((KIND==='txt'||KIND==='epub')&&t.length>=2&&t.length<=30&&!/\n/.test(t))?'':'none';
}
$('#selAll').onclick=async()=>{
  if(!PICK||!curB)return;
  const q=String(PICK.t||'').trim(); if(q.length<2)return;
  const gid='g'+Date.now().toString(36), mine=hlOf(curB.i), MAX=200;
  clearSel(); clearOv(); selbarOff();
  let n=0;
  if(KIND==='txt'){
    const T=txtShown(), have=new Set(mine.filter(o=>o.k==='txt'&&o.c).map(o=>o.c.s));
    let i=-1;
    while((i=T.indexOf(q,i+1))>=0&&n<MAX){ if(have.has(i))continue;
      hlAdd({k:'txt',c:{s:i,e:i+q.length},t:q,pos:TXTRAW.length?i/TXTRAW.length:0,col:'y',grp:gid}); n++; }
    paintTxtHl();
  } else if(KIND==='epub'&&book){
    toast('책 전체에서 찾는 중…',1500);
    const have=new Set(mine.filter(o=>o.k==='epub').map(o=>String(o.c)));
    const items=(book.spine&&book.spine.spineItems)||[];
    const L=book.locations&&book.locations.length&&book.locations.length()?book.locations:null;
    for(let k=0;k<items.length&&n<MAX;k++){
      const it=items[k];
      try{ await it.load(book.load.bind(book));
        for(const r of (it.find(q)||[])){ if(n>=MAX)break; if(have.has(String(r.cfi)))continue;
          let pos=null; try{ if(L)pos=L.percentageFromCfi(r.cfi); }catch(e){}
          hlAdd({k:'epub',c:r.cfi,t:q,pos:pos==null?undefined:pos,col:'y',grp:gid}); n++; }
        it.unload&&it.unload(); }catch(e){}
      if(k%8===7)await new Promise(r=>setTimeout(r,0));
    }
    paintEpubHl();
  }
  saveHL.now(); paintHlBadge(); syncSoon();
  toast(n?`「${q.length>14?q.slice(0,14)+'…':q}」 ${n}곳을 칠했습니다${n>=MAX?' (200곳까지)':''}\n지울 때는 칠한 곳을 눌러 메모 창의 [같이 칠한 곳 모두 지우기]`:'더 칠할 곳이 없습니다',4000);
};
function memoGrpShow(o){
  const box=$('#memoGrpBox'); if(!box)return;
  const n=o&&o.grp&&curB?hlOf(curB.i).filter(x=>x.grp===o.grp).length:0;
  box.style.display=n>1?'':'none';
  if(n>1)$('#memoGrpDel').textContent=`같이 칠한 ${n}곳 모두 지우기`;
}
$('#memoGrpDel').onclick=()=>{
  if(!curB||!memoId)return; const o=hlGet(memoId); if(!o||!o.grp)return;
  const a=HL[curB.i]||[], gone=a.filter(x=>x.grp===o.grp);
  if(!confirm(`「${String(o.t||'').slice(0,20)}」 ${gone.length}곳을 모두 지웁니다.`))return;
  const now=Date.now(); gone.forEach(x=>{ DEL[x.i]=now; });
  HL[curB.i]=a.filter(x=>x.grp!==o.grp); if(!HL[curB.i].length)delete HL[curB.i];
  saveDEL(); saveHL.now();
  if(o.k==='epub')paintEpubHl(); else if(o.k==='pdf')paintPdfHl(); else paintTxtHl();
  paintHlBadge(); panOff(); syncSoon(); toast(gone.length+'곳을 지웠습니다');
};
