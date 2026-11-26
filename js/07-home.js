/* 우리 도서관 — js/07-home.js
   홈 꾸미기 · 도서관 홈 · 읽기 자 · 남은 시간·목표·내려받기
   ※ 모든 파일이 같은 전역을 나눠 씁니다. index.html 에 적힌 순서(01 → 12)대로 불러와야 합니다. */
/* ══════════ v49 — 홈 꾸미기 ══════════
   P.home = {order:[칸], hide:{칸:1}, size:{칸:값}} — 이 기기만 (P 는 동기화하지 않습니다).
   아직 꾸민 적이 없으면 팀장님이 정한 '식구 기본 홈'(모임 칸 kind:'homedef') → 없으면 처음 모양. */
var HK=[
  {k:'quick',  id:'hQuick',  n:'요약 줄', h:'이어 읽기 한 권 · 독서 목표 · 바로가기'},
  {k:'banner', id:'hBanner', n:'이달의 특집'},
  {k:'today',  id:'hsToday', n:'오늘의 책',     sz:[1,3,6], u:'권'},
  {k:'new',    id:'hNewB',   n:'새로 담긴 책',   sz:[12,24,36], u:'권'},
  {k:'themes', id:'hThemes', n:'테마 서가',     sz:[1,3,5], u:'칸'},
  {k:'rank',   id:'hRank',   n:'우리집 순위',    sz:[3,5,10], u:'위', h:'많이 읽은 책 · 별점 높은 책'},
  {k:'picks',  id:'hPicks',  n:'분야별 다섯 권', sz:[2,4,6], u:'분야'},
  {k:'reading',id:'hRow1',   n:'이어 읽기',     sz:[12,24], u:'권'},
  {k:'pin',    id:'hsPin',   n:'내 서가'},
  {k:'recent', id:'hRow2',   n:'최근 본 책',     sz:[12,24], u:'권'},
  {k:'saved',  id:'hSaved',  n:'받아둔 책',     sz:[12,24], u:'권'},
  {k:'done',   id:'hDone',   n:'다 읽은 책',     sz:[12,24], u:'권'},
  {k:'hl',     id:'hHl',     n:'오늘의 밑줄',    sz:[1,3,5], u:'개', h:'예전에 그은 형광펜을 날마다 몇 개씩 다시 보여 줍니다'},
  {k:'board',  id:'hBoard',  n:'알림판'},
  {k:'q',      id:'hqWrap',  n:'최근 검색어'},
  {k:'links',  id:'hLinks',  n:'바로가기', h:'전체 둘러보기 · 모은 형광펜 · 독서 달력'}
];
var HK_DEF_SIZE={reading:12,today:3,new:12,themes:3,rank:5,picks:4,recent:12,saved:12,done:12,hl:3};
var HK_DEF_OFF={hl:1};   // v56 — 새로 생긴 칸 가운데 처음엔 꺼 두는 것 (홈 꾸미기에서 켬)
function famHomeDef(){ const rows=(FAM||[]).filter(x=>x['종류']==='homedef'&&!x['지움']).sort((a,b)=>Number(b['언제'])-Number(a['언제']));
  if(!rows.length)return null; try{ return JSON.parse(rows[0]['값']||'null'); }catch(e){ return null; } }
function homeCfg(){
  const base=P.home||famHomeDef()||{};
  const known=HK.map(x=>x.k);
  let order=(base.order||[]).filter(k=>known.includes(k));
  known.forEach(k=>{ if(!order.includes(k)){ const at=known.indexOf(k); // 새로 생긴 칸은 처음 모양의 자리 근처에
    let pos=order.length; for(let j=at-1;j>=0;j--){ const p=order.indexOf(known[j]); if(p>=0){ pos=p+1; break; } } order.splice(pos,0,k); } });
  const hide=Object.assign({},base.hide||{});
  Object.keys(HK_DEF_OFF).forEach(k=>{ if(!(base.order||[]).includes(k)) hide[k]=1; });   // 아직 만져 본 적 없는 새 칸은 꺼 둠
  return { order, hide, size:Object.assign({},HK_DEF_SIZE,base.size||{}) };
}
function homeSize(k){ try{ return homeCfg().size[k]||HK_DEF_SIZE[k]||12; }catch(e){ return HK_DEF_SIZE[k]||12; } }
function applyHomeLayout(){
  const home=$('#home'), c=homeCfg(), tail=$('#hCustom');
  c.order.forEach(k=>{ const h=HK.find(x=>x.k===k), el=h&&$('#'+h.id); if(!el)return;
    home.insertBefore(el,tail); el.classList.toggle('hk-off',!!c.hide[k]); });
}
function homeSave(c){ P.home={order:c.order,hide:c.hide,size:c.size}; savePref(); try{ buildHome(); }catch(e){} paintHomeSheet(); }
function paintHomeSheet(){
  const c=homeCfg(), L=$('#homeList'); L.innerHTML='';
  const fd=famHomeDef();
  $('#homeNote').textContent=(P.home?'이 기기의 홈만 바뀝니다.':(fd?'지금은 팀장님이 정한 식구 기본 홈입니다. 바꾸면 이 기기만 따로 갑니다.':'이 기기의 홈만 바뀝니다.'))
    +' 켜고 끄기 · ↑↓ · 크기를 고르면 바로 반영됩니다.';
  $('#homeFam').style.display=fd&&P.home?'':'none';
  $('#homeSetFam').style.display=isOwner()&&(ME.grp||(VIEWG&&VIEWG!=='*'))?'':'none';
  c.order.forEach((k,idx)=>{
    const h=HK.find(x=>x.k===k); if(!h)return;
    const r=document.createElement('div'); r.className='hr'+(c.hide[k]?' off':''); r.draggable=true; r.dataset.k=k;
    r.innerHTML=`<span class="nm">${esc(h.n)}${h.h?`<small>${esc(h.h)}</small>`:''}</span>`;
    if(h.sz){ const sel=document.createElement('select'); sel.setAttribute('aria-label',h.n+' 크기');
      h.sz.forEach(v=>{ const o=document.createElement('option'); o.value=v; o.textContent=v+h.u; if(Number(c.size[k])===v)o.selected=true; sel.appendChild(o); });
      sel.onchange=()=>{ c.size[k]=Number(sel.value); homeSave(c); }; r.appendChild(sel); }
    const up=document.createElement('button'); up.className='mv'; up.textContent='↑'; up.setAttribute('aria-label',h.n+' 위로'); up.disabled=idx===0;
    up.onclick=()=>{ c.order.splice(idx,1); c.order.splice(idx-1,0,k); homeSave(c); };
    const dn=document.createElement('button'); dn.className='mv'; dn.textContent='↓'; dn.setAttribute('aria-label',h.n+' 아래로'); dn.disabled=idx===c.order.length-1;
    dn.onclick=()=>{ c.order.splice(idx,1); c.order.splice(idx+1,0,k); homeSave(c); };
    const sw=document.createElement('label'); sw.className='sw';
    sw.innerHTML=`<input type="checkbox" aria-label="${esc(h.n)} 보이기"${c.hide[k]?'':' checked'}><span></span>`;
    sw.querySelector('input').onchange=e=>{ if(e.target.checked)delete c.hide[k]; else c.hide[k]=1; homeSave(c); };
    r.append(up,dn,sw);
    // PC: 끌어서 옮기기
    r.addEventListener('dragstart',e=>{ r.classList.add('drag'); try{ e.dataTransfer.setData('text/plain',k); }catch(x){} });
    r.addEventListener('dragend',()=>r.classList.remove('drag'));
    r.addEventListener('dragover',e=>e.preventDefault());
    r.addEventListener('drop',e=>{ e.preventDefault(); let from=''; try{ from=e.dataTransfer.getData('text/plain'); }catch(x){}
      if(!from||from===k)return; const a=c.order.indexOf(from); c.order.splice(a,1); c.order.splice(c.order.indexOf(k),0,from); homeSave(c); });
    L.appendChild(r);
  });
}
function openHomeSheet(){ panOff(); paintHomeSheet(); $('#homeSheet').classList.add('on'); }
$('#lkHome').onclick=openHomeSheet;
$('#homeOpen2').onclick=openHomeSheet;
$('#homeClose').onclick=()=>$('#homeSheet').classList.remove('on');
$('#homeSheet').addEventListener('click',e=>{ if(e.target.id==='homeSheet')$('#homeSheet').classList.remove('on'); });
$('#homeReset').onclick=()=>{ if(!confirm('홈을 처음 모양으로 되돌립니다.'))return;
  P.home={order:HK.map(x=>x.k),hide:{},size:Object.assign({},HK_DEF_SIZE)}; savePref(); try{ buildHome(); }catch(e){} paintHomeSheet(); };
