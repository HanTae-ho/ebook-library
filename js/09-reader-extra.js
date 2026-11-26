/* 우리 도서관 — js/09-reader-extra.js
   번역·각주 · 텍본 문구 · 책 소개 · RAR · 진짜 표지
   ※ 모든 파일이 같은 전역을 나눠 씁니다. index.html 에 적힌 순서(01 → 12)대로 불러와야 합니다. */
/* ══════════ v53 — 고른 글 번역 · 각주 작은 창 ══════════
   번역은 우리 Apps Script 웹앱(mode=tr)이 구글 번역(LanguageApp)으로 — 키가 필요 없습니다.
   결과는 이 기기 메모리에만 잠깐 (같은 글을 다시 물으면 바로). */
function rpop(title,html,acts){ $('#rpopT').textContent=title; $('#rpopB').innerHTML=html; const a=$('#rpopA'); a.innerHTML='';
  (acts||[]).forEach(([t,f])=>{ const b=document.createElement('button'); b.textContent=t; b.onclick=f; a.appendChild(b); });
  $('#rpop').classList.add('on'); $('#rpop').scrollTop=0; }
function rpopOff(){ $('#rpop').classList.remove('on'); }
$('#rpopX').onclick=rpopOff;
var TRC=new Map();
function trTo(t){ const h=(t.match(/[가-힣]/g)||[]).length, l=(t.match(/[A-Za-z]/g)||[]).length; return h>=l&&h>0?'en':'ko'; }
function trCut(t){ t=String(t||'').replace(/\s+/g,' ').trim(); while(t&&encodeURIComponent(t).length>6000)t=t.slice(0,Math.floor(t.length*.85)); return t; }
async function gasGet(params,oldMsg){
  const base=checkUrl();
  const q=new URLSearchParams(Object.assign({ token:cfg('tok'), uid:ME.id||'' },params));
  const ac=new AbortController(), tm=setTimeout(()=>ac.abort(),25000);
  try{
    const r=await fetch(base+(base.includes('?')?'&':'?')+q.toString(),{signal:ac.signal});
    if(!r.ok)throw new Error('웹앱 응답 '+r.status);
    const rd=r.body&&r.body.getReader?r.body.getReader():null; let txt='';
    if(rd){ const dec=new TextDecoder(); let n=0;
      for(;;){ const {done,value}=await rd.read(); if(done)break; n+=value.length; txt+=dec.decode(value,{stream:true});
        if(n>512*1024){ try{ ac.abort(); }catch(e){} throw new Error(oldMsg); } } }
    else txt=await r.text();
    let d; try{ d=JSON.parse(txt); }catch(e){ throw new Error('웹앱 응답을 읽지 못했습니다'); }
    if(d&&d.books)throw new Error(oldMsg);           // 옛 웹앱은 모르는 mode 에 색인을 통째로 줍니다
    if(d.error)throw new Error(d.error);
    return d;
  } catch(e){ if(e.name==='AbortError')throw new Error('응답이 너무 늦습니다'); throw e; }
  finally{ clearTimeout(tm); }
}
async function trFetch(text,to){
  const k=to+'|'+text; if(TRC.has(k))return TRC.get(k);
  const d=await gasGet({mode:'tr',q:text,to},'웹앱이 아직 번역을 모릅니다.\nApps Script 에 v18.15 를 붙이고\n배포 관리 → 새 버전으로 배포해 주세요');
  if(!d.ok)throw new Error(d.error||'번역하지 못했습니다');
  if(TRC.size>200)TRC.delete(TRC.keys().next().value);
  TRC.set(k,d.text||''); return d.text||'';
}
async function showTr(raw,to,title){
  const text=trCut(raw); if(!text)return; to=to||trTo(text);
  const cut=text.length<String(raw).replace(/\s+/g,' ').trim().length;
  const src=`<div class="src">${esc(text)}</div>`;
  rpop((title||'번역')+' · '+(to==='ko'?'한국어로':'영어로')+' …',src,[]);
  let out;
  try{ out=await trFetch(text,to); }
  catch(e){ rpop(title||'번역',src+`<div class="err">${esc(e.message||String(e))}</div>`,[['다시',()=>showTr(raw,to,title)],['닫기',rpopOff]]); return; }
  rpop((title||'번역')+' · '+(to==='ko'?'한국어로':'영어로')+(cut?' (앞부분만)':''),src+esc(out),[
    ['복사',()=>{ try{ navigator.clipboard.writeText(out); toast('번역을 복사했습니다'); }catch(e){} }],
    [to==='ko'?'영어로':'한국어로',()=>showTr(raw,to==='ko'?'en':'ko',title)],
    ['닫기',rpopOff]]);
}
/* 각주 — EPUB 안의 각주 번호(noteref · [1] · ¹ · * 등)를 누르면 그 자리로 넘어가지 않고 작은 창에 */
const NOTE_RE=/^[\[\(（【]?\s*(\d{1,3}|[*†‡§]+|[a-z]|[ivxlc]{1,6}|주\s*\d{1,3}|[¹²³⁴⁵⁶⁷⁸⁹⁰]+)\s*[\]\)）】]?$/i;
function noteLooks(a){
  const et=((a.getAttribute('epub:type')||'')+' '+(a.getAttributeNS?(a.getAttributeNS('http://www.idpf.org/2007/ops','type')||''):'')+' '+(a.getAttribute('role')||'')).toLowerCase();
  if(/noteref/.test(et))return true;
  const t=(a.textContent||'').trim();
  return t.length<=8&&(NOTE_RE.test(t)||!!a.closest('sup'));
}
function noteText(el,backHref){
  if(!el)return '';
  let box=el;
  const blk=el.closest&&el.closest('aside,li,dd,[epub\\:type*="note"],[role*="note"],p,div');
  if(blk&&(blk.textContent||'').trim().length>(el.textContent||'').trim().length+1)box=blk;
  if(box.tagName&&/^(BODY|HTML|SECTION)$/.test(box.tagName))box=el;
  const c=box.cloneNode(true);
  c.querySelectorAll('a').forEach(x=>{ const h=x.getAttribute('href')||''; const tx=(x.textContent||'').trim();
    if((backHref&&h.includes(backHref))||/^[↩↑⏎]$/.test(tx)||/backlink|doc-backlink/.test((x.getAttribute('role')||'')+(x.getAttribute('epub:type')||'')))x.remove(); });
  return (c.textContent||'').replace(/\s+/g,' ').trim().slice(0,2000);
}
async function noteFind(view,href){
  const [file,id]=href.split('#'); if(!id)return null;
  const doc=view.document;
  const secHref=(view.section&&view.section.href)||'';
  if(!file){ const el=doc.getElementById(id)||doc.querySelector(`[name="${CSS.escape(id)}"]`); return {el,full:secHref+'#'+id}; }
  let rel=file; try{ rel=decodeURIComponent(new URL(file,'http://x/'+secHref).pathname.slice(1)); }catch(e){}
  const sec=book&&(book.spine.get(rel)||book.spine.get(file));
  if(!sec)return {el:null,full:rel+'#'+id};
  const cont=await sec.load(book.load.bind(book));
  const d=cont&&(cont.ownerDocument||cont);
  const el=d&&(d.getElementById?d.getElementById(id):null)||(cont&&cont.querySelector?cont.querySelector(`[id="${CSS.escape(id)}"]`):null);
  return {el,full:rel+'#'+id};
}
function bindNotes(view){
  const doc=view&&view.document; if(!doc||doc._notes)return; doc._notes=1;
  doc.addEventListener('click',async e=>{
    const a=e.target&&e.target.closest&&e.target.closest('a[href]'); if(!a)return;
    const href=a.getAttribute('href')||''; if(!href.includes('#')||/^[a-z]+:/i.test(href)||!noteLooks(a))return;
    if(P.notePop===0)return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    let r=null; try{ r=await noteFind(view,href); }catch(err){}
    const me=a.getAttribute('id')||''; const txt=r&&noteText(r.el,me?'#'+me:'');
    const go=()=>{ rpopOff(); try{ rend.display(r?r.full:href); }catch(err){} };
    if(!txt){ go(); return; }
    const num=(a.textContent||'').trim();
    rpop('각주 '+num,esc(txt),[['그 자리로',go],['번역',()=>showTr(txt,null,'각주 '+num)],['닫기',rpopOff]]);
  },true);
}

