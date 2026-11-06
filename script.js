/* =====================================================
   CONFIGURACIÓN — aquí editas todo
   ===================================================== */
const CONFIG = {
  music: 'ASSETS/musica.mp3',
  volume: 0.30,
  sunriseSeconds: 14       // cuánto tarda la luz en llenar la pantalla
};

/* Una entrada por día. date = desde cuándo se desbloquea (AAAA-MM-DD). */
const LETTERS = [
  {
    day: 1,
    date: '2026-11-05',
    paragraphs: [
      'No soy mucho de decir esto y sé que a veces no sé muy bien qué aportar, pero te quiero, Nicole. Aprecio cada consejo que me das, aunque a lo mejor no parezca. Pienso que decirlo una vez ya es suficiente, pero claramente no siempre es así.',
      'Realmente te quiero. A ratos pienso que eres esa parte de la montaña que me parece linda... como te dije antes, resaltas a donde vayas o lo que hagas, y que estés aquí se siente así. Te quiero, Nicole, y perdón si no lo digo siempre.'
    ],
    sign: ''
  }
  /* ejemplo para mañana:
  ,{ day: 2, date: '2026-11-06', paragraphs: ['...'], sign: '— [tu nombre]' }
  */
];
/* ===================================================== */

const $ = id => document.getElementById(id);
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function todayStr(){
  const d = new Date(), p = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
}
function prettyDate(s){
  const [y,m,d] = s.split('-').map(Number);
  return `${d} de ${MESES[m-1]}, ${y}`;
}

const forced = parseInt(new URLSearchParams(location.search).get('dia'),10);
const unlocked = LETTERS
  .filter(l => forced ? l.day <= forced : l.date <= todayStr())
  .sort((a,b)=>a.day-b.day);
let current = unlocked.length - 1;

function fillSheet(letter){
  const s = $('sheet');
  s.innerHTML = '';
  const add = (t, cls) => { const p = document.createElement('p'); if (cls) p.className = cls; p.textContent = t; s.appendChild(p); };
  add(`Día ${letter.day} · ${prettyDate(letter.date)}`, 'meta');
  letter.paragraphs.forEach(t => add(t));
  if (letter.sign) add(letter.sign, 'sign');
}

/* =====================================================
   Destellos (partículas de luz al encajar cada pedazo)
   ===================================================== */
const fxCv = $('fx'), fxCtx = fxCv.getContext('2d');
let parts = [], fxRun = false, fxDpr = 1;
function fxResize(){
  fxDpr = Math.min(devicePixelRatio || 1, 2);
  fxCv.width = innerWidth * fxDpr; fxCv.height = innerHeight * fxDpr;
}
fxResize(); addEventListener('resize', fxResize);

function burst(x, y, n, spread){
  const now = performance.now();
  for (let i = 0; i < n; i++){
    const a = Math.random() * 6.283, sp = (.25 + Math.random() * 1.2) * spread;
    parts.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp - .3, r: .6 + Math.random()*1.9, born: now, life: 800 + Math.random()*1000 });
  }
  if (!fxRun){ fxRun = true; requestAnimationFrame(fxLoop); }
}
function fxLoop(now){
  fxCtx.clearRect(0, 0, fxCv.width, fxCv.height);
  fxCtx.globalCompositeOperation = 'lighter';
  parts = parts.filter(p => now - p.born < p.life);
  for (const p of parts){
    const t = (now - p.born) / p.life;
    p.x += p.vx; p.y += p.vy; p.vx *= .985; p.vy = p.vy * .985 - .004;
    const al = (1 - t) * (1 - t);
    const r = p.r * fxDpr * (1 - t * .4);
    fxCtx.beginPath(); fxCtx.arc(p.x * fxDpr, p.y * fxDpr, r * 3.2, 0, 6.283);
    fxCtx.fillStyle = `rgba(255,190,120,${al * .12})`; fxCtx.fill();
    fxCtx.beginPath(); fxCtx.arc(p.x * fxDpr, p.y * fxDpr, r, 0, 6.283);
    fxCtx.fillStyle = `rgba(255,236,190,${al * .95})`; fxCtx.fill();
  }
  if (parts.length) requestAnimationFrame(fxLoop);
  else { fxRun = false; fxCtx.clearRect(0, 0, fxCv.width, fxCv.height); }
}

/* =====================================================
   La hoja se rompe y se reconstruye como atraída por un imán
   ===================================================== */
let busy = false;

function polyArea(pts){
  let a = 0;
  for (let i = 0; i < pts.length; i++){
    const p = pts[i], q = pts[(i+1) % pts.length];
    a += p[0]*q[1] - q[0]*p[1];
  }
  return Math.abs(a) / 2;
}

