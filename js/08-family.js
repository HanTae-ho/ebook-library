/* 우리 도서관 — js/08-family.js
   식구 · 별점 · 옵시디언 · 전집 ZIP · 읽어주기 2 · 글 선택
   ※ 모든 파일이 같은 전역을 나눠 씁니다. index.html 에 적힌 순서(01 → 12)대로 불러와야 합니다. */
/* ══════════ v44 — 식구 ══════════
   ① 서로의 서재  기본 끔. 켠 사람만 모임 칸에 한 줄(kind:'read', id:'read-번호') —
                  지금 읽는 책 8권 + 최근 60일에 다 읽은 책 6권 (책ID·진도·다 읽음) + 올해·이달 다 읽은 권수.
                  제목은 실어 보내지 않습니다 — 같은 색인을 쓰니 받는 쪽이 책ID로 찾습니다. 끄면 그 줄을 지웁니다.
   ② 우리집 통계  켠 사람들의 권수로.
   ③ 명단        팀장님 기기끼리 동기화 (saveMates) · 마지막 활동은 모임 칸에 남긴 가장 최근 줄로.
   ④ 아이 칸     팀장님이 모임 칸에 kind:'kid', 대상=그 사람, 값={c:[보이는 대분류]|null, a:성인물 가리기, w:[낱말]}.
                  그 사람 기기가 받아 목록(BOOKS)을 거릅니다. 폴더 탭은 '색인' 으로만. */
var BOOKS_ALL=[], KIDR=null;
try{ KIDR=JSON.parse(localStorage.getItem('ebl_kid')||'null'); }catch(e){ KIDR=null; }
function kidRule(){ return KIDR&&(KIDR.a||KIDR.c||(KIDR.w&&KIDR.w.length))?KIDR:null; }
const ADULT_RE=/19금|\(19\)|\[19\]|19\+|18\+|R-?18|성인|에로|야설|미성년자\s*구독\s*불가|청소년\s*이용\s*불가|\bBL\b|\bGL\b/i;
function kidOk(b,r){
  if(r.c&&r.c.length&&!r.c.includes(b.b||'(분류 없음)'))return false;
  const txt=[b.t,b._fn,b.o,b.c,b.b,b.m,b.s,b.f].filter(Boolean).join(' ');
  if(r.a&&ADULT_RE.test(txt))return false;
  if(r.w&&r.w.some(w=>w&&txt.includes(w)))return false;
  return true;
}
function kidFilter(list){ const r=kidRule(); return r?list.filter(b=>kidOk(b,r)):list; }
/* 모임 칸에서 나에게 걸린 아이 칸을 찾아 적용 */
function kidSync(){
  const rows=(FAM||[]).filter(x=>x['종류']==='kid'&&String(x['대상'])===String(ME.id)&&!x['지움'])
    .sort((a,b)=>Number(b['언제'])-Number(a['언제']));
  let r=null; if(rows.length){ try{ r=JSON.parse(rows[0]['값']||'null'); }catch(e){ r=null; } }
  if(JSON.stringify(r)===JSON.stringify(KIDR))return;
  KIDR=r; try{ localStorage.setItem('ebl_kid',JSON.stringify(r)); }catch(e){}
  if(BOOKS_ALL.length){ BOOKS=kidFilter(BOOKS_ALL); Object.keys(ORD).forEach(k=>delete ORD[k]); metaApply(); LASTEX=null;
    try{ render(true); }catch(e){} }
  log(r?'아이 칸이 걸렸습니다':'아이 칸이 풀렸습니다');
}
const kidOf=id=>{ const rows=(FAM||[]).filter(x=>x['종류']==='kid'&&String(x['대상'])===String(id)&&!x['지움'])
  .sort((a,b)=>Number(b['언제'])-Number(a['언제'])); if(!rows.length)return null;
  try{ return JSON.parse(rows[0]['값']||'null'); }catch(e){ return null; } };
