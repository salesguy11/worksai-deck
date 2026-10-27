'use strict';
/* html-proposal engine v1 — no eval, no network. Deck content lives only in #deck-data / #deck-assets. */
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rich=v=>esc(v).replace(/\n/g,'<br>').replace(/\{([^}]*)\}/g,'<span class="lt">$1</span>');
const D=JSON.parse($('#deck-data').textContent);
const ASSETS=JSON.parse(($('#deck-assets')||{textContent:'{}'}).textContent||'{}');
const META=D.meta||{},PAGES=D.pages||[],N=PAGES.length;
const INTERNAL=false; /* 내부 검토용 빌드 폐지: 근거 확인은 작성 단계에서 끝낸다 */
const H=location.hash,STATIC=/static/.test(H)||matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- catalog: field specs (max chars, required) ---------- */
const S=(max,req)=>({k:'s',max,req}),E=(vals)=>({k:'e',vals}),AR=(min,max,item)=>({k:'a',min,max,item});
const EV=E(['v','i','u']);
const COMMON={bg:E(['light','parch','dark']),ev:EV,notes:S(500),src:S(120)};
const CATALOG={
 cover:{eyebrow:S(40),title:S(16,1),subtitle:S(46,1),accent:S(90),org:S(40),image:S(40,1)},
 statement:{eyebrow:S(30),title:S(60,1),lead:S(130),badge:S(30),badgeEv:EV},
 section:{eyebrow:S(30),title:S(36,1),lead:S(140),chips:AR(0,6,S(22))},
 cards:{eyebrow:S(30),title:S(40,1),lead:S(110),badge:S(40),items:AR(2,4,{title:S(24,1),body:S(110,1),ev:EV})},
 metrics:{eyebrow:S(30),title:S(40,1),lead:S(110),items:AR(3,12,{value:S(10,1),unit:S(8),label:S(34,1),badge:S(18),ev:EV}),foot:S(110)},
 steps:{eyebrow:S(30),title:S(40,1),lead:S(110),items:AR(3,5,{title:S(22,1),body:S(100,1),ev:EV})},
 'feature-shot':{eyebrow:S(30),title:S(30,1),lead:S(100),points:AR(0,3,{text:S(60,1),ev:EV}),image:S(40,1),alt:S(140,1),side:E(['right','left'])},
 rows:{eyebrow:S(30),title:S(40,1),lead:S(110),rows:AR(2,8,{label:S(20,1),value:S(110,1)}),side:{value:S(8),unit:S(6),caption:S(40),notes:AR(0,3,S(50))}},
 timeline:{eyebrow:S(30),title:S(46,1),lead:S(110),aside:AR(0,2,{k:S(8,1),title:S(30,1),body:S(100,1)}),items:AR(3,6,{tag:S(8,1),badge:S(14),title:S(30,1),body:S(80,1)})},
 quotes:{eyebrow:S(30),title:S(40,1),columns:AR(1,2,{org:S(40,1),role:S(40),qa:AR(1,3,{q:S(60,1),a:S(230,1)})})},
 gallery:{eyebrow:S(30),title:S(40,1),lead:S(110),image:S(40,1),alt:S(140,1),caption:S(80)},
 video:{eyebrow:S(30),title:S(40,1),lead:S(110),file:S(80,1),poster:S(40),caption:S(80)},
 contact:{eyebrow:S(30),title:S(30,1),lead:S(100),rows:AR(1,6,{label:S(16,1),value:S(60,1),href:S(200)}),org:S(40),cta:{text:S(24,1),href:S(200,1)}}
};
const len=s=>Array.from(String(s)).length;
function chk(spec,v,path,errs){
 if(spec.k==='s'){ if(v==null||v===''){ if(spec.req)errs.push(path+' 필수값 누락'); return }
  if(typeof v!=='string')return errs.push(path+' 문자열이어야 함');
  if(len(v)>spec.max)errs.push(path+' '+len(v)+'자 > 상한 '+spec.max+'자') }
 else if(spec.k==='e'){ if(v!=null&&!spec.vals.includes(v))errs.push(path+' 허용값 '+spec.vals.join('/')) }
 else if(spec.k==='a'){ const a=v==null?[]:v; if(!Array.isArray(a))return errs.push(path+' 배열이어야 함');
  if(a.length<spec.min||a.length>spec.max)errs.push(path+' 개수 '+a.length+' (허용 '+spec.min+'~'+spec.max+')');
  a.forEach((it,j)=>{ if(spec.item.k){ chk(spec.item,it,path+'['+j+']',errs) } else { if(typeof it!=='object'||!it)return errs.push(path+'['+j+'] 객체여야 함'); for(const k in spec.item)chk(spec.item[k],it[k],path+'['+j+'].'+k,errs) } }) }
 else { if(v==null)return; if(typeof v!=='object')return errs.push(path+' 객체여야 함'); for(const k in spec)chk(spec[k],v[k],path+'.'+k,errs) }
}
function validate(){
 const errs=[];
 if(!META.title)errs.push('meta.title 누락');
 if(!N)errs.push('pages 비어 있음');
 PAGES.forEach((p,i)=>{
  const sp=CATALOG[p.type]; const P='p'+(i+1)+'('+p.type+')';
  if(!sp)return errs.push(P+' 알 수 없는 쪽 유형');
  const all=Object.assign({},COMMON,sp);
  for(const k in all)chk(all[k],p[k],P+'.'+k,errs);
  if(p.image&&!ASSETS[p.image])errs.push(P+'.image "'+p.image+'" 자산 없음');
 });
 
 return errs;
}
function unverified(){
 const out=[];
 const walk=(o,path)=>{ if(Array.isArray(o))o.forEach((x,j)=>walk(x,path+'['+j+']')); else if(o&&typeof o==='object'){ if(o.ev==='u'||o.badgeEv==='u')out.push(path); for(const k in o)walk(o[k],path+'.'+k) } };
 PAGES.forEach((p,i)=>walk(p,'p'+(i+1)));
 return out;
}
const dag=o=>(INTERNAL&&o&&o.ev==='u')?'<sup class="dag" title="근거 확인 필요">†</sup>':'';

