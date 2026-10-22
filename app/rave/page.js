"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/* ============================================================
   UNKNOWN LOVERZ — side b
   ------------------------------------------------------------
   Two strangers meet at a rave, spend one hour on one pair of
   earphones, kiss once, and never exchange numbers. It is set
   as an open book: two dark pages meeting at a spine, fourteen
   plates cut from the inked pages in /public/comic.

   The reader's pointer drives an internal comic cursor that can
   only walk the panels in story order, leaving each through the
   exit its composition points at. The bottom of the left page
   is the only place the walk gives something back: push into the
   spine and the book turns. Fighting any other wall builds
   pressure — the print slips, the glass hairlines, and finally
   the whole spread shatters onto the hidden pier.

   The kiss is not a panel you pass. It takes the book off the
   screen and holds you there until it is finished.

   Pointer Lock is only requested on an explicit click, escape
   always works, and the free-cursor fallback enforces the same
   walk. The entrapment belongs to the artwork, not the OS.
   ============================================================ */

const SW = 1600;
const SH = 1000;

/* the open book */
const PAGE_Y = 30;
const PAGE_H = 940;
const PAGE_W = 760;
const PAGE_LX = 26;
const PAGE_RX = 814; // 28px spine between them

/* ---------- deterministic noise ---------- */
function hash2(i, j) {
  let h = (i * 374761393 + j * 668265263) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h >>> 0) / 4294967295;
}

function insideRect(r, x, y) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

/* ============================================================
   THE SPREAD — fourteen plates
   crop: fraction rect of the source plate (site chrome cut away)
   rect: placement on the 1600×1000 spread
   exit: side + band the story leaves through
   ============================================================ */
/* Every crop is cut to its panel's aspect. A crop shaped differently
   from the box it lands in gets centre-cropped by drawCover, and on a
   wide panel that quietly guillotines both characters' heads. */
const PANELS = [
  /* ---------- LEFT PAGE — inside. loud, cramped, many. ---------- */
  // the queue outside UNIT 7
  { p: 0, img: 2, crop: [0.006, 0.075, 0.988, 0.539],
    rect: { x: 46, y: 46, w: 720, h: 246 }, exit: { side: "b", a: 0.02, b: 0.55 },
    music: { kw: ["tral", "fork"], lowpass: 2200, gain: 0.6 } },

  // she comes through the crowd
  { p: 0, img: 3, crop: [0.22, 0.022, 0.69, 0.512],
    rect: { x: 46, y: 306, w: 452, h: 210 }, exit: { side: "r", a: 0.15, b: 0.85 },
    music: { kw: ["rave", "acid", "quad"], lowpass: 0, gain: 0.88 } },

  // his lenses
  { p: 0, img: 3, crop: [0.03, 0.548, 0.328, 0.437],
    rect: { x: 514, y: 306, w: 252, h: 210 }, exit: { side: "b", a: 0.1, b: 0.9 },
    music: { samePrev: true, lowpass: 0, gain: 0.8 } },

  // he says something. it is one dash long.
  { p: 0, img: 3, crop: [0.392, 0.60, 0.596, 0.198],
    rect: { x: 46, y: 530, w: 720, h: 150 }, exit: { side: "b", a: 0.02, b: 0.45 },
    music: { kw: ["chaos", "riff"], lowpass: 0, gain: 0.72 } },

  // the drop. "you lose something?" / "apparently."
  { p: 0, img: 4, crop: [0.008, 0.17, 0.637, 0.672],
    rect: { x: 46, y: 694, w: 380, h: 251 }, exit: { side: "r", a: 0.0, b: 0.5 },
    music: { kw: ["pearls", "22"], lowpass: 0, gain: 0.55 } },

  { p: 0, img: 4, crop: [0.70, 0.335, 0.253, 0.147],
    rect: { x: 442, y: 694, w: 324, h: 118 }, exit: { side: "b", a: 0.15, b: 0.85 },
    music: { samePrev: true, lowpass: 5200, gain: 0.42 } },

  // "tragic." she picks it up anyway
  { p: 0, img: 4, crop: [0.655, 0.72, 0.337, 0.198],
    rect: { x: 442, y: 826, w: 324, h: 119 },
    exit: { side: "r", a: 0.1, b: 0.9, turn: true }, // into the spine
    music: { kw: ["bimbongo", "milk"], lowpass: 0, gain: 0.5 } },

  /* ---------- RIGHT PAGE — outside. wider, slower, fewer. ---------- */
  // WHAT— CAN'T— YOUR— BASS. an entire conversation, unheard.
  { p: 1, img: 5, crop: [0.005, 0.20, 0.487, 0.387],
    rect: { x: 834, y: 46, w: 466, h: 232 }, exit: { side: "r", a: 0.12, b: 0.82 },
    music: { kw: ["quad", "chaos"], lowpass: 0, gain: 0.82 } },

  // so they stop trying to talk
  { p: 1, img: 5, crop: [0.508, 0.075, 0.487, 0.77],
    rect: { x: 1316, y: 46, w: 238, h: 232 }, exit: { side: "b", a: 0.1, b: 0.9 },
    music: { kw: ["donkey", "rave"], lowpass: 0, gain: 0.98 } },

  // the fire door. crossing it swings the filter.
  { p: 1, img: 6, crop: [0.005, 0.16, 0.99, 0.439],
    rect: { x: 834, y: 292, w: 720, h: 200 }, exit: { side: "b", a: 0.05, b: 0.6 },
    music: { samePrev: true, lowpass: 0, gain: 0.7 } },

  // "this one." one earphone each
  { p: 1, img: 7, crop: [0.19, 0.10, 0.805, 0.414],
    rect: { x: 834, y: 506, w: 720, h: 232 }, exit: { side: "b", a: 0.05, b: 0.5 },
    music: { kw: ["suzanne", "22"], lowpass: 0, gain: 0.46, dry: true, pan: -0.16 } },

  // 11:38 PM ———— 12:36 AM. the hour, as a filmstrip.
  { p: 1, img: 8, crop: [0.015, 0.125, 0.97, 0.12],
    rect: { x: 834, y: 752, w: 720, h: 56 }, exit: { side: "b", a: 0.02, b: 0.36 },
    music: { samePrev: true, lowpass: 0, gain: 0.38, dry: true, pan: 0.12 } },

  /* THE KISS — the smallest box on the spread, on purpose.
     It does not stay in it. */
  { p: 1, img: 8, crop: [0.322, 0.418, 0.33, 0.243], kiss: true,
    rect: { x: 834, y: 822, w: 262, h: 123 }, exit: { side: "r", a: 0.1, b: 0.9 },
    music: { samePrev: true, lowpass: 300, gain: 0.08 } },

  // "see you." / "yeah."
  { p: 1, img: 8, crop: [0.13, 0.665, 0.746, 0.33],
    rect: { x: 1110, y: 822, w: 444, h: 123 }, exit: null,
    music: { samePrev: true, lowpass: 900, gain: 0.2 } },
];