/* 이 책에서 찾기 — TXT 는 보이는 글, EPUB 은 장마다, PDF 는 쪽마다 */
const FIND={ gen:0, hits:[] };
function openFind(q){
  if(!readerOn()||KIND==='comic'){ toast('만화에서는 찾을 글이 없습니다'); return; }
  pan('#panFind',true);
  if(q){ $('#findQ').value=q; runFind(); }
  else setTimeout(()=>{ try{ $('#findQ').focus(); }catch(e){} },60);
}
function findSnip(text,i,len){
  const a=Math.max(0,i-24), z=Math.min(text.length,i+len+40);
  const clean=x=>esc(x.replace(/[​\s]+/g,' '));
  return (a>0?'…':'')+clean(text.slice(a,i))+'<b>'+clean(text.slice(i,i+len))+'</b>'+clean(text.slice(i+len,z))+(z<text.length?'…':'');
}
function findPaint(done){
  const L=$('#findList'), H=FIND.hits;
  $('#findN').textContent = H.length ? `${H.length>=200?'200개 넘게':H.length+'곳'}${done?'':' · 찾는 중…'}` : (done?'없습니다.':'찾는 중…');
  L.innerHTML='';
  const f=document.createDocumentFragment();
  H.slice(0,200).forEach(h=>{ const d=document.createElement('div'); d.className='it';
    d.innerHTML=h.snip+`<div class="w">${esc(h.where)}</div>`;
    d.onclick=()=>{ panOff(); findGo(h); }; f.appendChild(d); });
  L.appendChild(f);
}
async function runFind(){
  const q=nfc($('#findQ').value).trim(); const g=++FIND.gen; FIND.hits=[];
  if(q.length<1){ $('#findN').textContent=''; $('#findList').innerHTML=''; return; }
  const ql=q.toLowerCase(), push=h=>{ FIND.hits.push(h); return FIND.hits.length<200; };
  findPaint(false);
  if(KIND==='txt'){
    const T=txtShown(), low=T.toLowerCase(); let i=-1;
    while((i=low.indexOf(ql,i+1))>=0){ if(!push({k:'txt',off:i,snip:findSnip(T,i,q.length),
      where:Math.round(i/Math.max(1,T.length)*100)+'%'}))break; }
  } else if(KIND==='epub'&&book){
    const items=(book.spine&&book.spine.spineItems)||[];
    for(let k=0;k<items.length;k++){
      if(g!==FIND.gen)return;
      const it=items[k];
      try{ await it.load(book.load.bind(book));
           const rs=it.find(q)||[];
           for(const r of rs){ if(!push({k:'epub',cfi:r.cfi,snip:findSnip(r.excerpt||'',Math.max(0,(r.excerpt||'').toLowerCase().indexOf(ql)),q.length),
             where:`${k+1} / ${items.length} 장`}))break; }
           it.unload&&it.unload(); }catch(e){}
      if(FIND.hits.length>=200)break;
      if(k%5===4){ findPaint(false); await new Promise(r=>setTimeout(r,0)); }
    }
  } else if(KIND==='pdf'&&pdfDoc){
    for(let p=1;p<=pdfDoc.numPages;p++){
      if(g!==FIND.gen)return;
      try{ const pg=await pdfDoc.getPage(p), tc=await pg.getTextContent();
           const T=tc.items.map(x=>x.str).join(' ');
           /* v43 — PDF 는 글자층 빈칸이 들쭉날쭉합니다 ('관계 중 독'). 빈칸을 빼고 맞춰 봅니다 */
           const map=[]; let N=''; for(let j=0;j<T.length;j++){ if(!/\s/.test(T[j])){ N+=T[j].toLowerCase(); map.push(j); } }
           const qn=ql.replace(/\s+/g,''); let i=-1;
           if(qn) while((i=N.indexOf(qn,i+1))>=0){ const a=map[i], z=map[i+qn.length-1]+1;
             if(!push({k:'pdf',p,snip:findSnip(T,a,z-a),where:p+'쪽'}))break; } }catch(e){}
      if(FIND.hits.length>=200)break;
      if(p%10===0){ findPaint(false); await new Promise(r=>setTimeout(r,0)); }
    }
  }
  if(g===FIND.gen)findPaint(true);
}
function findGo(h){
  if(h.k==='txt') txtScrollTo(h.off);
  else if(h.k==='epub'&&rend){ try{ rend.display(h.cfi);
      try{ rend.annotations.highlight(h.cfi,{},null,'findhl',{fill:'#ffe14d','fill-opacity':'0.45'});
           setTimeout(()=>{ try{ rend.annotations.remove(h.cfi,'highlight'); }catch(e){} },2500); }catch(e){} }
    catch(e){ toast('그 자리를 찾지 못했습니다'); } }
  else if(h.k==='pdf') goPdfPage(h.p);
}
$('#btnFind').onclick=()=>openFind('');
$('#findGo').onclick=runFind;
$('#findQ').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); runFind(); } e.stopPropagation(); });