$('#homeFam').onclick=()=>{ delete P.home; savePref(); try{ buildHome(); }catch(e){} paintHomeSheet(); toast('식구 기본 홈을 따릅니다'); };
$('#homeSetFam').onclick=async()=>{
  const c=homeCfg();
  if(!confirm('지금 이 홈 모양을 식구 기본 홈으로 정합니다.\n아직 꾸민 적이 없는 식구 기기에 적용됩니다 (이미 꾸민 사람은 그대로).'))return;
  if(await famPut({kind:'homedef',id:'homedef',val:JSON.stringify({order:c.order,hide:c.hide,size:c.size})},ME.grp||VIEWG)) toast('식구 기본 홈으로 정했습니다');
};

/* ══════════ v48 — 도서관 홈 ══════════
   위에서부터: 빠른 줄(목표) · 이달의 특집 · 이어 읽기 · 내 서가 · 오늘의 책 3권 · 새로 담긴 책(분야 태그) ·
   테마 서가 · 우리집 많이 읽은 책 / 별점 높은 책 · 분야별 다섯 권 · 최근 본·받아둔·다 읽은 · 알림판.
   특집은 팀장님이 서가 하나에 {feat:1, d:'한 줄 소개'} 를 붙인 것. 알림판은 모임 칸 kind:'note'.
   오늘의 책 소개는 YES24 를 그때그때 (기기 메모리에만, 쌓지 않음 — YES24 약관). */
const TINTRO=new Map();
function cvBox(b){ const w=document.createElement('div'); w.className='cvw';
  const ok=b.v&&!(typeof isWrong==='function'&&isWrong(b.i));
  if(ok){ const im=document.createElement('img'); im.loading='lazy'; im.src=b.v; im.alt='';
    im.onerror=()=>{ im.remove(); w.insertAdjacentHTML('afterbegin',phHtml(b)); }; w.appendChild(im); }
  else w.innerHTML=phHtml(b);
  return w; }
function pickDistinct(pool,n,salt){
  const out=[], seen=new Set(); if(!pool.length)return out;
  const d=new Date(), seed=d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();
  for(let j=0;out.length<n&&j<n*8;j++){
    let h=(seed+(salt||0)*104729+j*7919)>>>0;
    h=(h^(h>>>15))*2246822507>>>0; h=(h^(h>>>13))*3266489909>>>0; h=(h^(h>>>16))>>>0;
    const b=pool[h%pool.length]; if(!seen.has(b.i)){ seen.add(b.i); out.push(b); } }
  return out; }
function paintToday3(pool){
  const te=$('#hToday'), arr=pickDistinct(pool,homeSize('today'),todayN+1);
  if(!arr.length)return false;
  te.innerHTML=''; te.onclick=null;
  arr.forEach(b=>{
    const c=document.createElement('div'); c.className='tc';
    c.appendChild(cvBox(b));
    const m=document.createElement('div'); m.className='m';
    m.innerHTML=`<span class="ct">${esc(b.s||b.m||b.b||(b.x||'').toUpperCase())}</span><span class="ti">${esc(b.t)}</span>`
      +`<span class="au">${esc(b.a||'')}</span><span class="in"></span><span class="src"></span>`;
    c.appendChild(m); c.onclick=()=>openPanBook(b); te.appendChild(c);
    const inEl=m.querySelector('.in'), srEl=m.querySelector('.src');
    const show=x=>{ if(!x){ inEl.textContent=''; return; } inEl.textContent=x.t; srEl.innerHTML='자료: YES24'; };
    if(TINTRO.has(b.i)) show(TINTRO.get(b.i));
    else if(cfg('url')&&kindOf(b)!=='comic'&&navigator.onLine!==false){
      inEl.textContent='책 소개를 불러오는 중…';
      y24Fetch(b).then(d=>{ const it=d&&d.item; const raw=it&&(it.intro||it.summary);
        const t=raw?String(raw).replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim().slice(0,160):'';
        const v=t?{t}:null; TINTRO.set(b.i,v); show(v); })
      .catch(()=>{ TINTRO.set(b.i,null); show(null); });
    }
  });
  return true;
}
function featShelf(){ const sh=(typeof shelves==='function')?shelves():[];
  return sh.filter(o=>unpackVal(o['값']).feat).sort((a,b)=>Number(b['언제'])-Number(a['언제']))[0]||null; }
const BTINT=['linear-gradient(135deg,#27486b,#1b2f45)','linear-gradient(135deg,#3d5a2f,#243a1d)','linear-gradient(135deg,#5a3a5f,#35213a)','linear-gradient(135deg,#6a4a2a,#3d2a17)'];
/* v51 — 배너는 넘기는 판 여러 장. 특집이 없어도 '이달의 분야' · '새로 담긴 책' 으로 채웁니다 */
var BNI=0, BNT=0;
function monthCat(vis){ const cc={}; (vis||[]).forEach(b=>{ if(b.b)cc[b.b]=(cc[b.b]||0)+1; });
  const cats=Object.keys(cc).filter(k=>cc[k]>=12).sort(); if(!cats.length)return '';
  const d=new Date(); return cats[(d.getFullYear()*12+d.getMonth())%cats.length]; }
