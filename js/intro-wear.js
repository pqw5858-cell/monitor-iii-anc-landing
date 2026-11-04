/* ================= film grain ================= */
(() => {
  const g = document.getElementById("grain"), tiles = [];
  try {
    for (let n = 0; n < 4; n++) {
      const c = document.createElement("canvas"); c.width = c.height = 180;
      const x = c.getContext("2d"), id = x.createImageData(180, 180), d = id.data;
      for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255 | 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
      x.putImageData(id, 0, 0); tiles.push(`url(${c.toDataURL()})`);
    }
  } catch (e) { return; }
  g.style.backgroundImage = tiles[0];
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let k = 0;
  setInterval(() => { k = (k + 1) % tiles.length; g.style.backgroundImage = tiles[k]; g.style.backgroundPosition = `${Math.random() * 180 | 0}px ${Math.random() * 180 | 0}px`; }, 140);
})();

/* ================= intro particles ================= */
const Intro = (() => {
  const cv = document.getElementById("introCv"), ctx = cv.getContext("2d");
  const glow = document.createElement("canvas"), gctx = glow.getContext("2d");
  const track = document.getElementById("intro"), copy = document.getElementById("introCopy");
  let W = 0, H = 0, DPR = 1, P = [], box = null, lbox = null, ready = false, target = 0, prog = 0, visible = true, small = false, glints = [];
  // intro colour: "silver" or "brass" (particles + waves)
  const INTRO_TONE = "silver";
  const TONES = { brass: { base: [226, 188, 122], wave: [[128, 88, 42], [205, 164, 92], [248, 226, 176]] }, silver: { base: [206, 211, 218], wave: [[104, 108, 115], [182, 187, 195], [238, 240, 244]] } };
  const TONE = TONES[INTRO_TONE], BRASS = TONE.wave;
  const rng = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  function build() {
    DPR = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight;
    if (!W || !H || !productImg.naturalWidth) return;
    cv.width = W * DPR; cv.height = H * DPR; glow.width = Math.ceil(W / 4); glow.height = Math.ceil(H / 4);
    const R = rng(7); small = W < 720; const nb = small ? 22 : 18;
    const pitch = Math.min(W * (small ? .86 : .54), 1040) / (small ? 22 : 34), barsW = pitch * nb, bw = pitch * .56;
    const segH = Math.max(5, pitch * .32), segP = segH * 1.55, baseY = H * (small ? .6 : .66);
    const maxSegs = Math.floor((H * (small ? .32 : .46)) / segP), x0 = (W - barsW) / 2 + (pitch - bw) / 2, sub = small ? 2 : 4;
    const cells = [], bars = [];
    for (let i = 0; i < nb; i++) {
      const t = i / (nb - 1), env = .3 + .7 * Math.pow(Math.sin(Math.PI * t), .9);
      const hmax = Math.max(3, Math.round(maxSegs * env * (.45 + .55 * R())));
      bars.push({ hmax, w1: 2 + R() * 4, w2: 5 + R() * 6, ph: R() * 6.28 });
      for (let k = 0; k < hmax; k++) cells.push({ i, k, x: x0 + i * pitch, y: baseY - k * segP - segH });
    }
    const pw = bw / sub, ph = segH / sub, parts = [];
    for (const c of cells) for (let a = 0; a < sub; a++) for (let b = 0; b < sub; b++) parts.push({ bar: c.i, k: c.k, bx: c.x + a * pw, by: c.y + b * ph, bw: pw, bh: ph });
    const scale = Math.min(H * (small ? .44 : .58) / productImg.height, (W * (small ? .7 : .4)) / productImg.width);
    const iw = productImg.width * scale, ih = productImg.height * scale;
    box = { x: (W - iw) / 2, y: (H - ih) / 2 + H * .04, w: iw, h: ih };
    const lw = Math.min(W * (small ? .9 : .5), iw * 2.1), lh = lw * heroLogoImg.height / Math.max(1, heroLogoImg.width);
    lbox = { x: (W - lw) / 2, y: box.y + ih * .19 - lh / 2, w: lw, h: lh };
    Object.assign(logoEl.style, { left: lbox.x + "px", top: lbox.y + "px", width: lw + "px", height: lh + "px" });
    glints = Array.from({ length: small ? 18 : 36 }, () => ({ rb: (R() * RIBBONS.length) | 0, u: (R() - .5) * 1.8, sp: .006 + R() * .012, ph: .15 + R() * .7, r: .7 + R() * 1.3, tw: R() * 6.28 }));
    const off = document.createElement("canvas"), sw = Math.max(1, Math.round(iw)), sh = Math.max(1, Math.round(ih));
    off.width = sw; off.height = sh;
    const o = off.getContext("2d", { willReadFrequently: true }); o.drawImage(productImg, 0, 0, sw, sh);
    const d = o.getImageData(0, 0, sw, sh).data, pool = [];
    for (let y = 0; y < sh; y += 2) for (let x = 0; x < sw; x += 2) { const q = (y * sw + x) * 4; if (d[q + 3] > 140) pool.push({ x: box.x + x, y: box.y + y, lum: (d[q] * .3 + d[q + 1] * .55 + d[q + 2] * .15) / 255 }); }
    for (let i = pool.length - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0; [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const m = Math.min(W, H);
    P = parts.map((p, n) => { const ang = R() * Math.PI * 2, dist = m * (.08 + Math.pow(R(), .7) * .62), tg = pool[n % pool.length];
      return { ...p, dx: clamp(p.bx + Math.cos(ang) * dist * 1.25, 8, W - 8), dy: clamp(p.by + Math.sin(ang) * dist, 8, H - 8), tx: tg.x, ty: tg.y, lum: tg.lum, r1: R(), r2: R(), fw: .4 + R() * .9, fp: R() * 6.28, sz: .9 + R() * 1.1 }; });
    P.bars = bars; ready = true;
  }
  // hero logo (SVG above the canvas): pen strokes in writing order reveal the filled logo
  const logoEl = document.getElementById("heroLogo"), pens = [...logoEl.querySelectorAll(".pens path")], logoAll = logoEl.querySelector(".all");
  // scroll ranges (share of the intro track): logo writes over WRITE, product fades in over SHOW
  const WRITE = [.66, .93], SHOW = [.89, .97];
  // hero photos fade in: [start, length, delay between photos]
  const photos = [...document.querySelectorAll(".hero-photos img")], PHOTOS = [.89, .07, .015];
  const lens = pens.map(p => p.getTotalLength()), total = lens.reduce((a, b) => a + b, 0), starts = lens.map((_, i) => lens.slice(0, i).reduce((a, b) => a + b, 0));
  pens.forEach((p, i) => { p.style.strokeDasharray = lens[i]; p.style.strokeDashoffset = lens[i]; });
  let lastW = -1;
  function writeLogo(w) {
    if (Math.abs(w - lastW) < .0005) return; lastW = w;
    logoEl.classList.toggle("on", w > 0);
    const done = w * total;
    pens.forEach((p, i) => { p.style.strokeDashoffset = lens[i] * (1 - clamp((done - starts[i]) / lens[i])); });
    logoAll.style.opacity = String(clamp((w - .94) / .06));
  }
  // hero product hover: leans toward the mouse and brightens slightly (mouse only)
  const stage = cv.parentElement;
  const hov = { x: 0, y: 0, in: false, k: 0, ox: 0, oy: 0 };
  stage.addEventListener("pointermove", e => { if (e.pointerType !== "mouse" || !box) return; const r = cv.getBoundingClientRect();
    hov.x = e.clientX - r.left; hov.y = e.clientY - r.top; hov.in = hov.x > box.x && hov.x < box.x + box.w && hov.y > box.y && hov.y < box.y + box.h; });
  stage.addEventListener("pointerleave", () => { hov.in = false; });
  function read() { const r = track.getBoundingClientRect(); target = clamp(-r.top / Math.max(1, track.offsetHeight - innerHeight)); visible = r.bottom > 0 && r.top < innerHeight; }
  /* hero waves: twisted ribbons of fine lines (ex-hero.png) */
  // amp/spread: share of screen height · freq/tw: cycles across the width · mid: where the swell peaks
  const RIBBONS = [
    { dy: 0, amp: .31, freq: 4.2, sp: .5, mid: .5, spread: .085, tw: 2.6, tsp: .35, lines: 80, a: .15, ph: 0, flip: false },
    { dy: .02, amp: .22, freq: 3.1, sp: -.35, mid: .42, spread: .065, tw: 1.9, tsp: -.28, lines: 60, a: .12, ph: 2.1, flip: true },
    { dy: -.03, amp: .15, freq: 5.6, sp: .62, mid: .6, spread: .045, tw: 3.4, tsp: .42, lines: 40, a: .1, ph: 4.3, flip: false },
    { dy: .05, amp: .26, freq: 2.4, sp: .28, mid: .3, spread: .05, tw: 4.2, tsp: -.5, lines: 36, a: .1, ph: 1.2, flip: true },
    { dy: -.06, amp: .19, freq: 6.8, sp: -.55, mid: .74, spread: .035, tw: 5.1, tsp: .6, lines: 28, a: .09, ph: 3.6, flip: false },
    { dy: 0, amp: .34, freq: 1.7, sp: .18, mid: .55, spread: .11, tw: 1.3, tsp: .22, lines: 50, a: .06, ph: 5.2, flip: true },
  ];
  const STRANDS = [
    { dy: .01, amp: .36, freq: 1.6, sp: .22, ph: .7 }, { dy: -.02, amp: .28, freq: 2.3, sp: -.3, ph: 2.6 },
    { dy: .04, amp: .32, freq: 1.9, sp: .27, ph: 4.1 }, { dy: -.05, amp: .24, freq: 2.8, sp: -.2, ph: 5.4 },
    { dy: .07, amp: .2, freq: 3.6, sp: .34, ph: 1.9 }, { dy: -.08, amp: .3, freq: 1.2, sp: -.16, ph: 3.3 },
    { dy: .02, amp: .42, freq: 2.1, sp: .12, ph: 6 },
  ];
  const WAVE_A = .45, SHOW_WAVES = false;
  const TAU = Math.PI * 2;
  function ribbonY(rb, x, u, t) {
    const nx = x / W, d = (nx - rb.mid) / .22, env = .2 + .8 * Math.exp(-d * d);
    const c = box.y + box.h * .5 + H * (rb.dy + rb.amp * env * Math.sin(TAU * rb.freq * nx + t * rb.sp + rb.ph) + .05 * Math.sin(TAU * 1.1 * nx - t * .3 + rb.ph));
    const w = H * rb.spread * (.35 + .65 * env) * Math.cos(TAU * rb.tw * nx + t * rb.tsp + rb.ph);
    return c + u * 2 * w + H * .004 * Math.sin(TAU * 7 * nx + t * 1.2 + u * 6);
  }
  function strandY(s, x, t) {
    const nx = x / W, env = .3 + .7 * Math.sin(Math.PI * nx);
    return box.y + box.h * .5 + H * (s.dy + s.amp * env * Math.sin(TAU * s.freq * nx + t * s.sp + s.ph));
  }
  function brassGradient(flip) {
    const gr = ctx.createLinearGradient(0, 0, W, 0), cs = flip ? [2, 1, 0] : [0, 1, 2];
    gr.addColorStop(0, `rgba(${BRASS[cs[0]]},.35)`); gr.addColorStop(.06, `rgba(${BRASS[cs[0]]},1)`);
    gr.addColorStop(.5, `rgba(${BRASS[cs[1]]},1)`); gr.addColorStop(.94, `rgba(${BRASS[cs[2]]},1)`); gr.addColorStop(1, `rgba(${BRASS[cs[2]]},.35)`);
    return gr;
  }
  function waves(t, wave) {
    const reach = W / 2 * ease(wave), x0 = W / 2 - reach, x1 = W / 2 + reach, step = small ? 8 : 5, k = small ? .5 : 1;
    wave *= WAVE_A;
    const path = fy => { ctx.beginPath(); for (let x = x0; x <= x1 + step; x += step) { const xx = Math.min(x, x1), y = fy(xx); x === x0 ? ctx.moveTo(xx, y) : ctx.lineTo(xx, y); } ctx.stroke(); };
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = .7; ctx.strokeStyle = brassGradient(true);
    for (const s of STRANDS) { ctx.globalAlpha = wave * .22; path(x => strandY(s, x, t)); }
    ctx.lineWidth = .6;
    for (const rb of RIBBONS) {
      ctx.strokeStyle = brassGradient(rb.flip);
      const n = Math.round(rb.lines * k);
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1) - .5;
        ctx.globalAlpha = wave * rb.a * (.6 + .8 * Math.abs(u));
        path(x => ribbonY(rb, x, u, t));
      }
    }
    for (const gl of glints) {
      const x = ((gl.ph + t * gl.sp) % 1) * W; if (x < x0 || x > x1) continue;
      const y = ribbonY(RIBBONS[gl.rb], x, gl.u, t), al = wave * Math.sin(Math.PI * x / W) * (.35 + .65 * Math.abs(Math.sin(t * 1.6 + gl.tw)));
      ctx.globalAlpha = al; ctx.fillStyle = "rgb(255,242,210)"; ctx.beginPath(); ctx.arc(x, y, gl.r, 0, TAU); ctx.fill();
      ctx.globalAlpha = al * .15; ctx.fillStyle = "rgb(246,224,172)"; ctx.beginPath(); ctx.arc(x, y, gl.r * 4, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function frame(now) {
    if (!ready || !visible) return;
    const t = now / 1000; prog += (target - prog) * .1; const p = prog;
    const ph1 = clamp(p / .2), dis = clamp((p - .18) / .2), asm = clamp((p - .42) / .24), fin = clamp((p - .64) / .08);
    const wave = clamp((p - .7) / .14);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H);
    gctx.setTransform(.25, 0, 0, .25, 0, 0); gctx.clearRect(0, 0, W, H);
    if (wave > 0 && SHOW_WAVES) waves(t, wave);
    const bars = P.bars, intensity = .35 + ph1 * .65, speed = 1 + ph1 * 1.6;
    const heights = bars.map(b => { const s = .5 + .5 * Math.sin(t * b.w1 * speed + b.ph) * Math.sin(t * b.w2 * speed * .5 + b.ph * 1.7);
      return b.hmax * clamp(lerp(.42, 1, ph1) * (1 - intensity * .55 + intensity * .55 * (.4 + s * .9)), .12, 1); });
    const shake = (1 - dis) * ph1 * ph1 * 1.6, sx = (Math.random() - .5) * shake, sy = (Math.random() - .5) * shake;
    if (fin < 1) for (let n = 0; n < P.length; n++) {
      const q = P[n], s = ease(clamp((dis - q.r1 * .68) / .32)), a = easeIO(clamp((asm - q.r2 * .55) / .45));
      if (s <= 0 && q.k >= heights[q.bar]) continue;
      const drift = s * (1 - a);
      let x = lerp(q.bx, q.dx, s) + (Math.sin(t * q.fw + q.fp) * 14 + Math.cos(t * .37 + q.fp) * 8) * drift;
      let y = lerp(q.by, q.dy, s) + Math.cos(t * q.fw * .8 + q.fp) * 12 * drift;
      x = lerp(x, q.tx, a); y = lerp(y, q.ty, a); if (s === 0) { x += sx; y += sy; }
      const sw = lerp(lerp(q.bw, q.sz, s), 1.6, a), shh = lerp(lerp(q.bh, q.sz, s), 1.6, a);
      let al = s === 0 ? 1 : lerp(1, .35 + .65 * (.55 + .45 * Math.sin(t * 3 * q.fw + q.fp)), drift); al *= 1 - fin;
      if (al <= .01) continue;
      const tf = s === 0 ? clamp(.5 + .5 * (q.k / Math.max(1, bars[q.bar].hmax))) : 1, k2 = tf * lerp(1, .3 + q.lum * 1.7, a);
      ctx.globalAlpha = al; ctx.fillStyle = `rgb(${clamp(TONE.base[0] * k2, 0, 255) | 0},${clamp(TONE.base[1] * k2, 0, 255) | 0},${clamp(TONE.base[2] * k2, 0, 255) | 0})`;
      ctx.fillRect(x, y, sw, shh);
      if ((n & 1) === 0) { gctx.globalAlpha = al * .9; gctx.fillStyle = ctx.fillStyle; gctx.fillRect(x - 2, y - 2, sw + 4, shh + 4); }
    }
    ctx.globalAlpha = 1;
    writeLogo(clamp((p - WRITE[0]) / (WRITE[1] - WRITE[0])));
    // product fades in (and settles from a slight zoom) as the logo finishes writing
    const pa = ease(clamp((p - SHOW[0]) / (SHOW[1] - SHOW[0])));
    if (pa > 0) {
      hov.k += ((hov.in && pa >= 1 ? 1 : 0) - hov.k) * .08;
      const nx = (hov.x - box.x) / box.w - .5, ny = (hov.y - box.y) / box.h - .5, k = hov.k;
      hov.ox += (nx * 16 * k - hov.ox) * .1; hov.oy += (ny * 12 * k - hov.oy) * .1;
      const sc = lerp(1.04, 1, pa) * (1 + .03 * k), w = box.w * sc, h = box.h * sc, x = box.x + (box.w - w) / 2 + hov.ox, y = box.y + (box.h - h) / 2 + hov.oy;
      ctx.globalAlpha = pa; ctx.filter = `brightness(${.8 + .14 * k})`; ctx.drawImage(productImg, x, y, w, h); ctx.filter = "none";
      ctx.globalAlpha = 1;
    }
    // edge photos fade in slowly, one after another, alongside the product
    photos.forEach((el, i) => { el.style.opacity = String(easeIO(clamp((p - PHOTOS[0] - i * PHOTOS[2]) / PHOTOS[1]))); });
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = .5 * (1 - fin);
    ctx.filter = `blur(${Math.round(6 * DPR)}px)`; ctx.drawImage(glow, 0, 0, cv.width, cv.height); ctx.restore();
    const start = 1 - clamp(p / .04);
    copy.style.opacity = String(start);
  }
  return { build, read, frame };
})();