/* 쪽 넘기기 — 형식마다 */
function readNext(){
  if(KIND==='comic') return comicNext();
  if(KIND==='txt'){ const h=$('#txt'); h.scrollTop+=h.clientHeight*0.9; return; }
  if(KIND==='pdf'&&P.pnav!=='page'){ const h=$('#pdf'); h.scrollTop+=h.clientHeight*0.9; return; }
  pageFwd();
}
function readPrev(){
  if(KIND==='comic') return comicPrev();
  if(KIND==='txt'){ const h=$('#txt'); h.scrollTop-=h.clientHeight*0.9; return; }
  if(KIND==='pdf'&&P.pnav!=='page'){ const h=$('#pdf'); h.scrollTop-=h.clientHeight*0.9; return; }
  pageBack();
}
function ttsKey(){ if(!TTS.on){ $('#btnTts').onclick(); } else { TTS.playing?ttsPause():ttsPlay(); } }
const KEYHELP=[
  ['→  PageDown  Space','다음 쪽 (TXT·흘려보는 PDF 는 한 화면 아래로)'],
  ['←  PageUp  Shift+Space','앞 쪽'],
  ['Home / End','처음 / 끝 (TXT·흘려보는 PDF)'],
  ['Ctrl+F  /','이 책에서 찾기'],
  ['B','책갈피 꽂기·빼기'],
  ['T','읽어주기 켜기 · 멈춤 · 다시'],
  ['M','형광펜·메모 목록'],
  ['C','목차'],
  ['[  ]','글자 작게 · 크게'],
  ['R','읽기 자 켜기·끄기'],
  ['A','자동 넘김 켜기·멈춤'],
  ['Esc','열린 판 닫기 → 한 번 더 누르면 책 닫기'],
];
function readerKey(e){
  if($('#reader').style.display!=='flex')return;
  const t=e.target, tag=t&&t.tagName;
  if(tag==='INPUT'||tag==='TEXTAREA'||(t&&t.isContentEditable))return;
  if(e.altKey||e.metaKey)return;
  const k=e.key, ctrl=e.ctrlKey;
  const anyPan=PANS.some(p=>$(p)&&$(p).classList.contains('on'))||$('#panToc').classList.contains('on')||$('.sheet.on');
  if(k==='Escape'){ if(anyPan||$('#selbar').classList.contains('on')){ selbarOff(); panOff(); $('#panToc').classList.remove('on');
      $$('.sheet.on').forEach(x=>x.classList.remove('on')); } else closeReader(); e.preventDefault(); return; }
  if((ctrl&&(k==='f'||k==='F'))||(!ctrl&&k==='/')){ e.preventDefault(); openFind(''); return; }
  if(ctrl)return;
  if(anyPan)return;
  let done=true;
  if(KIND==='comic'&&(k==='ArrowLeft'||k==='ArrowRight')) comicSide(k==='ArrowLeft'?'L':'R');
  else if(k==='ArrowRight'||k==='PageDown'||(k===' '&&!e.shiftKey)) readNext();
  else if(k==='ArrowLeft'||k==='PageUp'||(k===' '&&e.shiftKey)) readPrev();
  else if(k==='Home'||k==='End'){ const h=KIND==='txt'?$('#txt'):(KIND==='pdf'&&P.pnav!=='page'?$('#pdf'):null);
    if(h)h.scrollTop=k==='Home'?0:h.scrollHeight; else done=false; }
  else if(k==='b'||k==='B') $('#btnBm').onclick&&$('#btnBm').onclick();
  else if(k==='t'||k==='T') ttsKey();
  else if(k==='m'||k==='M') $('#btnHl').click();
  else if(k==='c'||k==='C') $('#btnToc').click();
  else if(k==='a'||k==='A') autoToggle();   // v57 — 자동 넘김
  else if(k==='r'||k==='R'){ P.ruler=P.ruler?0:1; savePref(); applyRuler(); toast(P.ruler?'읽기 자를 켰습니다':'읽기 자를 껐습니다',1000); }
  else if(k==='['||k===']'){ P.fs=Math.max(70,Math.min(220,P.fs+(k===']'?5:-5))); savePref(); applyRead(); toast('글자 '+P.fs+'%',900); }
  else done=false;
  if(done)e.preventDefault();
}
/* 휠: 굴러가는 화면(TXT·흘려보는 PDF)은 그대로 두고, 쪽으로 넘기는 것만 넘깁니다 */
let WHEEL_AT=0;
function readerWheel(e){
  if($('#reader').style.display!=='flex'||(P.wheel||'page')!=='page')return;
  const paged = (KIND==='epub'&&rend) || (KIND==='pdf'&&P.pnav==='page') || KIND==='comic';
  if(!paged)return;
  if(e.target&&e.target.closest&&e.target.closest('.pan, .sheet, #ttsbar'))return;
  if(KIND==='comic'&&P.cmode==='vert')return;            // 세로(웹툰) 보기는 굴립니다
  e.preventDefault();
  const now=Date.now(); if(now-WHEEL_AT<380||Math.abs(e.deltaY)<4)return; WHEEL_AT=now;
  e.deltaY>0?readNext():readPrev();
}
addEventListener('wheel',readerWheel,{passive:false});
/* 마우스 옆 단추 (뒤로 3 · 앞으로 4) — 브라우저 뒤로 가기를 막고 우리 일로 */
function readerSide(e){
  if($('#reader').style.display!=='flex')return;
  if(e.button!==3&&e.button!==4)return;
  const m=P.sidebtn||'page'; if(m==='off')return;
  e.preventDefault();
  if(m==='tts'){ if(e.button===4)ttsKey(); else if(TTS.on)ttsJump(-1); return; }
  e.button===4?readNext():readPrev();
}
addEventListener('mouseup',readerSide);
addEventListener('auxclick',e=>{ if($('#reader').style.display==='flex'&&(e.button===3||e.button===4)&&(P.sidebtn||'page')!=='off')e.preventDefault(); });
seg('#segWheel','wheel'); seg('#segSideBtn','sidebtn');
$('#keyShow').onclick=()=>{ const el=$('#keyHelp'); const on=el.style.display==='none';
  el.style.display=on?'block':'none'; el.textContent=KEYHELP.map(([a,b])=>a.padEnd(24,' ')+b).join('\n'); };

