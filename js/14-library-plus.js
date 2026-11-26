/* 우리 도서관 — js/14-library-plus.js  (v57, 서재 쪽)
   이 저자의 책 · 같은 시리즈 · 읽기 기록 자세히
   ※ 모든 파일이 같은 전역을 나눠 씁니다. index.html 에 적힌 순서(01 → 14)대로 불러와야 합니다. */

/* ══════════ v57 — 이 저자의 책 · 같은 시리즈 ══════════
   책 손질 창(표지 길게 누르기)에 '이 저자의 책 (n권)' · '같은 시리즈 (n권)'.
   시리즈 = 같은 저자 + 제목에서 권 번호(1권 · 제2권 · (상) · Ⅱ · 03 · - 12 …)를 뗀 이름이 같은 책들. */
const AU_ROLE=/\s*(지음|저|글|그림|옮김|역|편|엮음|편저|편역|감수|원작|외|공저|등)\s*$/;
function auKey(a){
  let x=nfc(a).split(/\s*[,/·;|]\s*/)[0]||''; x=x.replace(/\(.*?\)/g,' ');
  let y; while((y=x.replace(AU_ROLE,''))!==x)x=y;
  x=x.replace(/\s+/g,'').toLowerCase();
  return x.length>=2&&!/편집부$|편집팀$|^미상$/.test(x)?x:'';
}
function auName(a){ let x=(nfc(a).split(/\s*[,/·;|]\s*/)[0]||'').replace(/\(.*?\)/g,' ').trim(), y; while((y=x.replace(AU_ROLE,''))!==x)x=y; return x.trim(); }
const VOL_TAIL=/(\s*[-–—_.:]?\s*(\(|\[)?\s*(제\s*)?(\d{1,3}|[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]|[상중하]|[一二三四五六七八九十])\s*(권|부|편|화|집|巻)?\s*(\)|\])?\s*(완결|完)?\s*)$/;
function serBase(t){
  let s=nfc(t).replace(/\s*[-–—]\s*(완결|완|합본|개정판|특별판)\s*$/,'').trim();
  let prev; do{ prev=s; s=s.replace(VOL_TAIL,'').trim(); }while(s!==prev&&s.length>1);
  return s;
}
function volNo(t){
  const m=nfc(t).match(/(\d{1,3})\s*(권|부|편|화|집)?\s*[)\]]?\s*(완결)?\s*$/); if(m)return Number(m[1]);
  const r='ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ'.indexOf((nfc(t).match(/([ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ])\s*$/)||[])[1]); if(r>=0)return r+1;
  const h={'상':1,'중':2,'하':3}[(nfc(t).match(/[(\[]\s*([상중하])\s*[)\]]\s*$/)||[])[1]]; return h||999;
}
let AUX={sig:'',au:null,ser:null};
function auIndex(){
  const sig=BOOKS.length+'|'+(BOOKS[0]&&BOOKS[0].i)+'|'+(BOOKS[BOOKS.length-1]&&BOOKS[BOOKS.length-1].i);
  if(AUX.sig===sig)return AUX;
  const au=new Map(), ser=new Map();
  BOOKS.forEach(b=>{ const k=auKey(b.a||''); if(!k)return;
    (au.get(k)||au.set(k,[]).get(k)).push(b);
    const base=serBase(b.t||''); if(base.length<2)return;
    const sk=k+'#'+norm(base); (ser.get(sk)||ser.set(sk,[]).get(sk)).push(b); });
  AUX={sig,au,ser}; return AUX;
}
function serOf(b){ const k=auKey(b.a||''); if(!k)return null;
  const g=auIndex().ser.get(k+'#'+norm(serBase(b.t||''))); if(!g)return null;
  // 제목이 모두 같으면(형식만 다른 같은 책) 시리즈가 아님
  return new Set(g.map(x=>norm(x.t))).size>=2?g:null; }