function bannerSlides(vis){
  const out=[], own=isOwner(), sh=(typeof shelves==='function')?shelves():[], o=featShelf();
  const tint=x=>{ let h=0; for(const c of String(x))h=(h*31+c.charCodeAt(0))|0; return BTINT[Math.abs(h)%BTINT.length]; };
  if(o){ const v=unpackVal(o['값']), books=shelfBooks(o.id).map(x=>bookOf(x['책ID'])).filter(Boolean);
    out.push({tag:v.tag||'이달의 특집', title:o['제목']||'', desc:v.d||'', btn:'서가 열기 · '+books.length+'권', go:()=>goShelf(o),
      who:(nameOf(o['누가'])||'')+'가 꾸민 서가', covers:books.slice(0,4), bg:tint(o.id), ed:own?['특집 바꾸기',pickFeat]:null}); }
  const c=monthCat(vis), d=new Date();
  if(c){ const all=vis.filter(b=>b.b===c), un=all.filter(b=>!RD[b.i]);
    out.push({tag:(d.getMonth()+1)+'월의 분야', title:c+' — 한 달 동안 둘러보기',
      desc:`${c} ${all.length.toLocaleString()}권 가운데 아직 안 연 책 ${un.length.toLocaleString()}권. 매달 1일에 분야가 바뀝니다.`,
      btn:'분야 열기 · '+all.length.toLocaleString()+'권', go:()=>goList('',c), covers:pickDistinct(un.length>=4?un:all,4,d.getMonth()+3),
      bg:tint(c), ed:(!o&&own&&sh.length)?['특집 걸기',pickFeat]:null}); }
  const iso=t=>new Date(t).toISOString().slice(0,10);
  let fr=vis.filter(b=>b.g&&String(b.g)>=iso(Date.now()-7*864e5)), span='이번 주에';
  if(!fr.length){ fr=vis.filter(b=>b.g&&String(b.g)>=iso(Date.now()-30*864e5)); span='이번 달에'; }
  if(fr.length){ fr.sort((x,y)=>String(y.g).localeCompare(String(x.g)));
    out.push({tag:'새로 담김', title:`${span} 들어온 책 ${fr.length.toLocaleString()}권`, desc:'드라이브 책 폴더에 넣으면 새벽에 저절로 들어옵니다.',
      btn:'모두 보기 ›', go:()=>goList('new'), covers:fr.slice(0,4), bg:BTINT[2]}); }
  return out;
}
function paintBanner(vis){
  const el=$('#hBanner'); if(!el)return; el.innerHTML=''; clearInterval(BNT);
  const sl=bannerSlides(vis||BOOKS||[]); if(!sl.length)return;
  if(BNI>=sl.length)BNI=0;
  const d=document.createElement('div'); d.className='bn'; el.appendChild(d);
  const restart=()=>{ clearInterval(BNT); if(sl.length>1)BNT=setInterval(()=>{ if(document.hidden||!d.isConnected)return; show((BNI+1)%sl.length); },9000); };
  const show=i=>{ BNI=i; const x=sl[i]; d.style.background=x.bg;
    d.innerHTML=`<div style="flex:1 1 300px;min-width:0"><span class="tg">${esc(x.tag)}</span><h2>${esc(x.title)}</h2><p>${esc(x.desc)}</p>`
      +`<button class="go">${esc(x.btn)}</button>${x.who?`<span class="who">${esc(x.who)}</span>`:''}</div><div class="cvs"></div>`
      +(x.ed?`<button class="ed">${esc(x.ed[0])}</button>`:'')
      +(sl.length>1?'<div class="dots">'+sl.map((y,k)=>`<button aria-label="${k+1}번째 판" class="${k===i?'on':''}"></button>`).join('')+'</div>':'');
    const cv=d.querySelector('.cvs');
    x.covers.forEach(b=>{ const c=document.createElement('div'); c.className='cv'; const u=(COVERS&&COVERS[b.i])||b.v;
      if(u){ const im=document.createElement('img'); im.src=u; im.alt=''; im.onerror=()=>{ im.remove(); c.innerHTML=phHtml(b); }; c.appendChild(im); }
      else c.innerHTML=phHtml(b);
      c.onclick=e=>{ e.stopPropagation(); openPanBook(b); }; cv.appendChild(c); });
    d.querySelector('.go').onclick=x.go;
    if(x.ed)d.querySelector('.ed').onclick=x.ed[1];
    d.querySelectorAll('.dots button').forEach((b,k)=>b.onclick=()=>{ show(k); restart(); });
  };
  show(BNI); restart();
}
/* v51 — 요약 줄: 이어 읽기 한 권 · 독서 목표 · 바로가기 넷 */
function durTxt(sec){ const m=Math.max(1,Math.round(sec/60)); return m<60?m+'분':Math.floor(m/60)+'시간'+(m%60?' '+(m%60)+'분':''); }
function paintQuick(vis){
  const rd=$('#hqRead'), lk=$('#hqLinks'); if(!rd||!lk)return;
  const r=vis.filter(b=>stOf(b)==='reading').sort((x,y)=>((RD[y.i]&&RD[y.i].t)||0)-((RD[x.i]&&RD[x.i].t)||0))[0];
  rd.innerHTML=''; rd.className=''; rd.onclick=null;
  if(r){ const p=pctOf(r), pc=Math.round(p*100), sec=bookSec(r.i);
    const left=(p>=.05&&p<1&&sec>=300)?sec*(1-p)/p:0;
    rd.className='qc';
    rd.innerHTML=`<div class="cv"></div><div class="m"><div class="lb">이어 읽기</div><div class="t">${esc(r.t||'')}</div>`
      +`<div class="bar"><i style="width:${pc}%"></i></div><div class="lb">${pc}%${left?' · 약 '+durTxt(left)+' 남음':(sec>=60?' · 읽은 시간 '+durTxt(sec):'')}</div></div>`;
    const cv=rd.querySelector('.cv'), u=(COVERS&&COVERS[r.i])||r.v;
    if(u){ const im=document.createElement('img'); im.src=u; im.alt=''; im.onerror=()=>{ im.remove(); cv.innerHTML=phHtml(r); }; cv.appendChild(im); }
    else cv.innerHTML=phHtml(r);
    rd.onclick=()=>openBook(r); }
  let hl=0; try{ Object.values(HL).forEach(a=>(a||[]).forEach(o=>{ if(!isBm(o))hl++; })); }catch(e){}
  const mm=dkey().slice(0,7); let nd=0; Object.keys(DAYS||{}).forEach(k=>{ if(k.startsWith(mm)&&daySec(k)>=60)nd++; });
  let sz=0; try{ saved.forEach(i=>{ sz+=(SIZES[i]&&SIZES[i].b)||0; }); }catch(e){}
  const szT=sz>=1e9?(sz/1e9).toFixed(1)+'GB':sz>=1e6?Math.round(sz/1e6)+'MB':'';
  const items=[
    ['#ffe14d', hl?`모은 형광펜 · ${hl}개`:'모은 형광펜', ()=>openHlAll()],
    ['var(--acc)', nd?`독서 달력 · 이달 ${nd}일`:'독서 달력', ()=>openCal()],
    ['#7ee0a0', `받아둔 책 · ${saved.size}권${szT?' · '+szT:''}`, ()=>goList('saved')],
    ['#ffa8c8', '이 책 넣어주세요', ()=>$('#lkReq').onclick()] ];
  lk.innerHTML='';
  items.forEach(([c,t,f])=>{ const b=document.createElement('button'); b.innerHTML=`<i style="background:${c}"></i><span>${esc(t)}</span>`; b.onclick=f; lk.appendChild(b); });
}
/* 팀장님: 특집으로 걸 서가 고르기 + 한 줄 소개 */
async function pickFeat(){
  const sh=shelves(); if(!sh.length){ toast('먼저 서가를 만들어 주세요'); return; }
  const el=$('#pbActs'); el.innerHTML='';
  $('#pbT').textContent='이달의 특집으로 걸 서가'; $('#pbS').textContent='하나만 걸립니다. 지금 것은 내려갑니다'; $('#pbRv').innerHTML='';
  const cur=featShelf();
  sh.forEach(o=>{ const x=document.createElement('button');
    x.innerHTML=(cur&&cur.id===o.id?'✓ ':'')+esc(o['제목']||'')+`<span class="h">${shelfBooks(o.id).length}권</span>`;
    x.onclick=async()=>{ panOff();
      const v=unpackVal(o['값']);
      const desc=await ask('한 줄 소개','예) 중독을 겪은 사람과 곁에 있는 사람이 함께 읽을 책',v.d||''); if(desc===null)return;
      const tag=await ask('작은 꼬리표','예) 11월 특집 · 겨울방학',v.tag||'이달의 특집'); if(tag===null)return;
      if(cur&&cur.id!==o.id){ const cv=unpackVal(cur['값']); delete cv.feat;
        await famPut({kind:'shelf',id:cur.id,title:cur['제목'],val:packVal(cv)},grpOf(cur)||curGrp()); }
      const ok=await famPut({kind:'shelf',id:o.id,title:o['제목'],val:packVal(Object.assign(v,{feat:1,d:desc.trim(),tag:tag.trim()||'이달의 특집'}))},grpOf(o)||curGrp());
      if(ok){ toast('특집으로 걸었습니다'); render(true); } };
    el.appendChild(x); });
  if(cur){ const x=document.createElement('button'); x.className='warn'; x.textContent='특집 내리기';
    x.onclick=async()=>{ panOff(); const cv=unpackVal(cur['값']); delete cv.feat;
      if(await famPut({kind:'shelf',id:cur.id,title:cur['제목'],val:packVal(cv)},grpOf(cur)||curGrp())){ toast('특집을 내렸습니다'); render(true); } };
    el.appendChild(x); }
  pan('#panBook',true);
}
let HCHIP='';
function paintLibHome(vis,n){
  try{ paintQuick(vis); }catch(e){ log('요약 줄 실패: '+(e.message||e)); }
  paintBanner(vis);
  /* 새로 담긴 책 — 분야 태그 */
  const nb=$('#hNewB'); nb.innerHTML='';
  const fresh=vis.filter(b=>b.g).sort((x,y)=>String(y.g).localeCompare(String(x.g))).slice(0,300);
  if(fresh.length){
    const cnt={}; fresh.slice(0,120).forEach(b=>{ if(b.b)cnt[b.b]=(cnt[b.b]||0)+1; });
    const cats=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]).slice(0,6);
    if(HCHIP&&!cats.includes(HCHIP))HCHIP='';
    const list=fresh.filter(b=>!HCHIP||b.b===HCHIP);
    const d=document.createElement('div'); d.className='hs';
    d.innerHTML='<div class="hh"><b>새로 담긴 책</b></div><div class="hchips"></div><div class="hscr"></div>';
    const ch=d.querySelector('.hchips');
    ['',...cats].forEach(c=>{ const x=document.createElement('button'); x.textContent=c||'전체'; if(c===HCHIP)x.className='on';
      x.onclick=()=>{ HCHIP=c; paintLibHome(vis,n); }; ch.appendChild(x); });
    const more=document.createElement('button'); more.textContent='모두 보기 ›'; more.onclick=()=>goList('new'); d.querySelector('.hh').appendChild(more);
    hcards(d.querySelector('.hscr'),list.slice(0,homeSize('new')));
    nb.appendChild(d);
  }
  /* 테마 서가 — 특집이 아닌 서가 셋 */
  const th=$('#hThemes'); th.innerHTML='';
  const fo=featShelf();
  ((typeof shelves==='function')?shelves():[]).filter(o=>!fo||o.id!==fo.id).slice(-homeSize('themes')).reverse().forEach(o=>{
    const books=shelfBooks(o.id).map(x=>bookOf(x['책ID'])).filter(Boolean); if(!books.length)return;
    const d=document.createElement('div'); d.className='hbox';
    d.innerHTML=`<div class="hh"><b>${esc(o['제목']||'')}</b></div><div class="sub">${esc(nameOf(o['누가'])||'')}가 꾸민 서가 · ${books.length}권</div><div class="hscr"></div>`;
    const more=document.createElement('button'); more.textContent='모두 보기 ›'; more.onclick=()=>goShelf(o); d.querySelector('.hh').appendChild(more);
    hcards(d.querySelector('.hscr'),books.slice(0,HN)); th.appendChild(d);
  });
  if(!th.children.length){  // v51 — 식구 서가가 아직 없으면 내 서가(자주 여는 분류) → 없으면 책이 많은 분야
    const mc=monthCat(vis), mine=(P.pins||[]).length>0; let keys=(P.pins||[]).slice();
    if(!mine){ const cc={}; vis.forEach(b=>{ if(b.b)cc[b.b]=(cc[b.b]||0)+1; }); keys=Object.keys(cc).sort((a,b)=>cc[b]-cc[a]); }
    keys.filter(k=>k!==mc).slice(0,homeSize('themes')).forEach((k,ki)=>{
      const all=vis.filter(b=>b.b===k||b.m===k||b.s===k); if(!all.length)return;
      const un=all.filter(b=>!RD[b.i]);
      const d=document.createElement('div'); d.className='hbox';
      d.innerHTML=`<div class="hh"><b>${esc(k)}</b></div><div class="sub">${mine?'내 서가':'책이 많은 분야'} · ${all.length.toLocaleString()}권 · 안 읽은 책에서 날마다 바뀜</div><div class="hscr"></div>`;
      const more=document.createElement('button'); more.textContent='모두 보기 ›'; more.onclick=()=>goList('',k); d.querySelector('.hh').appendChild(more);
      hcards(d.querySelector('.hscr'),pickDistinct(un.length>=6?un:all,HN,ki+31+todayN)); th.appendChild(d); });
  }
  /* 우리집 많이 읽은 책 · 별점 높은 책 */
  const rk=$('#hRank'); rk.innerHTML='';
  const tally=new Map();
  famOf('read').filter(x=>!x['지움']).forEach(x=>{ let v={}; try{ v=JSON.parse(x['값']||'{}'); }catch(e){}
    const who=String(x['누가'])===String(ME.id)?'나':(x['이름']||nameOf(x['누가']));
    [...(v.r||[]),...(v.d||[])].forEach(e=>{ const t=tally.get(e.i)||{n:0,w:[]}; t.n++; if(!t.w.includes(who))t.w.push(who); tally.set(e.i,t); }); });
  const top=[...tally.entries()].map(([i,t])=>({b:bookOf(i),t})).filter(x=>x.b).sort((a,b)=>b.t.n-a.t.n).slice(0,homeSize('rank'));
  const rv=[];
  famOf('rv').filter(x=>!x['지움']&&Number(x['값'])>=4).forEach(x=>{ const b=bookOf(x['책ID']); if(b)rv.push({b,s:Number(x['값']),who:String(x['누가'])===String(ME.id)?'나':(x['이름']||nameOf(x['누가'])),say:x['내용']||'',at:Number(x['언제'])||0}); });
  Object.entries(RV).forEach(([i,r])=>{ if(r&&r.s>=4&&!r.sh){ const b=bookOf(i); if(b)rv.push({b,s:r.s,who:'나',say:r.t||'',at:r.at||0}); } });
  rv.sort((a,b)=>b.s-a.s||b.at-a.at);
  let mine=[];
  if(!top.length){ const sec={}; Object.values(DAYS||{}).forEach(m=>Object.entries(m||{}).forEach(([k,v])=>{ const id=k.split('|')[0]; sec[id]=(sec[id]||0)+v; }));
    mine=Object.entries(sec).filter(x=>x[1]>=60).map(([i,t])=>({b:bookOf(i),t})).filter(x=>x.b).sort((a,b)=>b.t-a.t).slice(0,homeSize('rank')); }
  if(top.length||rv.length||mine.length){
    const w=document.createElement('div'); w.className='h2c';
    if(top.length){ const c=document.createElement('div'); c.className='col'; c.innerHTML='<h4>우리집에서 많이 읽은 책</h4>';
      top.forEach((x,k)=>{ const li=document.createElement('div'); li.className='li';
        li.innerHTML=`<span class="n${k<3?' top':''}">${k+1}</span><span style="min-width:0"><span class="t" style="display:block">${esc(x.b.t)}</span><span class="w">${esc(x.t.w.join(' · '))}</span></span>`;
        li.onclick=()=>openPanBook(x.b); c.appendChild(li); });
      w.appendChild(c); }
    if(mine.length){ const c=document.createElement('div'); c.className='col'; c.innerHTML='<h4>내가 오래 읽은 책</h4>';
      mine.forEach((x,k)=>{ const li=document.createElement('div'); li.className='li'; const pc=Math.round(pctOf(x.b)*100);
        li.innerHTML=`<span class="n${k<3?' top':''}">${k+1}</span><span style="min-width:0"><span class="t" style="display:block">${esc(x.b.t)}</span><span class="w">${durTxt(x.t)}${pc?' · '+pc+'%':''}${stOf(x.b)==='done'?' · 다 읽음':''}</span></span>`;
        li.onclick=()=>openPanBook(x.b); c.appendChild(li); });
      w.appendChild(c); }
    if(rv.length){ const c=document.createElement('div'); c.className='col'; c.innerHTML='<h4>별점 높은 책</h4>';
      rv.slice(0,homeSize('rank')).forEach(x=>{ const li=document.createElement('div'); li.className='li';
        li.innerHTML=`<span style="min-width:0;flex:1"><span class="t" style="display:block">${esc(x.b.t)}</span><span class="w">${esc(x.who)}${x.say?' — '+esc(x.say):''}</span></span><span class="st" aria-label="별 ${x.s}개">${starStr(x.s)}</span>`;
        li.onclick=()=>openPanBook(x.b); c.appendChild(li); });
      w.appendChild(c); }
    rk.appendChild(w);
  }
  /* 분야별 오늘의 다섯 권 — 안 읽은 책에서 */
  const pk=$('#hPicks'); pk.innerHTML='';
  const unread=vis.filter(b=>!RD[b.i]&&b.b&&b.t);
  const cc={}; unread.forEach(b=>cc[b.b]=(cc[b.b]||0)+1);
  const big=Object.keys(cc).filter(k=>cc[k]>=5).sort((a,b)=>cc[b]-cc[a]).slice(0,homeSize('picks'));
  if(big.length){
    const hh=document.createElement('div'); hh.className='hh'; hh.innerHTML='<b>분야별 오늘의 다섯 권</b>'; pk.appendChild(hh);
    const w=document.createElement('div'); w.className='hpk';
    big.forEach((c,ci)=>{ const col=document.createElement('div'); col.className='col';
      col.innerHTML=`<b>${esc(c)}<button>더 보기</button></b><ol></ol>`;
      col.querySelector('button').onclick=()=>goList('',c);
      const ol=col.querySelector('ol');
      pickDistinct(unread.filter(b=>b.b===c),5,ci+11+todayN).forEach(b=>{ const li=document.createElement('li'); li.textContent=b.t; li.onclick=()=>openPanBook(b); ol.appendChild(li); });
      w.appendChild(col); });
    pk.appendChild(w);
  }
  paintBoard();
}
/* 알림판 — 팀장님 공지(kind:'note') + 나에게 온 권하기 한마디 */
function paintBoard(){
  const el=$('#hBoard'); if(!el)return; el.innerHTML='';
  const notes=famOf('note').filter(x=>!x['지움']).sort((a,b)=>Number(b['언제'])-Number(a['언제'])).slice(0,3);
  const recs=famOf('rec').filter(x=>x['대상']===ME.id&&x['내용']).sort((a,b)=>Number(b['언제'])-Number(a['언제'])).slice(0,2);
  const own=isOwner(), hasG=!!(ME.grp||(own&&VIEWG&&VIEWG!=='*'));
  if(!notes.length&&!recs.length&&!(own&&hasG)&&!hasG)return;
  const d=document.createElement('div'); d.className='hbox';
  d.innerHTML='<div class="hh"><b>알림판</b><button id="brReq">이 책 넣어주세요 ›</button></div>';
  notes.forEach(x=>{ const r=document.createElement('div'); r.className='nt';
    r.innerHTML=`<span><b>${esc(x['이름']||nameOf(x['누가']))}</b> · ${esc(x['내용']||'')}</span>`;
    if(own){ const b=document.createElement('button'); b.textContent='내리기';
      b.onclick=async()=>{ if(await famDel(x.id||x['id'],grpOf(x)||curGrp()))render(true); }; r.appendChild(b); }
    d.appendChild(r); });
  recs.forEach(x=>{ const r=document.createElement('div'); r.className='nt';
    r.innerHTML=`<span><b>${esc(x['이름']||nameOf(x['누가']))}</b> → 나 · “${esc(x['내용'])}” <i style="color:var(--dim);font-style:normal">${esc(x['제목']||'')}</i></span>`;
    d.appendChild(r); });
  if(!notes.length&&!recs.length) d.insertAdjacentHTML('beforeend','<div class="hnone" style="margin-top:6px">아직 알림이 없습니다.</div>');
  if(own&&hasG){ const r=document.createElement('div'); r.className='row';
    r.innerHTML='<label for="noteIn" style="position:absolute;left:-9999px">공지 한 줄</label><input id="noteIn" placeholder="식구에게 알릴 한 줄 (예: 겨울방학 서가를 열었습니다)" maxlength="120" autocomplete="off"><button class="pri" id="noteGo">올리기</button>';
    d.appendChild(r); }
  el.appendChild(d);
  $('#brReq').onclick=()=>$('#lkReq').onclick();
  const ng=$('#noteGo'); if(ng)ng.onclick=async()=>{ const t=$('#noteIn').value.trim(); if(!t)return;
    if(await famPut({kind:'note',text:t},ME.grp||VIEWG)){ toast('알림판에 올렸습니다'); render(true); } };
}

