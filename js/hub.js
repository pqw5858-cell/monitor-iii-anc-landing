/* ================= content (data/content.json) ================= */
let Scenes = [], Exp = null;
const COARSE = matchMedia("(pointer: coarse)").matches;

const fromTpl = id => document.getElementById(id).content.firstElementChild.cloneNode(true);
function render(D) {
  const scenes = document.getElementById("scenes");
  D.scenes.forEach(s => {
    const sec = fromTpl("sceneTpl");
    sec.id = s.key; sec.dataset.scene = s.key; sec.setAttribute("aria-label", s.sectionLabel);
    sec.querySelector(".scene").setAttribute("aria-label", s.canvasLabel);
    sec.querySelector(".sub").textContent = s.sub;
    sec.querySelector(".keycap b").textContent = s.press;
    sec.querySelector(".press-txt").textContent = COARSE ? "화면을 탭하세요." : `키보드 “${s.press}키”를 누르세요.`;
    sec.querySelector(".press").setAttribute("aria-label", `${s.button} 누르기 (${s.press}키)`);
    const st = sec.querySelector(".st");
    st.dataset.on = s.status.on; st.dataset.off = s.status.off; st.textContent = s.status.off;
    scenes.append(sec);
  });

  const hp = document.querySelector(".parts-hp");
  D.parts.forEach((p, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "part-dot"; b.dataset.i = i;
    b.style.left = p.x + "px"; b.style.top = p.y + "px";
    b.setAttribute("aria-label", p.title); b.setAttribute("aria-pressed", "false");
    hp.append(b);
  });

  renderDetails(D.details);

  // colour cards: product photo; on hover a strip of the four gallery photos slides along (dots jump to a photo)
  const colors = document.getElementById("colors");
  D.colors.forEach((c, i) => {
    const li = el("li", "colour-card rv"), ph = el("div", "ph"), strip = el("div", "strip"), dots = el("div", "dots"), name = el("p");
    li.style.transitionDelay = i * .12 + "s";
    const main = new Image(); main.src = c.photo; main.alt = "Monitor III A.N.C. " + c.name;
    c.gallery.forEach((src, k) => {
      const im = new Image(); im.src = src; im.alt = ""; strip.append(im);
      const d = el("button"); d.type = "button"; d.setAttribute("aria-label", `${c.name} 사진 ${k + 1}`); d.addEventListener("click", () => { go(k); restart(); }); dots.append(d);
    });
    ph.append(main, strip, dots); name.textContent = c.name; li.append(ph, name); colors.append(li);
    let k = 0, timer = 0;
    const go = n => { k = n; strip.style.transform = `translateX(${-100 * k}%)`; [...dots.children].forEach((d, j) => d.setAttribute("aria-current", String(j === k))); };
    const restart = () => { clearInterval(timer); timer = setInterval(() => go((k + 1) % c.gallery.length), 1600); };
    li.addEventListener("pointerenter", () => { go(0); li.classList.add("sliding"); restart(); });
    li.addEventListener("pointerleave", () => { clearInterval(timer); li.classList.remove("sliding"); });
    // clicking the photo steps to the next one (the first click on touch just opens the strip)
    let drag = null, dragged = false, opened = false;
    ph.addEventListener("click", e => {
      if (e.target.closest(".dots") || dragged) { dragged = false; return; }
      if (opened) opened = false; else if (!li.classList.contains("sliding")) { go(0); li.classList.add("sliding"); } else go((k + 1) % c.gallery.length);
      restart();
    });
    // drag / swipe sideways: the strip follows the pointer, a pull past 15% of the width turns the page
    const n = c.gallery.length;
    ph.addEventListener("pointerdown", e => {
      if (e.button || e.target.closest(".dots")) return;
      dragged = false; opened = false;
      if (!li.classList.contains("sliding")) { go(0); li.classList.add("sliding"); opened = true; }
      drag = { x: e.clientX, y: e.clientY, w: ph.clientWidth, dx: 0, on: false }; clearInterval(timer);
    });
    addEventListener("pointermove", e => {
      if (!drag) return;
      drag.dx = e.clientX - drag.x;
      if (!drag.on && Math.abs(drag.dx) > 8 && Math.abs(drag.dx) > Math.abs(e.clientY - drag.y)) { drag.on = true; strip.style.transition = "opacity .5s"; try { ph.setPointerCapture(e.pointerId); } catch (_) {} }
      if (drag.on) strip.style.transform = `translateX(calc(${-100 * k}% + ${drag.dx}px))`;
    });
    addEventListener("pointerup", () => {
      if (!drag) return;
      const d = drag; drag = null; strip.style.transition = "";
      if (d.on) { dragged = true; const t = d.dx / d.w; go(t < -.15 ? (k + 1) % n : t > .15 ? (k - 1 + n) % n : k); }
      if (li.matches(":hover")) restart();
    });
    ph.style.touchAction = "pan-y";
    ph.addEventListener("dragstart", e => e.preventDefault());
  });
}