function lastSeen(id){
  const t=Math.max(0,...(FAM||[]).filter(x=>String(x['누가'])===String(id)).map(x=>Number(x['언제'])||0));
  if(!t)return '';
  const d=Math.floor((Date.now()-t)/86400000);
  return d<=0?'오늘 활동':d===1?'어제 활동':d+'일 전 활동';
}
/* ── 아이 칸 설정 (팀장님) ── */
let KIDM=null;
function openKid(m){
  if(!m.grp){ toast('먼저 이 사람을 모임에 넣어 주세요.\n아이 칸은 그 모임 칸에 적어 둡니다',4500); return; }
  KIDM=m; const r=kidOf(m.id)||{};
  $('#kidT').textContent=`아이 칸 — ${m.name}`;
  $('#kidAdult').checked=r.a!=null?!!r.a:true;
  $('#kidWords').value=(r.w||[]).join(', ');
  const cnt={}; BOOKS_ALL.forEach(b=>{ const k=b.b||'(분류 없음)'; cnt[k]=(cnt[k]||0)+1; });
  const el=$('#kidCats'); el.innerHTML='';
  Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]).forEach(k=>{
    const l=document.createElement('label'); l.style.cssText='display:flex;gap:6px;align-items:center';
    l.innerHTML=`<input type="checkbox" value="${esc(k)}"${!r.c||r.c.includes(k)?' checked':''}> <span>${esc(k)} <i class="seen">${cnt[k].toLocaleString()}</i></span>`;
    el.appendChild(l); });
  kidCount(); $('#kidOff').style.display=kidOf(m.id)?'':'none';
  $('#kidNote').textContent='저장하면 그 사람이 앱을 다시 열거나 목록을 새로 받을 때 걸립니다.';
  $('#kidSheet').classList.add('on');
}
function kidPicked(){ return [...$$('#kidCats input')].filter(x=>x.checked).map(x=>x.value); }
function kidCount(){ const all=$$('#kidCats input').length, n=kidPicked().length;
  $('#kidCatN').textContent=n===all?'(모두)':`(${n} / ${all})`; }
$('#kidCats').addEventListener('change',kidCount);
$('#kidAll').onclick=()=>{ $$('#kidCats input').forEach(x=>x.checked=true); kidCount(); };
$('#kidNone').onclick=()=>{ $$('#kidCats input').forEach(x=>x.checked=false); kidCount(); };
$('#kidCancel').onclick=()=>$('#kidSheet').classList.remove('on');
$('#kidSave').onclick=async()=>{
  const m=KIDM; if(!m)return;
  const all=$$('#kidCats input').length, c=kidPicked();
  if(!c.length){ toast('보이는 분류를 하나 이상 고르세요'); return; }
  const r={ c:c.length===all?null:c, a:$('#kidAdult').checked?1:0,
            w:$('#kidWords').value.split(/[,，]/).map(x=>x.trim()).filter(Boolean).slice(0,30) };
  const ok=await famPut({kind:'kid',id:'kid-'+m.id,to:m.id,title:m.name,val:JSON.stringify(r)}, m.grp);
  if(ok){ $('#kidSheet').classList.remove('on'); paintMates(); toast(`'${m.name}' 에게 아이 칸을 걸었습니다`); }
};
$('#kidOff').onclick=async()=>{
  const m=KIDM; if(!m)return;
  if(!confirm(`'${m.name}' 의 아이 칸을 풉니다.`))return;
  if(await famDel('kid-'+m.id, m.grp)){ $('#kidSheet').classList.remove('on'); paintMates(); toast('아이 칸을 풀었습니다'); }
};

