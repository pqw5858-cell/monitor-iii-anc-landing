/* ================= scene: cafe ================= */
function cafeScene(sec, info) {
  const cv = sec.querySelector(".scene"), ctx = cv.getContext("2d"), rim = sec.querySelector(".rim");
  let W, H, DPR, loud = 0, A = null;
  const S = { key: "cafe", active: false, video: makeVideo(info.video, true) };
  const v = S.video;
  const FG = .695;
  S.size = () => { DPR = Math.min(devicePixelRatio || 1, 2); W = sec.clientWidth; H = sec.clientHeight; cv.width = W * DPR; cv.height = H * DPR; };
  S.audioInit = (c, bus) => {
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 12000;
    const out = c.createGain(); out.gain.value = .9; const an = c.createAnalyser(); an.fftSize = 512;
    lp.connect(out).connect(an).connect(bus);
    for (let v = 0; v < 7; v++) {
      const s = c.createBufferSource(); s.buffer = AU.nb; s.loop = true;
      const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 350 + Math.random() * 900; bp.Q.value = 2.5;
      const g = c.createGain(); g.gain.value = 0;
      const l1 = c.createOscillator(), g1 = c.createGain(); l1.frequency.value = 2.5 + Math.random() * 4; g1.gain.value = .22;
      const l2 = c.createOscillator(), g2 = c.createGain(); l2.frequency.value = .15 + Math.random() * .3; g2.gain.value = .12;
      l1.connect(g1).connect(g.gain); l2.connect(g2).connect(g.gain);
      s.connect(bp).connect(g).connect(lp); s.start(0, Math.random() * 2); l1.start(); l2.start();
    }
    const rum = c.createBufferSource(); rum.buffer = AU.nb; rum.loop = true;
    const rl = c.createBiquadFilter(); rl.type = "lowpass"; rl.frequency.value = 180; const rg = c.createGain(); rg.gain.value = .35;
    rum.connect(rl).connect(rg).connect(lp); rum.start();
    A = { lp, out, an, bus, data: new Uint8Array(an.frequencyBinCount), nextEv: 0 };
    S.onK(S.k || 0);
  };
  S.schedule = c => {
    if (c.currentTime < A.nextEv) return;
    const t = c.currentTime + .05;
    if (Math.random() < .55) [2600, 3900, 5200].forEach((f, i) => tone(c, A.lp, t + Math.random() * .3, f * (1 + Math.random() * .05), "sine", .35, .06 / (i + 1), .002));
    if (Math.random() < .08) noiseHit(c, A.lp, t, "highpass", 3000, 2.2, .1);
    A.nextEv = c.currentTime + .7 + Math.random() * .9;
  };
  // k: noise cancelling connected · q: scroll — the world outside slows almost to a stop and fades
  S.onK = (k, q = 0) => { S.k = k; S.q = q; if (!A) return; const t = AU.ctx.currentTime; A.lp.frequency.setTargetAtTime(12000 - 11760 * k, t, .08); A.out.gain.setTargetAtTime(.9 - .82 * k - .06 * q, t, .08); };
  S.pageSound = () => { if (!A || !AU.on) return; noiseHit(AU.ctx, A.bus, AU.ctx.currentTime, "bandpass", 2400, .35, .05, .6); };
  function loudness() {
    if (!A || !AU.on) return .35;
    A.an.getByteTimeDomainData(A.data); let s = 0;
    for (let i = 0; i < A.data.length; i++) { const q = (A.data[i] - 128) / 128; s += q * q; }
    return clamp(Math.sqrt(s / A.data.length) * 6);
  }
  S.frame = () => {
    if (v.readyState < 2) return;
    const k = S.k || 0, q = S.q || 0, c = coverOf(v, W, H);
    setRate(v, lerp(lerp(1, .35, k), .07, q));
    loud = lerp(loud, loudness(), .3);
    const jit = (1 - k) * loud * 2.4, jx = (Math.random() - .5) * jit, jy = (Math.random() - .5) * jit;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.filter = `blur(${(lerp(0, 10, k) + 5 * q).toFixed(1)}px) brightness(${(lerp(1, .5, k) * lerp(1, .55, q)).toFixed(2)}) saturate(${(lerp(1, .55, k) * lerp(1, .5, q)).toFixed(2)})`;
    ctx.drawImage(v, c.x - 12 * k + jx, c.y - 12 * k + jy, c.w + 24 * k, c.h + 24 * k);
    ctx.filter = "none";
    if (k > .01) {
      ctx.save(); ctx.beginPath(); ctx.rect(0, c.y + c.h * FG, W, H); ctx.clip();
      ctx.globalAlpha = k; ctx.filter = `brightness(${(lerp(1, .92, k) + .06 * q).toFixed(2)})`;
      ctx.drawImage(v, c.x + jx, c.y + jy, c.w, c.h); ctx.restore();
    }
    rim.style.opacity = String(k);
  };
  return S;
}