function assemble(){
  const wrap = $('wrap'), sheet = $('sheet'), halo = $('halo'), sweep = $('sweep').firstElementChild;

  if (reduceMotion){
    sheet.style.visibility = 'visible';
    halo.style.opacity = .4;
    return;
  }
  busy = true;
  sheet.style.visibility = 'hidden';
  const W = sheet.offsetWidth, H = sheet.offsetHeight;

  const old = wrap.querySelector('.shards'); if (old) old.remove();
  const layer = document.createElement('div');
  layer.className = 'shards';
  wrap.appendChild(layer);

  /* --- trozos de forma y tamaño aleatorios (celdas de Voronoi): encajan exacto --- */
  const target = innerWidth < 600 ? 34 : 56;
  const minD = Math.sqrt(W * H / target) * .32;
  const seeds = [];
  let guard = 0;
  while (seeds.length < target && guard++ < 4000){
    const s = [Math.random() * W, Math.random() * H];
    if (seeds.every(q => Math.hypot(q[0]-s[0], q[1]-s[1]) > minD)) seeds.push(s);
  }
  const rect = [[0,0],[W,0],[W,H],[0,H]];
  const clip = (poly, a, b) => {
    const mx = (a[0]+b[0])/2, my = (a[1]+b[1])/2, nx = b[0]-a[0], ny = b[1]-a[1];
    const f = p => (p[0]-mx)*nx + (p[1]-my)*ny;
    const out = [];
    for (let i = 0; i < poly.length; i++){
      const p = poly[i], q = poly[(i+1) % poly.length], fp = f(p), fq = f(q);
      if (fp <= 0) out.push(p);
      if ((fp < 0 && fq > 0) || (fp > 0 && fq < 0)){
        const t = fp / (fp - fq);
        out.push([p[0] + (q[0]-p[0])*t, p[1] + (q[1]-p[1])*t]);
      }
    }
    return out;
  };
  const polys = seeds.map(a => {
    let poly = rect;
    for (const b of seeds){ if (b !== a){ poly = clip(poly, a, b); if (poly.length < 3) break; } }
    return poly;
  }).filter(p => p.length >= 3);

  /* --- animación de cada pedazo --- */
  const reach = Math.max(innerWidth, innerHeight);
  const T = (x, y, r, s) => `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${r.toFixed(1)}deg) scale(${s.toFixed(3)})`;
  const SH = (blur, alpha, col, b) => `drop-shadow(0 ${(blur/2).toFixed(1)}px ${blur}px rgba(${col},${alpha})) brightness(${b})`;
  const items = [];
  let totalMs = 0;

  polys.forEach(pts => {
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const bx = Math.floor(Math.min(...xs)) - 1, by = Math.floor(Math.min(...ys)) - 1;
    const bw = Math.ceil(Math.max(...xs)) - bx + 2, bh = Math.ceil(Math.max(...ys)) - by + 2;
    const gx = xs.reduce((s,v) => s+v, 0) / xs.length, gy = ys.reduce((s,v) => s+v, 0) / ys.length;
    const cx = gx - bx, cy = gy - by;

    const outer = document.createElement('div');
    outer.className = 'shard';
    outer.setAttribute('aria-hidden', 'true');
    outer.style.cssText = `left:${bx}px;top:${by}px;width:${bw}px;height:${bh}px;transform-origin:${cx}px ${cy}px;opacity:0;`;
    const inner = sheet.cloneNode(true);
    inner.removeAttribute('id');
    inner.style.cssText = `left:${-bx}px;top:${-by}px;width:${W}px;height:${H}px;visibility:visible;` +
      `clip-path:polygon(${pts.map(p => `${p[0]}px ${p[1]}px`).join(',')});`;
    outer.appendChild(inner);
    layer.appendChild(outer);

    /* velocidad: unos llegan rápido, otros lentos, como atraídos con distinta fuerza */
    const k = Math.random();
    const dur = k < .28 ? 1900 + Math.random()*900
              : k < .78 ? 3000 + Math.random()*1300
              :           4300 + Math.random()*1200;
    const dn = Math.hypot(gx - W/2, gy - H/2) / Math.hypot(W/2, H/2);
    const delay = (Math.random() * .6 + dn * .4) * 1700;   // el centro tiende a atraerse primero

    /* trayectoria curva */
    const ang = Math.random() * 6.283;
    const dist = reach * (.4 + Math.random() * .5);
    const sx = Math.cos(ang) * dist, sy = Math.sin(ang) * dist;
    const ux = -Math.cos(ang), uy = -Math.sin(ang);       // hacia su lugar
    const px = -uy, py = ux;                               // perpendicular
    const curv = (Math.random() - .5) * dist * .9;
    const R0 = (Math.random() - .5) * 620, s0 = .45 + Math.random() * 1.1;
    const ov = 6 + Math.random() * 10, un = 2 + Math.random() * 3;
    const rO = (Math.random() - .5) * 6, rU = (Math.random() - .5) * 2.4;

    const dark = '0,0,0', warm = '255,214,150';
    const kf = [
      { offset: 0,   transform: T(sx, sy, R0, s0),                                            opacity: 0, filter: SH(5, .35, dark, 1), easing: 'ease-out' },
      { offset: .12, transform: T(sx*.97 + px*curv*.08, sy*.97 + py*curv*.08, R0*.96, s0*1.04), opacity: 1, filter: SH(6, .35, dark, 1), easing: 'cubic-bezier(.45,0,.85,.55)' },
      { offset: .58, transform: T(sx*.3 + px*curv, sy*.3 + py*curv, R0*.28, (s0 + 1) / 2),    opacity: 1, filter: SH(10, .4, dark, 1), easing: 'cubic-bezier(.5,0,1,.75)' },
      { offset: .84, transform: T(ux*ov, uy*ov, rO, 1.025),                                    opacity: 1, filter: SH(16, .9, warm, 1.35), easing: 'cubic-bezier(.2,.7,.3,1)' },
      { offset: .93, transform: T(-ux*un, -uy*un, rU, .996),                                   opacity: 1, filter: SH(8, .4, warm, 1.12), easing: 'ease-in-out' },
      { offset: 1,   transform: 'translate(0px,0px) rotate(0deg) scale(1)',                    opacity: 1, filter: SH(0, 0, dark, 1) }
    ];
    const anim = outer.animate(kf, { duration: dur, delay, fill: 'both' });

    const land = delay + dur * .84;
    totalMs = Math.max(totalMs, delay + dur);
    items.push({ outer, anim, land, gx, gy, area: polyArea(pts) });
  });

  /* los que llegan más tarde quedan por encima de los que ya llegaron */
  items.slice().sort((a, b) => a.land - b.land).forEach((it, i) => { it.outer.style.zIndex = i + 1; });

  /* destello al encajar cada pedazo */
  items.forEach(it => {
    setTimeout(() => {
      const r = wrap.getBoundingClientRect();
      const n = Math.max(3, Math.min(11, Math.round(it.area / (W * H) * 420)));
      burst(r.left + it.gx, r.top + it.gy, n, 1);
    }, it.land);
  });

  /* aura de luz que crece mientras la carta se forma */
  halo.getAnimations().forEach(a => a.cancel());
  halo.animate([{ opacity: 0 }, { opacity: .85, offset: .82 }, { opacity: .45 }],
               { duration: totalMs, easing: 'ease-in', fill: 'forwards' });

  document.documentElement.style.overflow = 'hidden';
  Promise.all(items.map(it => it.anim.finished)).then(() => {
    sheet.style.visibility = 'visible';
    requestAnimationFrame(() => {
      layer.remove();
      document.documentElement.style.overflow = '';
      busy = false;
    });

    /* remate: pulso de luz, barrido brillante sobre el papel y pequeño asentamiento */
    halo.animate([{ opacity: .45 }, { opacity: 1, offset: .25 }, { opacity: .42 }],
                 { duration: 2200, easing: 'ease-out', fill: 'forwards' });
    sweep.animate([
      { transform: 'translateX(0) skewX(-12deg)', opacity: 0 },
      { opacity: 1, offset: .2 },
      { opacity: 1, offset: .8 },
      { transform: 'translateX(360%) skewX(-12deg)', opacity: 0 }
    ], { duration: 1900, easing: 'ease-in-out' });
    wrap.animate([
      { transform: 'rotate(-.6deg) scale(.985)' },
      { transform: 'rotate(-.6deg) scale(1.006)', offset: .5 },
      { transform: 'rotate(-.6deg) scale(1)' }
    ], { duration: 1500, easing: 'ease-out' });

    const r = wrap.getBoundingClientRect();
    for (let i = 0; i < 16; i++){
      setTimeout(() => burst(r.left + Math.random() * r.width, r.top + Math.random() * r.height, 3, .8), i * 90);
    }
  });
}