/* ---------- renderers (stage coordinates 1920x1080) ---------- */
const chip=(cls)=>META.logos&&ASSETS[META.logos.main]&&ASSETS[META.logos.partner]?`<span class="lg ${cls}"><img src="${ASSETS[META.logos.main]}" alt="${esc(META.logos.mainAlt||'')}"><i></i><img src="${ASSETS[META.logos.partner]}" alt="${esc(META.logos.partnerAlt||'')}"></span>`:'';
const eb=p=>p.eyebrow?`<div class="eyebrow">${esc(p.eyebrow)}</div>`:'';
const head=p=>`<div class="hd">${eb(p)}<h1 class="h1">${rich(p.title)}${dag(p)}</h1>${p.lead?`<p class="lead">${rich(p.lead)}</p>`:''}</div>`;
const R={
 cover:p=>`<div class="cv-eb">${esc(p.eyebrow||'')}</div><h1 class="cv-t">${rich(p.title)}</h1><div class="cv-s">${rich(p.subtitle)}</div>${p.accent?`<div class="cv-a">${rich(p.accent)}</div>`:''}${p.org?`<div class="cv-o">${esc(p.org)}</div>`:''}${chip('cv-lg')}`,
 statement:p=>`<div class="body">${eb(p)}<h1 class="h1">${rich(p.title)}${dag(p)}</h1>${p.lead?`<p class="lead">${rich(p.lead)}</p>`:''}${p.badge?`<div><span class="badge">${esc(p.badge)}${INTERNAL&&p.badgeEv==='u'?'<sup class="dag">†</sup>':''}</span></div>`:''}</div>`,
 section:p=>`<div class="body">${eb(p)}<h1 class="h1">${rich(p.title)}</h1>${p.lead?`<p class="lead">${rich(p.lead)}</p>`:''}${(p.chips||[]).length?`<div class="chips">${p.chips.map(c=>`<span class="chip">${esc(c)}</span>`).join('')}</div>`:''}</div>`,
 cards:p=>`<div class="body">${head(p)}${p.badge?`<div><span class="badge" style="margin:0 0 36px">${esc(p.badge)}</span></div>`:''}<div class="cards" style="--n:${p.items.length}">${p.items.map((c,j)=>`<div class="card"><div class="ix">${String(j+1).padStart(2,'0')}</div><h3>${rich(c.title)}${dag(c)}</h3><p>${rich(c.body)}</p></div>`).join('')}</div></div>`,
 metrics:p=>{const n=p.items.length,c=n<=4?n:n<=6?3:n<=8?4:n===9?3:4,vs=n<=3?96:n<=6?76:n<=9?56:52;
  return `<div class="body">${head(p)}<div class="mgrid" style="--c:${c};--vs:${vs}px">${p.items.map(m=>`<div class="mt"><div class="mv">${num(m.value)}${m.unit?`<small>${esc(m.unit)}</small>`:''}${dag(m)}</div><div class="ml">${rich(m.label)}</div>${m.badge?`<span class="mb">${esc(m.badge)}</span>`:''}</div>`).join('')}</div>${p.foot?`<div class="mfoot">${esc(p.foot)}</div>`:''}</div>`},
 steps:p=>`<div class="body">${head(p)}<div class="srow">${p.items.map((s,j)=>(j?'<div class="sarr" aria-hidden="true">›</div>':'')+`<div class="scard"><span class="sn">${j+1}단계</span><h3>${rich(s.title)}${dag(s)}</h3><p>${rich(s.body)}</p></div>`).join('')}</div></div>`,
 'feature-shot':p=>`<div class="body"><div class="fs-text">${eb(p)}<h1 class="h1">${rich(p.title)}${dag(p)}</h1>${p.lead?`<p class="lead">${rich(p.lead)}</p>`:''}${(p.points||[]).length?`<ul class="pts">${p.points.map(x=>`<li>${rich(x.text)}${dag(x)}</li>`).join('')}</ul>`:''}</div><div class="fs-img"><img src="${ASSETS[p.image]||''}" alt="${esc(p.alt)}"></div></div>`,
 rows:p=>`<div class="body">${head(p)}<div class="rwrap"><div class="rtab">${p.rows.map(r=>`<div class="rrow"><span>${esc(r.label)}</span><b>${rich(r.value)}</b></div>`).join('')}</div>${p.side?`<aside class="rside"><div class="rbig">${num(p.side.value)}<small>${esc(p.side.unit||'')}</small></div><div class="rcap">${rich(p.side.caption||'')}</div>${(p.side.notes||[]).map(n=>`<div class="rnote">${rich(n)}</div>`).join('')}</aside>`:''}</div></div>`,
 timeline:p=>`<div class="body">${head(p)}<div class="tl">${(p.aside||[]).length?`<div class="tla">${p.aside.map(a=>`<div class="tlk"><div class="tlkk">${esc(a.k)}</div><h3>${rich(a.title)}</h3><p>${rich(a.body)}</p></div>`).join('')}</div>`:''}<ol class="tlist">${p.items.map(i=>`<li><span class="tg">${esc(i.tag)}</span><div><div class="tlh">${i.badge?`<em>${esc(i.badge)}</em>`:''}<h3>${rich(i.title)}</h3></div><p>${rich(i.body)}</p></div></li>`).join('')}</ol></div></div>`,
 quotes:p=>`<div class="body">${head(p)}<div class="qcols" style="--n:${p.columns.length}">${p.columns.map(c=>`<div class="qcol"><div class="qorg"><b>${esc(c.org)}</b>${c.role?`<span>${esc(c.role)}</span>`:''}</div>${c.qa.map(x=>`<div class="qa"><div class="qq">Q. ${esc(x.q)}</div><p>“${esc(x.a)}”</p></div>`).join('')}</div>`).join('')}</div></div>`,
 gallery:p=>`<div class="body">${head(p)}<div class="gal-card"><img src="${ASSETS[p.image]||''}" alt="${esc(p.alt)}"></div>${p.caption?`<div class="gal-cap">${esc(p.caption).replace(/\[([^\]]+)\]/g,'<em>$1</em>')}</div>`:''}</div>`,
 video:p=>`<div class="body">${head(p)}<div class="vid-card"><video controls preload="metadata" playsinline${p.poster&&ASSETS[p.poster]?` poster="${ASSETS[p.poster]}"`:''} src="${esc(p.file)}">영상을 재생할 수 없는 환경입니다.</video></div>${p.caption?`<div class="vid-cap">${esc(p.caption)}</div>`:''}</div>`,
 contact:p=>`<div class="body">${eb(p)}<h1 class="h1">${rich(p.title)}</h1>${p.lead?`<p class="lead">${rich(p.lead)}</p>`:''}<div class="crows">${p.rows.map(r=>`<div class="crow"><span>${esc(r.label)}</span><b>${r.href?`<a href="${esc(r.href)}">${esc(r.value)}</a>`:esc(r.value)}</b></div>`).join('')}</div>${p.cta?`<div><a class="cta" href="${esc(p.cta.href)}">${esc(p.cta.text)}</a></div>`:''}${p.org?`<div class="corg">${esc(p.org)}</div>`:''}${chip('ct-lg')}</div>`
};
const num=v=>{const s=String(v);return /^\d[\d,]*(\.\d+)?$/.test(s)?`<span class="num" data-to="${s.replace(/,/g,'')}" data-dec="${(s.split('.')[1]||'').length}" data-c="${s.includes(',')?1:0}">${esc(s)}</span>`:esc(s)};
const CYCLE=['light','parch','dark'];
const BGS=[];let cyc=0;
PAGES.forEach(p=>{ if(p.type==='cover'){BGS.push('cover');return} BGS.push(p.bg||CYCLE[cyc%3]);cyc++ });
let tiles=[];
function buildTiles(){
 tiles=PAGES.map((p,i)=>{
  const t=document.createElement('section');
  t.className='tile t-'+(p.type==='feature-shot'?'fs':p.type)+' bg-'+BGS[i]+(p.type==='feature-shot'&&p.side==='left'?' left':'');
  t.dataset.i=i; t.setAttribute('aria-label',(i+1)+'쪽');
  const foot=p.type==='cover'?'':`${p.src?`<div class="tsrc">출처: ${esc(p.src)}</div>`:''}<div class="tfoot">${(p.type==='contact'?'':chip('ft-lg'))||`<span>${p.type==='contact'?'':esc(META.brand||'')}</span>`}<span>${i+1} / ${N}</span></div>`;
  const amb=['statement','section','contact'].includes(p.type)?'<div class="amb"><i></i><i></i></div>':p.type==='cover'?'<div class="aur"><i></i><i></i><i></i><b></b></div>':'';
  t.innerHTML=amb+(p.type==='cover'?R.cover(p):R[p.type](p))+foot;
  return t;
 });
}
const RV='.eyebrow,.h1,.lead,.badge,.mfoot,.corg,.cta,.card,.mt,.scard,.sarr,.chip,.crow,.pts li,.fs-img,.gal-card,.gal-cap,.vid-card,.vid-cap,.rrow,.rside,.tlk,.tlist li,.qcol,.cv-lg,.ct-lg,.cv-eb,.cv-t,.cv-s,.cv-a,.cv-o';
function prepAnim(t){ if(STATIC)return; t.classList.add('anim');$$(RV,t).forEach((x,j)=>{x.classList.add('rv');x.style.setProperty('--i',j)}) }
function runCounts(t){ if(STATIC)return;
 $$('.num',t).forEach(el=>{ if(el.dataset.done)return;el.dataset.done=1;
  const to=+el.dataset.to,dec=+el.dataset.dec,cm=el.dataset.c==='1',fin=el.textContent;
  const f=n=>{let s=n.toFixed(dec);if(cm){const q=s.split('.');s=(+q[0]).toLocaleString('en-US')+(q[1]?'.'+q[1]:'')}return s};
  el.style.display='inline-block';el.style.minWidth=el.offsetWidth+'px';el.textContent=f(0);
  const t0=performance.now()+350,D=1500;
  (function st(now){const k=Math.max(0,Math.min(1,(now-t0)/D)),z=1-Math.pow(1-k,4);el.textContent=f(to*z);if(k<1)requestAnimationFrame(st);else el.textContent=fin})(performance.now());
 }) }