/* ── 서로의 서재 ── */
function readSnapshot(){
  const now=Date.now(), y=new Date().getFullYear(), mo=new Date().getMonth();
  const have=new Set(BOOKS_ALL.map(b=>b.i));
  const ent=Object.entries(RD).filter(([id,r])=>r&&r.t&&have.has(id));
  const reading=ent.filter(([,r])=>!r.f).sort((a,b)=>b[1].t-a[1].t).slice(0,8);
  const done=ent.filter(([,r])=>r.f&&now-r.t<60*86400000).sort((a,b)=>b[1].t-a[1].t).slice(0,6);
  const inY=ent.filter(([,r])=>r.f&&new Date(r.t).getFullYear()===y);
  const inM=inY.filter(([,r])=>new Date(r.t).getMonth()===mo);
  const pack=([id,r])=>({i:id,p:Math.round((r.p||0)*100),f:r.f?1:0,d:Math.floor(r.t/86400000)});
  return { r:reading.map(pack), d:done.map(pack), y, n:inY.length, m:inM.length };
}
let READ_SENT='', READ_AT=0;
async function readPush(force){
  const g=ME.grp||(cfg('adm')&&VIEWG&&VIEWG!=='*'?VIEWG:'');
  if(!g||!cfg('url'))return;
  if(!P.shareRead){ return; }
  const v=JSON.stringify(readSnapshot());
  if(!force&&(v===READ_SENT||Date.now()-READ_AT<180000))return;
  READ_SENT=v; READ_AT=Date.now();
  await famPut({kind:'read',id:'read-'+ME.id,val:v}, g);
}
async function shareToggle(){
  const g=ME.grp||(cfg('adm')&&VIEWG&&VIEWG!=='*'?VIEWG:'');
  if(!g){ toast('모임에 들어 있어야 식구에게 보일 수 있습니다'); return; }
  if(!P.shareRead){
    if(!confirm('내가 읽는 책 (제목과 진도)과 올해 읽은 권수를\n같은 모임 식구에게 보입니다.\n\n언제든 끌 수 있습니다. 켤까요?'))return;
    P.shareRead=1; savePref(); localStorage.setItem('ebl_shrat',String(Date.now())); syncSoon();
    await readPush(true); toast('식구에게 보이기를 켰습니다');
  } else {
    P.shareRead=0; savePref(); localStorage.setItem('ebl_shrat',String(Date.now())); syncSoon();
    await famDel('read-'+ME.id, g); READ_SENT=''; toast('껐습니다. 식구 화면에서 사라집니다');
  }
  paintFamRead();
}
function paintFamRead(){
  const btn=$('#shrBtn'); if(!btn)return;
  btn.textContent=P.shareRead?'내 것 보이는 중 · 끄기':'내 것도 보이기';
  btn.onclick=shareToggle;
  const rows=famOf('read').filter(x=>!x['지움']);
  const el=$('#hRead'); el.innerHTML='';
  const people=rows.map(x=>{ let v={}; try{ v=JSON.parse(x['값']||'{}'); }catch(e){}
    return {id:String(x['누가']), name:String(x['누가'])===String(ME.id)?'나':(x['이름']||nameOf(x['누가'])), v, at:Number(x['언제'])||0}; })
    .sort((a,b)=>(a.name==='나')-(b.name==='나')||b.at-a.at);
  // 같이 읽는 중 — 두 사람 이상이 읽는 중인 책
  const cnt={}; people.forEach(p=>(p.v.r||[]).forEach(e=>{ (cnt[e.i]=cnt[e.i]||[]).push(p.name+' '+e.p+'%'); }));
  const both=Object.entries(cnt).filter(([,a])=>a.length>1);
  if(both.length){ const d=document.createElement('div'); d.className='rd';
    d.innerHTML='<div class="nm">👥 같이 읽는 중</div>';
    both.forEach(([id,a])=>{ const b=bookOf(id); if(!b)return; const s=document.createElement('span'); s.className='bk';
      s.textContent=`${b.t}  ·  ${a.join(' · ')}`; s.onclick=()=>openPanBook(b); d.appendChild(s); });
    el.appendChild(d); }
  people.forEach(p=>{
    const d=document.createElement('div'); d.className='rd';
    d.innerHTML=`<div class="nm">${esc(p.name)}</div>`;
    const add=(e,dn)=>{ const b=bookOf(e.i); if(!b)return; const s=document.createElement('span'); s.className='bk'+(dn?' dn':'');
      s.textContent=b.t+(dn?' ✓':` ${e.p}%`); s.onclick=()=>openPanBook(b); d.appendChild(s); };
    (p.v.r||[]).forEach(e=>add(e,0)); (p.v.d||[]).forEach(e=>add(e,1));
    if(d.children.length===1)d.insertAdjacentHTML('beforeend','<div class="seen" style="font-size:12px;color:var(--dim)">지금 읽는 책이 없습니다</div>');
    el.appendChild(d);
  });
  $('#hReadNone').textContent=people.length?'':(P.shareRead?'아직 보이기를 켠 식구가 없습니다.':'보이기는 기본으로 꺼져 있습니다. 켠 사람의 읽는 책만 여기 보입니다.');
  // 통계
  const st=$('#hsStat'), y=new Date().getFullYear();
  const ps=people.filter(p=>p.v.y===y);
  st.style.display=ps.length?'':'none';
  if(ps.length){
    $('#hStatT').textContent=`우리집 통계 · ${y}년`;
    const tot=ps.reduce((a,p)=>a+(p.v.n||0),0);
    $('#hStat').innerHTML='<table><tr><th>누구</th><th>올해 다 읽음</th><th>이번 달</th><th>읽는 중</th></tr>'
      +ps.map(p=>`<tr><td>${esc(p.name)}</td><td>${p.v.n||0}권</td><td>${p.v.m||0}권</td><td>${(p.v.r||[]).length}권</td></tr>`).join('')
      +`<tr><td><b>모두</b></td><td><b>${tot}권</b></td><td></td><td></td></tr></table>`
      +'<div class="note">보이기를 켠 사람만 셉니다.</div>';
  }
}