function showLetter(i){
  fillSheet(unlocked[i]);
  $('wrap').classList.add('show');
  $('prev').disabled = i === 0;
  $('next').disabled = i === unlocked.length - 1;
  $('nav').classList.toggle('show', unlocked.length > 1);
  requestAnimationFrame(assemble);
}

/* ---------- portada ---------- */
if (!unlocked.length){
  document.querySelector('.intro h1').textContent = 'Todavía no es el momento';
  $('openBtn').style.display = 'none';
} else {
  $('kicker').textContent = `Día ${unlocked[current].day}`;
}
$('openBtn').addEventListener('click', () => {
  $('intro').classList.add('gone');
  setTimeout(() => showLetter(current), 600);
});
$('prev').addEventListener('click', () => { if (!busy && current > 0){ current--; showLetter(current); } });
$('next').addEventListener('click', () => { if (!busy && current < unlocked.length-1){ current++; showLetter(current); } });

/* ---------- música: intenta sonar sola ---------- */
const audio = new Audio(CONFIG.music);
audio.loop = true; audio.preload = 'auto'; audio.volume = CONFIG.volume;
let wantMusic = true;
function updateBtn(){ $('musicBtn').textContent = (!audio.paused && wantMusic) ? '♪ on' : '♪ off'; }
async function tryPlay(){
  if (!wantMusic) return false;
  try { await audio.play(); updateBtn(); $('hint').classList.remove('show'); return true; }
  catch(e){ return false; }
}
const unlockEvents = ['pointerdown','click','keydown','touchend'];
function armFallback(){
  $('hint').classList.add('show');
  const handler = async () => {
    if (await tryPlay()) unlockEvents.forEach(ev => removeEventListener(ev, handler, true));
  };
  unlockEvents.forEach(ev => addEventListener(ev, handler, true));
}
$('musicBtn').addEventListener('click', e => {
  e.stopPropagation();
  if (!audio.paused){ wantMusic = false; audio.pause(); } else { wantMusic = true; tryPlay(); }
  updateBtn();
});
audio.addEventListener('error', () => { $('musicBtn').style.display = 'none'; $('hint').classList.remove('show'); });
(async () => { if (!(await tryPlay())){ updateBtn(); armFallback(); } })();