const KISS_IDX = PANELS.findIndex((p) => p.kiss);

const INK = "#efece2";
const RED = "#c33a28";

/* ============================================================
   AUDIO — one psychoacoustic environment
   deck: element → lowpass → panner → gain → destination
   ============================================================ */
/* Archive items, healthiest first. AphexTwinAllUser18081971SoundcloudTracks
   is deliberately absent: it currently answers 503 for every file, which
   silently pinned the decks at readyState 0 — audio that looks like it is
   playing and never makes a sound. */
const ITEMS = ["aphex_twin_user18081971_soundcloud", "user48736353001"];
/* The pier plays the actual song: Frank Ocean's Moon River, streamed
   through YouTube's official embed (Frank Ocean - Topic upload), which
   is the licensed route — we never host the recording. If the embed is
   blocked or errors, the pier falls back to the archive ambient. */
const MOON_RIVER_YT = "MEZCknGf1E4";

/* Module-level, deliberately. React's dev StrictMode mounts every effect
   twice, so an engine that fetched its own catalogue fetched it four
   times and left a second pair of <audio> elements streaming MP3s
   behind it — two records downloading while the reader is still looking
   at the cover. The catalogue is fetched once per page load, full stop. */
let poolPromise = null;
function archivePool() {
  if (poolPromise) return poolPromise;
  poolPromise = Promise.allSettled(
    ITEMS.map((item) =>
      fetch(`https://archive.org/metadata/${item}`)
        .then((r) => r.json())
        .then((j) =>
          (j.files || [])
            .filter((f) => f.name && f.name.toLowerCase().endsWith(".mp3"))
            .map((f) => ({
              url: `https://archive.org/download/${item}/${encodeURIComponent(f.name)}`,
              title: f.name.replace(/\.mp3$/i, "").replace(/^\d+[\s-]*\d*[\s-]*/, "").trim(),
            }))
        )
    )
  ).then((rs) => {
    const seen = new Set();
    return rs
      .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
      .filter((tk) => {
        const k = tk.title.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
  });
  return poolPromise;
}

/* Plates are fetched once each and only when the story is about to need
   them. Seven images pulled the moment the page mounts is seven images
   competing with the page's own JavaScript for a reader who has not
   clicked anything yet. */
const plateCache = new Map();
function loadPlate(n) {
  if (plateCache.has(n)) return plateCache.get(n);
  const pr = new Promise((res) => {
    const el = new Image();
    el.onload = () => res(el);
    el.onerror = () => res(null);
    el.src = `/comic/ref${n}.webp`;
  });
  plateCache.set(n, pr);
  return pr;
}

function makeAudioEngine() {
  const state = { ctx: null, pool: [], decks: [], live: 0, onTitle: null, started: false };

  /* The media elements are built now, not at start(). Web Audio only needs
     the context for wiring, and creating them early means panel one's
     record can be buffering while the reader is still on the cover — the
     element that warms up is the element that plays. */
  for (let i = 0; i < 2; i++) {
    const el = new Audio();
    el.crossOrigin = "anonymous";
    el.preload = "auto";
    el.loop = true;
    const rotate = () => {
      const d = state.decks[state.live];
      if (!d || d.el !== el || !state.started) return;
      if (state.rotations > 6) return;
      state.rotations = (state.rotations || 0) + 1;
      const alt = pick(null, (state.rotations + 1) * 13);
      if (!alt) return;
      el.src = alt.url;
      el.play().catch(() => {});
      state.onTitle?.(alt.title);
    };
    // only a real error rotates. `stalled` fires while a file is still
    // legitimately buffering, and rotating on it aborts the in-flight
    // load, which stalls again — a loop that never plays anything.
    el.addEventListener("error", rotate);
    el.addEventListener("playing", () => (state.rotations = 0));
    state.decks.push({ el, lp: null, pan: null, g: null, url: "" });
  }

  const loadPool = archivePool().then((pool) => {
    if (state.dead) return;
    state.pool = pool;
    // Archive can take ten seconds to begin streaming. Buffer panel one's
    // record now so the book never opens onto silence — one stream, and
    // only after the engine is known to still be alive.
    const first = pick(PANELS[0].music.kw, 3);
    if (first) {
      state.warm = first;
      // deck 1 is where panel one lands (live starts at 0, panel() flips)
      const d = state.decks[1];
      d.el.src = first.url;
      d.url = first.url;
      d.el.load();
    }
  });

  function pick(kw, seed) {
    const pool = state.pool;
    if (!pool.length) return null;
    if (kw) {
      for (const k of kw) {
        const hits = pool.filter((tk) => tk.title.toLowerCase().includes(k));
        if (hits.length) return hits[Math.floor(hash2(seed, 17) * hits.length)];
      }
    }
    return pool[Math.floor(hash2(seed * 31 + 7, 23) * pool.length)];
  }

  function start() {
    if (state.started) return;
    state.started = true;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    state.ctx = ctx;
    state.decks.forEach((d) => {
      const src = ctx.createMediaElementSource(d.el);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 20000;
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(lp);
      if (pan) {
        lp.connect(pan);
        pan.connect(g);
      } else lp.connect(g);
      g.connect(ctx.destination);
      d.lp = lp;
      d.pan = pan;
      d.g = g;
    });
    ctx.resume();
  }

  async function panel(idx) {
    if (!state.started) return;
    await loadPool;
    const cfg = PANELS[idx].music;
    const now = state.ctx.currentTime;
    const cur = state.decks[state.live];
    if (cfg.samePrev && cur.url) {
      cur.lp.frequency.setTargetAtTime(cfg.lowpass || 20000, now, 0.35);
      cur.g.gain.setTargetAtTime(cfg.gain, now, 0.45);
      if (cur.pan) cur.pan.pan.setTargetAtTime(cfg.pan || 0, now, 0.4);
      return;
    }
    // panel one plays the record we already buffered
    const track = idx === 0 && state.warm ? state.warm : pick(cfg.kw, idx + 3);
    if (!track) return;
    const nextIdx = 1 - state.live;
    const nxt = state.decks[nextIdx];
    // re-assigning src would throw away the bytes we already buffered
    if (nxt.el.src !== track.url) {
      nxt.el.src = track.url;
      nxt.url = track.url;
    }
    nxt.lp.frequency.setValueAtTime(cfg.lowpass || 20000, now);
    if (nxt.pan) nxt.pan.pan.setValueAtTime(cfg.pan || 0, now);
    nxt.el.play().catch(() => {});
    nxt.g.gain.cancelScheduledValues(now);
    nxt.g.gain.setValueAtTime(0.0001, now);
    nxt.g.gain.setTargetAtTime(cfg.gain, now, cfg.dry ? 0.9 : 0.55);
    cur.g.gain.setTargetAtTime(0.0001, now, 0.5);
    state.live = nextIdx;
    state.onTitle?.(track.title);
    setTimeout(() => {
      const old = state.decks[1 - state.live];
      if (old !== state.decks[state.live]) old.el.pause();
    }, 3000);
    // archive nodes 500 intermittently — if nothing is audibly rolling
    // after four seconds, deal a different record
    setTimeout(() => {
      if (state.decks[state.live] === nxt && nxt.el.readyState === 0) {
        const alt = pick(null, idx * 7 + 11);
        if (alt) {
          nxt.el.src = alt.url;
          nxt.url = alt.url;
          nxt.el.play().catch(() => {});
          state.onTitle?.(alt.title);
        }
      }
    }, 4000);
  }

  /* the fire-door: cursor position physically swings the filter */
  function doorMix(p01) {
    if (!state.ctx || state.kissNodes) return;
    const now = state.ctx.currentTime;
    const d = state.decks[state.live];
    const f = 20000 - p01 * (20000 - 240);
    d.lp.frequency.setTargetAtTime(Math.max(240, f), now, 0.08);
    d.g.gain.setTargetAtTime(0.7 - p01 * 0.42, now, 0.1);
  }

  /* the kiss: the room is still there, four walls away. what is left
     is the ring your ears make after a night of it. */
  function kiss() {
    if (!state.ctx || state.kissNodes) return;
    const ctx = state.ctx;
    const now = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    g.gain.setTargetAtTime(0.075, now, 1.1);
    const oscs = [61.74, 92.5, 3140].map((f, i) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = i === 2 ? 0.11 : 1; // the tinnitus sits far under
      o.connect(og);
      og.connect(g);
      o.start();
      return o;
    });
    g.connect(ctx.destination);
    state.kissNodes = { g, oscs };
  }

  function unkiss() {
    if (!state.ctx || !state.kissNodes) return;
    const { g, oscs } = state.kissNodes;
    state.kissNodes = null;
    const now = state.ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setTargetAtTime(0.0001, now, 0.5);
    oscs.forEach((o) => o.stop(now + 2.4));
  }

  /* the spine takes the weight of the page coming over */
  function thump() {
    if (!state.ctx) return;
    const ctx = state.ctx;
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(120, now);
    o.frequency.exponentialRampToValueAtTime(38, now + 0.28);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.34, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(now + 0.5);
    staticBurst(0.05);
  }

  function crack(hard) {
    if (!state.ctx) return;
    const ctx = state.ctx;
    const n = hard ? 10 : 1;
    for (let i = 0; i < n; i++) {
      const t0 = ctx.currentTime + i * 0.028 * Math.random();
      const buf = ctx.createBuffer(1, 2205, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let k = 0; k < d.length; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / d.length, 2.4);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = hard ? 1800 + Math.random() * 5200 : 3200 + Math.random() * 3000;
      bp.Q.value = 9;
      const g = ctx.createGain();
      g.gain.value = hard ? 0.5 : 0.3;
      src.connect(bp);
      bp.connect(g);
      g.connect(ctx.destination);
      src.start(t0);
    }
    if (hard) {
      const o = ctx.createOscillator();
      o.frequency.value = 46;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.5, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.75);
    }
  }

  function staticBurst(len = 0.12) {
    if (!state.ctx) return;
    const ctx = state.ctx;
    const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * len)), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let k = 0; k < d.length; k++) d[k] = (Math.random() * 2 - 1) * 0.5;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1400;
    const g = ctx.createGain();
    g.gain.value = 0.13;
    src.connect(hp);
    hp.connect(g);
    g.connect(ctx.destination);
    src.start();
  }

  function fadeAll(sec = 0.5) {
    if (!state.ctx) return;
    unkiss();
    const now = state.ctx.currentTime;
    state.decks.forEach((d) => d.g.gain.setTargetAtTime(0.0001, now, sec / 3));
  }

  async function pier() {
    if (!state.started) return;
    await loadPool;
    const now = state.ctx.currentTime;
    const nextIdx = 1 - state.live;
    const nxt = state.decks[nextIdx];
    const url = pick(["suzanne", "pearls", "22"], 99)?.url;
    if (!url) return;
    nxt.el.src = url;
    nxt.url = url;
    nxt.lp.frequency.setValueAtTime(820, now);
    if (nxt.pan) nxt.pan.pan.setValueAtTime(0, now);
    nxt.el.play().catch(() => {});
    nxt.g.gain.setValueAtTime(0.0001, now);
    nxt.g.gain.setTargetAtTime(0.3, now, 1.6);
    state.decks[state.live].g.gain.setTargetAtTime(0.0001, now, 0.5);
    state.live = nextIdx;
    state.onTitle?.("(standing in for moon river)");
  }

  const api = {
    state, start, panel, doorMix, crack, staticBurst, fadeAll, pier, kiss, unkiss, thump,
    stop: () => state.decks.forEach((d) => d.el.pause()),
    /* A paused <audio> with a src keeps its buffer and keeps the
       connection warm. On teardown the elements have to be emptied or a
       discarded engine goes on streaming in the background. */
    destroy: () => {
      state.dead = true;
      state.decks.forEach((d) => {
        d.el.pause();
        d.el.removeAttribute("src");
        try {
          d.el.load();
        } catch {}
      });
      state.ctx?.close().catch(() => {});
    },
    // read the live deck's clock — used to prove sound is actually rolling
    probe: () => {
      const d = state.decks[state.live];
      return d
        ? { t: d.el.currentTime, paused: d.el.paused, gain: d.g?.gain.value, ctx: state.ctx?.state }
        : null;
    },
  };
  if (typeof window !== "undefined") window.__cxAudio = api;
  return api;
}