function pbMore(b,add){
  const k=auKey(b.a||''); if(!k)return;
  const ab=auIndex().au.get(k)||[], sg=serOf(b);
  if(sg) add(`같은 시리즈 (${sg.length}권)`,serBase(b.t),()=>openSeries(b));
  if(ab.length>1) add(`이 저자의 책 (${ab.length}권)`,auName(b.a),()=>openAuthor(b));
}
function plRow(b){
  const st=stOf(b), pc=pctOf(b);
  const x=document.createElement('button'); x.className='plr'+(curB&&curB.i===b.i?' cur':'');
  const tag=st==='done'?'다 읽음':st==='stop'?'중단':st==='reading'?(pc>0?Math.round(pc*100)+'%':'읽는 중'):'';
  x.innerHTML=`<span class="t">${esc(b.t||'제목 없음')}</span><span class="m">${esc([(b.x||'').toUpperCase(),tag].filter(Boolean).join(' · '))}</span>`;
  x.onclick=()=>{ panOff(); setTimeout(()=>openPanBook(b),60); };
  return x;
}
function openBookList(title,sub,groups){
  $('#plT').textContent=title; $('#plS').textContent=sub||'';
  const body=$('#plBody'); body.innerHTML='';
  groups.forEach(g=>{ if(g.name){ const h=document.createElement('div'); h.className='plh'; h.textContent=g.name; body.appendChild(h); }
    g.books.forEach(b=>body.appendChild(plRow(b))); });
  pan('#panList',true);
}
function openSeries(b){
  const g=(serOf(b)||[b]).slice().sort((x,y)=>volNo(x.t)-volNo(y.t)||String(x.t).localeCompare(String(y.t),'ko'));
  const done=g.filter(x=>stOf(x)==='done').length;
  openBookList(serBase(b.t),`${auName(b.a)} · ${g.length}권${done?' · 다 읽음 '+done:''}`,[{name:'',books:g}]);
}
function openAuthor(b){
  const k=auKey(b.a||''), all=(auIndex().au.get(k)||[]).slice();
  const by=new Map(); all.forEach(x=>{ const base=norm(serBase(x.t||'')); (by.get(base)||by.set(base,[]).get(base)).push(x); });
  const groups=[], singles=[];
  [...by.values()].forEach(arr=>{ if(arr.length>=2&&new Set(arr.map(x=>norm(x.t))).size>=2)
      groups.push({name:serBase(arr[0].t)+` (${arr.length}권)`,books:arr.sort((x,y)=>volNo(x.t)-volNo(y.t))});
    else singles.push(...arr); });
  groups.sort((a,b)=>a.name.localeCompare(b.name,'ko'));
  singles.sort((x,y)=>String(x.t).localeCompare(String(y.t),'ko'));
  if(singles.length)groups.push({name:groups.length?'낱권':'',books:singles});
  const nm=auName(b.a);
  openBookList(nm,`${all.length}권${groups.length>1||(groups[0]&&groups[0].name!=='낱권'&&groups[0].name)?' · 시리즈 '+groups.filter(g=>g.name&&g.name!=='낱권').length:''}`,groups);
}
PANS.push('#panList');

/* ══════════ v57 — 읽기 기록 자세히 ══════════
   RS.d['날짜'] = { c:읽은 글자(추정), pg:PDF 쪽, ts:글 책(TXT·EPUB)을 읽은 초, n:읽은 횟수, ss:횟수들 합친 초, mx:가장 긴 한 번(초) }
   · 읽은 글자 = 진도가 앞으로 간 만큼 × 책 글자 수 (EPUB 은 위치 수 × 1600 으로 어림)
   · 한 번 = 손을 놓은 지 1분이 안 되게 이어 읽은 덩어리 (1분 넘게 읽은 것만 셈)
   이 기기에만 담습니다 (읽은 시간 달력 DAYS 는 따로 기기끼리 맞춤). */
let RS={d:{}}; try{ RS=JSON.parse(localStorage.getItem('ebl_rstat')||'{"d":{}}')||{d:{}}; if(!RS.d)RS.d={}; }catch(e){ RS={d:{}}; }
const saveRS=(()=>{ let t=null; const flush=()=>{ t=null;
  const ks=Object.keys(RS.d).sort(); while(ks.length>800)delete RS.d[ks.shift()];
  try{ localStorage.setItem('ebl_rstat',JSON.stringify(RS)); }catch(e){} };
  const f=()=>{ if(!t)t=setTimeout(flush,4000); }; f.now=()=>{ if(t)clearTimeout(t); flush(); }; return f; })();