/* ══════════ v38 — 텍본 쓰레기 문구 · 이어 읽기 ══════════ */
function txtRepaint(msg){
  if(KIND!=='txt'){ return; }
  const h=$('#txt'), m0=h.scrollHeight-h.clientHeight, p=m0>0?h.scrollTop/m0:0;
  TXTC=''; paintTxtHl(); TOCS=null;
  const m1=h.scrollHeight-h.clientHeight; h.scrollTop=p*m1;
  paintJunkN();
  if(msg)toast(msg);
}
function paintJunkN(){
  const el=$('#junkN'); if(!el)return;
  if(KIND==='txt'&&P.junk){ txtShown(); el.textContent=TXTJN?`· 이 책에서 ${TXTJN}곳 ›`:'›'; }
  else el.textContent=(P.jpat&&P.jpat.length)?`· 넣은 문구 ${P.jpat.length}개 ›`:'›';
}
seg('#segJunk','junk',()=>{ txtRepaint(P.junk?'쓰레기 문구를 지우고 보여 드립니다\n(원본 파일은 그대로입니다)':'원문 그대로 보여 드립니다'); });
function paintJunkSheet(){
  if(KIND==='txt'&&P.junk){ txtShown(); $('#junkStat').textContent=`이 책에서 지운 곳: ${TXTJN}곳`; }
  else $('#junkStat').textContent=P.junk?'':'지금은 [그대로] 입니다. 설정판에서 [지우기] 를 고르면 적용됩니다.';
  const L=$('#junkList'); L.innerHTML='';
  const a=P.jpat||[];
  if(!a.length){ L.innerHTML='<div class="note">아직 없습니다.</div>'; }
  a.forEach((t,i)=>{ const r=document.createElement('div'); r.className='row';
    r.innerHTML=`<span>${esc(t)}</span>`; const x=document.createElement('button'); x.textContent='빼기';
    x.onclick=()=>{ P.jpat.splice(i,1); savePref(); jpStamp(); paintJunkSheet(); txtRepaint(); };
    r.append(x); L.append(r); });
  const C=$('#junkCand'); C.innerHTML='';
  if(KIND!=='txt'){ C.innerHTML='<div class="note">TXT 책을 연 상태에서 보입니다.</div>'; return; }
  const cs=junkCands();
  if(!cs.length){ C.innerHTML='<div class="note">되풀이되는 줄이 없습니다.</div>'; return; }
  cs.forEach(([t,c])=>{ const r=document.createElement('div'); r.className='row';
    r.innerHTML=`<span>${esc(t)} <i>${c}번</i></span>`; const b=document.createElement('button'); b.textContent='넣기';
    b.onclick=()=>junkAddText(t);
    r.append(b); C.append(r); });
}
function jpStamp(){ try{ localStorage.setItem('ebl_jpatat',String(Date.now())); }catch(e){} syncSoon(); }
function junkAddText(t){
  t=String(t||'').trim(); if(!t)return;
  if(/^\/.+\/[a-z]*$/.test(t)){ try{ const m=/^\/(.+)\/([a-z]*)$/.exec(t); new RegExp(m[1],m[2]); }
    catch(e){ toast('모양(/…/)이 바르지 않습니다\n'+e.message); return; } }
  else if(t.length<2){ toast('두 글자 이상 넣어 주세요'); return; }
  P.jpat=(P.jpat||[]).filter(x=>x!==t); P.jpat.push(t);
  if(!P.junk){ P.junk=1; segSet('#segJunk',1); }
  savePref(); jpStamp(); txtRepaint(); paintJunkSheet();
}
$('#junkOpen').onclick=()=>{ panOff(); paintJunkSheet(); $('#junkSheet').classList.add('on'); };
$('#junkClose').onclick=()=>$('#junkSheet').classList.remove('on');
$('#junkSheet').addEventListener('click',e=>{ if(e.target.id==='junkSheet')$('#junkSheet').classList.remove('on'); });
$('#junkAdd').onclick=()=>{ junkAddText($('#junkIn').value); $('#junkIn').value=''; };
$('#junkIn').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); $('#junkAdd').onclick(); } });