function resetCounts(t){ $$('.num',t).forEach(el=>{delete el.dataset.done}) }
const coverURL=()=>{const c=PAGES.find(p=>p.type==='cover');return c?ASSETS[c.image]:''};

/* ---------- doc mode ---------- */
let MODE='doc',CUR=0,prevCur=0;
function buildDoc(){
 const m=$('#doc');m.innerHTML='';
 tiles.forEach((t,i)=>{
  t.classList.remove('anim','in');$$('.rv',t).forEach(x=>x.classList.remove('rv'));t.style.transform='';resetCounts(t);prepAnim(t);
  const b=document.createElement('div');b.className='band bg-'+BGS[i];b.id='pg'+(i+1);
  if(BGS[i]==='cover')b.style.backgroundImage=`url("${coverURL()}")`;
  const w=document.createElement('div');w.className='tw';w.appendChild(t);b.appendChild(w);m.appendChild(b);
 });
 layoutDoc();observeDoc();
}
let IO=null;
function observeDoc(){
 if(IO)IO.disconnect();
 if(STATIC){$$('.tile',$('#doc')).forEach(t=>t.classList.add('in'));return}
 IO=new IntersectionObserver(es=>es.forEach(en=>{const t=$('.tile',en.target);if(!t)return;
  if(en.intersectionRatio>=.3){if(!t.classList.contains('in')){t.classList.add('in');runCounts(t)}}
  else if(en.intersectionRatio<=.02){t.classList.remove('in');resetCounts(t)}}),{threshold:[0,.02,.3,.6]});
 $$('.band',$('#doc')).forEach(b=>IO.observe(b));
}
function parallax(){
 if(MODE!=='doc')return;
 const vh=innerHeight;
 $$('.band',$('#doc')).forEach(b=>{const r=b.getBoundingClientRect();if(r.bottom<0||r.top>vh)return;const p=(r.top+r.height/2-vh/2)/vh;b.firstChild.firstChild.style.setProperty('--py',(p*-46).toFixed(1)+'px')});
 const pr=$('#gprog');if(pr){const m=document.documentElement.scrollHeight-vh;pr.style.width=(m>0?scrollY/m*100:0)+'%'}
}
let pt=0;function onScroll(){if(pt)return;pt=requestAnimationFrame(()=>{pt=0;parallax()})}
function layoutDoc(){
 if(MODE!=='doc')return;
 const vw=document.documentElement.clientWidth,s=Math.min(vw/1920,1.3);
 $$('.band',$('#doc')).forEach(b=>{b.style.height=Math.round(1080*s)+'px';const w=$('.tw',b);w.style.width=Math.round(1920*s)+'px';w.style.height=Math.round(1080*s)+'px';$('.tile',w).style.transform='scale('+s+')'});
}

