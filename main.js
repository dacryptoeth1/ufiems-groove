/* UFIEM’S GROOVE — intro sequence + ambient atmosphere
 *
 * 1. A time-lapse of a flower blooming plays (muted, inline, once). It's tinted and screen-blended
 *    in CSS so its black background vanishes. Embers and a heartbeat glow rise behind it.
 * 2. The video's timeupdate cues each stage. As the bud opens, the name grows out of its centre:
 *    tiny, blurred and glowing at first, full size and sharp once the petals are open (--np, 0 → 1,
 *    is read from video.currentTime every frame so the growth is smooth).
 * 3. "COMING SOON" reveals letter by letter with a shimmer, then the tagline, the
 *    "Launch date — to be announced" teaser and the links.
 * 4. When the video ends it holds its last frame, the flower settles back and petals start to fall.
 *
 * Each stage is a class on <html> (styled in styles.css). With prefers-reduced-motion — or if the
 * video can't play — the page shows the final screen, still.
 */
(() => {
  'use strict';

  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const step = (name) => root.classList.add(name);
  const FINAL = ['is-video', 'is-emerge', 'is-named', 'is-title', 'is-tagline', 'is-announce', 'is-social', 'is-end'];

  const video = document.getElementById('bloom-video');
  const bloom = document.getElementById('bloom');

  /* Cue points, in seconds of *video* time (the clip is 15.6 s; it plays at RATE). */
  const RATE = 1.3;
  const CUES = {
    emerge: 1.6,   // the sepals start to split: the name begins to glow inside the bud
    named: 7.2,    // petals open: the name is full size and sharp
    title: 7.6,    // COMING SOON
    tagline: 9.4,
    announce: 10.8,
    social: 12.2,
  };
  const STALL_MS = 6000; // no progress for this long → give up and show the final screen

  /* ======================================================================
     COMING SOON: give every letter its slice of one shared gradient
     ====================================================================== */

  const letters = document.querySelector('.headline__letters');
  function measureHeadline() {
    if (!letters) return;
    letters.style.setProperty('--hw', `${letters.offsetWidth}px`);
    letters.querySelectorAll('.headline__word > span').forEach((s) => {
      s.style.setProperty('--x', s.offsetLeft);   // offsetParent is .headline__letters
    });
  }

  /* ======================================================================
     Embers + parallax (pointer and device tilt)
     ====================================================================== */

  const canvas = document.getElementById('fx');
  const ctx = canvas && canvas.getContext('2d');

  let W = 0, H = 0, DPR = 1;
  let embers = [];
  let t = 0, last = 0, raf = 0;
  let lastInput = -1e9;
  const par = { x: 0, y: 0, tx: 0, ty: 0 };
  const ptr = { x: -1e4, y: -1e4 };

  const sprite = (stops) => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    stops.forEach(([o, col]) => r.addColorStop(o, col));
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
    return c;
  };
  const SPRITES = [
    sprite([[0, 'rgba(255,246,255,1)'], [0.14, 'rgba(214,170,255,.9)'], [0.4, 'rgba(146,80,255,.25)'], [1, 'rgba(110,50,230,0)']]),
    sprite([[0, 'rgba(255,230,255,1)'], [0.12, 'rgba(232,140,255,.85)'], [0.42, 'rgba(170,60,230,.2)'], [1, 'rgba(120,30,200,0)']]),
  ];

  const makeEmber = (anywhere) => {
    const z = 0.2 + Math.random() * 0.8;
    return {
      x: Math.random() * W,
      y: anywhere ? Math.random() * H : H + rand(10, 60),
      z,
      vx: rand(-4, 4),
      vy: -rand(8, 26) * (0.4 + z * 0.6),
      px: 0, py: 0,                         // push from the pointer (decays)
      s: 2.5 + z * z * 10,
      a: 0.3 + z * 0.65,
      ph: Math.random() * Math.PI * 2,
      tw: rand(1.5, 4),                     // flicker speed
      sp: SPRITES[Math.random() < 0.3 ? 1 : 0],
    };
  };

  function resize() {
    if (!ctx) return;
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const n = Math.round(clamp((W * H) / 11000, 28, 120));
    while (embers.length < n) embers.push(makeEmber(true));
    embers.length = n;
  }

  function draw(dt) {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    const ox = par.x * 30, oy = par.y * 18;
    const wind = par.x * 14;               // tilt / pointer leans the column of embers
    for (const m of embers) {
      if (dt) {
        // Pointer: embers within ~140px drift away from it.
        const dx = m.x + ox * m.z - ptr.x, dy = m.y + oy * m.z - ptr.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 19600 && d2 > 1) {
          const f = (1 - Math.sqrt(d2) / 140) * 90 * dt;
          const d = Math.sqrt(d2);
          m.px += (dx / d) * f;
          m.py += (dy / d) * f;
        }
        m.px *= 1 - dt * 1.8;
        m.py *= 1 - dt * 1.8;
        m.x += (m.vx + wind * m.z + Math.sin(t * 0.6 + m.ph) * 7 + m.px) * dt;
        m.y += (m.vy + m.py) * dt;
        if (m.y < -30) Object.assign(m, makeEmber(false));
        if (m.x < -30) m.x = W + 30; else if (m.x > W + 30) m.x = -30;
      }
      // Fade out towards the top, flicker like a cinder.
      const life = clamp(m.y / (H * 0.35), 0, 1);
      const flick = 0.6 + 0.4 * Math.sin(t * m.tw + m.ph) * Math.sin(t * m.tw * 0.37 + m.ph * 2);
      ctx.globalAlpha = m.a * flick * life;
      ctx.drawImage(m.sp, m.x + ox * m.z - m.s / 2, m.y + oy * m.z - m.s / 2, m.s, m.s);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ---- Name emergence, read straight from the video clock each frame ---- */
  let emerging = false;
  let np = 0;
  function setNP(v) {
    np = v;
    if (bloom) bloom.style.setProperty('--np', v.toFixed(4));
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (!(dt > 0)) return;
    dt = Math.min(dt, 0.05);
    t += dt;

    if (emerging && video) {
      const p = smooth((video.currentTime - CUES.emerge) / (CUES.named - CUES.emerge));
      if (p > np) setNP(p);
    }

    // Idle drift when there's no pointer or tilt input.
    if (now - lastInput > 3500) {
      par.tx = Math.sin(t * 0.13) * 0.3;
      par.ty = Math.cos(t * 0.1) * 0.2;
    }
    const k = 1 - Math.exp(-dt * 2.6);
    par.x += (par.tx - par.x) * k;
    par.y += (par.ty - par.y) * k;
    root.style.setProperty('--px', par.x.toFixed(4));
    root.style.setProperty('--py', par.y.toFixed(4));

    if (ctx) draw(dt);
  }

  const startLoop = () => {
    if (raf || reducedMotion.matches || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const stopLoop = () => { cancelAnimationFrame(raf); raf = 0; };

  /* ---- Input ---- */
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    lastInput = performance.now();
    ptr.x = e.clientX;
    ptr.y = e.clientY;
    par.tx = (e.clientX / window.innerWidth) * 2 - 1;
    par.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
  document.addEventListener('mouseleave', () => { lastInput = -1e9; ptr.x = ptr.y = -1e4; });

  // Device tilt (phones). iOS asks permission, which must come from a tap.
  let tiltBase = null;
  function onTilt(e) {
    if (e.gamma == null || e.beta == null) return;
    if (tiltBase === null) tiltBase = e.beta;
    lastInput = performance.now();
    par.tx = clamp(e.gamma / 30, -1, 1);
    par.ty = clamp((e.beta - tiltBase) / 30, -1, 1);
  }
  if ('DeviceOrientationEvent' in window) {
    const DOE = window.DeviceOrientationEvent;
    if (typeof DOE.requestPermission === 'function') {
      const ask = () => {
        DOE.requestPermission().then((s) => {
          if (s === 'granted') window.addEventListener('deviceorientation', onTilt, { passive: true });
        }).catch(() => {});
      };
      window.addEventListener('pointerup', ask, { once: true });
    } else {
      window.addEventListener('deviceorientation', onTilt, { passive: true });
    }
  }

  /* ======================================================================
     Falling petals
     ====================================================================== */

  const petalLayer = document.getElementById('petals');
  let petalsOn = false;
  let activePetals = 0;

  function spawnPetal(delay = 0) {
    if (!petalLayer || !bloom || document.hidden) return;
    const r = bloom.getBoundingClientRect();
    const F = r.width;
    const unit = clamp(F / 480, 0.55, 1.25);

    // Start somewhere in the lower half of the flower head (centre ≈ 49% / 54% of the frame).
    const x0 = r.left + F * (0.49 + rand(-0.26, 0.26));
    const y0 = r.top + F * (0.55 + rand(-0.06, 0.14));
    const yEnd = window.innerHeight * rand(0.84, 0.98);
    const size = rand(18, 42) * unit;
    const drift = rand(-0.35, 0.35) * F;
    const amp = rand(16, 48) * unit;
    const cycles = rand(1.4, 2.6);
    const phase = rand(0, Math.PI * 2);
    const depth = rand(-120, 80);
    const dur = rand(7500, 12500) * clamp((yEnd - y0) / 600, 0.7, 1.4);

    const el = document.createElement('div');
    el.className = 'petal';
    el.style.width = `${size}px`;
    el.style.height = `${size * 1.4}px`;
    el.innerHTML = `<div class="petal__spin"><svg viewBox="0 0 100 140"><use href="#petal-${Math.random() < 0.55 ? 'a' : 'b'}"/></svg></div>`;
    petalLayer.appendChild(el);
    activePetals++;

    // Path: a short pause on the flower, then a drifting, swaying fall that slows as it lands.
    const N = 14;
    const fall = [];
    for (let i = 0; i <= N; i++) {
      const f = i / N;
      const g = f < 0.08 ? f * 0.2 : 0.016 + (f - 0.08) / 0.92 * 0.984;   // lingers, then falls
      const land = 1 - Math.pow(1 - g, 1.25);                             // eases onto the floor
      const sway = Math.sin(f * cycles * Math.PI * 2 + phase) * amp * (1 - f * 0.6);
      const x = x0 + drift * land + sway - size / 2;
      const y = y0 + (yEnd - y0) * land - size * 0.7;
      const z = depth + Math.sin(f * Math.PI * 1.5 + phase) * 40;
      const opacity = f < 0.06 ? f / 0.06 : f > 0.84 ? (1 - f) / 0.16 : 1;
      fall.push({ transform: `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px)`, opacity });
    }

    // Tumbling: rotations accumulate unevenly, then the petal settles almost flat on the floor.
    const spin = [];
    let rx = rand(-30, 30), ry = rand(-40, 40), rz = rand(0, 360);
    const vrz = rand(-260, 260), vrx = rand(200, 520) * (Math.random() < 0.5 ? -1 : 1), vry = rand(-300, 300);
    for (let i = 0; i <= N; i++) {
      const f = i / N;
      const settle = f > 0.86 ? (f - 0.86) / 0.14 : 0;
      const tx = rx + vrx * f + Math.sin(f * 9 + phase) * 30;
      spin.push({
        transform: `rotateZ(${(rz + vrz * f).toFixed(1)}deg) rotateX(${(tx * (1 - settle) + 72 * settle).toFixed(1)}deg) rotateY(${(ry + vry * f).toFixed(1)}deg)`,
      });
    }

    const opts = { duration: dur, delay, easing: 'linear', fill: 'both' };
    const a = el.animate(fall, opts);
    el.firstElementChild.animate(spin, opts);
    a.onfinish = () => { el.remove(); activePetals--; };
  }

  function startPetals() {
    if (petalsOn || reducedMotion.matches || !petalLayer) return;
    petalsOn = true;
    const small = window.innerWidth < 600;
    const burst = small ? 7 : 12;
    for (let i = 0; i < burst; i++) spawnPetal(rand(0, 4500) + i * 180);
    // Then a gentle, endless trickle.
    const max = small ? 9 : 14;
    (function trickle() {
      setTimeout(() => {
        if (!reducedMotion.matches && activePetals < max) spawnPetal();
        trickle();
      }, rand(2200, 5200));
    })();
  }

  /* ======================================================================
     Events
     ====================================================================== */

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); measureHeadline(); if (!raf && ctx) draw(0); }, 120);
  }, { passive: true });

  document.addEventListener('visibilitychange', () => (document.hidden ? stopLoop() : startLoop()));

  const onMotionPref = () => {
    if (reducedMotion.matches) {
      stopLoop();
      par.x = par.y = 0;
      root.style.setProperty('--px', '0');
      root.style.setProperty('--py', '0');
      finalScreen();
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
    const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
    return Promise.race([fonts, wait(2500)]);
  }

  let finished = false;
  // Final screen without the video: the last frame as a still, the name in place, nothing moving
  // except (when motion is allowed) the ambient layer and the petals.
  function finalScreen() {
    if (finished) return;
    finished = true;
    emerging = false;
    if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
    setNP(1);
    step('is-still');
    FINAL.forEach(step);
    if (reducedMotion.matches) {
      if (ctx) draw(0);          // one still frame of embers
    } else {
      startLoop();
      startPetals();
    }
  }

  // Resolves when the video ends — or errors, or stops making progress (slow network).
  function playedThrough() {
    return new Promise((resolve) => {
      let dog = 0;
      const done = (ok) => { clearTimeout(dog); resolve(ok); };
      const kick = () => { clearTimeout(dog); dog = setTimeout(() => done(false), STALL_MS); };
      video.addEventListener('timeupdate', kick);
      video.addEventListener('ended', () => done(true), { once: true });
      video.addEventListener('error', () => done(false), { once: true });
      kick();
    });
  }

  async function intro() {
    resize();
    await ready();
    measureHeadline();

    if (reducedMotion.matches || !video || !video.canPlayType('video/mp4')) return finalScreen();

    // Each stage fires once, the first time the video clock passes its cue.
    const pending = Object.entries(CUES).sort((a, b) => a[1] - b[1]);
    const onTime = () => {
      const now = video.currentTime;
      while (pending.length && now >= pending[0][1]) {
        const [cue] = pending.shift();
        if (cue === 'emerge') emerging = true;
        if (cue === 'named') { emerging = false; setNP(1); }
        step(`is-${cue}`);
      }
      if (!pending.length) video.removeEventListener('timeupdate', onTime);
    };
    video.addEventListener('timeupdate', onTime);
    const ended = playedThrough();

    step('is-video');               // bud fades up (its poster is the first frame); embers + heartbeat
    startLoop();
    video.playbackRate = RATE;
    try {
      await video.play();
    } catch (e) {
      return finalScreen();         // autoplay refused (e.g. Low Power Mode) → skip to the end
    }

    const ok = await ended;
    if (!ok) return finalScreen();

    // Make sure every stage happened, even if a timeupdate was skipped.
    emerging = false;
    setNP(1);
    FINAL.forEach(step);
    startPetals();                  // the bloom is done: petals begin to fall
  }

  intro();
})();