/* ============================================================
   drawImage with cover semantics for a fractional source crop
   ============================================================ */
function drawCover(ctx, img, crop, dw, dh) {
  const sx = crop[0] * img.naturalWidth;
  const sy = crop[1] * img.naturalHeight;
  const sw = crop[2] * img.naturalWidth;
  const sh = crop[3] * img.naturalHeight;
  const scale = Math.max(dw / sw, dh / sh);
  const usedW = dw / scale;
  const usedH = dh / scale;
  const ox = sx + (sw - usedW) / 2;
  const oy = sy + (sh - usedH) / 2;
  ctx.drawImage(img, ox, oy, usedW, usedH, 0, 0, dw, dh);
}

/* a light second-generation-photocopy pass so every plate sits in
   the same print run. Subtle: the art carries its own texture. */
function xeroxLite(c, w, h, seed) {
  if (hash2(seed, 1) > 0.5) {
    const x = hash2(seed, 3) * w;
    c.save();
    c.globalCompositeOperation = "destination-out";
    c.fillStyle = "rgba(0,0,0,0.35)";
    for (let y = 0; y < h; y += 3) {
      if (hash2(Math.floor(y / 3), seed) > 0.55) continue;
      c.fillRect(x + Math.sin(y * 0.04) * 2, y, 1.5, 3);
    }
    c.restore();
  }
  c.strokeStyle = "rgba(239,236,226,0.2)";
  c.lineWidth = 0.7;
  for (let i = 0; i < 3; i++) {
    const x1 = hash2(seed * 3 + i, 11) * w;
    const y1 = hash2(seed * 5 + i, 13) * h;
    const a = hash2(seed * 7 + i, 17) * Math.PI;
    const len = 16 + hash2(i, seed) * 60;
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x1 + Math.cos(a) * len, y1 + Math.sin(a) * len);
    c.stroke();
  }
  const g = c.createLinearGradient(0, 0, w, h);
  const dark = 0.05 + hash2(seed, 21) * 0.07;
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${dark})`);
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
}

/* ============================================================
   THE KISS — it does not stay in its panel
   A fixed layer that takes the whole screen, holds, and lets go.
   ============================================================ */
/* Drawn once, then left alone. The old version repainted a full-viewport
   canvas — five million pixels at 2× — sixty times a second for five
   seconds, to show a still frame. The push-in, the bloom and the flash
   are all CSS on a static bitmap now, and the hold is short: it should
   land like a held breath, not a slideshow. */
function KissLayer({ img, crop, onDone }) {
  const ref = useRef(null);
  const [release, setRelease] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRelease(true), 2300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !img) return;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const draw = () => {
      const W = Math.min(window.innerWidth * 0.86, window.innerHeight * 1.9);
      const H = W / 2.13;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      const ctx = canvas.getContext("2d");
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      drawCover(ctx, img, crop, W, H);
      // the grain is baked in, not animated — the print stops breathing
      ctx.globalAlpha = 0.035;
      for (let i = 0; i < 90; i++) {
        ctx.fillStyle = INK;
        ctx.fillRect(hash2(i, 5) * W, hash2(i * 3, 7) * H, 1.4, 1.4);
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgba(239,236,226,0.45)";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
    };
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [img, crop]);

  return (
    <div className="cxKiss">
      <div className="cxKissFrame">
        <canvas ref={ref} className="cxKissCanvas" />
        {/* his blue and her pink, the only colour in the book */}
        <i className="cxKissBlue" />
        <i className="cxKissPink" />
      </div>
      <i className="cxKissFlash" />
      {release && (
        <button className="cxKissOut" onClick={onDone}>
          ⟶
        </button>
      )}
    </div>
  );
}

/* ============================================================
   THE PIER — the broken state
   ============================================================ */
function Pier({ audio, onReturn }) {
  const ref = useRef(null);
  const ytRef = useRef(null);
  const [showBack, setShowBack] = useState(false);

  /* Moon River. YouTube IFrame API into a hidden mount; if it isn't
     audibly playing within a few seconds, the archive ambient stands in. */
  useEffect(() => {
    let dead = false;
    let fellBack = false;
    const fallback = () => {
      if (dead || fellBack) return;
      fellBack = true;
      audio?.pier();
    };
    const guard = setTimeout(fallback, 4500);
    const boot = () => {
      if (dead) return;
      try {
        ytRef.current = new window.YT.Player("cx-yt-mount", {
          videoId: MOON_RIVER_YT,
          playerVars: { autoplay: 1, controls: 0, disablekb: 1, rel: 0, playsinline: 1 },
          events: {
            onReady: (e) => {
              e.target.unMute();
              e.target.setVolume(65);
              e.target.playVideo();
            },
            onStateChange: (e) => {
              if (e.data === window.YT?.PlayerState?.PLAYING) {
                clearTimeout(guard);
                audio?.fadeAll(0.8);
                audio?.state?.onTitle?.("moon river — frank ocean");
              }
              if (e.data === window.YT?.PlayerState?.ENDED) e.target.playVideo();
            },
            onError: fallback,
          },
        });
      } catch {
        fallback();
      }
    };
    if (window.YT?.Player) boot();
    else {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        boot();
      };
      document.body.appendChild(s);
    }
    return () => {
      dead = true;
      clearTimeout(guard);
      try {
        ytRef.current?.destroy?.();
      } catch {}
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("cx_pier", "1");
    } catch {}
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = "/comic/ref9.webp";
    let raf;
    let W = 0;
    let H = 0;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const size = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    size();
    window.addEventListener("resize", size);
    const backTimer = setTimeout(() => setShowBack(true), 14000);

    let glitchUntil = 0;
    let glitchBands = [];
    let strips = [];
    let holdFrame = 0;
    let last = 0;
    let t = 0;

    function frame(ts) {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(60, ts - last) : 16;
      last = ts;
      if (holdFrame > 0) {
        holdFrame -= dt; // image persistence: the frame simply stays
        return;
      }
      t += dt / 1000;
      if (!img.complete) return;

      const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const uw = W / scale;
      const uh = H / scale;
      const ox = (img.naturalWidth - uw) / 2;
      const oy = (img.naturalHeight - uh) / 2;
      ctx.drawImage(img, ox, oy, uw, uh, 0, 0, W, H);

      // the water breathes: slow raster displacement over the river band
      for (let b = 0; b < 4; b++) {
        const y = H * (0.66 + b * 0.05);
        const dx = Math.sin(t * (0.4 + b * 0.13) + b * 2.1) * (2 + b);
        const band = ctx.getImageData(0, y * DPR, W * DPR, Math.max(1, 6 * DPR));
        ctx.putImageData(band, dx * DPR, y * DPR);
      }

      // dropped static: vertical missing strips + raster displacement
      if (ts > glitchUntil && Math.random() < 0.007) {
        glitchUntil = ts + 100 + Math.random() * 160;
        glitchBands = Array.from({ length: 2 + Math.floor(Math.random() * 2) }, () => ({
          y: Math.random() * H,
          h: 5 + Math.random() * 22,
          dx: (Math.random() - 0.5) * 36,
        }));
        strips = Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => ({
          x: Math.random() * W,
          w: 2 + Math.random() * 9,
        }));
        audio?.staticBurst();
        if (Math.random() < 0.3) holdFrame = 100 + Math.random() * 220;
      }
      if (ts < glitchUntil) {
        glitchBands.forEach(({ y, h, dx }) => {
          const band = ctx.getImageData(0, y * DPR, W * DPR, Math.max(1, h * DPR));
          ctx.putImageData(band, dx * DPR, y * DPR);
        });
        ctx.fillStyle = "#000";
        strips.forEach(({ x, w }) => ctx.fillRect(x, 0, w, H));
      }

      // a flower fragment trying to render, failing
      if (Math.random() < 0.012) {
        const fx = W * (0.1 + Math.random() * 0.8);
        const fy = H * (0.15 + Math.random() * 0.6);
        ctx.strokeStyle = "rgba(239,236,226,0.5)";
        ctx.lineWidth = 1;
        const s = 4 + Math.random() * 8;
        for (let p = 0; p < 5; p++) {
          if (Math.random() > 0.55) continue; // half-rendered
          const a = (p / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(fx + Math.cos(a) * s * 0.6, fy + Math.sin(a) * s * 0.6, s * 0.5, s * 0.24, a, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 0.04;
      for (let i = 0; i < 80; i++) {
        ctx.fillStyle = INK;
        ctx.fillRect(hash2(i, Math.floor(t * 12)) * W, hash2(i * 3, Math.floor(t * 12)) * H, 1.4, 1.4);
      }
      ctx.globalAlpha = 1;
    }
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(backTimer);
      window.removeEventListener("resize", size);
    };
  }, []);

  return (
    <div className="cxPier">
      <canvas ref={ref} className="cxPierCanvas" />
      <div className="cxYtMount">
        <div id="cx-yt-mount" />
      </div>
      {/* no captions. no explanation of who this is. */}
      {showBack && (
        <button className="cxSideA" onClick={onReturn}>
          side a_
        </button>
      )}
      <Link href="/" className="cxHome">
        ⟵ refoldered.com_
      </Link>
    </div>
  );
}

/* ============================================================
   THE BOOK
   ============================================================ */
export default function RavePage() {
  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const glassRef = useRef(null);
  const cursorRef = useRef(null);
  const edgeRef = useRef(null);
  const panelRefs = useRef([]);
  const audioRef = useRef(null);
  const imagesRef = useRef({});
  const platesRef = useRef([]);
  const kissDoneRef = useRef(null);

  const [phase, setPhase] = useState("cover"); // cover | comic | pier
  const [scale, setScale] = useState(1);
  const [nowPlaying, setNowPlaying] = useState("");
  const [lockLost, setLockLost] = useState(false);
  const [pierSeen, setPierSeen] = useState(false);
  const [kissOn, setKissOn] = useState(false);
  const [tooSmall, setTooSmall] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fit = () => {
      setScale(Math.min(window.innerWidth / (SW + 24), window.innerHeight / (SH + 24)));
      /* A spread this dense scaled to a phone is 380px of unreadable
         grey. Same position as the poster takes on the front page. */
      setTooSmall(window.innerWidth < 900 || !window.matchMedia("(pointer: fine)").matches);
    };
    fit();
    window.addEventListener("resize", fit);
    try {
      setPierSeen(!!localStorage.getItem("cx_pier"));
    } catch {}
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    const eng = makeAudioEngine();
    eng.state.onTitle = setNowPlaying;
    audioRef.current = eng;
    return () => {
      if (audioRef.current === eng) audioRef.current = null;
      eng.destroy();
    };
  }, []);

  /* Develop plates on demand. `ensure` is called for the panel being
     entered and the two after it, so the artwork lands a beat before the
     story needs it and never all at once. Nothing here gates the cover —
     a cover that waits on the whole book is a cover people get stuck on. */
  const ensureRef = useRef(null);
  useEffect(() => {
    let cancelled = false;

    const develop = (n, im) => {
      if (cancelled) return;
      imagesRef.current[n] = im;
      PANELS.forEach((p, i) => {
        if (p.img !== n || platesRef.current[i]) return;
        const plate = document.createElement("canvas");
        plate.width = p.rect.w;
        plate.height = p.rect.h;
        const c = plate.getContext("2d");
        c.fillStyle = "#000";
        c.fillRect(0, 0, p.rect.w, p.rect.h);
        if (im) drawCover(c, im, p.crop, p.rect.w, p.rect.h);
        xeroxLite(c, p.rect.w, p.rect.h, i + 2);
        platesRef.current[i] = plate;
        const cv = panelRefs.current[i];
        if (cv) {
          cv.width = p.rect.w;
          cv.height = p.rect.h;
          cv.getContext("2d").drawImage(plate, 0, 0);
        }
      });
    };

    // one at a time, so decoding never lands two images on one frame
    let chain = Promise.resolve();
    const asked = new Set();
    ensureRef.current = (idx) => {
      for (let k = idx; k < Math.min(idx + 3, PANELS.length); k++) {
        const n = PANELS[k].img;
        if (asked.has(n)) continue;
        asked.add(n);
        chain = chain.then(() => (cancelled ? null : loadPlate(n).then((im) => develop(n, im))));
      }
    };

    return () => {
      cancelled = true;
      ensureRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (phase !== "comic") return;
    const root = rootRef.current;
    const stage = stageRef.current;
    const glass = glassRef.current;
    const gctx = glass.getContext("2d");
    glass.width = SW;
    glass.height = SH;
    const cursorEl = cursorRef.current;
    const edgeEl = edgeRef.current;
    const audio = audioRef.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const st = {
      cur: 0,
      pos: [PANELS[0].rect.x + PANELS[0].rect.w / 2, PANELS[0].rect.y + PANELS[0].rect.h / 2],
      pressure: 0,
      cracks: [],
      armedAt: performance.now() + 1600,
      found: false, // the gum, on the drop panel
      shattering: null,
      snapshot: null,
      done: false,
      locked: false,
      turning: false,
      inKiss: false,
      lastDir: 0,
      lastMoveAt: 0,
      reversals: 0,
    };
    audio.panel(0);
    panelRefs.current.forEach((el, i) => el && el.classList.toggle("cxOn", i === 0));

    window.__cx = {
      arm: () => {
        st.armedAt = 0;
        st.found = true;
      },
      advance: () => enterPanel(Math.min(st.cur + 1, PANELS.length - 1)),
      goto: (i) => enterPanel(i),
      crack: () => addCrack(),
      finish: () => finish("finished"),
      state: () => ({ cur: st.cur, cracks: st.cracks.length, locked: st.locked, kiss: st.inKiss }),
    };

    const wantLock = () => {
      try {
        stage.requestPointerLock?.()?.catch?.(() => {});
      } catch {
        /* the free-cursor fallback still enforces the walk */
      }
    };
    const onLockChange = () => {
      st.locked = document.pointerLockElement === stage;
      setLockLost(!st.locked && !st.done && !st.inKiss);
    };
    document.addEventListener("pointerlockchange", onLockChange);
    onLockChange(); // the entry click may have locked us already

    /* no arrows. once the panel has been looked at, the edge the story
       leaves through starts to breathe — laid out once, pulsed in CSS. */
    function layoutEdge() {
      if (!edgeEl) return;
      const p = PANELS[st.cur];
      const armed = performance.now() >= st.armedAt - 16 && (st.cur !== 4 || st.found);
      if (!p.exit || !armed || st.done || st.inKiss) {
        edgeEl.style.opacity = "0";
        return;
      }
      const { x, y, w, h } = p.rect;
      const { side, a, b } = p.exit;
      const vert = side === "r" || side === "l";
      edgeEl.style.left = `${side === "r" ? x + w - 3 : side === "l" ? x : x + w * a}px`;
      edgeEl.style.top = `${vert ? y + h * a : side === "b" ? y + h - 3 : y}px`;
      edgeEl.style.width = `${vert ? 3 : w * (b - a)}px`;
      edgeEl.style.height = `${vert ? h * (b - a) : 3}px`;
      edgeEl.style.opacity = "1";
    }

    function enterPanel(i) {
      st.cur = i;
      ensureRef.current?.(i);
      const r = PANELS[i].rect;
      st.pos = [r.x + r.w / 2, r.y + r.h / 2];
      st.armedAt = performance.now() + (i === 11 ? 2600 : i === 4 ? 2000 : 1400);
      st.found = i !== 4;
      st.repaint = true; // static plates redraw exactly once, here
      if (edgeEl) edgeEl.style.opacity = "0";
      clearTimeout(st.edgeTimer);
      st.edgeTimer = setTimeout(layoutEdge, Math.max(0, st.armedAt - performance.now()));
      cursorEl?.classList.toggle("cxLens", i === 2); // his lenses refract it
      audio.panel(i);
      panelRefs.current.forEach((el, k) => {
        if (!el) return;
        el.classList.toggle("cxOn", k === i);
        el.classList.toggle("cxSeen", k < i);
      });

      if (PANELS[i].kiss) {
        // it leaves the page. everything else stops.
        st.inKiss = true;
        if (edgeEl) edgeEl.style.opacity = "0";
        setLockLost(false);
        document.exitPointerLock?.();
        audio.kiss();
        setKissOn(true);
        return;
      }
      if (i === PANELS.length - 1) {
        setTimeout(() => {
          if (!st.shattering && !st.done) finish("finished");
        }, 8000);
      }
    }

    // the kiss hands control back here
    kissDoneRef.current = () => {
      setKissOn(false);
      st.inKiss = false;
      audio.unkiss();
      audio.panel(KISS_IDX);
      st.armedAt = performance.now() + 900;
      st.repaint = true;
      clearTimeout(st.edgeTimer);
      st.edgeTimer = setTimeout(layoutEdge, 900);
      if (window.matchMedia("(pointer: fine)").matches) wantLock();
    };

    function exitAllowed(cand) {
      const p = PANELS[st.cur];
      if (!p.exit) return false;
      const { x, y, w, h } = p.rect;
      const { side, a, b } = p.exit;
      const fx = (cand[0] - x) / w;
      const fy = (cand[1] - y) / h;
      if (side === "r" && cand[0] > x + w) return fy > a && fy < b;
      if (side === "l" && cand[0] < x) return fy > a && fy < b;
      if (side === "b" && cand[1] > y + h) return fx > a && fx < b;
      if (side === "t" && cand[1] < y) return fx > a && fx < b;
      return false;
    }

    function addCrack() {
      st.cracks.push({ x: st.pos[0], y: st.pos[1], seed: st.cracks.length * 7 + 3 });
      const n = st.cracks.length;
      audio.crack(false);
      if (n >= 2) audio.staticBurst(0.07);
      if (n >= 3) {
        [st.cur - 1, st.cur + 1]
          .filter((k) => k >= 0 && k < PANELS.length)
          .forEach((k) => {
            const el = panelRefs.current[k];
            if (!el) return;
            el.classList.add("cxMisreg");
            setTimeout(() => el.classList.remove("cxMisreg"), 260);
          });
      }
      stage.classList.remove("cxShake");
      void stage.offsetWidth;
      stage.classList.add("cxShake");
      if (n >= 7) shatter();
    }

    /* the one place the walk gives instead of takes: push into the
       spine and the book turns over to the other page. */
    function turnPage(next) {
      if (st.turning) return;
      st.turning = true;
      root.classList.add("cxTurning");
      audio.thump();
      setTimeout(() => {
        root.classList.remove("cxTurning");
        st.turning = false;
        enterPanel(next);
      }, 620);
    }

    function move(dx, dy) {
      if (st.done || st.turning || st.inKiss) return;
      /* The unlocked fallback reports absolute jumps, not deltas: one flick
         of the OS pointer across the desk arrives as a single 900px move.
         Un-clamped that banks a whole crack per flick, so seven idle flicks
         break the book without the reader ever fighting it. The comic
         cursor moves at a hand's pace or not at all. */
      const step = Math.hypot(dx, dy);
      if (step > 48) {
        dx = (dx / step) * 48;
        dy = (dy / step) * 48;
      }
      const now = performance.now();
      const dir = Math.sign(dx) || st.lastDir;
      if (dir && st.lastDir && dir !== st.lastDir && now - st.lastMoveAt < 160 && Math.abs(dx) > 4) {
        st.reversals += 1;
        if (st.reversals > 5) {
          st.pressure += 40;
          st.reversals = 0;
        }
      }
      st.lastDir = dir;
      st.lastMoveAt = now;

      // the crowd buffets in the wide room; the hour passes slowly
      if (st.cur === 1) {
        dx += Math.sin(now / 260) * 0.7;
        dy += Math.cos(now / 340) * 0.5;
      }
      if (st.cur === 11) {
        dx *= 0.5;
        dy *= 0.5;
      }

      const cand = [st.pos[0] + dx, st.pos[1] + dy];
      const r = PANELS[st.cur].rect;
      const armed = now > st.armedAt && (st.cur !== 4 || st.found);

      if (insideRect(r, cand[0], cand[1])) {
        st.pos = cand;
        // the drop panel: the gum has to be found before it lets go.
        // it sits by the DROP lettering, low left of the plate.
        if (st.cur === 4 && !st.found) {
          const gx = r.x + r.w * 0.2;
          const gy = r.y + r.h * 0.9;
          if (Math.hypot(cand[0] - gx, cand[1] - gy) < 36) {
            st.found = true;
            st.repaint = true; // the pulsing ring stops; redraw clean
            layoutEdge();
          }
        }
        // the fire door swings with your crossing
        if (st.cur === 9) {
          const f = (cand[0] - r.x) / r.w;
          audio.doorMix(Math.max(0, Math.min(1, (f - 0.35) / 0.55)));
        }
        return;
      }
      if (st.cur < PANELS.length - 1 && armed && exitAllowed(cand)) {
        if (PANELS[st.cur].exit.turn) {
          turnPage(st.cur + 1);
          return;
        }
        const nr = PANELS[st.cur + 1].rect;
        const near =
          insideRect(nr, cand[0], cand[1]) ||
          (Math.abs(cand[0] - (nr.x + nr.w / 2)) < nr.w && Math.abs(cand[1] - (nr.y + nr.h / 2)) < nr.h);
        if (near) {
          enterPanel(st.cur + 1);
          if (insideRect(PANELS[st.cur].rect, cand[0], cand[1])) st.pos = cand;
          return;
        }
      }
      // wrong direction: slide what's slideable, bank the rest
      const sx = [cand[0], st.pos[1]];
      const sy2 = [st.pos[0], cand[1]];
      if (insideRect(r, sx[0], sx[1])) st.pos = sx;
      else if (insideRect(r, sy2[0], sy2[1])) st.pos = sy2;
      st.pressure += Math.hypot(dx, dy);
      if (st.pressure > 260) {
        st.pressure = 0;
        addCrack();
      }
    }

    const onLockedMove = (e) => {
      if (!st.locked) return;
      move(e.movementX / scale, e.movementY / scale);
    };
    document.addEventListener("mousemove", onLockedMove);
    const onFreeMove = (e) => {
      if (st.locked || st.done || e.pointerType === "touch") return;
      const r = stage.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * SW;
      const y = ((e.clientY - r.top) / r.height) * SH;
      move(x - st.pos[0], y - st.pos[1]);
    };
    // window, not stage: in the unlocked fallback the OS pointer can
    // wander off the sheet — its movement must still drive (and fight)
    // the comic cursor or the walk has no teeth
    window.addEventListener("pointermove", onFreeMove);
    const onClick = (e) => {
      if (st.inKiss) return;
      if (e.pointerType === "touch" || !window.matchMedia("(pointer: fine)").matches) {
        // touch: tap the next panel to step forward. no prison, no punishment.
        const r = stage.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * SW;
        const y = ((e.clientY - r.top) / r.height) * SH;
        const nxt = st.cur + 1;
        if (nxt < PANELS.length && insideRect(PANELS[nxt].rect, x, y)) enterPanel(nxt);
        else if (st.cur === PANELS.length - 1 && insideRect(PANELS[st.cur].rect, x, y)) finish("finished");
        return;
      }
      if (!st.locked && !st.done) wantLock();
    };
    stage.addEventListener("pointerup", onClick);

    function finish(kind) {
      st.done = true;
      if (edgeEl) edgeEl.style.opacity = "0";
      if (cursorEl) cursorEl.style.opacity = "0";
      audio.fadeAll();
      document.exitPointerLock?.();
      setTimeout(() => setPhase("pier"), kind === "shattered" ? 1050 : 900);
    }

    function shatter() {
      if (st.shattering) return;
      audio.fadeAll(0.15); // the music disappears first
      audio.crack(true);
      // snapshot the whole spread so every shard carries its artwork
      const snap = document.createElement("canvas");
      snap.width = SW;
      snap.height = SH;
      const sc = snap.getContext("2d");
      sc.fillStyle = "#0d0d0c";
      sc.fillRect(0, 0, SW, SH);
      PANELS.forEach((p, i) => {
        if (platesRef.current[i]) sc.drawImage(platesRef.current[i], p.rect.x, p.rect.y);
      });
      st.snapshot = snap;
      stage.classList.add("cxShattered");
      const shards = [];
      for (let i = 0; i < 64; i++) {
        const cx = 40 + hash2(i, 53) * (SW - 80);
        const cy = 40 + hash2(i, 57) * (SH - 80);
        const a0 = hash2(i, 61) * Math.PI * 2;
        const s = 40 + hash2(i, 71) * 130;
        const pts = [
          [cx + Math.cos(a0) * s, cy + Math.sin(a0) * s],
          [cx + Math.cos(a0 + 2.1) * s * (0.5 + hash2(i, 73) * 0.7), cy + Math.sin(a0 + 2.1) * s * 0.8],
          [cx + Math.cos(a0 + 4.2) * s * (0.5 + hash2(i, 79) * 0.7), cy + Math.sin(a0 + 4.2) * s * 0.9],
        ];
        const va = hash2(i, 83) * Math.PI * 2;
        shards.push({
          pts, cx, cy, dx: 0, dy: 0,
          vx: Math.cos(va) * (1.5 + hash2(i, 89) * 4),
          vy: -2 - hash2(i, 97) * 5,
          rot: 0,
          vr: (hash2(i, 101) - 0.5) * 0.22,
        });
      }
      st.shattering = { shards, flash: 1 };
      finish("shattered");
    }

    /* ---- master loop ---- */
    let raf;
    let last = 0;
    let strobeAt = 0;
    let glassDirty = true;
    function frame(ts) {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(60, ts - last) : 16;
      last = ts;
      const t = ts / 1000;
      st.pressure = Math.max(0, st.pressure - dt * 0.06);
      // the book is off the screen, or the tab is: do nothing either way
      if (st.inKiss || document.hidden) return;

      /* Only three plates in the book actually move: the strobe on her
         panel, the ghosted second exposure on the dance, and the ring
         around the pill. Repainting a canvas every frame is a texture
         upload every frame, so the other eleven are drawn once when
         entered and then left alone. */
      const i = st.cur;
      const plate = platesRef.current[i];
      const cv = panelRefs.current[i];
      const live = !reduceMotion && (i === 1 || i === 8 || (i === 4 && !st.found));
      if (plate && cv && (live || st.repaint)) {
        st.repaint = false;
        const c = cv.getContext("2d");
        c.drawImage(plate, 0, 0);
        if (live) {
          if (i === 1 && ts > strobeAt) {
            strobeAt = ts + 1400 + hash2(Math.floor(t), 7) * 2200;
            c.fillStyle = "rgba(239,236,226,0.85)";
            c.fillRect(0, 0, cv.width, cv.height);
          }
          if (i === 8 && Math.floor(t * 2.2) % 5 === 0) {
            c.globalAlpha = 0.22;
            c.drawImage(plate, 4, -3);
            c.globalAlpha = 1;
          }
          if (i === 4 && !st.found) {
            c.strokeStyle = "rgba(239,236,226,0.5)";
            c.lineWidth = 1.4;
            c.beginPath();
            c.arc(cv.width * 0.2, cv.height * 0.9, 12 + Math.sin(t * 4) * 3, 0, Math.PI * 2);
            c.stroke();
          }
          c.globalAlpha = 0.05;
          for (let k = 0; k < 14; k++) {
            c.fillStyle = INK;
            c.fillRect(hash2(k, Math.floor(t * 10)) * cv.width, hash2(k * 3, Math.floor(t * 10)) * cv.height, 1.4, 1.4);
          }
          c.globalAlpha = 1;
        }
      }

      /* glass overlay — only touched when there is glass to draw */
      if (st.cracks.length || st.shattering || glassDirty) {
        glassDirty = !!(st.cracks.length || st.shattering);
        gctx.setTransform(1, 0, 0, 1, 0, 0);
        gctx.clearRect(0, 0, SW, SH);
        st.cracks.forEach(({ x, y, seed }) => {
          gctx.strokeStyle = "rgba(239,236,226,0.85)";
          gctx.lineWidth = 1.3;
          const arms = 5 + Math.floor(hash2(seed, 3) * 3);
          for (let k = 0; k < arms; k++) {
            const a = hash2(seed + k, 7) * Math.PI * 2;
            gctx.beginPath();
            gctx.moveTo(x, y);
            let px = x;
            let py = y;
            let aa = a;
            for (let s2 = 0; s2 < 5; s2++) {
              aa += (hash2(seed + k * 9 + s2, 11) - 0.5) * 0.9;
              px += Math.cos(aa) * (16 + hash2(seed + s2, 13) * 30);
              py += Math.sin(aa) * (16 + hash2(seed + s2, 13) * 30);
              gctx.lineTo(px, py);
            }
            gctx.stroke();
          }
        });
        if (st.shattering) {
          const sh = st.shattering;
          if (sh.flash > 0) {
            gctx.fillStyle = `rgba(239,236,226,${sh.flash * 0.9})`;
            gctx.fillRect(0, 0, SW, SH);
            sh.flash -= dt / 240;
          }
          gctx.fillStyle = "rgba(0,0,0,0.2)";
          gctx.fillRect(0, 0, SW, SH);
          sh.shards.forEach((s2) => {
            s2.vy += 0.26;
            s2.dx += s2.vx;
            s2.dy += s2.vy;
            s2.rot += s2.vr;
            gctx.save();
            gctx.translate(s2.cx + s2.dx, s2.cy + s2.dy);
            gctx.rotate(s2.rot);
            gctx.translate(-s2.cx, -s2.cy);
            gctx.beginPath();
            gctx.moveTo(s2.pts[0][0], s2.pts[0][1]);
            gctx.lineTo(s2.pts[1][0], s2.pts[1][1]);
            gctx.lineTo(s2.pts[2][0], s2.pts[2][1]);
            gctx.closePath();
            gctx.clip();
            if (st.snapshot) gctx.drawImage(st.snapshot, 0, 0);
            gctx.strokeStyle = "rgba(239,236,226,0.8)";
            gctx.lineWidth = 1.4;
            gctx.stroke();
            gctx.restore();
          });
        }
      }

      /* The comic cursor is three small elements moved by transform, not
         a 1600×1000 canvas cleared and re-uploaded sixty times a second
         to draw a ring the size of a fingernail. The exit edge is set
         once per panel and pulses in CSS. */
      if (!st.done && cursorEl) {
        const [cx2, cy2] = st.pos;
        const strainF = Math.min(1, st.pressure / 260);
        cursorEl.style.transform = `translate(${cx2}px, ${cy2}px) scale(${1 - strainF * 0.34})`;
        if (strainF > 0.5) {
          if (!st.strained) {
            st.strained = true;
            cursorEl.classList.add("cxStrain");
          }
        } else if (st.strained) {
          st.strained = false;
          cursorEl.classList.remove("cxStrain");
        }
      }
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(st.edgeTimer);
      document.removeEventListener("pointerlockchange", onLockChange);
      document.removeEventListener("mousemove", onLockedMove);
      window.removeEventListener("pointermove", onFreeMove);
      stage.removeEventListener("pointerup", onClick);
      document.exitPointerLock?.();
      kissDoneRef.current = null;
      delete window.__cx;
    };
  }, [phase, scale]);

  if (phase === "pier") {
    return <Pier audio={audioRef.current} onReturn={() => setPhase("cover")} />;
  }

  const open = () => {
    if (phase !== "cover" || tooSmall) return;
    audioRef.current?.start();
    ensureRef.current?.(0); // the first plates start now, not on page load
    setPhase("comic");
  };

  return (
    <div ref={rootRef} className={`cxRoot${phase === "cover" ? " cxClosed" : ""}`}>
      <div
        ref={stageRef}
        className="cxStage"
        style={{ width: SW, height: SH, transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {/* the open book: two pages and the spine between them */}
        <div className="cxPage cxPageL" style={{ left: PAGE_LX, top: PAGE_Y, width: PAGE_W, height: PAGE_H }} />
        <div className="cxPage cxPageR" style={{ left: PAGE_RX, top: PAGE_Y, width: PAGE_W, height: PAGE_H }} />
        <div className="cxSpine" style={{ left: PAGE_LX + PAGE_W, top: PAGE_Y, width: PAGE_RX - PAGE_LX - PAGE_W, height: PAGE_H }} />

        {/* ruled boxes: a page laid out but not yet inked. The reader can
            see how much book is left without seeing a frame of it. */}
        {PANELS.map((p, i) => (
          <div
            key={`g${i}`}
            className="cxGhost"
            style={{ left: p.rect.x, top: p.rect.y, width: p.rect.w, height: p.rect.h }}
          />
        ))}

        {PANELS.map((p, i) => (
          <canvas
            key={i}
            ref={(el) => (panelRefs.current[i] = el)}
            className="cxPanel"
            style={{ left: p.rect.x, top: p.rect.y, width: p.rect.w, height: p.rect.h }}
          />
        ))}

        <div className="cxTurnSweep" />
        <canvas ref={glassRef} className="cxGlass" />
        <div ref={edgeRef} className="cxExitEdge" />
        <div ref={cursorRef} className="cxCursor">
          <i className="cxCursorRing" />
          <i className="cxCursorLens" />
          <i className="cxCursorDot" />
        </div>

        {/* running heads. the only type on the spread. */}
        <div className="cxHeadL">unknown loverz</div>
        <div className="cxHeadR">side b</div>
      </div>

      {phase === "cover" && (
        <div className="cxCover" onClick={open}>
          <div className="cxCoverMark">exhibit b</div>
          <h1 className="cxTitle" data-t="UNKNOWN LOVERZ">
            UNKNOWN LOVERZ
          </h1>
          <div className="cxClock">11:38 PM ———— 12:36 AM</div>
          {/* The cover paints from the server in half a second, but the
              handler behind `begin` only exists once React has hydrated.
              Showing an affordance that does nothing yet is exactly the
              stuck-on-the-entry-screen feeling — so until then there is
              no affordance, only a mark that the thread is being found. */}
          {!mounted ? (
            <div className="cxWait">⌇</div>
          ) : tooSmall ? (
            <div className="cxNag">
              <span className="cxNagShout">FUCK OFF</span>
              <span className="cxNagLine">THIS WAS NOT DRAWN FOR A PHONE.</span>
              <span className="cxNagLine">
                COME BACK ON A REAL DEVICE. THEN LEAVE.
                <span className="cxCaret">_</span>
              </span>
            </div>
          ) : (
            <>
              <button className="cxBegin" onClick={open}>
                begin<span className="cxCaret">_</span>
              </button>
            </>
          )}
          <div className="cxFine">contains one (1) kiss.</div>
          {pierSeen && (
            <button
              className="cxCrackMark"
              onClick={(e) => {
                e.stopPropagation();
                audioRef.current?.start();
                setPhase("pier");
              }}
            >
              ⌇
            </button>
          )}
          <Link href="/" className="cxHome" onClick={(e) => e.stopPropagation()}>
            ⟵ refoldered.com_
          </Link>
        </div>
      )}

      {kissOn && (
        <KissLayer
          img={imagesRef.current[PANELS[KISS_IDX].img]}
          crop={PANELS[KISS_IDX].crop}
          onDone={() => kissDoneRef.current?.()}
        />
      )}

      {phase === "comic" && !kissOn && (
        <div className="cxHud">
          <span className="cxNow">{nowPlaying ? `♪ ${nowPlaying}` : "♪ …"}</span>
          {lockLost && <span className="cxRegrip">the thread slipped — click to be held again</span>}
        </div>
      )}
    </div>
  );
}