/* ---------- presentation mode ---------- */
let hideT=0;
function fitPres(){
 if(MODE!=='pres')return;
 const vw=innerWidth,vh=innerHeight,s=Math.min(vw/1920,vh/1080),t=$('.pst .tile');
 if(t)t.style.transform=`translate(${(vw-1920*s)/2}px,${(vh-1080*s)/2}px) scale(${s})`;
}
function showPres(i){
 CUR=Math.max(0,Math.min(N-1,i));
 const pst=$('.pst'),t=tiles[CUR],pres=$('#pres');
 pst.innerHTML='';pst.appendChild(t);
 pres.className='bg-'+BGS[CUR];
 pres.style.backgroundImage=BGS[CUR]==='cover'?`url("${coverURL()}")`:'';
 t.classList.remove('in','anim');$$('.rv',t).forEach(x=>x.classList.remove('rv'));resetCounts(t);
 if(!STATIC){prepAnim(t);void t.offsetWidth;t.classList.add('in');runCounts(t);pst.classList.remove('go-n','go-p');void pst.offsetWidth;pst.classList.add(CUR>=prevCur?'go-n':'go-p')}
 prevCur=CUR;
 fitPres();
 $('#pcnt').textContent=(CUR+1)+' / '+N;
 const nt=$('#pnotes');nt.textContent=PAGES[CUR].notes||'';if(!PAGES[CUR].notes)nt.classList.remove('on');
 history.replaceState(null,'','#pres/'+(CUR+1)+(STATIC?'/static':''));
}
function enterPres(i){
 MODE='pres';document.documentElement.classList.add('pres');document.body.classList.add('pres');
 showPres(i==null?CUR:i);pingCtl();
}
function exitPres(){
 const i=CUR;MODE='doc';document.documentElement.classList.remove('pres');document.body.classList.remove('pres');
 $('#ov').classList.remove('on');$('#pnotes').classList.remove('on');
 buildDoc();history.replaceState(null,'','#doc/'+(i+1)+(STATIC?'/static':''));
 const b=$('#pg'+(i+1));if(b)b.scrollIntoView({block:'start'});
}
function pingCtl(){const c=$('#pctl');c.classList.add('show');clearTimeout(hideT);hideT=setTimeout(()=>c.classList.remove('show'),2600)}
function openOv(){
 const ov=$('#ov');ov.innerHTML=`<h2>${esc(META.title)}</h2><div class="ovg">${PAGES.map((p,i)=>`<button class="ovc" data-i="${i}"><em>${i+1}</em>${esc(p.title||p.eyebrow||p.type).replace(/\{|\}/g,'')}</button>`).join('')}</div>`;
 ov.classList.add('on');$$('.ovc',ov).forEach(b=>b.onclick=()=>{ov.classList.remove('on');showPres(+b.dataset.i)});
}