/* 앱을 열 때 읽던 책 이어서 — 받아둔 책은 바로, 아니면 단추로 (구글 로그인 창은 손으로 눌러야 뜹니다) */
seg('#segResume','resume');
function lastBook(){
  const byId=new Map(BOOKS.map(b=>[b.i,b]));
  let best=null, bt=0;
  Object.entries(RD).forEach(([id,r])=>{ if(!r||r.f||!r.t||r.t<=bt)return;
    const b=byId.get(id); if(!b||!kindOf(b))return; best=b; bt=r.t; });
  return best;
}
function resumeOffer(){
  if(!P.resume||resumeOffer.done)return; resumeOffer.done=true;
  if(location.hash.length>1||/[?&](inv|i|s)=/.test(location.search))return;   // 초대·공유 링크로 열었으면 건드리지 않습니다
  if($('#reader')&&$('#reader').style.display==='flex')return;
  const b=lastBook(); if(!b)return;
  if(saved.has(b.i)){ openBook(b); return; }
  $('#resumeT').textContent='이어 읽기 · '+(b.t||'읽던 책');
  $('#resumeBar').classList.add('on');
  clearTimeout(resumeOffer._t); resumeOffer._t=setTimeout(()=>$('#resumeBar').classList.remove('on'),15000);
  $('#resumeGo').onclick=()=>{ $('#resumeBar').classList.remove('on'); openBook(b); };
}
$('#resumeX').onclick=()=>$('#resumeBar').classList.remove('on');