/* details accordion: simple line icons for the feature list (no icon files were supplied) */
const ICONS = {
  wave: '<path d="M2 12h2M6 9v6M9 6v12M12 9v6M15 4v16M18 8v8M21 11v2"/>',
  anc: '<path d="M2 12c2-5 3 5 5 0s3-5 5 0 3 5 5 0 3-5 5 0"/><path d="M4 4l16 16"/>',
  clock: '<circle cx="11" cy="12" r="8"/><path d="M11 8v4l3 2"/><path d="M17 19h5"/>',
  fold: '<path d="M5 13a7 7 0 0 1 14 0"/><rect x="3" y="13" width="5" height="7" rx="1.5"/><rect x="16" y="13" width="5" height="7" rx="1.5"/><path d="M12 6v3"/>',
  m: '<circle cx="12" cy="12" r="9"/><path d="M8 16l1.5-8 2.5 5 2.5-5L16 16"/>',
  bt: '<path d="M7 7l10 10-5 4V3l5 4L7 17"/>',
  stage: '<circle cx="12" cy="12" r="2.5"/><path d="M7 7a7 7 0 0 0 0 10M17 7a7 7 0 0 1 0 10M4 4a11 11 0 0 0 0 16M20 4a11 11 0 0 1 0 16"/>',
  adapt: '<path d="M4 20v-6M9 20V8M14 20v-9M19 20V5"/><path d="M2 14h4M7 8h4M12 11h4M17 5h4"/>',
  knob: '<rect x="3" y="4" width="18" height="6" rx="1.5"/><ellipse cx="12" cy="16" rx="8" ry="3"/><path d="M4 16v2c0 1.7 3.6 3 8 3s8-1.3 8-3v-2"/>'
};
const CHEVRON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9l7 7 7-7"/></svg>';
const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
function renderDetails(groups) {
  const acc = document.getElementById("detailsAcc");
  groups.forEach((g, i) => {
    const item = el("section", "acc-item" + (g.open ? " open" : "")), h = el("h3"), btn = el("button", "acc-head");
    btn.type = "button"; btn.id = "accH" + i; btn.setAttribute("aria-controls", "accB" + i); btn.setAttribute("aria-expanded", String(!!g.open));
    btn.append(document.createTextNode(g.title)); btn.insertAdjacentHTML("beforeend", CHEVRON); h.append(btn);
    const body = el("div", "acc-body"), inn = el("div", "acc-in");
    body.id = "accB" + i; body.setAttribute("role", "region"); body.setAttribute("aria-labelledby", btn.id);
    if (g.type === "features") {
      const ul = el("ul", "acc-feat");
      g.items.forEach(f => { const li = el("li", null, `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[f.icon] || ""}</svg>`), t = el("div"); t.append(el("b"), el("span")); t.children[0].textContent = f.title; t.children[1].textContent = f.desc; li.append(t); ul.append(li); });
      inn.append(ul);
    } else if (g.type === "box") {
      const box = el("div", "acc-box"), pics = el("div", "pics"), ul = el("ul");
      g.images.forEach(src => { const im = new Image(); im.src = src; im.alt = ""; pics.append(im); });
      g.items.forEach(t => { const li = el("li"); li.textContent = t; ul.append(li); });
      box.append(pics, ul); inn.append(box);
    } else {
      const dl = el("dl", "acc-rows");
      g.rows.forEach(([k, v]) => { const row = el("div", "row"), dt = el("dt"), dd = el("dd"); dt.textContent = k; dd.textContent = v; row.append(dt, dd); dl.append(row); });
      inn.append(dl);
      if (g.note) { const p = el("p", "acc-note"); p.textContent = g.note; inn.append(p); }
      if (g.buttons) { const bs = el("div", "acc-btns"); g.buttons.forEach(b => { const a = el("a"); a.href = b.href; a.target = "_blank"; a.rel = "noopener"; a.textContent = b.label; bs.append(a); }); inn.append(bs); }
    }
    body.append(inn); item.append(h, body); acc.append(item);
    btn.addEventListener("click", () => { const open = item.classList.toggle("open"); btn.setAttribute("aria-expanded", String(open)); });
  });
}