/* ══════════ v42 — 별점 · 한 줄 평 ══════════
   RV[책ID] = {s:별 1~5, t:한 줄 평, at:고친 때, sh:모임에 보였는지}
   내 기록이라 읽은 기록처럼 기기끼리 맞춰집니다 (나중에 고친 쪽). 지우면 {s:0,t:'',at} 로 남겨 되살아나지 않게.
   '모임 식구에게도 보이기' 를 고르면 모임 칸에 kind:'rv' 한 줄 (id 는 사람·책마다 하나라 고치면 그 줄이 바뀝니다). */
var RV={}; try{ RV=JSON.parse(localStorage.getItem('ebl_rv')||'{}'); }catch(e){ RV={}; }
function saveRV(){ try{ localStorage.setItem('ebl_rv',JSON.stringify(RV)); }catch(e){} }
const rvOf=id=>{ const r=RV[id]; return r&&(r.s||r.t)?r:null; };
const starStr=n=>'★'.repeat(n||0)+'☆'.repeat(5-(n||0));
function rvFid(id){ let h=0; for(const c of String(id))h=(h*31+c.charCodeAt(0))|0; return 'rv-'+ME.id+'-'+(h>>>0).toString(36); }
function famRvs(id){ return (FAM||[]).filter(x=>x['종류']==='rv'&&x['책ID']===id&&!x['지움']); }
function paintPbRv(b){
  const el=$('#pbRv'); if(!el)return;
  const mine=rvOf(b.i), fam=famRvs(b.i).filter(x=>String(x['누가'])!==String(ME.id));
  let h='';
  if(mine) h+=`<div class="r"><b>${starStr(mine.s)}</b> 나${mine.t?' — '+esc(mine.t):''}</div>`;
  fam.forEach(x=>{ h+=`<div class="r"><b>${starStr(Number(x['값'])||0)}</b> ${esc(x['이름']||'식구')}${x['내용']?' — '+esc(x['내용']):''}</div>`; });
  el.innerHTML=h;
}
let RVB=null, RVS=0;
function paintStars(){ $$('#rvStars button').forEach((x,i)=>x.classList.toggle('on',i<RVS)); }
(function(){ const box=$('#rvStars'); for(let i=1;i<=5;i++){ const x=document.createElement('button'); x.textContent='★';
  x.onclick=()=>{ RVS=(RVS===i?i-1:i); paintStars(); }; box.appendChild(x); } })();