/* ══════════ v37 — 책 소개 (YES24) ══════════
   앱이 YES24 에 직접 묻지 않습니다 — 키를 앱에 넣으면 안 되기 때문입니다 (YES24 약관).
   우리 Apps Script 웹앱(mode=y24)이 대신 묻고, 결과만 돌려줍니다. 키는 스크립트 속성에만.
   받은 소개는 이 창을 닫으면 버립니다 (쌓지 않음). 출처 'YES24' 와 상품 링크를 늘 함께 보입니다.
   ★ 웹앱을 새 버전으로 배포하기 전이면, 옛 웹앱이 모르는 mode 라 색인 전체(15MB)를 돌려보냅니다.
     그래서 512KB 가 넘게 오면 바로 끊고 '새 버전 배포' 를 안내합니다. */
async function y24Fetch(b){
  const base=checkUrl();
  const q=new URLSearchParams({ token:cfg('tok'), uid:ME.id||'', mode:'y24',
    isbn:String(b.k||'').replace(/[^0-9Xx]/g,''), t:(b._0&&b._0.t)||b.o||b.t||'', a:(b._0&&b._0.a)||b.a||'' });
  const ac=new AbortController(), tm=setTimeout(()=>ac.abort(),25000);
  const r=await fetch(base+(base.includes('?')?'&':'?')+q.toString(),{signal:ac.signal});
  if(!r.ok){ clearTimeout(tm); throw new Error('웹앱 응답 '+r.status); }
  const rd=r.body&&r.body.getReader?r.body.getReader():null; let txt='';
  if(rd){ const dec=new TextDecoder(); let n=0;
    for(;;){ const {done,value}=await rd.read(); if(done)break; n+=value.length; txt+=dec.decode(value,{stream:true});
      if(n>512*1024){ try{ ac.abort(); }catch(e){} clearTimeout(tm);
        throw new Error('웹앱이 아직 책 소개를 모릅니다.\nApps Script 에서 YES24 추가분을 붙이고\n배포 관리 → 새 버전으로 배포해 주세요'); } } }
  else txt=await r.text();
  clearTimeout(tm);
  let d; try{ d=JSON.parse(txt); }catch(e){ throw new Error('웹앱 응답을 읽지 못했습니다'); }
  if(d.error)throw new Error(d.error);
  return d;
}
async function showY24(b){
  busy(true,'YES24 에서 책 소개를 찾는 중…','',0);
  let d;
  try{ d=await y24Fetch(b); }
  catch(e){ busy(false); toast(e.name==='AbortError'?'응답이 너무 늦습니다':(e.message||e),6000); return; }
  busy(false);
  const el=$('#y24Body'); el.innerHTML='';
  if(!d.found){ el.innerHTML='<div class="note">YES24 에서 이 책을 찾지 못했습니다.<br>웹소설·스캔본은 없을 수 있습니다.</div>';
    $('#y24Sheet').classList.add('on'); return; }
  const it=d.item||{};
  const txt=s=>{ const t=document.createElement('textarea'); t.innerHTML=String(s||'').replace(/<br\s*\/?>/gi,'\n').replace(/<\/(p|div|li)>/gi,'\n').replace(/<[^>]*>/g,'');
    return t.value.replace(/\n{3,}/g,'\n\n').trim(); };
  const head=document.createElement('div'); head.className='yh';
  head.innerHTML=(it.cover?`<img src="${esc(it.cover)}" alt="" referrerpolicy="no-referrer">`:'')
    +`<div><b>${esc(txt(it.title))}</b>${it.sub?`<i>${esc(txt(it.sub))}</i>`:''}`
    +`<span>${esc([txt(it.author),txt(it.publisher),String(it.date||'').slice(0,10)].filter(Boolean).join(' · '))}</span>`
    +(d.conf&&d.conf!=='높음'?`<em>제목으로 찾은 것이라 다른 책일 수 있습니다</em>`:'')+'</div>';
  el.appendChild(head);
  const sec=(t,s,open)=>{ if(!s)return; const x=document.createElement('details'); if(open)x.open=true;
    x.innerHTML=`<summary>${t}</summary><div class="yt"></div>`; x.querySelector('.yt').textContent=txt(s); el.appendChild(x); };
  sec('책 소개',it.intro||it.summary,true);
  if(it.intro&&it.summary)sec('줄거리',it.summary,false);
  sec('목차',it.toc,false);
  const src=document.createElement('div'); src.className='ysrc';
  src.innerHTML=`자료: YES24 · <a href="${esc(it.link||'https://www.yes24.com')}" target="_blank" rel="noopener">YES24 에서 보기 ›</a>`;
  el.appendChild(src);
  $('#y24Sheet').classList.add('on');
}
$('#y24Close').onclick=()=>{ $('#y24Sheet').classList.remove('on'); $('#y24Body').innerHTML=''; };
$('#y24Sheet').addEventListener('click',e=>{ if(e.target.id==='y24Sheet')$('#y24Close').click(); });