addEventListener('pagehide',()=>{ try{ sesEnd(); saveRS.now(); }catch(e){} });
const rsDay=k=>RS.d[k]||(RS.d[k]={c:0,pg:0,ts:0,n:0,ss:0,mx:0});
function bookLen(){
  try{ if(KIND==='txt')return {c:TXTRAW.length};
    if(KIND==='epub'&&book&&book.locations&&book.locations.length){ const n=book.locations.length(); return n?{c:n*1600}:{}; }
    if(KIND==='pdf'&&pdfDoc)return {pg:pdfDoc.numPages}; }catch(e){}
  return {};
}
const _markRead57=markRead;
markRead=function(id,p,...rest){
  const before=RD[id]&&typeof RD[id].p==='number'?RD[id].p:null;
  const r=_markRead57.call(this,id,p,...rest);
  try{ if(curB&&curB.i===id&&!noMark&&before!=null&&RD[id]){ const d=(RD[id].p||0)-before;
      if(d>0&&d<0.2){ const L=bookLen(), day=rsDay(dkey());
        if(L.c){ day.c+=Math.round(d*L.c); } if(L.pg){ day.pg+=d*L.pg; } saveRS(); } } }catch(e){}
  return r;
};
let SES=null;
function sesEnd(){ if(!SES)return; if(SES.sec>=60){ const day=rsDay(SES.d); day.n++; day.ss+=SES.sec; day.mx=Math.max(day.mx,SES.sec); saveRS(); } SES=null; }
setInterval(()=>{
  const now=Date.now();
  const on=curB&&readerOn()&&!document.hidden&&!noMark&&(now-Math.max(ACT,(RD[curB.i]&&RD[curB.i].t)||0)<=IDLE);
  if(!on){ if(SES&&now-SES.last>60000)sesEnd(); return; }
  if(SES&&(SES.b!==curB.i||SES.d!==dkey()||now-SES.last>60000))sesEnd();
  if(!SES)SES={b:curB.i,d:dkey(),last:now,sec:0};
  SES.last=now; SES.sec+=15;
  if(KIND==='txt'||KIND==='epub'){ rsDay(SES.d).ts+=15; saveRS(); }
},15000);
const fmtC=c=>c>=10000?(c/10000).toFixed(c>=100000?0:1)+'만 자':Math.round(c).toLocaleString()+'자';
function paintRstat(){
  const el=$('#rstat'); if(!el)return;
  const pre=`${CALY}-${String(CALM+1).padStart(2,'0')}-`;
  const t={c:0,pg:0,ts:0,n:0,ss:0,mx:0,mxd:''};
  Object.entries(RS.d).forEach(([k,v])=>{ if(!k.startsWith(pre))return;
    t.c+=v.c||0; t.pg+=v.pg||0; t.ts+=v.ts||0; t.n+=v.n||0; t.ss+=v.ss||0; if((v.mx||0)>t.mx){ t.mx=v.mx; t.mxd=k; } });
  const sel=CALSEL&&CALSEL.startsWith(pre)?RS.d[CALSEL]:null;
  const spd=(c,ts)=>ts>=300&&c>0?Math.round(c/(ts/60)).toLocaleString()+'자':'';
  const line=(label,v)=>v?`<div class="rr"><span>${label}</span><b>${v}</b></div>`:'';
  if(!t.c&&!t.pg&&!t.n){ el.innerHTML='<div class="rh">읽기 기록</div><div class="note">이 달에 모인 기록이 아직 없습니다. 책을 읽어 나가면 읽은 양과 속도가 여기에 쌓입니다 (v57 부터, 이 기기만).</div>'; return; }
  el.innerHTML='<div class="rh">읽기 기록 · '+(CALM+1)+'월</div>'
    +line('읽은 글자 (어림)',t.c?fmtC(t.c):'')
    +line('읽는 속도 (분마다)',spd(t.c,t.ts))
    +line('PDF 쪽',t.pg>=1?Math.round(t.pg).toLocaleString()+'쪽':'')
    +line('읽은 횟수',t.n?t.n+'번 · 한 번에 평균 '+fmtDur(t.ss/t.n):'')
    +line('가장 길게 읽은 한 번',t.mx?fmtDur(t.mx)+(t.mxd?' ('+Number(t.mxd.slice(5,7))+'/'+Number(t.mxd.slice(8))+')':''):'')
    +(sel&&(sel.c||sel.n||sel.pg)?'<div class="rh" style="margin-top:8px">'+Number(CALSEL.slice(5,7))+'월 '+Number(CALSEL.slice(8))+'일</div>'
      +line('읽은 글자 (어림)',sel.c?fmtC(sel.c):'')+line('읽는 속도 (분마다)',spd(sel.c,sel.ts))
      +line('PDF 쪽',sel.pg>=1?Math.round(sel.pg)+'쪽':'')+line('읽은 횟수',sel.n?sel.n+'번 · 가장 길게 '+fmtDur(sel.mx):''):'')
    +'<div class="note" style="margin-top:6px">글자 수는 진도로 어림합니다 (EPUB 은 대략). 1분 넘게 이어 읽은 것을 한 번으로 셉니다. 이 기기의 기록만 보입니다.</div>';
}
const _paintCal57=paintCal;
paintCal=function(){ const r=_paintCal57.apply(this,arguments); try{ paintRstat(); }catch(e){ log('읽기 기록 실패: '+(e.message||e)); } return r; };