function canShare(){ return !!(ME.grp||(cfg('adm')&&VIEWG&&VIEWG!=='*')); }
function openRv(b){
  RVB=b; const r=RV[b.i]||{};
  RVS=r.s||0; paintStars();
  $('#rvT').textContent=b.t||'별점 · 한 줄 평';
  $('#rvText').value=r.t||'';
  const cs=canShare(); $('#rvShareL').style.display=cs?'':'none';
  $('#rvShare').checked=cs&&!!r.sh;
  $('#rvShareT').textContent='모임 식구에게도 보이기'+(ME.grpN?` (${ME.grpN})`:'');
  $('#rvNote').textContent=cs?'':'모임에 들어 있지 않아 나만 봅니다.';
  $('#rvDel').style.display=rvOf(b.i)?'':'none';
  $('#rvSheet').classList.add('on');
}
async function rvSave(del){
  const b=RVB; if(!b)return;
  const t=del?'':$('#rvText').value.trim().slice(0,300), s=del?0:RVS, sh=!del&&$('#rvShare').checked&&canShare();
  const was=RV[b.i]||{};
  RV[b.i]={s,t,at:Date.now(),sh:sh?1:0}; saveRV(); syncSoon();
  $('#rvSheet').classList.remove('on');
  if(sh){ await famPut({kind:'rv',id:rvFid(b.i),book:b.i,title:b.t||'',text:t,val:String(s)}, ME.grp||VIEWG); }
  else if(was.sh){ try{ await famDel(rvFid(b.i), ME.grp||VIEWG); }catch(e){} }
  toast(del?'별점·평을 지웠습니다':(sh?'남겼습니다 · 모임에도 보입니다':'남겼습니다'));
  try{ render(true); }catch(e){}
}
$('#rvSave').onclick=()=>rvSave(false);
$('#rvDel').onclick=()=>{ if(confirm('이 책의 별점·평을 지울까요?'))rvSave(true); };
$('#rvCancel').onclick=()=>$('#rvSheet').classList.remove('on');
$('#rvSheet').addEventListener('click',e=>{ if(e.target.id==='rvSheet')$('#rvSheet').classList.remove('on'); });
/* 다 읽었을 때 한 번 권합니다 (끄려면 다음 판에서 설정으로) */
function rvAsk(id){
  if(rvOf(id)||rvAsk.done[id])return; rvAsk.done[id]=1;
  const b=(BOOKS.find(x=>x.i===id))||(curB&&curB.i===id?curB:null); if(!b)return;
  setTimeout(()=>{ if(NEXTVOL&&NEXTVOL.offered)return;          // 다음 권 단추가 먼저
    $('#resumeT').textContent='다 읽으셨네요 · 별점 남기기';
    $('#resumeBar').classList.add('on');
    clearTimeout(resumeOffer._t); resumeOffer._t=setTimeout(()=>$('#resumeBar').classList.remove('on'),12000);
    $('#resumeGo').onclick=()=>{ $('#resumeBar').classList.remove('on'); openRv(b); };
  },400);
}
rvAsk.done={};

/* ══════════ v42 — 형광펜·메모 → 옵시디언 ══════════
   obsidian://new?vault=…&file=폴더/제목&content=…&append=true
   같은 이름의 노트가 있으면 끝에 덧붙이고, 없으면 새로 만듭니다. 플러그인의 노트 이름(제목에서 \/:*?"<>| 를 뺀 것)과 맞춥니다.
   보낸 형광펜에는 ob(보낸 때)를 적어 다음에 '새로 그은 것만' 을 고를 수 있게 합니다. */