/* ══════════ v36 — RAR · 7z (CBR · CB7) ══════════
   ZIP 과 달리 RAR·7z 는 '필요한 장만 받기' 가 안 됩니다 (목차가 앞에 있고, 대개 통째로 눌러 담김).
   그래서 통째로 받아 한 번에 풉니다. 아이패드 메모리를 생각해 300MB 까지만 엽니다.
   해제 도구는 libarchive (wasm) 입니다. 처음 RAR·7z 를 열 때만 받아 오고(약 0.7MB), 그 뒤로는 기기에 남습니다.
     libarchive-web.js  — npm libarchive-wasm 1.2.0 (MIT) 을 esbuild 로 한 파일로 묶은 것
     libarchive.wasm    — libarchive (BSD)
   ★ 7z 안의 한글 파일 이름은 깨져 보일 수 있습니다 (숫자 순서는 지켜집니다).
   ★ CBR 인데 속은 ZIP 이거나, CBZ 인데 속은 RAR 인 파일이 흔해서, 이름이 아니라 첫 몇 바이트로 가릅니다. */
const ARC_MAX=300*1048576;
let ARCMOD=null;
function loadArc(){
  if(ARCMOD)return ARCMOD;
  ARCMOD=new Promise((ok,ng)=>{
    if(window.LibArchive)return ok();
    const s=document.createElement('script'); s.src='./libarchive-web.js';
    s.onload=()=>ok(); s.onerror=()=>ng(new Error('해제 도구(libarchive-web.js)를 불러오지 못했습니다'));
    document.head.appendChild(s);
  }).then(()=>window.LibArchive.libarchiveWasm({locateFile:p=>new URL(p,location.href).href}));
  ARCMOD.catch(()=>{ ARCMOD=null; });
  return ARCMOD;
}
/* 첫 바이트로 종류 가르기 */
async function sniffArc(src){
  const h=await src.read(0,Math.min(8,src.size));
  if(h[0]===0x50&&h[1]===0x4b)return 'zip';
  if(h[0]===0x52&&h[1]===0x61&&h[2]===0x72&&h[3]===0x21)return 'rar';
  if(h[0]===0x37&&h[1]===0x7a&&h[2]===0xbc&&h[3]===0xaf)return '7z';
  return '';
}
/* 통째로 — 8MB 씩 나눠 받으며 진행을 보여 드립니다 */
async function readAll(src,label){
  if(src.mem)return src.mem;
  const out=new Uint8Array(src.size), CH=8*1048576;
  abort=new AbortController();
  for(let a=0;a<src.size;a+=CH){
    if(abort.signal.aborted)throw new Error('그만두었습니다');
    const z=Math.min(src.size,a+CH);
    out.set(await src.read(a,z),a);
    busy(true,label||'받는 중…',`${(z/1048576).toFixed(0)} / ${(src.size/1048576).toFixed(0)}MB`,z/src.size);
  }
  return out;
}
async function showArc(b,src,kind,parent){
  if(src.size>ARC_MAX)throw new Error(`${kind==='7z'?'7z':'RAR'} 는 통째로 받아 풀어야 해서 ${Math.round(src.size/1048576)}MB 는 너무 큽니다 (300MB 까지)`);
  busy(true,'해제 도구를 준비하는 중…','처음 한 번만 받습니다 (약 0.7MB)',0);
  const mod=await loadArc();
  const data=await readAll(src,(kind==='7z'?'7z':'RAR')+' 를 받는 중…');
  busy(true,'푸는 중…','',0); await new Promise(r=>setTimeout(r,30));
  const rd=new window.LibArchive.ArchiveReader(mod,new Int8Array(data.buffer,data.byteOffset,data.byteLength));
  const pages=[], books=[]; let k=0, enc=false, all=0;
  try{
    for(const e of rd.entries()){
      all++;
      const nm=e.getPathname()||'';
      if(e.getFiletype()!=='File')continue;
      if(/(^|\/)(__MACOSX|\.)/.test(nm))continue;
      if(e.isEncrypted()){ enc=true; continue; }
      const ext=((nm.match(/\.(\w+)$/)||[])[1]||'').toLowerCase();
      if(CIMG.test(nm)){ const d=e.readData(); if(d)pages.push({name:nm, blob:new Blob([d],{type:CMIME[ext]||'image/jpeg'})}); }
      else if(/^(txt|md|epub|pdf|zip|cbz)$/.test(ext)&&e.getSize()<200*1048576){
        const d=e.readData(); if(d)books.push({name:nm, us:e.getSize(), blob:new Blob([d])}); }
      if(++k%15===0){ busy(true,'푸는 중…',k+'개',0); await new Promise(r=>setTimeout(r,0)); }
    }
  } finally { try{ rd.free(); }catch(e){} }
  busy(false);
  log((kind||'압축')+' 열기: '+(b._fn||b.t)+' — '+all+'개, 그림 '+pages.length+', 책 '+books.length);
  if(!pages.length&&!books.length)throw new Error(enc?'암호가 걸린 압축은 아직 열 수 없습니다':'이 압축 안에는 열 수 있는 그림이나 책이 없습니다');
  if(!pages.length)return arcInner(b,books);
  pages.sort((x,y)=>EXCOLL.compare(x.name,y.name));
  return startComic(b,{arc:true},pages,parent);
}
/* RAR·7z 안의 책 고르기 — v41 부터 폴더 나무 (innerList) */
function arcInner(b,books){
  innerList(b, books.map(en=>({ name:en.name, us:en.us, open:items=>arcOpenOne(b,en,items) })));
}
async function arcOpenOne(b,en,items){
  $('#zipSheet').classList.remove('on');
  try{ busy(true,'꺼내는 중…',en.name.split('/').pop(),0);
    const buf=await en.blob.arrayBuffer(), ext=((en.name.match(/\.(\w+)$/)||[])[1]||'txt').toLowerCase();
    const nm=en.name.split('/').pop();
    const b2={ i:b.i+'#'+en.name, t:nm.replace(/\.\w+$/,''), _fn:nm, x:ext, f:b.f, z:Math.round(en.us/104857.6)/10 };
    innerMark(b,en.name,items);
    if(ext==='zip'||ext==='cbz'){ busy(false); return showComic(b2,memSrc(buf)); }
    busy(true,'화면을 구성하는 중…','',1);
    if(ext==='epub')await showReader(b2,buf); else if(ext==='pdf')await showPdf(b2,buf); else await showTxt(b2,buf);
    busy(false);
  }catch(e){ busy(false); toast('열지 못했습니다\n'+(e.message||e),5000); }
}