/* ---------- la luz llena la pantalla + estrellas ---------- */
(function dawn(){
  const ease = t => t < .5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2;
  const bg = $('bg'), glow = $('glow'), sky = $('sky');
  const start = performance.now();

  function apply(p){
    const H = Math.max(1, -8 + 190 * p);            // hasta dónde llega la luz (% de la pantalla)
    const k = Math.min(1, p * 1.6);
    const a = x => (x * k).toFixed(3);
    bg.style.background =
      `linear-gradient(to top, rgba(255,200,130,${a(.95)}) 0%, rgba(240,140,115,${a(.85)}) ${Math.max(1,H*.42)}%, rgba(150,130,190,${a(.7)}) ${Math.max(2,H*.82)}%, rgba(12,13,16,0) ${Math.max(3,H+28)}%), #0c0d10`;
    glow.style.opacity = Math.min(1, p * 1.6);
    sky.style.opacity = Math.max(0, 1 - p * 1.7);
  }
  function tick(now){
    const raw = Math.min(1, (now - start) / (CONFIG.sunriseSeconds * 1000));
    apply(ease(raw));
    if (raw < 1) requestAnimationFrame(tick);
  }
  if (reduceMotion) apply(.6); else requestAnimationFrame(tick);

  const ctx = sky.getContext('2d');
  let w, h, dpr, stars = [];
  function resize(){
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = sky.width = innerWidth * dpr; h = sky.height = innerHeight * dpr;
    const n = Math.round(innerWidth * innerHeight / 12000);
    stars = Array.from({length:n}, () => ({
      x: Math.random()*w, y: Math.random()*h*.8,
      r: (.3 + Math.random()) * dpr, a: .15 + Math.random()*.4,
      tw: Math.random()*6.28, ts: .3 + Math.random()*.8,
      vx: (Math.random()-.5)*.05*dpr, vy: -(.01 + Math.random()*.04)*dpr
    }));
  }
  resize(); addEventListener('resize', resize);
  let t = 0;
  (function frame(){
    t += .016; ctx.clearRect(0,0,w,h);
    for (const s of stars){
      if (!reduceMotion){ s.x += s.vx; s.y += s.vy; if (s.y < -5) s.y = h*.8; }
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283);
      ctx.fillStyle = `rgba(215,222,240,${s.a*(.6+.4*Math.sin(t*s.ts+s.tw))})`;
      ctx.fill();
    }
    requestAnimationFrame(frame);
  })();
})();