/* ================= scene: room (bass) ================= */
function roomScene(sec, info) {
  const cv = sec.querySelector(".scene"), ctx = cv.getContext("2d"), rim = sec.querySelector(".rim");
  let W, H, DPR, A = null, lv = 0;
  const S = { key: "room", active: false };
  const BPM = 116, S16 = 60 / BPM / 4, notes = [40, 40, 40, 43, 45, 45, 43, 38];
  S.video = makeVideo(info.video, true); const v = S.video;
  const mc = document.createElement("canvas"), mctx = mc.getContext("2d");
  const tiny = document.createElement("canvas"), tctx = tiny.getContext("2d", { willReadFrequently: true });
  let lightMap = null, LW = 64, LH = 36, dust = [], prevLv = 0, fr = 0, cover = null, mapOK = true, lit = -1;
  tiny.width = LW; tiny.height = LH;
  // volume meter next to the status: scrolling = turning the knob up
  const meter = document.createElement("span"); meter.className = "vol"; meter.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 12; i++) meter.append(document.createElement("i"));
  sec.querySelector(".status").append(meter);
  const bars = [...meter.children];
  S.size = () => {
    DPR = Math.min(devicePixelRatio || 1, 2); W = sec.clientWidth; H = sec.clientHeight; cv.width = W * DPR; cv.height = H * DPR;
    mc.width = Math.ceil(W / 3); mc.height = Math.ceil(H / 3);
    dust = Array.from({ length: Math.min(320, Math.round(W * H / 4500)) }, () => ({ x: W * (.3 + Math.random() * .45), y: H * (.15 + Math.random() * .65), vx: 0, vy: 0, s: .6 + Math.random() * 1.8, ph: Math.random() * 6.28, sp: .2 + Math.random() * .5 }));
  };
  const lightAt = (x, y) => {
    if (lightMap) { const ix = clamp((x / W * LW) | 0, 0, LW - 1), iy = clamp((y / H * LH) | 0, 0, LH - 1); return lightMap[iy * LW + ix]; }
    const dx = (x / W - .5) / .2, dy = (y / H - .5) / .3; return clamp(1 - (dx * dx + dy * dy)) * .7;
  };
  S.audioInit = (c, bus) => {
    const shelf = c.createBiquadFilter(); shelf.type = "lowshelf"; shelf.frequency.value = 160; shelf.gain.value = 9;
    const an = c.createAnalyser(); an.fftSize = 1024; an.smoothingTimeConstant = .5;
    const music = c.createGain(); music.gain.value = 0; const room = c.createGain(); room.gain.value = .5;
    music.connect(shelf).connect(an).connect(bus); room.connect(bus);
    A = { music, room, an, data: new Uint8Array(an.frequencyBinCount), next: 0, step: 0, tick: 0 };
    S.onK(S.k || 0);
  };
  function kick(c, t) { const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + .14); g.gain.setValueAtTime(1.1, t); g.gain.exponentialRampToValueAtTime(.001, t + .38); o.connect(g).connect(A.music); o.start(t); o.stop(t + .4); }
  function bass(c, t, m, dur) { const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(); o.type = "sawtooth"; o.frequency.value = mtof(m); f.type = "lowpass"; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(220, t + dur); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.42, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(f).connect(g).connect(A.music); o.start(t); o.stop(t + dur + .02); }
  function chord(c, t, m, dur) { const f = c.createBiquadFilter(), g = c.createGain(), sh = c.createWaveShaper(), cu = new Float32Array(256); for (let i = 0; i < 256; i++) cu[i] = Math.tanh((i / 128 - 1) * 3.5); sh.curve = cu; f.type = "lowpass"; f.frequency.value = 2600; g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.09, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + dur); [0, 7, 12].forEach(iv => { const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = mtof(m + 12 + iv); o.detune.value = (Math.random() - .5) * 14; o.connect(sh); o.start(t); o.stop(t + dur + .02); }); sh.connect(f).connect(g).connect(A.music); }
  S.schedule = c => {
    if (A.next < c.currentTime) A.next = c.currentTime + .05;
    if (A.tick < c.currentTime) A.tick = c.currentTime + .1;
    while (A.next < c.currentTime + .15) {
      const t = A.next, s = A.step % 32, bar = Math.floor(A.step / 16) % 2;
      if (s % 16 === 0 || s % 16 === 10 || (s % 16 === 8 && bar === 1)) kick(c, t);
      if (s % 8 === 4) noiseHit(c, A.music, t, "bandpass", 1800, .18, .55);
      if (s % 2 === 0) { noiseHit(c, A.music, t, "highpass", 8000, .05, s % 4 === 2 ? .16 : .09); bass(c, t, notes[Math.floor(s / 4) % 8], S16 * 1.8); }
      if (s % 16 === 0) chord(c, t, notes[Math.floor(s / 4) % 8], S16 * 6);
      if (s % 16 === 8) chord(c, t, notes[Math.floor(s / 4) % 8] + 3, S16 * 5);
      A.next += S16; A.step++;
    }
    while (A.tick < c.currentTime + .2) { tone(c, A.room, A.tick, 2400, "square", .025, .05, .001); A.tick += 1; }
  };
  // k: music connected (knob pressed) · q: scroll turns the volume up
  S.onK = (k, q = 0) => { S.k = k; S.q = q; if (!A) return; const t = AU.ctx.currentTime; A.music.gain.setTargetAtTime(k * lerp(.3, .95, q), t, .12); A.room.gain.setTargetAtTime(.5 * (1 - k), t, .12); };
  S.frame = now => {
    if (v.readyState < 2) return;
    const t = now / 1000, k = S.k || 0, q = S.q || 0; cover = coverOf(v, W, H);
    setRate(v, lerp(.5, 1, k));
    const n = Math.round(k * lerp(3, 12, q));
    if (n !== lit) { lit = n; bars.forEach((b, i) => b.classList.toggle("on", i < n)); }
    let raw = 0;
    if (A && AU.on) { A.an.getByteFrequencyData(A.data); let s = 0; for (let i = 1; i < 9; i++) s += A.data[i]; raw = clamp((s / 8 - 110) / 120) * k; }
    else raw = Math.pow(Math.max(0, Math.sin(t * Math.PI * BPM / 60)), 12) * k * lerp(.35, 1, q); // silent fallback beat
    lv = raw > lv ? lerp(lv, raw, .6) : lv * .9;
    const hit = lv - prevLv > .12; prevLv = lv;
    mctx.setTransform(1 / 3, 0, 0, 1 / 3, 0, 0); mctx.globalCompositeOperation = "source-over";
    mctx.filter = "grayscale(1) brightness(.7) contrast(10)"; mctx.drawImage(v, cover.x, cover.y, cover.w, cover.h); mctx.filter = "none";
    mctx.globalCompositeOperation = "multiply"; mctx.fillStyle = "#f2cf98"; mctx.fillRect(0, 0, W, H); mctx.globalCompositeOperation = "source-over";
    if (mapOK && (fr++ % 6 === 0)) {
      try { tctx.clearRect(0, 0, LW, LH); tctx.drawImage(mc, 0, 0, LW, LH); const d = tctx.getImageData(0, 0, LW, LH).data; lightMap = lightMap || new Float32Array(LW * LH); for (let i = 0; i < LW * LH; i++) lightMap[i] = d[i * 4 + 1] / 180; }
      catch (e) { mapOK = false; lightMap = null; }
    }
    const z = 1 + lv * .03 + q * k * .025;
    ctx.setTransform(DPR * z, 0, 0, DPR * z, (W * DPR) * (1 - z) / 2, (H * DPR) * (1 - z) / 2);
    ctx.filter = `brightness(${lerp(1, .36, k).toFixed(2)}) saturate(${lerp(1, .85, k).toFixed(2)})`;
    ctx.drawImage(v, cover.x, cover.y, cover.w, cover.h); ctx.filter = "none";
    if (k > .01) {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const sw = Math.sin(t * 6.5) * lv * 7;
      ctx.globalAlpha = clamp(k * (.2 + .3 * q + lv * .65)); ctx.drawImage(mc, sw, 0, W, H);
      ctx.filter = "blur(14px)"; ctx.globalAlpha = clamp(k * (.16 + .3 * q + lv * .45)); ctx.drawImage(mc, sw, 0, W, H);
      ctx.restore();
    }
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (const p of dust) {
      p.vx += Math.sin(t * p.sp + p.ph) * .004 + (Math.random() - .5) * .01;
      p.vy += Math.cos(t * p.sp * .8 + p.ph) * .004 + (Math.random() - .5) * .01 - .002;
      if (hit) { p.vy -= lv * (1 + Math.random() * 2.2); p.vx += (Math.random() - .5) * lv * 3; }
      p.vx *= .965; p.vy *= .965; p.x += p.vx; p.y += p.vy;
      if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) { p.x = W * (.3 + Math.random() * .45); p.y = H * (.2 + Math.random() * .6); p.vx = p.vy = 0; }
      const l = clamp(lightAt(p.x, p.y)), tw = .6 + .4 * Math.sin(t * 2 + p.ph);
      const a = clamp((.03 + l * .8) * tw * lerp(.8, 1, k) + lv * k * l * .6);
      if (a < .02) continue;
      ctx.fillStyle = `rgba(255,${lerp(242, 238, k) | 0},${lerp(220, 214, k) | 0},${a})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (1 + lv * k * .8), 0, 6.29); ctx.fill();
    }
    ctx.restore();
    const warm = lv * .1 + q * k * .07;
    if (warm > .005) { ctx.fillStyle = `rgba(236,208,150,${warm})`; ctx.fillRect(0, 0, W, H); }
    rim.style.opacity = String(k * (.35 + lv * .9));
  };
  return S;
}

/* ================= scene: lake (treble) ================= */
function lakeScene(sec, info) {
  const cv = sec.querySelector(".scene"), ctx = cv.getContext("2d"), rim = sec.querySelector(".rim");
  let W, H, DPR, A = null, lv = 0, sparks = [];
  const S = { key: "lake", active: false };
  const BPM = 104, S16 = 60 / BPM / 4, arp = [76, 83, 80, 88, 76, 83, 79, 86, 74, 81, 78, 86, 74, 81, 78, 83], roots = [40, 40, 38, 38];
  S.video = makeVideo(info.video, false); const v = S.video;
  let towers = [], cur = 0;
  // soft round light: stretched into horizontal glints on the water, small dots for the windows
  const GLINT = document.createElement("canvas"); GLINT.width = GLINT.height = 64;
  { const g = GLINT.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(255,244,222,1)"); r.addColorStop(.3, "rgba(255,224,170,.55)"); r.addColorStop(1, "rgba(255,210,150,0)");
    g.fillStyle = r; g.fillRect(0, 0, 64, 64); }
  S.size = () => {
    DPR = Math.min(devicePixelRatio || 1, 2); W = sec.clientWidth; H = sec.clientHeight; cv.width = W * DPR; cv.height = H * DPR;
    sparks = Array.from({ length: 300 }, () => { const d = Math.pow(Math.random(), 1.4); return { fx: .57 + (Math.random() - .5) * (.03 + d * .34) * (Math.random() + .3), fy: .42 + d * .4, d, ph: Math.random() * 6.28, sp: 2 + Math.random() * 6, hi: Math.random() }; });
    towers = Array.from({ length: 90 }, () => ({ fx: .28 + Math.random() * .4, fy: .25 + Math.random() * .12, ph: Math.random() * 6.28, sp: 1 + Math.random() * 4 }));
  };
  S.audioInit = (c, bus) => {
    const shelf = c.createBiquadFilter(); shelf.type = "highshelf"; shelf.frequency.value = 3200; shelf.gain.value = 9;
    const an = c.createAnalyser(); an.fftSize = 1024; an.smoothingTimeConstant = .3;
    const music = c.createGain(); music.gain.value = 0; const room = c.createGain(); room.gain.value = .45;
    music.connect(shelf).connect(an).connect(bus); room.connect(bus);
    const w = c.createBufferSource(); w.buffer = AU.nb; w.loop = true; const wl = c.createBiquadFilter(); wl.type = "lowpass"; wl.frequency.value = 420;
    const wg = c.createGain(); wg.gain.value = .5; const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = .13; lg.gain.value = .3;
    lfo.connect(lg).connect(wg.gain); lfo.start(); w.connect(wl).connect(wg).connect(room); w.start();
    A = { music, room, an, data: new Uint8Array(an.frequencyBinCount), next: 0, step: 0 };
    S.onK(S.k || 0);
  };
  function kick(c, t) { const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(48, t + .12); g.gain.setValueAtTime(.55, t); g.gain.exponentialRampToValueAtTime(.001, t + .3); o.connect(g).connect(A.music); o.start(t); o.stop(t + .32); }
  S.schedule = c => {
    if (A.next < c.currentTime) A.next = c.currentTime + .05;
    while (A.next < c.currentTime + .15) {
      const t = A.next, s = A.step % 16, bar = Math.floor(A.step / 16) % 4, M = A.music;
      if (s === 0 || s === 8) kick(c, t);
      if (s === 4 || s === 12) noiseHit(c, M, t, "bandpass", 2600, .14, .32);
      noiseHit(c, M, t, "highpass", 9000, s % 4 === 2 ? .09 : .04, s % 2 === 0 ? .22 : .12);
      if (s === 0) noiseHit(c, M, t, "highpass", 6500, 1.4, .18, .4);
      if (s % 4 === 2) noiseHit(c, M, t, "bandpass", 7200, .35, .1, 3);
      const n = arp[(s + bar * 4) % 16]; tone(c, M, t, mtof(n), "triangle", .34, .12); tone(c, M, t, mtof(n + 12), "sine", .2, .05);
      if (s === 0) tone(c, M, t, mtof(roots[bar]), "sine", S16 * 15, .25, .02);
      if (s === 0 && bar % 2 === 0) [0, 7, 12, 19].forEach((iv, i) => tone(c, M, t + i * .002, mtof(88 + iv), "sine", 1.6, .03));
      A.next += S16; A.step++;
    }
  };
  // k: Soundstage connected, the view opens wide · q: scroll sets the sun and the city lights come on
  S.onK = (k, q = 0) => { S.k = k; S.q = q; if (!A) return; const t = AU.ctx.currentTime; A.music.gain.setTargetAtTime(k * .85, t, .12); A.room.gain.setTargetAtTime(.45 * (1 - k), t, .12); };
  S.frame = now => {
    if (v.readyState < 1) return;
    const t = now / 1000, k = S.k || 0, p = S.q || 0, dur = v.duration || 8;
    // the clip is a one-way sunset scrubbed by q; a small sway around that point keeps the water moving
    const tgt = clamp(p * (dur - 1.4) + .7 + .5 * Math.sin(t * .7), 0, dur - .05); cur += (tgt - cur) * .18;
    if (!v.seeking && Math.abs(v.currentTime - cur) > 1 / 30) { try { v.currentTime = cur; } catch (e) {} }
    if (v.readyState < 2) return;
    let raw = 0;
    if (A && AU.on) { A.an.getByteFrequencyData(A.data); const bin = AU.ctx.sampleRate / A.an.fftSize, i0 = Math.floor(3000 / bin), i1 = Math.min(A.data.length - 1, Math.floor(12000 / bin)); let s = 0; for (let i = i0; i <= i1; i++) s += A.data[i]; raw = clamp((s / (i1 - i0 + 1) - 40) / 90) * k; }
    else raw = clamp(.3 + .45 * Math.sin(t * 5.3) * Math.sin(t * 2.1)) * k; // silent fallback shimmer
    lv = raw > lv ? lerp(lv, raw, .8) : lv * .82;
    const c0 = coverOf(v, W, H), z = lerp(1.14, 1, ease(k));
    const c = { x: c0.x - c0.w * (z - 1) / 2, y: c0.y - c0.h * (z - 1) / 2, w: c0.w * z, h: c0.h * z };
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.drawImage(v, c.x, c.y, c.w, c.h);
    if (k > .01) {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      for (const q of sparks) {
        const tw = .5 + .5 * Math.sin(t * q.sp + q.ph), hit = lv * (q.hi < .55 ? 1 : .35) * (.4 + tw), a = clamp(hit * 1.4 * k);
        if (a < .03) continue;
        const x = c.x + c.w * q.fx + Math.sin(t * .8 + q.ph) * 5, y = c.y + c.h * q.fy, rr = (1 + q.d * 2.4) * (1 + hit * 1.6);
        ctx.globalAlpha = a * .85; ctx.drawImage(GLINT, x - rr * 3.2, y - rr * .7, rr * 6.4, rr * 1.4);
      }
      for (const q of towers) {
        const a = clamp(lv * k * (.3 + .7 * (.5 + .5 * Math.sin(t * q.sp * 3 + q.ph))) * (.4 + p));
        if (a < .04) continue;
        ctx.globalAlpha = a; ctx.drawImage(GLINT, c.x + c.w * q.fx - 2.5, c.y + c.h * q.fy - 2.5, 5, 5);
      }
      ctx.globalAlpha = 1; ctx.restore();
      if (lv > .02) { ctx.fillStyle = `rgba(255,240,210,${lv * .06})`; ctx.fillRect(0, 0, W, H); }
    }
    cv.style.filter = `blur(${lerp(5, 0, k).toFixed(2)}px) saturate(${lerp(.35, 1.08, k).toFixed(2)}) contrast(${lerp(.82, 1.06, k).toFixed(2)})`;
    rim.style.opacity = String(k * (.3 + lv * .7));
  };
  return S;
}

