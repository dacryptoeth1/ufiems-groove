/* UFIEM’S GROOVE — intro sequence + ambient atmosphere
 *
 * 1. The stem grows up out of the dark and a closed, black-and-purple rosebud rises onto it.
 * 2. The bud opens petal by petal in 3D (≈ 5s); the name grows out from inside the flower.
 * 3. The petals come loose and drift down. The stem and green sepals stay standing, just
 *    below the logo, so they never cross the lettering.
 * 4. "Coming Soon" writes itself in under the stem, then the tagline, then the contact links.
 * 5. Ambient motion takes over: floating violet motes, a breathing glow, gentle parallax.
 *
 * Each stage is a class on <html> (styled in styles.css); petals are animated with the
 * Web Animations API. With prefers-reduced-motion the page skips straight to the final
 * state with simple fades.
 */
(() => {
  'use strict';

  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const SVGNS = 'http://www.w3.org/2000/svg';

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const step = (name) => root.classList.add(name);
  const STAGES = ['is-stem', 'is-bloom', 'is-logo', 'is-fall', 'is-title', 'is-tagline', 'is-social', 'is-ambient'];

  /* ======================================================================
     The rose — 18 petals in three rings, posed with CSS 3D transforms
     ====================================================================== */

  const scenes = {
    back: document.getElementById('bloom-back'),   // inner ring + far side: behind the logo
    front: document.getElementById('bloom-front'), // near side: in front of the logo
  };
  const flowerEl = document.querySelector('.flower');

  /* Sizes in drawing units (the 1000-wide flower; inside a scene 1em = 100 units).
     lean: inward tilt when closed (deg) — tops converge into the bud's teardrop.
     open: outward tilt when bloomed (deg) — the outer ring curls back past horizontal.
     at / dur: ring timing in ms; each petal adds its own jitter so they peel one by one. */
  // cup / cupOpen: how far each half of the petal folds inward (deg) — tight in the bud, relaxed when open.
  const RINGS = [
    // hMin: shortest petal as a share of h; roll: diagonal tilt (deg) so wrapped edges cross the bud.
    { n: 5, h: 340, w: 150, r: 16, lean: 24, open: 26, rOpen: 30, cup: 34, cupOpen: 22, hMin: .95, roll: 6,  at: 2600, dur: 2400 }, // inner
    { n: 6, h: 365, w: 220, r: 36, lean: 14, open: 72, rOpen: 66, cup: 28, cupOpen: 14, hMin: .86, roll: 7,  at: 1250, dur: 2700 }, // middle
    { n: 7, h: 345, w: 265, r: 52, lean: 8,  open: 94, rOpen: 96, cup: 22, cupOpen: 8,  hMin: .74, roll: 10, at: 0,    dur: 3000 }, // outer
  ];

  // One petal's artwork in a 100 × 130 box: base at the bottom centre (50, 130), widest near
  // the top, with a soft wavy lip. Each petal gets its own jitter so no two are alike.
  function petalArt() {
    const j = (v, a) => +(v + rand(-a, a) * 0.6).toFixed(1);
    // Wavy top edge, right to left.
    const R = [j(93, 2), j(28, 3)];
    const t1 = [j(70, 3), j(6, 2.5)];
    const mid = [j(50, 2), j(5, 3)];
    const t2 = [j(30, 3), j(6, 2.5)];
    const L = [j(7, 2), j(28, 3)];
    const topEdge =
      `C${j(91, 2)} ${j(15, 3)} ${j(81, 3)} ${j(5, 2)} ${t1[0]} ${t1[1]} ` +
      `C${j(62, 2)} ${j(7, 2)} ${j(57, 2)} ${j(2, 2)} ${mid[0]} ${mid[1]} ` +
      `C${j(43, 2)} ${j(2, 2)} ${j(38, 2)} ${j(7, 2)} ${t2[0]} ${t2[1]} ` +
      `C${j(19, 3)} ${j(5, 2)} ${j(9, 2)} ${j(15, 3)} ${L[0]} ${L[1]}`;
    const outline =
      `M50 130 C${j(62, 2)} 126 ${j(79, 3)} ${j(112, 3)} ${j(87, 3)} ${j(92, 3)} ` +
      `C${j(96, 2)} ${j(72, 3)} ${j(99, 2)} ${j(47, 3)} ${R[0]} ${R[1]} ` +
      topEdge +
      ` C${j(1, 2)} ${j(47, 3)} ${j(4, 2)} ${j(72, 3)} ${j(13, 3)} ${j(92, 3)} ` +
      `C${j(21, 3)} ${j(112, 3)} ${j(38, 2)} 126 50 130Z`;
    // Rolled lip: the top edge plus a parallel curve a little lower, filled with a light gradient.
    const lip = `M${R[0]} ${R[1]} ${topEdge} ` +
      `C${L[0] + 4} ${L[1] - 2} ${t2[0]} ${t2[1] + 9} ${mid[0]} ${mid[1] + 8} ` +
      `C${t1[0]} ${t1[1] + 9} ${R[0] - 4} ${R[1] - 2} ${R[0]} ${R[1]}Z`;
    const rim = `M${R[0]} ${R[1]} ${topEdge}`;
    let veins = '';
    for (let i = 0; i < 7; i++) {
      const xe = 14 + i * 12 + rand(-3, 3);
      veins += `M50 127 Q${(50 + (xe - 50) * 0.35).toFixed(1)} ${j(72, 8)} ${xe.toFixed(1)} ${j(20, 6)} `;
    }
    return `<path d="${outline}" fill="url(#pt-body)"/>` +
      `<path d="${outline}" fill="url(#pt-sheen)"/>` +
      `<path class="pt-veins" d="${veins}"/>` +
      `<path d="${outline}" fill="url(#pt-cup)"/>` +
      `<path d="${outline}" fill="url(#pt-base)"/>` +
      `<path d="${lip}" fill="url(#pt-lip)"/>` +
      `<path class="pt-rim" d="${rim}"/>` +
      `<path class="pt-shade" d="${outline}"/>` +
      `<path class="pt-edge" d="${outline}"/>`;
  }

  // A petal is folded down its midline into two halves hinged in 3D, so it really cups.
  // Both halves show the same artwork through different halves of the viewBox.
  const petalHalves = (art) =>
    `<div class="ph ph--l"><svg viewBox="0 0 50 130" preserveAspectRatio="none" focusable="false">${art}</svg></div>` +
    `<div class="ph ph--r"><svg viewBox="50 0 50 130" preserveAspectRatio="none" focusable="false">${art}</svg></div>`;
  const fold = (deg) => [`rotateY(${(-deg).toFixed(2)}deg)`, `rotateY(${deg.toFixed(2)}deg)`];

  /* Every pose uses the same list of transform functions so keyframes interpolate cleanly:
       translate3d (world drift, for falling) → rotateY (place around the stem) → translateZ
       (ring radius) → rotateY (yaw: overlap/spiral) → rotateX (lean in / peel out) → rotateZ
       → tumble about the petal's middle → scale. */
  const pose = (q) =>
    `translate3d(${q.tx.toFixed(1)}px, ${q.ty.toFixed(1)}px, ${q.tz.toFixed(1)}px) ` +
    `rotateY(${q.az.toFixed(2)}deg) translateZ(${(q.r / 100).toFixed(3)}em) ` +
    `rotateY(${q.yaw.toFixed(2)}deg) rotateX(${q.tilt.toFixed(2)}deg) rotateZ(${q.roll.toFixed(2)}deg) ` +
    `translateY(${(-q.half / 100).toFixed(3)}em) rotateX(${q.ax.toFixed(1)}deg) rotateY(${q.ay.toFixed(1)}deg) ` +
    `rotateZ(${q.azz.toFixed(1)}deg) translateY(${(q.half / 100).toFixed(3)}em) scale(${q.s.toFixed(3)})`;

  const still = { tx: 0, ty: 0, tz: 0, ax: 0, ay: 0, azz: 0 };
  let petals = [];

  function buildBud() {
    RINGS.forEach((ring, ri) => {
      const offset = ri * (180 / ring.n) + rand(-8, 8);
      for (let i = 0; i < ring.n; i++) {
        const az = offset + (i * 360) / ring.n + rand(-7, 7);
        const front = ri > 0 && Math.cos(az * Math.PI / 180) > 0.05;
        const h = ring.h * rand(ring.hMin, 1.03);
        const w = ring.w * rand(0.92, 1.08);
        const el = document.createElement('div');
        el.className = 'petal3d';
        el.style.width = `${w / 100}em`;
        el.style.height = `${h / 100}em`;
        el.style.left = `${-w / 200}em`;
        // Petals turned away from the light are darker.
        el.style.setProperty('--shade', (0.08 + 0.32 * (1 - Math.cos(az * Math.PI / 180)) / 2).toFixed(2));
        el.innerHTML = petalHalves(petalArt());
        const halves = el.querySelectorAll('.ph');
        const p = {
          el, ring: ri, h, half: h / 2,
          halves,
          cup: ring.cup + rand(-4, 4),
          cupOpen: ring.cupOpen + rand(-4, 4),
          closed: { ...still, az, r: ring.r, yaw: rand(-8, 8), tilt: ring.lean + rand(-2, 2), roll: rand(-ring.roll, ring.roll), half: h / 2, s: 1 },
          open: {
            ...still,
            az: az + rand(-6, 6),
            r: ring.rOpen,
            yaw: rand(-8, 8),
            tilt: -(ring.open + rand(-8, 8)),
            roll: rand(-10, 10),
            half: h / 2,
            s: rand(1.04, 1.12),
          },
          at: ring.at + i * rand(110, 190) + rand(0, 160),
          dur: ring.dur * rand(0.9, 1.1),
        };
        el.style.transform = pose(p.closed);
        fold(p.cup).forEach((t, k) => { halves[k].style.transform = t; });
        scenes[front ? 'front' : 'back'].appendChild(el);
        petals.push(p);
      }
    });
  }

  // Each petal peels back on its hinge: it first loosens, then curls outward in 3D.
  function bloom() {
    for (const p of petals) {
      const c = p.closed, o = p.open;
      const mid = {
        ...still,
        az: c.az + (o.az - c.az) * 0.4,
        r: c.r + (o.r - c.r) * 0.35,
        yaw: c.yaw * 0.6 + o.yaw * 0.4,
        tilt: c.tilt + (o.tilt - c.tilt) * 0.38,
        roll: c.roll + (o.roll - c.roll) * 0.5,
        half: c.half,
        s: 1 + (o.s - 1) * 0.5,
      };
      const timing = { duration: p.dur, delay: p.at, easing: 'cubic-bezier(.42, 0, .3, 1)', fill: 'forwards' };
      p.el.animate([{ transform: pose(c) }, { transform: pose(mid), offset: 0.42 }, { transform: pose(o) }], timing);
      // The petal relaxes as it opens: its fold eases from a tight cup to a gentle curve.
      const a = fold(p.cup), b = fold(p.cupOpen);
      p.halves.forEach((h, k) => h.animate([{ transform: a[k] }, { transform: b[k] }], timing));
    }
  }

  // Petals let go — outer ring first — and drift down in 3D: swaying, tumbling slowly about
  // their middle, fading as they reach the ground. The stem and sepals stay standing.
  function fall() {
    const base = flowerEl.getBoundingClientRect();
    const baseY = base.top + base.height * 0.7923;
    const N = 20;
    const order = petals.slice().sort((a, b) => b.ring - a.ring || a.at - b.at);

    order.forEach((p, i) => {
      const o = p.open;
      const drop = window.innerHeight - baseY + base.width * 0.25;
      const side = Math.sin(o.az * Math.PI / 180) || rand(-1, 1);
      const dx = side * rand(40, 160) + rand(-40, 40);
      const dz = rand(-60, 120);
      const sway = rand(18, 46);
      const swayCycles = rand(1.2, 2.4);
      const spinX = rand(70, 220) * (Math.random() < 0.5 ? -1 : 1);
      const spinY = rand(90, 260) * (Math.random() < 0.5 ? -1 : 1);
      const spinZ = rand(30, 120) * (Math.random() < 0.5 ? -1 : 1);

      const frames = [];
      for (let k = 0; k <= N; k++) {
        const t = k / N;
        const ease = t * t * (1.6 - 0.6 * t); // drifts off gently, then settles into a slow fall
        frames.push({
          transform: pose({
            ...o,
            tx: dx * t + Math.sin(t * Math.PI * swayCycles) * sway,
            ty: drop * ease,
            tz: dz * t,
            ax: spinX * t,
            ay: spinY * t + Math.sin(t * Math.PI * 2) * 25,
            azz: spinZ * t,
          }),
          opacity: t < 0.72 ? 1 : 1 - (t - 0.72) / 0.28,
        });
      }
      const anim = p.el.animate(frames, {
        duration: rand(6500, 9000),
        delay: i * 150 + rand(0, 250),
        easing: 'linear',
        fill: 'forwards',
      });
      anim.finished.then(() => p.el.remove(), () => {});
    });
    petals = [];
  }

  /* ======================================================================
     Ambient atmosphere: floating motes + parallax (starts after the intro)
     ====================================================================== */

  const canvas = document.getElementById('fx');
  const ctx = canvas && canvas.getContext('2d');

  let W = 0, H = 0, DPR = 1;
  let motes = [];
  let t = 0, last = 0, raf = 0, ambientOn = false;
  let lastPointerMove = -1e9;
  const par = { x: 0, y: 0, tx: 0, ty: 0 };

  const MOTE = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(246,238,255,1)');
    r.addColorStop(0.16, 'rgba(204,168,255,.85)');
    r.addColorStop(0.42, 'rgba(140,82,255,.22)');
    r.addColorStop(1, 'rgba(110,50,230,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
    return c;
  })();

  const makeMote = () => {
    const z = 0.2 + Math.random() * 0.8;
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      z,
      vx: rand(-5, 5),
      vy: -rand(3, 13) * z,
      s: 3 + z * z * 11,
      a: 0.25 + z * 0.65,
      ph: Math.random() * Math.PI * 2,
      tw: rand(0.4, 1.6),
    };
  };

  function resize() {
    if (!ctx) return;
    DPR = Math.min(window.devicePixelRatio || 1, 1.5); // soft glows don't need retina density
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const n = Math.round(clamp((W * H) / 9000, 30, 140));
    while (motes.length < n) motes.push(makeMote());
    motes.length = n;
    for (const m of motes) { if (m.x > W) m.x = Math.random() * W; if (m.y > H) m.y = Math.random() * H; }
    if (!raf) draw(0);
  }

  function draw(dt) {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    const ox = par.x * 26, oy = par.y * 14;
    for (const m of motes) {
      if (dt) {
        m.x += (m.vx + Math.sin(t * 0.3 + m.ph) * 6) * dt;
        m.y += m.vy * dt;
        if (m.y < -20) { m.y = H + 20; m.x = Math.random() * W; }
        if (m.x < -20) m.x = W + 20; else if (m.x > W + 20) m.x = -20;
      }
      ctx.globalAlpha = m.a * (0.55 + 0.45 * Math.sin(t * m.tw + m.ph));
      ctx.drawImage(MOTE, m.x + ox * m.z - m.s / 2, m.y + oy * m.z - m.s / 2, m.s, m.s);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (!(dt > 0)) return;
    dt = Math.min(dt, 0.05);
    t += dt;

    // Idle drift when there's no mouse (touch devices, or a still pointer).
    if (now - lastPointerMove > 3500) {
      par.tx = Math.sin(t * 0.13) * 0.35;
      par.ty = Math.cos(t * 0.1) * 0.25;
    }
    const k = 1 - Math.exp(-dt * 2.4);
    par.x += (par.tx - par.x) * k;
    par.y += (par.ty - par.y) * k;
    root.style.setProperty('--px', par.x.toFixed(4));
    root.style.setProperty('--py', par.y.toFixed(4));

    draw(dt);
  }

  const startLoop = () => {
    if (!ctx || !ambientOn || raf || reducedMotion.matches || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  const stopLoop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };

  function startAmbient() {
    ambientOn = true;
    resize();
    startLoop();
  }

  /* ======================================================================
     Events
     ====================================================================== */

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    lastPointerMove = performance.now();
    par.tx = (e.clientX / window.innerWidth) * 2 - 1;
    par.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  document.addEventListener('mouseleave', () => { lastPointerMove = -1e9; });

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  }, { passive: true });

  document.addEventListener('visibilitychange', () => (document.hidden ? stopLoop() : startLoop()));

  const onMotionPref = () => {
    if (reducedMotion.matches) {
      stopLoop();
      par.x = par.y = 0;
      root.style.setProperty('--px', '0');
      root.style.setProperty('--py', '0');
      if (ctx) draw(0);
    } else {
      startLoop();
    }
  };
  if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', onMotionPref);
  else if (reducedMotion.addListener) reducedMotion.addListener(onMotionPref);

  // Stop single-finger drags and wheel scrolling from nudging the page (pinch-zoom still works).
  document.addEventListener('touchmove', (e) => { if (e.touches.length === 1) e.preventDefault(); }, { passive: false });
  window.addEventListener('wheel', (e) => { if (!e.ctrlKey) e.preventDefault(); }, { passive: false });

  /* ======================================================================
     Sequence
     ====================================================================== */

  function ready() {
    const img = document.querySelector('.logo img');
    const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
    const logo = img && img.decode ? img.decode().catch(() => {}) : Promise.resolve();
    return Promise.race([Promise.all([fonts, logo]), wait(2500)]);
  }

  async function intro() {
    await ready();

    const canAnimate = scenes.back && scenes.front && flowerEl && typeof Element.prototype.animate === 'function';
    if (reducedMotion.matches || !canAnimate) {
      STAGES.forEach(step);
      startAmbient();
      return;
    }

    buildBud();
    await new Promise((r) => requestAnimationFrame(r));

    step('is-stem');                // the stem grows and the closed bud rises onto it
    await wait(2900);
    step('is-bloom');               // the bud opens, petal by petal, in 3D (≈ 5s)
    bloom();
    await wait(1100);
    step('is-logo');                // the name grows out from inside the flower
    await wait(4500);
    step('is-fall');                // petals come loose and drift down; the stem stays
    fall();
    await wait(1500);
    step('is-title');               // "Coming Soon" under the stem
    await wait(1800);
    step('is-tagline');
    await wait(1200);
    step('is-social');
    step('is-ambient');             // floating particles + breathing glow
    startAmbient();
  }

  intro();
})();