/* ---------- boot ---------- */
function boot(){
 const errs=validate();
 if(errs.length){document.body.innerHTML=`<div class="errbox"><b>자료 설정을 확인해 주세요</b>${errs.slice(0,14).map(esc).join('<br>')}</div>`;window.__deck={validate:()=>errs,errors:errs};return}
 document.title=META.title;
 document.documentElement.lang=META.lang||'ko';
 const warn=INTERNAL?unverified().length:0;
 $('#app').innerHTML=`<header id="gnav"><div class="gn-in"><strong>${esc(META.title)}</strong><span class="gn-sp"></span>${INTERNAL&&warn?`<span class="gn-warn">내부 검토용 · 근거 확인 필요 ${warn}건 (†)</span>`:''}<button class="gn-btn" id="bPres">발표 모드</button></div><i id="gprog"></i></header><main id="doc"></main><div id="pres"><div class="pst"></div></div><div id="pctl"><button data-a="prev" aria-label="이전 쪽">‹</button><span id="pcnt"></span><button data-a="next" aria-label="다음 쪽">›</button><button data-a="ov">쪽 목록</button><button data-a="exit">문서 보기</button></div><div id="pnotes" aria-live="polite"></div><div id="ov" role="dialog" aria-label="쪽 목록"></div>`;
 buildTiles();
 const m=H.match(/^#(pres|doc)(?:\/(\d+))?/);
 CUR=m&&m[2]?Math.max(0,Math.min(N-1,+m[2]-1)):0;
 buildDoc();
 $('#bPres').onclick=()=>enterPres(currentDocPage());
 $('#pctl').onclick=e=>{const a=e.target.dataset&&e.target.dataset.a;if(a==='prev')showPres(CUR-1);else if(a==='next')showPres(CUR+1);else if(a==='ov')openOv();else if(a==='exit')exitPres()};
 $('#pres').addEventListener('click',e=>{if(e.target.closest('a,button'))return;showPres(CUR+1)});
 addEventListener('mousemove',()=>{if(MODE==='pres')pingCtl()});
 addEventListener('resize',()=>{layoutDoc();fitPres()});
 addEventListener('keydown',onKey);
 addEventListener('scroll',onScroll,{passive:true});
 addEventListener('mousemove',tilt);
 parallax();
 if(m&&m[1]==='pres')enterPres(CUR);
 else if(m&&m[2]){const b=$('#pg'+(CUR+1));if(b)b.scrollIntoView({block:'start'})}
 window.__deck={validate,errors:[],unverified,pages:N,mode:()=>MODE,cur:()=>CUR,enterPres,exitPres,showPres,tiles:()=>tiles,bgs:BGS};
}
function tilt(ev){
 const f=ev.target.closest&&ev.target.closest('.fs-img');
 $$('.fs-img img').forEach(im=>{ if(!f||!f.contains(im)){im.style.setProperty('--rx','0deg');im.style.setProperty('--ry','0deg');return}
  const r=im.getBoundingClientRect(),x=(ev.clientX-r.left)/r.width-.5,y=(ev.clientY-r.top)/r.height-.5;
  im.style.setProperty('--ry',(x*9).toFixed(2)+'deg');im.style.setProperty('--rx',(-y*7).toFixed(2)+'deg')})
}
function currentDocPage(){
 const y=scrollY+60;let k=0;$$('.band',$('#doc')).forEach((b,i)=>{if(b.offsetTop<=y)k=i});return k;
}
function onKey(e){
 if(e.target.matches&&e.target.matches('input,textarea,select'))return;
 const k=e.key;
 if(MODE==='pres'){
  if($('#ov').classList.contains('on')){if(k==='Escape'){$('#ov').classList.remove('on')}return}
  if(k==='ArrowRight'||k==='PageDown'||k===' '||k==='Enter'){e.preventDefault();showPres(CUR+1)}
  else if(k==='ArrowLeft'||k==='PageUp'||k==='Backspace'){e.preventDefault();showPres(CUR-1)}
  else if(k==='Home')showPres(0);else if(k==='End')showPres(N-1);
  else if(/^[oO]$/.test(k)||k==='o')openOv();
  else if(/^[nN]$/.test(k))$('#pnotes').classList.toggle('on',!!PAGES[CUR].notes&&!$('#pnotes').classList.contains('on'));
  else if(k==='Escape')exitPres();
  pingCtl();
 } else if(/^[pP]$/.test(k)&&!e.metaKey&&!e.ctrlKey){enterPres(currentDocPage())}
}
boot();