/* ══════════ v47 — 읽기 자 · 집중 모드 ══════════
   읽는 줄 몇 개만 밝게 두고 위아래를 어둡게 덮습니다 (그림을 덮는 층이라 글·형광펜은 그대로).
   TXT·흘려보는 PDF: 띠는 제자리, 글이 띠 아래로 흘러갑니다.
   EPUB·한 쪽씩 PDF: 쪽을 넘기면 띠가 맨 위로 돌아가고, 오른쪽 ≡ 를 끌어 내려가며 읽습니다.
   '켬 + 막대 숨김' 은 위아래 막대까지 감춰 집중합니다 (화면 가운데를 누르면 다시 보임). */
if(P.rulerY==null)P.rulerY=0.32; if(!P.rulerH)P.rulerH=3; if(!P.rulerD)P.rulerD=45;
function rulerLinePx(){ return 15*(P.fs||110)/100*(P.lh||170)/100; }
function applyRuler(){
  const el=$('#ruler'); if(!el)return;
  const on=!!P.ruler&&readerOn()&&KIND!=='comic';
  el.classList.toggle('on',on);
  document.body.classList.toggle('rfocus',on&&P.ruler===2);
  if(on&&P.ruler===2){ $('#rbar').classList.add('hide'); $('#rfoot').classList.add('hide'); }
  const H=Math.round(rulerLinePx()*P.rulerH+10), vh=innerHeight;
  const y=Math.max(0,Math.min(vh-H,Math.round(P.rulerY*vh)));
  el.style.setProperty('--ry',y+'px'); el.style.setProperty('--rh',H+'px'); el.style.setProperty('--rdim',(P.rulerD/100).toFixed(2));
  segSet('#segRuler',P.ruler||0); $('#rulerBox').style.display=P.ruler?'':'none';
  $('#rgRulerH').value=P.rulerH; $('#vRulerH').textContent=P.rulerH+'줄';
  $('#rgRulerD').value=P.rulerD; $('#vRulerD').textContent=P.rulerD+'%';
}
function rulerTop(){ if(!P.ruler)return; const top=($('#rbar').classList.contains('hide')?16:64)/innerHeight;
  P.rulerY=Math.max(0.02,top); applyRuler(); }