fetch("data/content.json").then(r => r.json()).then(D => { render(D); init(D); });

function init(D) {
  /* ================= pinned stages: shared helpers ================= */
  const span = (s, a, b) => clamp((s - a) / (b - a));
  // layer opacity + state classes: .cur once mostly shown (starts its .rv copy / battery bars), .live once fully shown (clickable)
  function layerVis(n, v, curAt = .6) {
    n.style.opacity = v.toFixed(3);
    if (v > curAt) n.classList.add("cur"); else if (v < .05) n.classList.remove("cur");
    n.classList.toggle("live", v > .95);
  }
  // programmatic scrolling (menu, skip, arrow): the experience hold must not catch it on the way
  const Nav = { busy: false, t: 0,
    go(y) { Exp.release(); this.busy = true; clearTimeout(this.t); scrollTo({ top: y, behavior: "smooth" }); this.t = setTimeout(() => { this.busy = false; }, 1800); },
    stop() { this.busy = false; clearTimeout(this.t); } };
  addEventListener("scrollend", () => { if (Nav.busy) Nav.stop(); });

  /* ================= experience ================= */
  // one pinned stage, timeline in screen heights (s = 0 when the stage pins): "Turn it on." fades in and out, then the
  // scenes fade in. at LOCK the page scroll is held: wheel / swipe only drives the open scene's change (q), and only
  // after its key is pressed. scenes change with the arrow or the scene bar, never by scrolling.
  // the hold lets go when scrolling on past the finished last scene, or up before the first one → scenes fade out
  const factories = { cafe: cafeScene, room: roomScene, lake: lakeScene };
  const TURN_IN = [-.15, .45], TURN_OUT = [1, 1.4], SC_IN = [1.5, 1.9], LOCK = 1.9, SC_OUT = [2, 2.4];
  const Q_RUN = 1.6;        // scroll distance (screen heights) that runs a scene's change from 0 to 1
  const SLIDE_MS = 900, EDGE_MS = 500;
  const CUP_REST = .35;     // ear cups rest slightly inside the screen edges before connecting (share of the full wrap)
  Exp = (() => {
    const track = document.getElementById("experience"), stage = document.getElementById("expStage"), turn = document.getElementById("turn");
    const layer = document.getElementById("expScenes"), strip = document.getElementById("scenes"), cups = layer.querySelectorAll(".cup");
    const nextBtn = document.getElementById("expNext"), nav = document.getElementById("expNav");
    let H = innerHeight, s = 0, top = 0, idx = 0, pos = 0, slide = null, locked = false, lastY = scrollY, inView = false, live = null;
    const last = () => Scenes.length - 1;
    Scenes = [...strip.querySelectorAll(".exp")].map((sec, i) => {
      const info = D.scenes[i], S = factories[sec.dataset.scene](sec, info);
      Object.assign(S, { sec, press: info.press, on: false, kv: 0, qv: 0, qT: 0, done: false, doneAt: 0, zeroAt: 0, st: sec.querySelector(".st"), pr: sec.querySelector(".press") });
      S.size();
      const hit = () => { if (Scenes[slide ? slide.to : idx] === S) press(); };
      S.pr.addEventListener("click", hit);
      S.pr.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); hit(); } });
      if (COARSE) sec.addEventListener("click", hit);
      return S;
    });
    // scene bar: 01 Café · 02 Bedroom · 03 Lake park | Skip
    const sep = nav.querySelector(".skip-sep");
    const navBtns = Scenes.map((S, i) => {
      const b = el("button", null, `<b>0${i + 1}</b>`); b.type = "button"; b.append(D.scenes[i].title);
      b.addEventListener("click", () => { if (!locked) { Nav.stop(); hold(); } goTo(i); });
      nav.insertBefore(b, sep); return b;
    });
    document.getElementById("expSkip").addEventListener("click", () => Nav.go(Fade.y(0)));
    nextBtn.addEventListener("click", () => { if (idx < last()) goTo(idx + 1); });
    const downBtn = document.getElementById("expDown");
    downBtn.addEventListener("click", () => Nav.go(Fade.y(0)));
    stage.addEventListener("scroll", () => { stage.scrollLeft = 0; stage.scrollTop = 0; });

    // never touches the sound setting: the visitor chose it at the gate / header button
    function turnOn(S) {
      if (S.on) return;
      S.on = true; S.sec.classList.add("on"); S.st.textContent = S.st.dataset.on;
    }
    function turnOff(S) { S.qT = 0; if (!S.on) return; S.on = false; S.sec.classList.remove("on"); S.st.textContent = S.st.dataset.off; }
    function goTo(i) { if (i === idx || slide) return; turnOff(Scenes[i]); pending = false; slide = { from: idx, to: i, t0: performance.now() }; }
    // the scene key works whenever the scenes are on screen: while they are still fading in it pins the stage first,
    // during a slide it is remembered and applied as soon as the new scene is in place
    let vis = 0, pending = false;
    function press() {
      if (vis < .3 && !locked) return false;
      if (!locked) { Nav.stop(); hold(); }
      if (slide) pending = true; else turnOn(Scenes[idx]);
      return true;
    }
    const lockY = () => top + LOCK * H;
    function hold() { locked = true; scrollTo({ top: lockY(), behavior: "instant" }); lastY = scrollY; }
    function release() { locked = false; }
    const nudge = n => { n.classList.remove("nudge"); void n.offsetWidth; n.classList.add("nudge"); };

    // one wheel / swipe / key step while held. returns false when the hold lets go (the page scrolls normally)
    function push(d) {
      if (!d || slide) return true;
      const S = Scenes[idx], now = performance.now();
      if (d > 0) {
        if (!S.on) { nudge(S.pr); return true; }
        if (S.qT < 1) { S.qT = Math.min(1, S.qT + d / (H * Q_RUN)); if (S.qT >= 1) { S.done = true; S.doneAt = now; } return true; }
        // the last scene moves on only by clicking "Product view" (or Skip / the menu), never by scrolling
        nudge(idx === last() ? downBtn : nextBtn); return true;
      }
      if (S.on && S.qT > 0) { S.qT = Math.max(0, S.qT + d / (H * Q_RUN)); if (S.qT <= 0) S.zeroAt = now; return true; }
      if (idx === 0 && now - S.zeroAt > EDGE_MS) { release(); return false; }
      return true;
    }
    addEventListener("wheel", e => {
      if (!locked || e.ctrlKey) return;
      const d = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? H : 1);
      if (push(d)) e.preventDefault();
    }, { passive: false });
    let ty = null;
    addEventListener("touchstart", e => { ty = e.touches[0].clientY; }, { passive: true });
    addEventListener("touchmove", e => {
      if (!locked || ty == null) return;
      const y = e.touches[0].clientY, d = (ty - y) * 1.5; ty = y;
      if (push(d) && e.cancelable) e.preventDefault();
    }, { passive: false });
    const STEP = { ArrowDown: .25, ArrowUp: -.25, PageDown: .8, PageUp: -.8 };
    addEventListener("keydown", e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // physical key position (e.code), so Korean input mode or caps lock still counts as A / K / M
      if (!e.repeat && e.code === "Key" + Scenes[slide ? slide.to : idx].press && press()) { e.preventDefault(); return; }
      if (!locked) return;
      const k = e.key === " " && !e.target.closest("button, [role=button]") ? (e.shiftKey ? -.8 : .8) : STEP[e.key];
      if (k != null && push(k * H)) e.preventDefault();
    });

    function size() {
      H = innerHeight; track.style.height = (SC_OUT[1] + 1) * H + "px";
      Scenes.forEach(S => S.size());
    }
    function read() {
      const r = track.getBoundingClientRect(), y = scrollY;
      top = y + r.top; s = -r.top / H; inView = r.bottom > 0 && r.top < H;
      if (locked) {
        const off = y - lockY();
        if (Math.abs(off) > H * .6) release();               // scrollbar dragged away
        else if (Math.abs(off) > 1) scrollTo({ top: lockY(), behavior: "instant" });
      } else if (!Nav.busy) {
        const L = lockY();
        // reached the scenes from above or below by scrolling (a jump of most of a screen at once, e.g. scrollbar or End key, passes)
        if (Math.abs(y - lastY) < H * .8 && ((lastY < L && y >= L) || (lastY > L && y <= L))) hold();
      }
      lastY = scrollY;
    }
    function frame(now) {
      const sc = locked ? LOCK : s;
      layerVis(turn, span(sc, ...TURN_IN) * (1 - span(sc, ...TURN_OUT)));
      const sv = span(sc, ...SC_IN) * (1 - span(sc, ...SC_OUT)); vis = inView ? sv : 0;
      layerVis(layer, sv);
      nav.classList.toggle("show", sv > .5);
      if (!inView || sv <= 0) { if (live) { live = null; Scenes.forEach(S => { S.active = false; S.video && S.video.pause(); }); updateBuses(); } return; }

      if (slide) {
        const t = clamp((now - slide.t0) / SLIDE_MS);
        pos = lerp(slide.from, slide.to, easeIO(t));
        if (t >= 1) { idx = slide.to; pos = idx; slide = null; if (pending) { pending = false; turnOn(Scenes[idx]); } }
      }
      strip.style.transform = `translate3d(${-pos * innerWidth}px, 0, 0)`;
      Scenes.forEach((S, i) => {
        const kt = S.on ? 1 : 0, qt = S.on ? S.qT : 0;
        S.kv += (kt - S.kv) * .06; if (Math.abs(kt - S.kv) < .002) S.kv = kt;
        S.qv += (qt - S.qv) * .1; if (Math.abs(qt - S.qv) < .002) S.qv = qt;
        if (S.kv !== S.k || S.qv !== S.q) S.onK(S.kv, S.qv);
        S.sec.classList.toggle("cue", locked && !slide && i === idx && S.on && S.qT < .06);
        if (Math.abs(i - pos) < 1) { if (S.video && S.video.loop && S.video.paused) S.video.play().catch(() => {}); S.frame(now); }
        else if (S.video && !S.video.paused) S.video.pause();
      });
      // cups wrap in further once connected, and ease back to rest while the next scene (not connected yet) slides in
      const a = Math.floor(pos), b = Math.ceil(pos);
      const wrap = ease(lerp(Scenes[a].kv, Scenes[b].kv, pos - a));
      const c = lerp(CUP_REST, 1, wrap) * cups[0].offsetWidth * .3;
      cups[0].style.transform = `translateX(${c}px)`; cups[1].style.transform = `translateX(${-c}px)`;
      const front = Scenes[Math.round(pos)];
      if (front !== live) { live = front; Scenes.forEach(S => { S.active = S === live; }); updateBuses(); }

      const cur = Scenes[idx];
      const finished = locked && !slide && cur.on && cur.qT >= 1;
      nextBtn.classList.toggle("show", finished && idx < last());
      downBtn.classList.toggle("show", finished && idx === last());
      navBtns.forEach((btn, i) => { btn.setAttribute("aria-current", String(i === (slide ? slide.to : idx))); btn.classList.toggle("done", Scenes[i].done); });
    }
    return { read, frame, size, release, turnY: () => top + .5 * H };
  })();

  /* ================= product: battery → parts → colour swap in place ================= */
  // each layer fades in (IN), holds (HOLD), fades out (OUT) through black; the last one stays and the stage scrolls on to Details.
  // the track overlaps the end of the experience track by one screen, so its black stage covers the faded-out scenes
  const Fade = (() => {
    const track = document.getElementById("product"), layers = [...track.querySelectorAll(".fl")];
    const IN = .45, HOLD = .9, OUT = .35, n = layers.length;
    const start = i => i * (IN + HOLD + OUT), end = start(n - 1) + IN + HOLD;
    let H = innerHeight, top = 0;
    function size() { H = innerHeight; track.style.height = (end + 1) * H + "px"; track.style.marginTop = -H + "px"; }
    function read() {
      const r = track.getBoundingClientRect(), s = -r.top / H; top = scrollY + r.top;
      layers.forEach((l, i) => {
        const a = start(i), v = span(s, a, a + IN) * (i < n - 1 ? 1 - span(s, a + IN + HOLD, a + IN + HOLD + OUT) : 1);
        layerVis(l, v, .9);
        if (l.id === "parts" && v < .05) partsReset();
      });
    }
    return { size, read, y: i => top + (start(i) + IN + .05) * H };
  })();

  /* ================= parts: pick a point → headphones slide left, elbow line to the close-up ================= */
  const partsReset = (() => {
    const sec = document.getElementById("parts"), dots = [...sec.querySelectorAll(".part-dot")];
    const panel = sec.querySelector(".part-panel"), pImg = panel.querySelector("img"), pTitle = panel.querySelector("h3"), pList = panel.querySelector("ul");
    const line = sec.querySelector(".parts-line path");
    // .parts-stage coordinates: headphones sit at x 3 once picked, close-up image's left edge middle, elbow column, row under the headphones
    const HP_X = 3, TO = [784, 226], ELBOW_X = 657, BELOW_Y = 663, R = 25;
    let cur = -1, swap = 0;
    function route(p) {
      const x = HP_X + p.x, y = p.y;
      if (p.route === "down") return `M${x} ${y + R}V${TO[1]}H${TO[0]}`;
      if (p.route === "below") return `M${x} ${y + R}V${BELOW_Y}H${ELBOW_X}V${TO[1]}H${TO[0]}`;
      return `M${x + R} ${y}H${ELBOW_X}V${TO[1]}H${TO[0]}`;
    }
    function draw(d, delay) {
      line.style.transition = "none"; line.setAttribute("d", d);
      const len = line.getTotalLength(); line.style.strokeDasharray = len; line.style.strokeDashoffset = len;
      line.getBoundingClientRect();
      line.style.transition = `stroke-dashoffset .7s ease ${delay}s`; line.style.strokeDashoffset = 0;
    }
    function fill(p) {
      pImg.src = p.img; pImg.alt = p.title + " 확대 사진"; pTitle.textContent = p.title;
      pList.replaceChildren(...p.points.map(t => { const li = document.createElement("li"); li.textContent = t; return li; }));
    }
    function reset() {
      cur = -1; clearTimeout(swap); sec.classList.remove("picked"); line.setAttribute("d", "");
      dots.forEach(d => d.setAttribute("aria-pressed", "false"));
    }
    function pick(i) {
      if (i === cur) { reset(); return; }
      const first = cur < 0, p = D.parts[i]; cur = i; clearTimeout(swap);
      dots.forEach((d, k) => d.setAttribute("aria-pressed", String(k === i)));
      if (first) { fill(p); panel.style.transitionDelay = ".45s"; sec.classList.add("picked"); draw(route(p), .75); return; }
      panel.style.transitionDelay = "0s"; panel.classList.add("swap");
      swap = setTimeout(() => { fill(p); panel.classList.remove("swap"); }, 200);
      draw(route(p), 0);
    }
    dots.forEach((d, i) => d.addEventListener("click", () => pick(i)));
    addEventListener("keydown", e => { if (e.key === "Escape" && cur >= 0) reset(); });
    D.parts.forEach(p => { new Image().src = p.img; }); // preload the close-ups
    return () => { if (cur >= 0) reset(); };
  })();

  /* ================= misc ================= */
  const rev = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); rev.unobserve(e.target); } }), { threshold: .2 });
  document.querySelectorAll(".reveal").forEach(n => rev.observe(n));
  // in-page links go through Nav so the experience hold does not catch them; pinned sections jump to where their layer is shown
  // #hero = end of the intro track, where the hero is fully built (the logo goes here, not back to the particle intro)
  const JUMP = { intro: () => 0, hero: () => introTrack.offsetTop + introTrack.offsetHeight - innerHeight, turn: () => Exp.turnY(), battery: () => Fade.y(0) };
  document.addEventListener("click", e => {
    const a = e.target.closest('a[href^="#"]'), go = a && JUMP[a.getAttribute("href").slice(1)];
    if (go) { e.preventDefault(); Nav.go(go()); }
  });
  document.getElementById("toTop").addEventListener("click", () => Nav.go(0));

  /* ================= menu ================= */
  const hdr = document.getElementById("hdr"), menuLinks = [...document.querySelectorAll(".menu a")];
  const expTrack = document.getElementById("experience"), prodTrack = document.getElementById("product"), lightSecs = [];
  function updateMenu() {
    const e = expTrack.getBoundingClientRect().top, p = prodTrack.getBoundingClientRect().top;
    const sec = p <= 0 ? "product" : e <= innerHeight * .5 ? "experience" : "home";
    menuLinks.forEach(a => a.setAttribute("aria-current", String(a.dataset.sec === sec)));
    // logo + menu stay hidden during the particle intro and appear once the hero is built (sound button always shown)
    const r = introTrack.getBoundingClientRect(), ip = -r.top / Math.max(1, r.height - innerHeight);
    hdr.classList.toggle("in-intro", ip < .96);
    hdr.classList.toggle("solid", lightSecs.some(s => { const r = s.getBoundingClientRect(); return r.top < 64 && r.bottom > 0; }));
  }

  // hero fades out while it scrolls away, so its photos' bottom edge never shows as a cut against the experience stage
  const introTrack = document.getElementById("intro"), introStage = introTrack.querySelector(".intro-stage");
  const heroLeave = () => { const gone = 1 - introTrack.getBoundingClientRect().bottom / innerHeight; introStage.style.opacity = (1 - easeIO(clamp(gone / .5))).toFixed(3); };

  addEventListener("scroll", () => { Intro.read(); heroLeave(); Exp.read(); Fade.read(); updateMenu(); }, { passive: true });
  addEventListener("resize", () => { Intro.build(); Intro.read(); Exp.size(); Fade.size(); Exp.read(); Fade.read(); });
  Promise.all([productImg, heroLogoImg].map(i => i.decode().catch(() => {}))).then(() => { Intro.build(); Intro.read(); });
  Exp.size(); Fade.size(); heroLeave(); Exp.read(); Fade.read(); updateMenu();

  function loop(now) {
    Intro.frame(now);
    Exp.frame(now);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