/* ══════════ v36 — 정보 틀림 · 진짜 표지 ══════════ */
function setWrong(b,v){
  WRONG[b.i]={v:v?1:0,t:Date.now()};
  try{ localStorage.setItem('ebl_wrong',JSON.stringify(WRONG)); }catch(e){}
  metaApply(); LASTEX=null; paintTabs(); render(true); syncSoon();
  toast(v?'이 책은 파일 이름으로 보여 드립니다.\n다른 기기에도 맞춰집니다':'찾은 책 정보로 되돌렸습니다');
}
/* 책 속 표지를 작게 줄여 기기에 담습니다 — 알라딘 표지가 엉뚱하거나 없을 때 진짜 얼굴이 보입니다 */
let coverSaveT=null;
function saveCover(id,url){
  if(!id||COVERS[id])return;
  const im=new Image();
  im.onload=()=>{ try{
      const w=240, h=Math.round(w*(im.naturalHeight||360)/(im.naturalWidth||240));
      const c=document.createElement('canvas'); c.width=w; c.height=Math.min(h,480);
      c.getContext('2d').drawImage(im,0,0,w,c.height);
      COVERS[id]=c.toDataURL('image/jpeg',0.78);
      clearTimeout(coverSaveT); coverSaveT=setTimeout(()=>{ DB.put('kv','covers',COVERS).catch(()=>{}); },1500);
    }catch(e){} };
  im.src=url;
}
DB.get('kv','covers').then(c=>{ if(c&&typeof c==='object'){ COVERS=Object.assign(c,COVERS);
  if(BOOKS.length&&$('#reader').style.display!=='flex'){ try{ render(true); }catch(e){} } } }).catch(()=>{});

