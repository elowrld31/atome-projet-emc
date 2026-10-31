(function(){
  const screens=[...document.querySelectorAll('.screen')];
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Images : chargées si le fichier existe, sinon cadre de remplacement ---------- */
  document.querySelectorAll('figure.photo[data-src]').forEach(f=>{
    const img=new Image();img.alt=f.querySelector('figcaption').textContent;
    img.onload=()=>{const fr=f.querySelector('.frame');fr.innerHTML='';fr.appendChild(img);};
    img.src=f.dataset.src;
  });

  /* ITER : on essaie plusieurs extensions (png, svg, jpg, jpeg, webp) */
  function tryLoad(base,ok){
    const exts=['png','svg','jpg','jpeg','webp'];let k=0;
    const img=new Image();
    img.onload=()=>ok(img);
    img.onerror=()=>{k++;if(k<exts.length)img.src=base+'.'+exts[k];};
    img.src=base+'.'+exts[0];
  }
  document.querySelectorAll('img[data-try]').forEach(el=>{
    tryLoad(el.dataset.try,img=>{el.src=img.src;el.hidden=false;});
  });
  document.querySelectorAll('figure.photo[data-try]').forEach(f=>{
    tryLoad(f.dataset.try,img=>{img.alt=f.querySelector('figcaption').textContent;const fr=f.querySelector('.frame');fr.innerHTML='';fr.appendChild(img);});
  });

  /* ---------- Frise ---------- */
  const ERAS={
    hist:[["1896","Becquerel"],["1898","Curie"],["1945","Hiroshima"],["1970","Nucléaire civil"],["1986 · 2011","Accidents"]],
    deb:[["2022","Débat public"],["2023","Loi"],["2026","PPE3"]]
  };
  const frise=document.getElementById('frise'),ticks=document.getElementById('ticks'),fill=document.getElementById('fill');
  let curEra=null;
  function buildEra(e){
    ticks.innerHTML='';const list=ERAS[e];
    list.forEach((t,i)=>{
      const b=document.createElement('button');b.className='tick';b.tabIndex=-1;
      b.style.left=(list.length===1?50:(i/(list.length-1))*100)+'%';
      b.innerHTML=`<i></i>${t[0]} <span>· ${t[1]}</span>`;
      b.onclick=()=>{const s=screens.find(x=>x.dataset.era===e&&+x.dataset.tick===i);if(s)go(screens.indexOf(s));};
      ticks.appendChild(b);
    });
  }
  function setFrise(s){
    const e=s.dataset.era;
    if(!e){frise.classList.add('off');return;}
    if(e!==curEra){buildEra(e);curEra=e;}
    frise.classList.remove('off');
    const k=+s.dataset.tick,n=ERAS[e].length;
    [...ticks.children].forEach((t,i)=>{t.classList.toggle('past',i<k);t.classList.toggle('now',i===k);});
    fill.style.width=(n===1?0:(k/(n-1))*100)+'%';
  }

  /* ---------- Étapes ---------- */
  const stepState=new Map();
  function steps(s){return [...s.querySelectorAll('.step')];}
  function lit(s,n){stepState.set(s,n);steps(s).forEach((el,i)=>el.classList.toggle('lit',i<n));}
  screens.filter(s=>s.hasAttribute('data-steps')).forEach(s=>lit(s,1));

  /* ---------- Navigation ---------- */
  const count=document.getElementById('count'),bar=document.getElementById('bar');
  let cur=0,target=null,arrive=null;
  function current(){
    let best=0,bd=Infinity;
    screens.forEach((s,i)=>{const d=Math.abs(s.getBoundingClientRect().top);if(d<bd){bd=d;best=i;}});
    return best;
  }
  function render(){
    count.textContent=String(cur+1).padStart(2,'0')+' / '+screens.length;
    bar.style.width=(cur/(screens.length-1))*100+'%';
    setFrise(screens[cur]);
  }
  function update(){if(target===null)cur=current();render();}
  function go(i){
    i=Math.max(0,Math.min(screens.length-1,i));
    cur=i;target=i;render();
    screens[i].scrollIntoView({behavior:reduce?'auto':'smooth'});
    clearTimeout(arrive);arrive=setTimeout(()=>{target=null;update();},reduce?60:900);
  }
  function next(){
    const s=screens[cur];
    if(s.hasAttribute('data-steps')){const n=stepState.get(s),tot=steps(s).length;if(n<tot){lit(s,n+1);return;}}
    go(cur+1);
  }
  function prev(){
    const s=screens[cur];
    if(s.hasAttribute('data-steps')){const n=stepState.get(s);if(n>1){lit(s,n-1);return;}}
    go(cur-1);
  }
  let t=null;addEventListener('scroll',()=>{cancelAnimationFrame(t);t=requestAnimationFrame(update);},{passive:true});
  addEventListener('resize',()=>{if(target===null)screens[cur].scrollIntoView();update();});
  document.getElementById('next').onclick=next;document.getElementById('prev').onclick=prev;

  /* Écran plus haut que la fenêtre (téléphone) : on laisse défiler normalement jusqu'au bord */
  function scrollsInside(dir){
    const r=screens[cur].getBoundingClientRect();
    if(r.height<=innerHeight+4)return false;
    return dir>0?r.bottom>innerHeight+4:r.top<-4;
  }

  /* ---------- Molette / pavé tactile : un geste = un écran ---------- */
  let wheelAcc=0,wheelLock=false,wheelIdle=null;
  addEventListener('wheel',e=>{
    if(!document.getElementById('ov').hidden||e.ctrlKey)return;
    let dy=Math.abs(e.deltaY)>=Math.abs(e.deltaX)?e.deltaY:e.deltaX;
    if(e.deltaMode===1)dy*=16;else if(e.deltaMode===2)dy*=innerHeight;
    const dir=Math.sign(dy);if(!dir)return;
    if(target===null&&!wheelLock&&scrollsInside(dir))return;
    e.preventDefault();
    clearTimeout(wheelIdle);wheelIdle=setTimeout(()=>{wheelLock=false;wheelAcc=0;},200);
    if(wheelLock)return;
    wheelAcc+=dy;
    if(Math.abs(wheelAcc)>=40){wheelLock=true;wheelAcc=0;dir>0?next():prev();}
  },{passive:false});

  /* ---------- Doigt : glisser vers le haut = écran suivant ---------- */
  let ty=null,tx=null,native=false;
  addEventListener('touchstart',e=>{
    if(!document.getElementById('ov').hidden||e.touches.length>1){ty=null;return;}
    ty=e.touches[0].clientY;tx=e.touches[0].clientX;native=false;
  },{passive:true});
  addEventListener('touchmove',e=>{
    if(ty===null)return;
    const dy=ty-e.touches[0].clientY,dir=Math.sign(dy);
    if(native||(target===null&&scrollsInside(dir))){native=true;return;}
    if(e.cancelable)e.preventDefault();
  },{passive:false});
  addEventListener('touchend',e=>{
    if(ty===null)return;
    const p=e.changedTouches[0],dy=ty-p.clientY,dx=tx-p.clientX;ty=null;
    if(native||Math.abs(dy)<50||Math.abs(dy)<Math.abs(dx))return;
    dy>0?next():prev();
  },{passive:true});

  const ov=document.getElementById('ov');
  addEventListener('keydown',e=>{
    if(!ov.hidden){if(e.key==='Escape')closeOv();return;}
    if(e.target.matches('input,textarea'))return;
    if(['ArrowDown','ArrowRight','PageDown',' ','Enter'].includes(e.key)){if(e.key==='Enter'&&e.target.closest('button,a'))return;e.preventDefault();next();}
    else if(['ArrowUp','ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();prev();}
    else if(e.key==='Home'){e.preventDefault();go(0);}
    else if(e.key==='End'){e.preventDefault();go(screens.length-1);}
  });

  /* ---------- Réacteur ---------- */
  const PARTS={
    combustible:["Combustible","Des noyaux d'uranium 235. Un neutron les casse : ils libèrent de l'énergie et d'autres neutrons."],
    barres:["Barres de contrôle","Elles absorbent des neutrons. Le but : qu'un seul provoque la fission suivante. Teste avec le curseur."],
    eau:["Eau","Elle ralentit les neutrons, de 20 000 km/s à 2 km/s, pour que la réaction continue. Et elle emporte la chaleur."],
    cuve:["Cuve","Un récipient en acier épais. Elle enferme le cœur et protège des radiations."],
    primaire:["Circuit primaire","L'eau reste liquide grâce à une pression de 155 atmosphères. Elle tourne en boucle fermée."],
    gv:["Générateur de vapeur","La chaleur passe dans un second circuit. L'eau bout, la vapeur fait tourner la turbine."],
    plasma:["Plasma","Deutérium et tritium chauffés à 150 millions de degrés. À cette température, les noyaux fusionnent."],
    aimants:["Aimants","Refroidis à −269 °C. Ils forment une « bouteille magnétique » qui empêche le plasma de toucher les parois."],
    chambre:["Chambre à vide","L'anneau où circule le plasma. Même la fusion produit des déchets radioactifs."],
    solenoide:["Bobine centrale","Une partie du système magnétique, au centre de l'anneau. Schéma simplifié."]
  };
  const DEF={fission:["Réacteur à eau pressurisée","Le modèle des 56 réacteurs français. Le principe : chauffer de l'eau pour faire de la vapeur."],
             fusion:["ITER · Cadarache","35 pays. Un réacteur de recherche : il ne produira pas d'électricité. Phase deutérium-tritium prévue en 2039."]};
  const panel=document.getElementById('panel');
  function show(tag,t){panel.innerHTML=`<div class="tag">${tag}</div><h4>${t[0]}</h4><p>${t[1]}</p>`;}
  function clearOn(){document.querySelectorAll('.hot.on').forEach(e=>e.classList.remove('on'));}
  let mode='fission';
  document.querySelectorAll('.hot').forEach(g=>{
    const f=()=>{clearOn();g.classList.add('on');show(mode==='fission'?'Fission':'Fusion',PARTS[g.dataset.part]);};
    g.addEventListener('click',f);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();f();}});
  });
  const tf=document.getElementById('t-fis'),tu=document.getElementById('t-fus');
  function setMode(m){mode=m;clearOn();tf.setAttribute('aria-selected',m==='fission');tu.setAttribute('aria-selected',m==='fusion');
    document.getElementById('svg-fission').toggleAttribute('hidden',m!=='fission');document.getElementById('svg-fusion').toggleAttribute('hidden',m!=='fusion');
    document.getElementById('ctrl').hidden=m!=='fission';document.getElementById('iterbox').hidden=m!=='fusion';show(m==='fission'?'Fission':'Fusion',DEF[m]);}
  tf.onclick=()=>setMode('fission');tu.onclick=()=>setMode('fusion');
  let lastFocus=null;
  function openOv(m){lastFocus=document.activeElement;setMode(m);ov.hidden=false;document.documentElement.style.overflow='hidden';document.getElementById('ovclose').focus();}
  function closeOv(){ov.hidden=true;document.documentElement.style.overflow='';if(lastFocus)lastFocus.focus();}
  document.querySelectorAll('[data-open]').forEach(b=>b.onclick=e=>{e.stopPropagation();openOv(b.dataset.open);});
  document.getElementById('ovclose').onclick=closeOv;

  const slider=document.getElementById('rodslider'),rods=document.querySelectorAll('#rods rect'),light=document.getElementById('core-light'),st=document.getElementById('rodstate');
  function rod(){const v=+slider.value;rods.forEach(r=>r.setAttribute('height',60+v*2.2));light.style.opacity=Math.max(.05,Math.min(1,1.25-v/80));light.classList.toggle('breathe',v<95);
    st.textContent=v>=80?'Sous-critique : la réaction s\'éteint. Arrêt du réacteur.':v>=35?'Critique : réaction stable. Fonctionnement normal.':'Sur-critique : la réaction s\'accélère. La sûreté doit intervenir.';}
  slider.addEventListener('input',rod);rod();setMode('fission');

  update();
})();