seg('#segRuler','ruler',()=>{ if(!P.ruler){ $('#rbar').classList.remove('hide'); $('#rfoot').classList.remove('hide'); } applyRuler(); });
$('#rgRulerH').addEventListener('input',()=>{ P.rulerH=Number($('#rgRulerH').value); savePref(); applyRuler(); });
$('#rgRulerD').addEventListener('input',()=>{ P.rulerD=Number($('#rgRulerD').value); savePref(); applyRuler(); });
(function(){ const h=document.querySelector('#ruler .rh'); let dy=0, on=false;
  h.addEventListener('pointerdown',e=>{ on=true; dy=e.clientY-P.rulerY*innerHeight; try{ h.setPointerCapture(e.pointerId); }catch(x){} e.preventDefault(); e.stopPropagation(); });
  h.addEventListener('pointermove',e=>{ if(!on)return; P.rulerY=Math.max(0,Math.min(0.95,(e.clientY-dy)/innerHeight)); applyRuler(); e.preventDefault(); });
  const up=()=>{ if(on){ on=false; savePref(); } };
  h.addEventListener('pointerup',up); h.addEventListener('pointercancel',up);
})();
addEventListener('resize',()=>{ try{ if(P.ruler)applyRuler(); }catch(e){} });

/* ══════════ v46 — 남은 시간 · 독서 목표 · 저장 공간 한도 · 내 기록 내려받기 ══════════ */
/* 남은 시간
   책: 이 책에 쓴 시간(DAYS 를 모두 더함) ÷ 지금 진도 × 남은 진도 — 5분 넘게, 3% 넘게 읽은 뒤부터.
   장(EPUB): 이번에 쪽을 넘긴 간격의 가운데 값 × 이 장에 남은 쪽.  */