let OBB=null, OBW='new';
const obSafe=s=>nfc(s).replace(/[\\/:*?"<>|]/g,'').replace(/\s+/g,' ').trim().slice(0,120);
function obItems(b){ return hlOf(b.i).filter(o=>OBW==='all'||!o.ob||(o.up||o.at||0)>o.ob)
  .slice().sort((x,y)=>(x.pos||0)-(y.pos||0)); }
function obText(b){
  const a=obItems(b), r=rvOf(b.i), d=new Date();
  const day=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  let t=`\n## 우리 도서관에서 (${day})\n`;
  const info=[b.a, b.u?`[드라이브](${b.u})`:''].filter(Boolean).join(' · ');
  if(info)t+=info+'\n';
  if(r)t+=`\n별점: ${starStr(r.s)}${r.t?'\n> '+r.t.replace(/\n/g,'\n> '):''}\n`;
  if(a.length)t+='\n'+a.map(o=>{ const w=whereOf(o);
    if(isBm(o))return `- 🔖 ${w}${o.t?' — '+o.t:''}`;
    return `> ${String(o.t||'').replace(/\n/g,'\n> ')}\n> — ${w}`+(o.n?`\n\n${o.n}`:''); }).join('\n\n')+'\n';
  return {t,n:a.length};
}
function obPaint(){
  const b=OBB, x=obText(b), all=hlOf(b.i).length;
  segSet('#obWhich',OBW);
  $('#obInfo').textContent=`${b.t||''} — 형광펜·메모·책갈피 ${all}개 가운데 ${x.n}개를 보냅니다`+(OBW==='new'&&x.n<all?' (앞서 보낸 것은 뺌)':'');
  $('#obPrev').textContent=x.t;
}
function openOb(b){ OBB=b; OBW='new';
  if(!obItems(b).length) OBW='all';
  $('#obVault').value=P.obVault||'Projects'; $('#obDir').value=P.obDir||'05. 도서관/읽은 책';
  obPaint(); $('#obSheet').classList.add('on'); }
$$('#obWhich button').forEach(x=>x.onclick=()=>{ OBW=x.dataset.v; obPaint(); });
function obMark(b){ const now=Date.now(); obItems(b).forEach(o=>{ o.ob=now; }); saveHL.now(); syncSoon(); }
$('#obGo').onclick=()=>{
  const b=OBB; if(!b)return;
  P.obVault=$('#obVault').value.trim()||'Projects'; P.obDir=$('#obDir').value.trim().replace(/^\/+|\/+$/g,''); savePref();
  const x=obText(b);
  const file=(P.obDir?P.obDir+'/':'')+obSafe(b.t||b._fn||'책');
  const u='obsidian://new?vault='+encodeURIComponent(P.obVault)+'&file='+encodeURIComponent(file)
        +'&content='+encodeURIComponent(x.t)+'&append=true';
  if(u.length>60000){
    try{ navigator.clipboard.writeText(x.t); }catch(e){}
    location.href='obsidian://open?vault='+encodeURIComponent(P.obVault)+'&file='+encodeURIComponent(file);
    toast('너무 길어 주소로 못 보냅니다.\n복사해 두었으니 노트 끝에 붙여넣으세요',6000);
  } else { location.href=u; }
  obMark(b); $('#obSheet').classList.remove('on');
};
$('#obCopy').onclick=()=>{ const b=OBB; if(!b)return; const x=obText(b);
  try{ navigator.clipboard.writeText(x.t); toast('복사했습니다'); obMark(b); }catch(e){ toast('복사하지 못했습니다'); } };
$('#obClose').onclick=()=>$('#obSheet').classList.remove('on');
$('#obSheet').addEventListener('click',e=>{ if(e.target.id==='obSheet')$('#obSheet').classList.remove('on'); });
$('#hlOb').onclick=()=>{ if(!curB)return; if(!hlOf(curB.i).length){ toast('아직 그은 것이 없습니다'); return; } panOff(); openOb(curB); };
$('#hlAllOb').onclick=()=>{
  const rows=hlAllRows(); const ids=[...new Set(rows.map(r=>r.bk))];
  if(ids.length!==1){ toast(ids.length?'책 한 권만 보이게 걸러 주세요 (검색에 책 제목)':'보낼 것이 없습니다',4000); return; }
  const r=rows[0]; if(!r.b){ toast('목록에 없는 책이라 보낼 수 없습니다'); return; }
  $('#hlSheet').classList.remove('on'); openOb(r.b); };

/* ══════════ v41 — 전집 ZIP 을 폴더처럼 ══════════
   ZIP·RAR·7z 안의 책을 안쪽 폴더 그대로 둘러봅니다.
   안쪽 책의 이름표는 '바깥ID#안쪽경로' — 그래서 권마다 읽은 기록·형광펜·책갈피가 따로 남고 기기끼리 맞춰집니다.
   바깥 ZIP 의 읽은 기록(RD[바깥ID])에는 마지막으로 연 안쪽 책(l)을 적어, 홈의 '읽는 중' 에 뜨고 [이어 읽기] 가 됩니다.
   한 권을 끝까지 읽으면 같은 폴더의 다음 권을 권합니다. */
var ZIL=null, NEXTVOL=null;
function innerSt(b,name){
  const r=RD[b.i+'#'+name]; if(!r)return '';
  if(r.f)return '<span class="st done">✓ 다 읽음</span>';
  return r.p!=null?`<span class="st">${Math.round(r.p*100)}%</span>`:'<span class="st">읽는 중</span>';
}
function innerList(b,items,all){
  const isArc=it=>/\.(zip|cbz)$/i.test(it.name)?0:1;            // 권 ZIP 을 먼저 (v35.1 과 같게)
  items=items.slice().sort((x,y)=>(isArc(x)-isArc(y))||EXCOLL.compare(x.name,y.name));
  ZIL={b,items,all,path:''};
  // 맨 위가 폴더 하나뿐이면 그 안부터 (흔한 '작품명/01권.txt' 모양)
  for(;;){ const segs=new Set(items.map(it=>it.name.slice(ZIL.path.length).split('/')[0]));
    const deeper=items.every(it=>it.name.slice(ZIL.path.length).includes('/'));
    if(segs.size===1&&deeper)ZIL.path+=[...segs][0]+'/'; else break; }
  ZIL.root=ZIL.path;
  // 마지막에 읽던 안쪽 책이 들어 있는 폴더부터 보여 줍니다
  const last=RD[b.i]&&RD[b.i].l;
  if(last&&items.some(it=>it.name===last)&&last.startsWith(ZIL.root)){ const d=last.lastIndexOf('/'); if(d>=0)ZIL.path=last.slice(0,d+1); }
  $('#zipT').textContent=b._fn||b.t||'압축 안의 책';
  drawInner();
  $('#zipSheet').classList.add('on');
}
function drawInner(){
  const {b,items,all,path}=ZIL, el=$('#zipList'); el.innerHTML='';
  const here=items.filter(it=>it.name.startsWith(path));
  const dirs=new Map(), files=[];
  here.forEach(it=>{ const rest=it.name.slice(path.length), k=rest.indexOf('/');
    if(k>=0){ const d=rest.slice(0,k); if(!dirs.has(d))dirs.set(d,[]); dirs.get(d).push(it); } else files.push(it); });
  const done=items.filter(it=>RD[b.i+'#'+it.name]&&RD[b.i+'#'+it.name].f).length;
  $('#zipN').textContent=`${items.length}권이 들어 있습니다`+(done?` · 다 읽음 ${done}권`:'')+'.';
  $('#zipPath').textContent=path&&path!==ZIL.root?'📂 '+path.slice(ZIL.root.length).replace(/\/$/,''):'';
  const add=(cls,l,r,go)=>{ const x=document.createElement('button'); if(cls)x.className=cls;
    x.innerHTML=`<span>${l}</span><span>${r||''}</span>`; x.onclick=go; el.appendChild(x); return x; };
  const last=RD[b.i]&&RD[b.i].l, li=last&&items.find(it=>it.name===last);
  if(li){
    add('last','📖 이어 읽기 · '+esc(li.name.split('/').pop()), innerSt(b,li.name), ()=>li.open(sibOf(li)));
  }
  if(path!==ZIL.root) add('up','‹ 위 폴더로','',()=>{ const p=path.slice(0,-1); ZIL.path=p.slice(0,p.lastIndexOf('/')+1); if(!ZIL.path.startsWith(ZIL.root))ZIL.path=ZIL.root; drawInner(); });
  if(all&&path===ZIL.root) add('all',all.label,all.sub,all.go);
  [...dirs.keys()].sort((x,y)=>EXCOLL.compare(x,y)).forEach(d=>{
    const list=dirs.get(d), dn=list.filter(it=>RD[b.i+'#'+it.name]&&RD[b.i+'#'+it.name].f).length;
    add('dir',esc(d),`${list.length}권${dn?` · ✓${dn}`:''}`,()=>{ ZIL.path=path+d+'/'; drawInner(); });
  });
  files.forEach(it=>{ add(it.name===last?'last':'', esc(it.name.split('/').pop())+innerSt(b,it.name),
    (it.us/1048576).toFixed(1)+'MB', ()=>it.open(sibOf(it))); });
}
/* 같은 폴더의 책들 (다음 권을 고르는 데 씁니다) */
function sibOf(it){
  const d=it.name.slice(0,it.name.lastIndexOf('/')+1);
  return ZIL.items.filter(x=>x.name.slice(0,x.name.lastIndexOf('/')+1)===d&&!/\.(zip|cbz)$/i.test(x.name)===!/\.(zip|cbz)$/i.test(it.name));
}
/* 안쪽 책을 열 때 — 바깥 ZIP 에 '마지막으로 연 것' 을 적고, 다음 권 후보를 기억합니다 */
function innerMark(b,name,items){
  const r=RD[b.i]||(RD[b.i]={}); r.l=name; r.t=Date.now(); saveRD(); syncSoon();
  NEXTVOL=null;
  if(items&&items.length){ const k=items.findIndex(x=>x.name===name);
    if(k>=0&&k<items.length-1) NEXTVOL={ id:b.i+'#'+name, nx:items[k+1], items, offered:false }; }
}
/* 끝까지 읽으면 (markRead 가 부릅니다) */
function nextVolOffer(id){
  if(!NEXTVOL||NEXTVOL.offered||NEXTVOL.id!==id)return;
  if(/\.(zip|cbz)$/i.test(NEXTVOL.nx.name))return;          // 만화 권은 만화 뷰어가 따로 넘깁니다
  NEXTVOL.offered=true;
  const nv=NEXTVOL;
  $('#resumeT').textContent='다음 권 · '+nv.nx.name.split('/').pop();
  $('#resumeBar').classList.add('on');
  clearTimeout(resumeOffer._t); resumeOffer._t=setTimeout(()=>$('#resumeBar').classList.remove('on'),20000);
  $('#resumeGo').onclick=()=>{ $('#resumeBar').classList.remove('on'); closeReader(); setTimeout(()=>nv.nx.open(nv.items),60); };
}

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
/* 글 고르기 막대 — 한자를 고르면 음을 함께 보입니다 */
function selHanjaPv(){
  const t=PICK&&PICK.t; if(!t||!HANJA_RE.test(t))return;
  const go=()=>{ if(!PICK||PICK.t!==t)return;
    const r=hanjaRead(t.replace(/\s+/g,' ').slice(0,40)); const el=$('#selpv');
    if(el&&r!==t)el.textContent='"'+t.replace(/\s+/g,' ').slice(0,40)+'"  →  '+r; };
  window.HANJA_EUM?go():hanjaReady().then(go).catch(()=>{});
}

/* ══════════ v39 — 글 선택 메뉴 · 이 책에서 찾기 · 단축키 · 마우스 ══════════ */
function selWord(){ return PICK&&PICK.t ? PICK.t.replace(/\s+/g,' ').trim().slice(0,60) : ''; }
function selWeb(u){ const t=selWord(); if(!t)return;
  window.open(u+encodeURIComponent(t),'_blank','noopener'); clearSel(); clearOv(); selbarOff(); }
$('#selDict').onclick=()=>selWeb('https://ko.dict.naver.com/#/search?query=');
$('#selNamu').onclick=()=>selWeb('https://namu.wiki/Go?q=');
$('#selGoogle').onclick=()=>selWeb('https://www.google.com/search?q=');
$('#selTr').onclick=()=>{ const t=PICK&&PICK.t?PICK.t:''; clearSel(); clearOv(); selbarOff(); if(t)showTr(t); };
$('#selFind').onclick=()=>{ const t=selWord(); clearSel(); clearOv(); selbarOff(); openFind(t.slice(0,40)); };

