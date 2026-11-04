const PRODUCT = "images/product-black.webp", HERO_LOGO = "images/marshall-logo-white.png";
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => 1 - Math.pow(1 - t, 3);
const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const mix = (c1, c2, t) => `rgb(${lerp(c1[0], c2[0], t) | 0},${lerp(c1[1], c2[1], t) | 0},${lerp(c1[2], c2[2], t) | 0})`;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const loadImg = src => { const i = new Image(); i.src = src; return i; };
const productImg = loadImg(PRODUCT), heroLogoImg = loadImg(HERO_LOGO);

/* ================= audio ================= */
const AU = { ctx: null, master: null, on: false, nb: null, bus: {} };
const soundBtn = document.getElementById("soundBtn");
function ensureAudio() {
  if (AU.ctx) { if (AU.on) AU.ctx.resume(); return true; }
  try {
    const c = new (window.AudioContext || window.webkitAudioContext)();
    AU.ctx = c;
    AU.master = c.createGain(); AU.master.gain.value = 1;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    AU.master.connect(comp).connect(c.destination);
    const nb = c.createBuffer(1, c.sampleRate * 3, c.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    AU.nb = nb;
    ["cafe", "room", "lake"].forEach(k => { const g = c.createGain(); g.gain.value = 0; g.connect(AU.master); AU.bus[k] = g; });
    Scenes.forEach(s => s.audioInit && s.audioInit(c, AU.bus[s.key]));
    setInterval(tickAudio, 40);
    return true;
  } catch (e) { soundBtn.hidden = true; return false; }
}
function setSound(on) {
  if (on && !ensureAudio()) return;
  AU.on = on;
  if (AU.ctx) { on ? AU.ctx.resume() : AU.ctx.suspend(); }
  soundBtn.classList.toggle("on", on);
  soundBtn.setAttribute("aria-label", on ? "소리 끄기" : "소리 켜기"); soundBtn.setAttribute("aria-pressed", String(on));
  updateBuses();
}
soundBtn.addEventListener("click", () => setSound(!AU.on));

/* focus rings only after Tab; any mouse / touch press turns them off again */
addEventListener("keydown", e => { if (e.key === "Tab") document.documentElement.classList.add("tabbing"); });
addEventListener("pointerdown", () => document.documentElement.classList.remove("tabbing"));

/* custom inverting cursor — mouse / trackpad only (touch devices keep no cursor) */
(() => {
  const cur = document.getElementById("cursor");
  if (!cur || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  document.documentElement.classList.add("has-cursor");
  const BIG = ".gate h1, .turn h2, .bat-copy h2, .colour h2, .details h2, .purchase h2, .feature .sub";
  const RING = ".buy-main, .gate-btns .on";
  const LINK = "a, button, [role=button], label, .colour-card";
  let x = -100, y = -100, raf = 0;
  const put = () => { raf = 0; cur.style.setProperty("--x", x + "px"); cur.style.setProperty("--y", y + "px"); };
  addEventListener("pointermove", e => {
    if (e.pointerType !== "mouse") return;
    x = e.clientX; y = e.clientY; if (!raf) raf = requestAnimationFrame(put);
    const t = e.target instanceof Element ? e.target : null;
    const ring = !!(t && t.closest(RING)), link = !ring && !!(t && t.closest(LINK)), big = !ring && !link && !!(t && t.closest(BIG));
    cur.classList.toggle("ring", ring); cur.classList.toggle("link", link); cur.classList.toggle("big", big); cur.classList.remove("hide");
  }, { passive: true });
  document.addEventListener("mouseleave", () => cur.classList.add("hide"));
  addEventListener("blur", () => cur.classList.add("hide"));
})();

/* entrance gate: always starts at the top; the button click counts as the user gesture that unlocks audio */
(() => {
  const gate = document.getElementById("gate");
  if (!gate) return;
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  document.documentElement.classList.add("gated"); scrollTo(0, 0);
  gate.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    setSound(b.dataset.sound === "1");
    gate.classList.add("out"); document.documentElement.classList.remove("gated");
    scrollTo(0, 0);
  }));
})();
function updateBuses() {
  if (!AU.ctx) return;
  const t = AU.ctx.currentTime;
  Scenes.forEach(s => AU.bus[s.key].gain.setTargetAtTime(s.active ? 1 : 0, t, .25));
}
function tickAudio() { if (!AU.ctx || !AU.on) return; Scenes.forEach(s => s.active && s.schedule && s.schedule(AU.ctx)); }
function noiseHit(c, dest, t, type, f, dur, vol, q = .8) {
  const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
  s.buffer = AU.nb; fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  s.connect(fl).connect(g).connect(dest); s.start(t, Math.random() * 2); s.stop(t + dur + .02);
}
function tone(c, dest, t, f, type, dur, vol, attack = .004) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
  o.connect(g).connect(dest); o.start(t); o.stop(t + dur + .02);
}


/* ================= video helpers ================= */
function makeVideo(src, loop) {
  const v = document.createElement("video");
  v.muted = true; v.defaultMuted = true; v.playsInline = true; v.setAttribute("playsinline", ""); v.loop = loop; v.preload = "auto";
  if (loop) v.src = src;
  else fetch(src).then(r => { if (!r.ok) throw 0; return r.blob(); }).then(b => { v.src = URL.createObjectURL(b); }).catch(() => { v.src = src; });
  return v;
}
function coverOf(v, W, H) {
  const vw = v.videoWidth || 1280, vh = v.videoHeight || 720, s = Math.max(W / vw, H / vh);
  return { x: (W - vw * s) / 2, y: (H - vh * s) / 2, w: vw * s, h: vh * s, s };
}
function setRate(v, r) { if (Math.abs(v.playbackRate - r) > .04) { try { v.playbackRate = r; } catch (e) {} } }