var PGT={ id:'', last:0, gaps:[] };
function pageTick(loc){
  if(!curB)return; const now=Date.now();
  if(PGT.id!==curB.i){ PGT={id:curB.i,last:now,gaps:[]}; return; }
  const g=(now-PGT.last)/1000; PGT.last=now;
  if(g>=3&&g<=300){ PGT.gaps.push(g); if(PGT.gaps.length>40)PGT.gaps.shift(); }
}
function bookSec(id){ let t=0; Object.values(DAYS).forEach(m=>Object.entries(m||{}).forEach(([k,v])=>{ if(k.split('|')[0]===id)t+=v; })); return t; }
const shortDur=sec=>{ const m=Math.round(sec/60); if(m<1)return '1분 안'; if(m<60)return m+'분';
  const h=Math.floor(m/60), r=m%60; return h+'시간'+(r&&h<10?' '+r+'분':''); };
function leftStr(loc){
  if(!curB||P.leftTime===0)return '';
  const out=[];
  if(loc&&loc.start&&loc.start.displayed&&PGT.gaps.length>=4){
    const d=loc.start.displayed, left=Math.max(0,(d.total||0)-(d.page||0));
    const g=PGT.gaps.slice().sort((a,b)=>a-b), med=g[g.length>>1];
    if(left>0)out.push('이 장 '+shortDur(left*med));
  }
  const p=pctOf(curB), sec=bookSec(curB.i);
  if(p>=0.03&&p<0.985&&sec>=300) out.push('책 '+shortDur(sec*(1-p)/p));
  return out.length?out.join(' · ')+' 남음  ·  ':'';
}

/* 독서 목표 — 홈 위 카드. 누르면 올해 목표 권수를 정합니다 (0 이면 목표 없이 기록만) */
function yearDone(y){ return Object.entries(RD).filter(([id,r])=>r&&r.f&&r.t&&new Date(r.t).getFullYear()===y&&!/#all$/.test(id)).length; }
function daySec(k){ return Object.values(DAYS[k]||{}).reduce((a,v)=>a+v,0); }
function streak(){
  let n=0; const d=new Date();
  if(daySec(dkey(d))<60)d.setDate(d.getDate()-1);          // 오늘 아직 안 읽었으면 어제부터 셉니다
  for(;;){ if(daySec(dkey(d))>=60){ n++; d.setDate(d.getDate()-1); } else break; if(n>3650)break; }
  return n;
}
function paintGoal(){
  const el=$('#hGoal'); if(!el)return;
  if(P.goalOff){ el.innerHTML=''; return; }
  const y=new Date().getFullYear(), n=yearDone(y), goal=goalOf(y), st=streak(), today=daySec(dkey());
  if(!n&&!st&&!today&&!goal){ // 기록도 목표도 없을 때 — 그래도 목표는 정할 수 있게
    el.innerHTML=`<div class="g gnew" id="goalCard"><div class="tx"><b>${y}년 독서 목표 정하기 ›</b><br><i>다 읽은 책과 연속 독서일을 여기서 셉니다</i></div></div>`;
    $('#goalCard').onclick=goalAsk; return; }
  const fr=goal?Math.min(1,n/goal):0, C=2*Math.PI*18;
  // 지금 날짜까지 와 있어야 할 권수
  const doy=(Date.now()-new Date(y,0,1))/86400000, pace=goal?Math.round(goal*doy/365):0;
  el.innerHTML=`<div class="g" id="goalCard">
    <svg class="ring" viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" fill="none" stroke="var(--line)" stroke-width="5"/>
      <circle cx="22" cy="22" r="18" fill="none" stroke="var(--acc)" stroke-width="5" stroke-linecap="round"
        stroke-dasharray="${(C*fr).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 22 22)"/>
      <text x="22" y="26" text-anchor="middle" font-size="12" fill="var(--tx)">${n}</text></svg>
    <div class="tx"><b>${y}년 ${n}권</b>${goal?` / 목표 ${goal}권 <i>(지금쯤 ${pace}권${n>=pace?' · 앞서는 중':''})</i>`:' <i>· 누르면 목표를 정합니다</i>'}<br>
      ${st?`연속 ${st}일째`:'오늘 읽어 연속을 시작해 보세요'}${today?` · 오늘 ${shortDur(today)}`:''}</div></div>`;
  $('#goalCard').onclick=goalAsk;
}
/* 목표는 해마다 — 해가 바뀌면 지난 목표는 쓰지 않습니다 (v50, 기기끼리 맞춤) */
function goalOf(y){ return (P.goal&&(!P.goalY||P.goalY===y))?P.goal:0; }
function goalHint(){
  const y=new Date().getFullYear(), last=yearDone(y-1), cut=Date.now()-90*86400000;
  const r90=Object.entries(RD).filter(([id,r])=>r&&r.f&&r.t>=cut&&!/#all$/.test(id)).length;
  const pace=r90?Math.round(r90*365/90):0;
  let sug=Math.max(last,pace); sug=sug?Math.min(999,Math.max(1,Math.round(sug*1.1))):12;
  const bits=[]; if(last)bits.push(`작년 ${last}권`); if(r90)bits.push(`최근 3개월 ${r90}권 → 이 속도면 1년 ${pace}권`);
  return { sug, txt:(bits.length?bits.join(' · ')+` · 조금 더 해서 ${sug}권을 권합니다`:`기록이 아직 없어 한 달에 한 권(12권)으로 시작해 보세요`) };
}
async function goalAsk(){
  const y=new Date().getFullYear(), cur=goalOf(y), h=goalHint();
  const v=await ask(`${y}년 목표 — 몇 권?`,h.txt+' · 0 이면 목표 없이 기록만',String(cur||h.sug));
  if(v===null)return; const k=Math.max(0,Math.min(999,parseInt(v,10)||0));
  P.goal=k; P.goalY=y; savePref(); try{ localStorage.setItem('ebl_goalat',String(Date.now())); }catch(e){} syncSoon();
  paintGoal(); toast(k?`올해 목표 ${k}권 — 다른 기기에도 맞춰집니다`:'목표 없이 기록만 보입니다');
}

/* 저장 공간 한도 — 받아둔 책의 크기와 마지막으로 연 때를 기기에 적어 둡니다 */
var SIZES={}; try{ SIZES=JSON.parse(localStorage.getItem('ebl_sizes')||'{}'); }catch(e){ SIZES={}; }
function sizeTouch(id,bytes){ const o=SIZES[id]||(SIZES[id]={}); if(bytes)o.b=bytes; o.t=Date.now();
  clearTimeout(sizeTouch._t); sizeTouch._t=setTimeout(()=>{ try{ localStorage.setItem('ebl_sizes',JSON.stringify(SIZES)); }catch(e){} },800); }
function sizeOf(id){ const o=SIZES[id]; if(o&&o.b)return o.b; const b=(BOOKS_ALL.length?BOOKS_ALL:BOOKS).find(x=>x.i===id); return b&&b.z?b.z*1048576:5*1048576; }
function sizeTotal(){ let t=0; saved.forEach(id=>t+=sizeOf(id)); return t; }
async function capClean(keep){
  const cap=(P.cap||0)*1073741824; if(!cap)return 0;
  let tot=sizeTotal(); if(tot<=cap)return 0;
  const now=Date.now(), recent=id=>(SIZES[id]&&now-(SIZES[id].t||0)<3*86400000);
  const lastOf=id=>Math.max((SIZES[id]&&SIZES[id].t)||0,(RD[id]&&RD[id].t)||0);
  const cand=[...saved].filter(id=>id!==keep&&!(curB&&curB.i===id)&&!recent(id));
  const done=cand.filter(id=>RD[id]&&RD[id].f).sort((a,b)=>lastOf(a)-lastOf(b));
  const old=cand.filter(id=>!(RD[id]&&RD[id].f)&&now-lastOf(id)>30*86400000).sort((a,b)=>lastOf(a)-lastOf(b));
  let n=0;
  for(const id of done.concat(old)){
    if(tot<=cap*0.9)break;
    try{ await DB.del('books',id); saved.delete(id); tot-=sizeOf(id); delete SIZES[id]; n++; }catch(e){}
  }
  try{ localStorage.setItem('ebl_sizes',JSON.stringify(SIZES)); }catch(e){}
  if(n){ log('저장 공간 한도로 '+n+'권을 비웠습니다'); toast(`받아둔 책이 한도를 넘어\n오래된 ${n}권의 파일을 비웠습니다 (읽은 기록은 그대로)`,4500);
    try{ paintTabs(); }catch(e){} }
  return n;
}
seg('#segCap','cap',async()=>{ const n=await capClean(); useInfo();
  if(P.cap&&!n)toast(`한도 ${P.cap}GB — 지금은 넘지 않습니다`); });

/* 내 기록 내려받기 — JSON(전부) + 마크다운(사람이 읽기 좋게). 설정(주소·토큰)은 뺍니다 */
function dlFile(name,text,type){
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type}));
  a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1500);
}
function exportMd(){
  const byId=new Map((BOOKS_ALL.length?BOOKS_ALL:BOOKS).map(b=>[b.i,b]));
  const nm=id=>{ const b=byId.get(id); if(b)return b.t; const h=(HL[id]||[]).find(o=>o.bt); return h?h.bt:id; };
  const day=t=>t?dkey(t):'';
  let md=`# 우리 도서관 — 내 기록\n\n${dkey()} · ${ME.name||''}\n\n`;
  const y=new Date().getFullYear();
  md+=`올해 다 읽은 책 ${yearDone(y)}권 · 연속 ${streak()}일\n\n## 다 읽은 책\n\n`;
  Object.entries(RD).filter(([,r])=>r&&r.f).sort((a,b)=>(b[1].t||0)-(a[1].t||0)).forEach(([id,r])=>{
    const v=RV[id]; md+=`- ${day(r.t)}  ${nm(id)}${v&&v.s?'  '+starStr(v.s):''}${v&&v.t?' — '+v.t:''}  (읽은 시간 ${shortDur(bookSec(id))})\n`; });
  md+=`\n## 읽다가 그만둔 책\n\n`;
  Object.entries(RD).filter(([,r])=>r&&!r.f&&r.s).sort((a,b)=>(b[1].t||0)-(a[1].t||0)).forEach(([id,r])=>{
    md+=`- ${nm(id)}  ${Math.round((r.p||0)*100)}%  (${day(r.t)})\n`; });
  md+=`\n## 읽는 중\n\n`;
  Object.entries(RD).filter(([,r])=>r&&!r.f&&!r.s).sort((a,b)=>(b[1].t||0)-(a[1].t||0)).forEach(([id,r])=>{
    md+=`- ${nm(id)}  ${Math.round((r.p||0)*100)}%  (${day(r.t)})\n`; });
  md+=`\n## 형광펜 · 메모 · 책갈피\n`;
  Object.entries(HL).forEach(([id,a])=>{ if(!a||!a.length)return;
    md+=`\n### ${nm(id)}\n\n`+a.slice().sort((x,y)=>(x.pos||0)-(y.pos||0)).map(o=>{ const w=whereOf(o);
      if(isBm(o))return `- 🔖 ${w}${o.t?' — '+o.t:''}`;
      return `> ${String(o.t||'').replace(/\n/g,'\n> ')}\n> — ${w}`+(o.n?`\n\n${o.n}`:''); }).join('\n\n')+'\n'; });
  return md;
}
$('#btnExport').onclick=()=>{
  const st=localState(); delete st.cfg; delete st.cfgAt;                 // 주소·토큰은 넣지 않습니다
  const stamp=dkey().replace(/-/g,'');
  dlFile(`우리도서관_내기록_${stamp}.json`,JSON.stringify(st,null,1),'application/json');
  setTimeout(()=>dlFile(`우리도서관_내기록_${stamp}.md`,exportMd(),'text/markdown'),600);
  toast('파일 두 개를 내려받습니다 (JSON · 마크다운)');
};

/* v56 — 표로 받기: 책마다 한 줄 (엑셀·구글 시트에서 바로 열림, 한글 깨짐 막는 BOM 포함) */
$('#btnExportCsv').onclick=()=>{
  const byId=new Map((BOOKS_ALL.length?BOOKS_ALL:BOOKS).map(b=>[b.i,b]));
  const q=v=>{ v=String(v==null?'':v); return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; };
  const rows=[['제목','저자','출판사','분류','형식','상태','진도(%)','마지막으로 읽은 날','읽은 시간(분)','별점','한 줄 평','형광펜','메모','책갈피']];
  const ids=new Set([...Object.keys(RD),...Object.keys(HL),...Object.keys(RV||{})]);
  [...ids].map(id=>({id,r:RD[id]||{}})).sort((a,b)=>(b.r.t||0)-(a.r.t||0)).forEach(({id,r})=>{
    const b=byId.get(id)||{}, v=(RV||{})[id]||{}, h=HL[id]||[];
    const st=r.f?'다 읽음':r.s?'중단':(r.t?'읽는 중':'');
    let nh=0,nm=0,nb=0; h.forEach(o=>{ if(isBm(o))nb++; else { nh++; if(o.n)nm++; } });
    const bt=b.t||((h.find(o=>o.bt)||{}).bt)||id;
    let sec=0; try{ sec=bookSec(id)||0; }catch(e){}
    rows.push([bt,b.a||'',b.p||'',[b.b,b.m,b.s].filter(Boolean).join(' > '),(b.x||'').toUpperCase(),st,
      r.t?Math.round((r.p||0)*100):'', r.t?dkey(r.t):'', sec?Math.round(sec/60):'', v.s||'', v.t||'', nh||'', nm||'', nb||'']);
  });
  const csv='\uFEFF'+rows.map(r=>r.map(q).join(',')).join('\r\n');
  dlFile(`우리도서관_독서기록_${dkey().replace(/-/g,'')}.csv`,csv,'text/csv;charset=utf-8');
  toast(`${rows.length-1}권을 표로 내려받습니다`);
};

