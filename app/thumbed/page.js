"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/* ============================================================
   THUMBED — disc 03
   ------------------------------------------------------------
   A perforated sheet of four thousand tabs, each printed with a
   design of its own, and the whole sheet dissolving on the clock:
   one tab every two hundred and twenty-five milliseconds, in an
   order the sheet decided when it was printed, gone entirely at
   the quarter-hour. Then the next sheet prints.

   The clock is the only author. The sheet is a function of the
   time of day and nothing else — no server, no visitor, no
   button. Sheet 0412 is sheet 0412 on every machine on earth, at
   the same stage of dissolving, whether or not anyone is looking.
   Most of its four thousand trips are never taken.

   Hold a thumb on a tab that is still there and it is yours: a
   trip of geometry and a beat, both seeded by the sheet and the
   tab, both unrepeatable. One per sheet. The thumb is dry after.
   ============================================================ */

const SW = 1600;
const SH = 1000;

/* the sheet */
const COLS = 80;
const ROWS = 50;
const TABS = COLS * ROWS; // 4000
const PITCH = 17;
const GRID_X = (SW - COLS * PITCH) / 2; // 120
const GRID_Y = (SH - ROWS * PITCH) / 2; // 75

/* the clock */
const SHEET_MS = 15 * 60 * 1000;
const EPOCH = Date.UTC(2026, 9, 22); // sheet 0001 printed at midnight, 22 oct 2026
const TAB_MS = SHEET_MS / TABS; // 225ms a tab
const HOLD_MS = 720; // a thumb has to mean it

const INK = "#f0eee6";
const RED = "#d43d2a";

/* ---------- deterministic noise ---------- */
function hash2(i, j) {
  let h = (i * 374761393 + j * 668265263) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h >>> 0) / 4294967295;
}

// mulberry32: a small seeded generator, one per thing that needs a stream
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- the clock ----------
   Everything the sheet is comes from here. */
function clockNow(now = Date.now()) {
  const since = Math.max(0, now - EPOCH);
  const sheet = Math.floor(since / SHEET_MS) + 1;
  const start = EPOCH + (sheet - 1) * SHEET_MS;
  const elapsed = now - start;
  const dissolved = Math.min(TABS, Math.floor(elapsed / TAB_MS));
  return { sheet, start, elapsed, dissolved, remainingMs: SHEET_MS - elapsed };
}

// the order the sheet goes in, decided when it was printed
function dissolveOrder(sheet) {
  const r = rng(sheet * 2654435761 + 7);
  const order = new Array(TABS);
  for (let i = 0; i < TABS; i++) order[i] = i;
  for (let i = TABS - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const t = order[i];
    order[i] = order[j];
    order[j] = t;
  }
  return order;
}

const pad4 = (n) => String(n).padStart(4, "0");
const mmss = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/* ============================================================
   THE SHEET — printing and dissolving
   ============================================================ */

/* each tab carries a small design of its own; the sheet as a whole
   reads as a field of four thousand different marks */
function drawTabGlyph(c, x, y, s, seed) {
  const r = rng(seed);
  const kind = Math.floor(r() * 7);
  const cx = x + s / 2;
  const cy = y + s / 2;
  const a = 0.3 + r() * 0.5;
  c.strokeStyle = `rgba(240,238,230,${a})`;
  c.fillStyle = `rgba(240,238,230,${a})`;
  c.lineWidth = 0.8;
  c.beginPath();
  if (kind === 0) {
    // ring
    c.arc(cx, cy, 2 + r() * 3, 0, Math.PI * 2);
    c.stroke();
  } else if (kind === 1) {
    // polygon
    const n = 3 + Math.floor(r() * 4);
    const rad = 2.5 + r() * 3;
    const rot = r() * Math.PI;
    for (let k = 0; k <= n; k++) {
      const t = rot + (k / n) * Math.PI * 2;
      const px = cx + Math.cos(t) * rad;
      const py = cy + Math.sin(t) * rad;
      if (k === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.stroke();
  } else if (kind === 2) {
    // cross / star
    const n = 2 + Math.floor(r() * 3);
    const rad = 3 + r() * 3;
    const rot = r() * Math.PI;
    for (let k = 0; k < n; k++) {
      const t = rot + (k / n) * Math.PI;
      c.moveTo(cx - Math.cos(t) * rad, cy - Math.sin(t) * rad);
      c.lineTo(cx + Math.cos(t) * rad, cy + Math.sin(t) * rad);
    }
    c.stroke();
  } else if (kind === 3) {
    // dot cluster
    const n = 3 + Math.floor(r() * 5);
    for (let k = 0; k < n; k++) {
      const t = r() * Math.PI * 2;
      const d = r() * 5;
      c.moveTo(cx + Math.cos(t) * d + 0.7, cy + Math.sin(t) * d);
      c.arc(cx + Math.cos(t) * d, cy + Math.sin(t) * d, 0.7, 0, Math.PI * 2);
    }
    c.fill();
  } else if (kind === 4) {
    // spiral stub
    const turns = 1.5 + r() * 1.5;
    const rot = r() * Math.PI * 2;
    for (let k = 0; k <= 24; k++) {
      const t = (k / 24) * turns * Math.PI * 2;
      const d = (k / 24) * 5.5;
      const px = cx + Math.cos(t + rot) * d;
      const py = cy + Math.sin(t + rot) * d;
      if (k === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.stroke();
  } else if (kind === 5) {
    // bars
    const n = 2 + Math.floor(r() * 3);
    const vert = r() > 0.5;
    for (let k = 0; k < n; k++) {
      const o = -4 + (k / (n - 1 || 1)) * 8;
      if (vert) {
        c.moveTo(cx + o, cy - 4);
        c.lineTo(cx + o, cy + 4);
      } else {
        c.moveTo(cx - 4, cy + o);
        c.lineTo(cx + 4, cy + o);
      }
    }
    c.stroke();
  } else {
    // concentric
    const n = 2 + Math.floor(r() * 2);
    for (let k = 1; k <= n; k++) {
      c.moveTo(cx + k * 2, cy);
      c.arc(cx, cy, k * 2, 0, Math.PI * 2);
    }
    c.stroke();
  }
  // one tab in forty carries the red
  if (r() < 0.025) {
    c.fillStyle = RED;
    c.beginPath();
    c.arc(cx + (r() - 0.5) * 6, cy + (r() - 0.5) * 6, 1, 0, Math.PI * 2);
    c.fill();
  }
}

/* black stock with tooth, cheaper than the poster's: this sheet has to
   reprint every quarter of an hour */
function drawStock(c, seed) {
  c.fillStyle = "#000";
  c.fillRect(0, 0, SW, SH);
  const r = rng(seed * 31 + 1);
  // fibre: batched into four brightness buckets, one stroke each
  for (let b = 0; b < 4; b++) {
    const v = 8 + b * 5;
    c.strokeStyle = `rgba(${v},${v},${Math.round(v * 0.92)},0.85)`;
    c.lineWidth = 0.55;
    c.beginPath();
    for (let i = 0; i < 4500; i++) {
      const x = r() * SW;
      const y = r() * SH;
      const a = r() * Math.PI;
      const len = 1 + r() * 4;
      c.moveTo(x, y);
      c.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    }
    c.stroke();
  }
  // foxing
  for (let k = 0; k < 40; k++) {
    const x = r() * SW;
    const y = r() * SH;
    const rad = 6 + r() * 30;
    const fg = c.createRadialGradient(x, y, 0, x, y, rad);
    fg.addColorStop(0, `rgba(48,30,18,${0.08 + r() * 0.14})`);
    fg.addColorStop(1, "rgba(48,30,18,0)");
    c.fillStyle = fg;
    c.beginPath();
    c.arc(x, y, rad, 0, Math.PI * 2);
    c.fill();
  }
  // scan banding
  for (let y = 0; y < SH; y += 3) {
    const v = 3 + Math.floor(hash2(y, 21) * 5);
    c.fillStyle = `rgba(${v * 3},${v * 3},${v * 3},0.5)`;
    c.fillRect(0, y, SW, 1);
  }
}

function tabRect(i) {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  return { x: GRID_X + col * PITCH, y: GRID_Y + row * PITCH, s: PITCH };
}

function tabAt(px, py) {
  const col = Math.floor((px - GRID_X) / PITCH);
  const row = Math.floor((py - GRID_Y) / PITCH);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return -1;
  return row * COLS + col;
}

/* a tab that has gone: the stock shows through, the perforation is
   torn, a few fibres stand up at the edge */
function drawHole(c, i, seed) {
  const { x, y, s } = tabRect(i);
  c.fillStyle = "#000";
  c.fillRect(x + 0.5, y + 0.5, s - 1, s - 1);
  const r = rng(seed);
  c.strokeStyle = "rgba(240,238,230,0.22)";
  c.lineWidth = 0.6;
  c.beginPath();
  for (let k = 0; k < 5; k++) {
    const side = Math.floor(r() * 4);
    const t = r() * s;
    const len = 1 + r() * 2.5;
    let px = x;
    let py = y;
    let dx = 0;
    let dy = 0;
    if (side === 0) [px, py, dx, dy] = [x + t, y, 0, len];
    else if (side === 1) [px, py, dx, dy] = [x + s, y + t, -len, 0];
    else if (side === 2) [px, py, dx, dy] = [x + t, y + s, 0, -len];
    else [px, py, dx, dy] = [x, y + t, len, 0];
    c.moveTo(px, py);
    c.lineTo(px + dx, py + dy);
  }
  c.stroke();
}

/* the perforations: a dotted rule between every tab, drawn once */
function drawPerforations(c) {
  c.strokeStyle = "rgba(240,238,230,0.16)";
  c.lineWidth = 0.7;
  c.setLineDash([1, 2.2]);
  c.beginPath();
  for (let col = 0; col <= COLS; col++) {
    const x = GRID_X + col * PITCH;
    c.moveTo(x, GRID_Y);
    c.lineTo(x, GRID_Y + ROWS * PITCH);
  }
  for (let row = 0; row <= ROWS; row++) {
    const y = GRID_Y + row * PITCH;
    c.moveTo(GRID_X, y);
    c.lineTo(GRID_X + COLS * PITCH, y);
  }
  c.stroke();
  c.setLineDash([]);
}

/* ============================================================
   THE THUMB — a print of your own, seeded once and kept
   ============================================================ */
function thumbSeed() {
  try {
    const k = localStorage.getItem("th_thumb");
    if (k) return Number(k);
    const s = Math.floor(Math.random() * 1e9);
    localStorage.setItem("th_thumb", String(s));
    return s;
  } catch {
    return 1234567;
  }
}

/* whorls: a stack of distorted ellipses around a core that drifts */
function drawThumb(c, x, y, seed, ink, scale = 1) {
  const r = rng(seed);
  const ox = (r() - 0.5) * 3;
  const oy = (r() - 0.5) * 3;
  const tilt = (r() - 0.5) * 0.8;
  const rings = 9;
  c.save();
  c.translate(x, y);
  c.rotate(tilt);
  c.scale(scale, scale * 1.25);
  for (let k = 1; k <= rings; k++) {
    const rad = k * 1.7;
    const a = ink * (0.22 + 0.5 * (1 - k / rings));
    c.strokeStyle = `rgba(240,238,230,${a})`;
    c.lineWidth = 0.9;
    c.beginPath();
    const N = 40;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * Math.PI * 2;
      const wob = 1 + 0.08 * Math.sin(t * 3 + k) + 0.05 * Math.sin(t * 7 + seed % 7);
      const px = ox * (k / rings) + Math.cos(t) * rad * wob;
      const py = oy * (k / rings) + Math.sin(t) * rad * wob;
      // a break in each ridge, where the skin creases
      if (i === Math.floor(N * ((k * 0.37) % 1))) {
        c.moveTo(px, py);
        continue;
      }
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.stroke();
  }
  c.restore();
}

/* ============================================================
   THE BEAT — a composer, not a song.
   Nothing here is sampled. Every sound is an oscillator or a noise
   buffer, built when it is needed and thrown away after. What makes
   one tab's beat unlike another's is that the tab deals everything:
   the tempo and whether it jumps, the shape of the night — how long
   the build, whether the drop is teased and taken away, whether the
   floor goes to half time, whether there is a third drop faster than
   the second — the kick's pitch and decay, the bass's rhythm and
   wave, the hat pattern, the clap, which leads are in the room and
   what each of them plays, the key changes, the transitions, the
   fills, the delay, the size of the room, the drive, the pump.
   ============================================================ */
const SCALES = {
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
};
const MIDI = (m) => 440 * Math.pow(2, (m - 69) / 12);
const pickOf = (r, list) => list[Math.floor(r() * list.length)];

/* sixteen-step masks: which steps of a bar a thing is hit on */
const BASS_PATTERNS = {
  rolling: [0, 1, 1, 1],
  gallop: [0, 0, 1, 1],
  offbeat: [0, 0, 1, 0],
  swung: [0, 1, 0, 1],
  walking: [0, 1, 1, 1],
};
const HAT_PATTERNS = {
  off8: (s) => s % 4 === 2,
  sixteen: (s) => s % 4 !== 0,
  shuffle: (s) => s % 4 === 2 || s % 8 === 5,
  off16: (s) => s % 2 === 1,
};

/* ---------- the plan: the shape of the night ---------- */
function composePlan(r) {
  const style = pickOf(r, ["progressive", "fullon", "dark"]);
  const bpm =
    style === "progressive" ? 134 + Math.floor(r() * 6) : style === "fullon" ? 140 + Math.floor(r() * 8) : 146 + Math.floor(r() * 10);
  const secs = [];
  const push = (kind, bars, extra = {}) => secs.push({ kind, bars, ...extra });
  push("intro", 4 + 4 * Math.floor(r() * 3));
  push("build", 8 + 4 * Math.floor(r() * 3));
  if (r() < 0.35) {
    push("tease", 4); // four bars of the drop, then taken away
    push("breakdown", 4);
  }
  push("breath", r() < 0.5 ? 1 : 2);
  push("drop", 16 + 8 * Math.floor(r() * 3), { n: 1 });
  push("breakdown", 8 + 4 * Math.floor(r() * 3));
  if (r() < 0.3) push("halftime", 8);
  push("riser", 2);
  push("drop", 16 + 8 * Math.floor(r() * 3), { n: 2, bpmShift: r() < 0.5 ? 0 : 2 + Math.floor(r() * 5) });
  if (r() < 0.3) {
    push("breath", 1);
    push("drop", 8 + 8 * Math.floor(r() * 2), { n: 3, bpmShift: 4 + Math.floor(r() * 7) });
  }
  push("outro", 6 + 2 * Math.floor(r() * 3));
  let bar = 0;
  secs.forEach((s) => {
    s.start = bar;
    bar += s.bars;
    s.bpm = bpm + (s.bpmShift || 0);
    s.energy = s.kind === "drop" ? (s.n >= 2 ? 3 : 2) : s.kind === "tease" ? 2 : s.kind === "build" || s.kind === "riser" || s.kind === "halftime" ? 1 : 0;
  });
  return { style, bpm, secs, bars: bar };
}

/* ---------- the kit: what is in the room ---------- */
function composeKit(r, style) {
  const rootMidi = 28 + Math.floor(r() * 8); // E1..B1
  const scaleName = pickOf(r, Object.keys(SCALES));
  const leadKinds = ["acid", "stab", "pluck", "zap"];
  const nLeads = 1 + Math.floor(r() * 3);
  const leads = [];
  const bag = leadKinds.slice();
  for (let i = 0; i < nLeads; i++) {
    // the first voice carries the breakdown, so it is never the zap
    const bagNow = i === 0 ? bag.filter((k) => k !== "zap") : bag;
    const kind = bagNow[Math.floor(r() * bagNow.length)];
    bag.splice(bag.indexOf(kind), 1);
    const len = r() < 0.5 ? 16 : 32;
    const scale = SCALES[scaleName];
    const density = kind === "zap" ? 0.07 : kind === "stab" ? 0.22 : kind === "pluck" ? 0.6 : 0.6;
    const pattern = [];
    for (let s = 0; s < len; s++) {
      const on = r() < (s % 4 === 0 ? density + 0.25 : density);
      const deg = Math.floor(r() * scale.length);
      const oct = r() < 0.22 ? 12 : 0;
      pattern.push({ on, note: rootMidi + 12 + scale[deg] + oct + (kind === "pluck" ? 12 : 0), acc: r() < 0.3, slide: r() < 0.25 });
    }
    leads.push({
      kind, len, pattern,
      wave: pickOf(r, ["sawtooth", "square"]),
      q: 6 + r() * 10,
      base: 160 + r() * 320,
      env: 1200 + r() * 3000,
      ratio: pickOf(r, [1, 2, 3]), // the pluck's modulator
      chord: pickOf(r, [[0, 7, 12], [0, 3, 7], [0, 5, 12], [0, 7, 10]]),
      detune: 4 + r() * 12,
      octaveUp: r() < 0.5, // in the later drops
    });
  }
  return {
    rootMidi, scaleName,
    kick: { f0: 120 + r() * 90, f1: 38 + r() * 14, decay: 0.22 + r() * 0.2, click: r() * 0.5, wave: r() < 0.8 ? "sine" : "triangle" },
    bass: {
      wave: pickOf(r, ["sawtooth", "square"]), pattern: pickOf(r, Object.keys(BASS_PATTERNS)),
      cut: 220 + r() * 500, q: 1.5 + r() * 3, decay: 0.08 + r() * 0.08,
      fifth: r() < 0.35, octave: r() < 0.25,
    },
    hats: { pattern: pickOf(r, Object.keys(HAT_PATTERNS)), tone: 6500 + r() * 3000, open: Math.floor(r() * 4), shaker: r() < 0.5 },
    perc: { snare: pickOf(r, ["clap", "snare", "rim", "none"]), toms: r() < 0.5 },
    leads,
    pad: r() < 0.75,
    fx: {
      delayDiv: pickOf(r, [2, 3, 4, 6]), fb: 0.25 + r() * 0.3, verbSec: 1.2 + r() * 2.5,
      drive: r() < 0.5 ? 0.3 + r() * 0.6 : 0, pump: r() < 0.8,
    },
    riser: pickOf(r, ["noise", "pitch", "roll", "reverse"]),
    fill: pickOf(r, ["roll", "stutter", "mute", "silence", "toms", "none"]),
    keyChange: r() < 0.5 ? pickOf(r, [5, 7, -2, 3]) : 0,
    style,
  };
}

function makeTrip(seed) {
  const r = rng(seed);
  const plan = composePlan(r);
  const kit = composeKit(r, plan.style);
  const family = Math.floor(r() * 5);
  const family2 = (family + 1 + Math.floor(r() * 4)) % 5;
  const visualSeed = Math.floor(r() * 1e9);

  /* the clock of the night: every bar's start and step length, so the
     tempo can move between sections and the visuals can still find
     the eighth they are on */
  const barStart = [];
  const barStep = [];
  let acc = 0;
  plan.secs.forEach((s) => {
    const step = 60 / s.bpm / 4;
    for (let b = 0; b < s.bars; b++) {
      barStart.push(acc);
      barStep.push(step);
      acc += step * 16;
    }
  });
  const totalSec = acc;
  const sectionAt = (bar) => plan.secs.find((s) => bar >= s.start && bar < s.start + s.bars) || plan.secs[plan.secs.length - 1];
  const energyAt = (bar) => sectionAt(bar).energy;
  const switchBar = (plan.secs.find((s) => s.kind === "drop" && s.n === 2) || { start: 0 }).start;
  /* strobe bursts: the last bar of every eight in the first drop, the
     last two of every eight in the later ones, and sixteenths through
     the final four bars of a later drop */
  const strobeAt = (bar) => {
    const s = sectionAt(bar);
    if (s.kind !== "drop") return 0;
    const i = bar - s.start;
    const left = s.bars - i;
    if (s.n >= 2 && left <= 4) return 2; // sixteenths
    if (s.n >= 2 && i % 8 >= 6) return 1;
    if (s.n === 1 && i % 8 === 7) return 1;
    return 0;
  };

  const state = {
    bpm: plan.bpm, style: plan.style, bars: plan.bars, totalSec, family, family2, visualSeed, switchBar,
    secs: plan.secs, barStart, barStep, sectionAt, energyAt, strobeAt, kit,
    ctx: null, startAt: 0, kicks: [], claps: [], bar: 0, running: false, ended: false, master: null,
  };

  function noiseBuffer(ctx, sec) {
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sec), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function start() {
    if (state.running) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    state.ctx = ctx;
    state.running = true;
    if (typeof window !== "undefined") window.__thTrip = api;

    /* master: the wall it all comes through, the drive, then glue */
    const wall = ctx.createBiquadFilter();
    wall.type = "lowpass";
    wall.frequency.value = 380;
    let into = wall;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.18;
    if (kit.fx.drive > 0) {
      const shaper = ctx.createWaveShaper();
      const curve = new Float32Array(1024);
      const k = kit.fx.drive * 6;
      for (let i = 0; i < 1024; i++) {
        const x = (i / 512) - 1;
        curve[i] = Math.tanh(x * (1 + k)) / Math.tanh(1 + k);
      }
      shaper.curve = curve;
      wall.connect(shaper);
      shaper.connect(comp);
    } else wall.connect(comp);
    const master = ctx.createGain();
    master.gain.value = 0.7;
    comp.connect(master);
    master.connect(ctx.destination);
    state.master = master;

    /* the pump: the bass and the leads duck under every kick */
    const pump = ctx.createGain();
    pump.gain.value = 1;
    pump.connect(wall);
    const voiceBus = kit.fx.pump ? pump : wall;

    /* the room */
    const verb = ctx.createConvolver();
    {
      const sec = kit.fx.verbSec;
      const buf = ctx.createBuffer(2, Math.floor(ctx.sampleRate * sec), ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3.2);
      }
      verb.buffer = buf;
    }
    const verbGain = ctx.createGain();
    verbGain.gain.value = 0.2;
    verb.connect(verbGain);
    verbGain.connect(wall);

    /* the delay, at a division of the beat; it follows the tempo */
    const delay = ctx.createDelay(1.5);
    const fb = ctx.createGain();
    fb.gain.value = kit.fx.fb;
    const dlHp = ctx.createBiquadFilter();
    dlHp.type = "highpass";
    dlHp.frequency.value = 500;
    delay.connect(fb);
    fb.connect(dlHp);
    dlHp.connect(delay);
    const dlOut = ctx.createGain();
    dlOut.gain.value = 0.3;
    delay.connect(dlOut);
    dlOut.connect(wall);
    dlOut.connect(verb);

    const noise = noiseBuffer(ctx, 1.5);

    /* ---------- the drums ---------- */
    const kick = (t, soft) => {
      const o = ctx.createOscillator();
      o.type = kit.kick.wave;
      o.frequency.setValueAtTime(kit.kick.f0, t);
      o.frequency.exponentialRampToValueAtTime(kit.kick.f1, t + 0.075);
      const g = ctx.createGain();
      g.gain.setValueAtTime(soft ? 0.6 : 1.0, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + kit.kick.decay);
      o.connect(g);
      g.connect(wall);
      o.start(t);
      o.stop(t + kit.kick.decay + 0.02);
      if (kit.kick.click > 0.05) {
        const n = ctx.createBufferSource();
        n.buffer = noise;
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 2500;
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(kit.kick.click * 0.7, t);
        ng.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
        n.connect(hp);
        hp.connect(ng);
        ng.connect(wall);
        n.start(t);
        n.stop(t + 0.02);
      }
      if (kit.fx.pump) {
        pump.gain.cancelScheduledValues(t);
        pump.gain.setValueAtTime(0.3, t);
        pump.gain.linearRampToValueAtTime(1, t + 0.22);
      }
      state.kicks.push(t);
      if (state.kicks.length > 16) state.kicks.shift();
    };

    const bass = (t, note, decayMul = 1) => {
      const o = ctx.createOscillator();
      o.type = kit.bass.wave;
      o.frequency.value = MIDI(note);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(kit.bass.cut * 1.6, t);
      lp.frequency.exponentialRampToValueAtTime(kit.bass.cut * 0.55, t + 0.1);
      lp.Q.value = kit.bass.q;
      const g = ctx.createGain();
      const dec = kit.bass.decay * decayMul;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
      o.connect(lp);
      lp.connect(g);
      g.connect(voiceBus);
      o.start(t);
      o.stop(t + dec + 0.02);
    };

    const hat = (t, open, soft) => {
      const n = ctx.createBufferSource();
      n.buffer = noise;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = open ? kit.hats.tone - 1500 : kit.hats.tone;
      const g = ctx.createGain();
      const len = open ? 0.19 : 0.035;
      g.gain.setValueAtTime((open ? 0.16 : 0.11) * (soft ? 0.5 : 1), t);
      g.gain.exponentialRampToValueAtTime(0.001, t + len);
      n.connect(hp);
      hp.connect(g);
      g.connect(wall);
      n.start(t);
      n.stop(t + len + 0.01);
    };

    const shaker = (t) => {
      const n = ctx.createBufferSource();
      n.buffer = noise;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 4200;
      bp.Q.value = 2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.05, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      n.connect(bp);
      bp.connect(g);
      g.connect(wall);
      n.start(t);
      n.stop(t + 0.06);
    };

    // the backbeat: a clap, a snare, or a rim, as dealt
    const snare = (t, kind = kit.perc.snare, loud = 1) => {
      if (kind === "none") return;
      if (kind === "clap") {
        for (let k = 0; k < 3; k++) {
          const n = ctx.createBufferSource();
          n.buffer = noise;
          const bp = ctx.createBiquadFilter();
          bp.type = "bandpass";
          bp.frequency.value = 1500;
          bp.Q.value = 0.9;
          const g = ctx.createGain();
          const t1 = t + k * 0.011;
          g.gain.setValueAtTime((k === 2 ? 0.3 : 0.14) * loud, t1);
          g.gain.exponentialRampToValueAtTime(0.001, t1 + (k === 2 ? 0.16 : 0.03));
          n.connect(bp);
          bp.connect(g);
          g.connect(wall);
          if (k === 2) g.connect(verb);
          n.start(t1);
          n.stop(t1 + 0.2);
        }
      } else if (kind === "snare") {
        const o = ctx.createOscillator();
        o.type = "triangle";
        o.frequency.setValueAtTime(220, t);
        o.frequency.exponentialRampToValueAtTime(140, t + 0.06);
        const og = ctx.createGain();
        og.gain.setValueAtTime(0.35 * loud, t);
        og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        o.connect(og);
        og.connect(wall);
        o.start(t);
        o.stop(t + 0.12);
        const n = ctx.createBufferSource();
        n.buffer = noise;
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 1800;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.3 * loud, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        n.connect(hp);
        hp.connect(g);
        g.connect(wall);
        g.connect(verb);
        n.start(t);
        n.stop(t + 0.2);
      } else {
        // rim: a tick through a tight bandpass
        const n = ctx.createBufferSource();
        n.buffer = noise;
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 3200;
        bp.Q.value = 12;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.5 * loud, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        n.connect(bp);
        bp.connect(g);
        g.connect(wall);
        n.start(t);
        n.stop(t + 0.05);
      }
      state.claps.push(t);
      if (state.claps.length > 8) state.claps.shift();
    };

    const tom = (t, hz) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(hz, t);
      o.frequency.exponentialRampToValueAtTime(hz * 0.55, t + 0.18);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      o.connect(g);
      g.connect(wall);
      g.connect(verb);
      o.start(t);
      o.stop(t + 0.25);
    };

    /* ---------- the leads ---------- */
    const prevHz = {};
    const acid = (t, L, p, sweep, up, step) => {
      const o = ctx.createOscillator();
      o.type = L.wave;
      const hz = MIDI(p.note + (up ? 12 : 0));
      if (p.slide && prevHz[L.kind]) {
        o.frequency.setValueAtTime(prevHz[L.kind], t);
        o.frequency.exponentialRampToValueAtTime(hz, t + step * 0.8);
      } else o.frequency.value = hz;
      prevHz[L.kind] = hz;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.Q.value = L.q;
      const peak = L.base + L.env * (p.acc ? 1 : 0.55) * (0.35 + sweep * 0.65);
      lp.frequency.setValueAtTime(peak, t);
      lp.frequency.exponentialRampToValueAtTime(L.base, t + (p.acc ? 0.22 : 0.13));
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(p.acc ? 0.26 : 0.17, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (p.slide ? step * 0.95 : 0.16));
      o.connect(lp);
      lp.connect(g);
      g.connect(voiceBus);
      g.connect(delay);
      o.start(t);
      o.stop(t + step + 0.02);
    };

    // a chord of detuned saws, short, through a filter, into the delay
    const stab = (t, L, p, sweep, up) => {
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.Q.value = 3;
      lp.frequency.setValueAtTime(600 + 2600 * sweep, t);
      lp.frequency.exponentialRampToValueAtTime(400, t + 0.2);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(p.acc ? 0.16 : 0.11, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.19);
      L.chord.forEach((iv, k) => {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = MIDI(p.note + iv + (up ? 12 : 0));
        o.detune.value = (k - 1) * L.detune;
        o.connect(lp);
        o.start(t);
        o.stop(t + 0.22);
      });
      lp.connect(g);
      g.connect(voiceBus);
      g.connect(delay);
    };

    // FM pluck: a sine bent by another sine, the bend dying fast
    const pluck = (t, L, p, sweep, up) => {
      const car = ctx.createOscillator();
      car.type = "sine";
      const hz = MIDI(p.note + (up ? 12 : 0));
      car.frequency.value = hz;
      const mod = ctx.createOscillator();
      mod.type = "sine";
      mod.frequency.value = hz * L.ratio;
      const mg = ctx.createGain();
      mg.gain.setValueAtTime(hz * (1.5 + sweep * 3), t);
      mg.gain.exponentialRampToValueAtTime(1, t + 0.12);
      mod.connect(mg);
      mg.connect(car.frequency);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(p.acc ? 0.2 : 0.13, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      car.connect(g);
      g.connect(voiceBus);
      g.connect(delay);
      car.start(t);
      mod.start(t);
      car.stop(t + 0.16);
      mod.stop(t + 0.16);
    };

    // the zap: a square dropping two octaves in sixty milliseconds
    const zap = (t) => {
      const o = ctx.createOscillator();
      o.type = "square";
      o.frequency.setValueAtTime(1800 + Math.random() * 1200, t);
      o.frequency.exponentialRampToValueAtTime(120, t + 0.06);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      o.connect(g);
      g.connect(voiceBus);
      g.connect(delay);
      o.start(t);
      o.stop(t + 0.1);
    };

    // the pad, for the breakdowns: two saws a few cents apart and an
    // octave, under a filter that breathes
    const pad = (t, len, note) => {
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.Q.value = 1.2;
      lp.frequency.setValueAtTime(500, t);
      lp.frequency.linearRampToValueAtTime(1800, t + len * 0.6);
      lp.frequency.linearRampToValueAtTime(400, t + len);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.09, t + 1.6);
      g.gain.setValueAtTime(0.09, t + len - 2);
      g.gain.linearRampToValueAtTime(0.0001, t + len);
      [[0, -6], [0, 6], [12, 0], [7, 3]].forEach(([iv, det]) => {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = MIDI(note + 12 + iv);
        o.detune.value = det;
        o.connect(lp);
        o.start(t);
        o.stop(t + len + 0.1);
      });
      lp.connect(g);
      g.connect(wall);
      g.connect(verb);
    };

    /* ---------- transitions ---------- */
    const riser = (t, len, kind = kit.riser) => {
      if (kind === "noise" || kind === "reverse") {
        const n = ctx.createBufferSource();
        n.buffer = noise;
        n.loop = true;
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.Q.value = 1.4;
        bp.frequency.setValueAtTime(kind === "reverse" ? 2400 : 180, t);
        bp.frequency.exponentialRampToValueAtTime(kind === "reverse" ? 400 : 5200, t + len);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(kind === "reverse" ? 0.26 : 0.2, t + len);
        g.gain.setValueAtTime(0.0001, t + len + 0.01);
        n.connect(bp);
        bp.connect(g);
        g.connect(wall);
        g.connect(verb);
        n.start(t);
        n.stop(t + len + 0.05);
      } else if (kind === "pitch") {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.setValueAtTime(110, t);
        o.frequency.exponentialRampToValueAtTime(1760, t + len);
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.Q.value = 3;
        bp.frequency.setValueAtTime(300, t);
        bp.frequency.exponentialRampToValueAtTime(4000, t + len);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.14, t + len);
        g.gain.setValueAtTime(0.0001, t + len + 0.01);
        o.connect(bp);
        bp.connect(g);
        g.connect(wall);
        g.connect(verb);
        o.start(t);
        o.stop(t + len + 0.05);
      }
      // the roll is scheduled by the step loop, so it stays on the grid
    };

    /* ---------- the night, step by step ---------- */
    const t0 = ctx.currentTime + 0.12;
    state.startAt = t0;
    const secAt = (bar) => sectionAt(bar);
    const firstBarSec = barStart[plan.secs[0].bars] || 8;
    // the wall opens over the intro and closes over the outro
    const outro = plan.secs[plan.secs.length - 1];
    wall.frequency.setValueAtTime(380, t0);
    wall.frequency.exponentialRampToValueAtTime(18000, t0 + barStart[plan.secs[0].bars] || t0 + firstBarSec);
    wall.frequency.setValueAtTime(18000, t0 + barStart[outro.start]);
    wall.frequency.exponentialRampToValueAtTime(240, t0 + totalSec);

    // risers before every drop, pads over every breakdown
    plan.secs.forEach((s, i) => {
      const next = plan.secs[i + 1];
      if (next && next.kind === "drop" && (s.kind === "riser" || s.kind === "breath" || s.kind === "build")) {
        const len = Math.min(2, s.bars) * 16 * barStep[s.start];
        riser(t0 + barStart[s.start + s.bars] - len, len);
      }
      if (kit.pad && (s.kind === "breakdown" || s.kind === "intro")) {
        const len = s.bars * 16 * barStep[s.start];
        pad(t0 + barStart[s.start], len, kit.rootMidi + 12);
      }
    });

    let stepIdx = 0;
    let bar = 0;
    let s16 = 0;
    let barT = t0;
    let dropsSeen = 0;
    let lastDrop = null;
    const LOOKAHEAD = 0.14;
    const tick = () => {
      if (!state.running) return;
      while (bar < plan.bars) {
        const step = barStep[bar];
        const t = barT + s16 * step;
        if (t >= ctx.currentTime + LOOKAHEAD) break;
        const sec = secAt(bar);
        const inSec = bar - sec.start;
        const left = sec.bars - inSec;
        const kind = sec.kind;
        state.bar = bar;
        if (sec !== lastDrop && kind === "drop") {
          lastDrop = sec;
          dropsSeen = sec.n;
        }
        const drop = kind === "drop" || kind === "tease";
        const later = kind === "drop" && sec.n >= 2;
        const half = kind === "halftime";
        // a fill in the last bar of every eight of a drop
        const fillBar = drop && inSec % 8 === 7 && kit.fill !== "none";
        const fill = fillBar ? kit.fill : null;
        const lastBeat = s16 >= 12;
        const lastHalf = s16 >= 8;
        const silenced = fill === "silence" && lastBeat;
        const muted = silenced || (fill === "mute" && lastHalf);
        // key: the later drops move
        const transpose = kit.keyChange && dropsSeen >= 2 && drop ? kit.keyChange : 0;

        /* kick */
        const kickOn =
          !silenced &&
          (kind === "intro" || kind === "build" || drop || kind === "riser" || half || (kind === "outro" && left > 1));
        if (kickOn) {
          if (half) {
            if (s16 === 0 || s16 === 8) kick(t);
          } else if (fill === "stutter" && lastBeat) {
            kick(t, true);
          } else if (s16 % 4 === 0) kick(t);
        }

        /* the roll: snare hits that come faster through the bar */
        if (((kind === "riser" && kit.riser === "roll") || fill === "roll") && !silenced) {
          const every = kind === "riser" ? (inSec === 0 ? 4 : s16 < 8 ? 2 : 1) : lastHalf ? (s16 < 12 ? 2 : 1) : 4;
          if (s16 % every === 0) snare(t, kit.perc.snare === "none" ? "snare" : kit.perc.snare, 0.5 + (s16 / 16) * 0.5);
        }
        if (fill === "toms" && lastBeat && !silenced) tom(t, [220, 165, 110, 82][s16 - 12]);

        /* bass */
        const bassOn = !muted && (kind === "build" || drop || kind === "riser" || half || (kind === "outro" && left > 3));
        if (bassOn) {
          const mask = BASS_PATTERNS[half ? "offbeat" : kit.bass.pattern];
          if (mask[s16 % 4]) {
            let note = kit.rootMidi + transpose;
            if (kit.bass.fifth && bar % 2 === 1) note += 7;
            if (kit.bass.pattern === "walking" && s16 % 4 === 3) note += kit.bass.fifth ? 5 : 12;
            if (kit.bass.octave && s16 % 8 === 6) note += 12;
            bass(t, note, half ? 1.6 : 1);
          }
        }

        /* hats and shaker */
        const hatsOn = !silenced && ((kind === "intro" && inSec >= 2) || kind === "build" || drop || kind === "riser" || (kind === "outro" && left > 2));
        if (hatsOn) {
          const pat = HAT_PATTERNS[later && kit.hats.pattern === "off8" ? "sixteen" : kit.hats.pattern];
          if (pat(s16)) hat(t, false, kind === "intro");
          if (bar % 4 === kit.hats.open && s16 === 14) hat(t, true);
          if (kit.hats.shaker && drop && s16 % 2 === 0) shaker(t);
        }
        if (half && s16 % 8 === 4) hat(t, false);

        /* the backbeat */
        if (drop && !silenced && (s16 === 4 || s16 === 12) && !(fill === "roll" && lastHalf)) snare(t);

        /* leads */
        const leadsOn = !muted && (drop || (kind === "build" && inSec >= sec.bars / 2) || kind === "breakdown" || kind === "riser" || (kind === "outro" && left > 4));
        if (leadsOn) {
          const sweep = ((inSec % 8) / 8 + s16 / 128) * (drop ? 1 : kind === "breakdown" ? 0.35 : 0.7);
          kit.leads.forEach((L, li) => {
            // the breakdown keeps one voice; the build brings them in one at a time
            if (kind === "breakdown" && li !== 0) return;
            if (kind === "build" && li > Math.floor(((inSec - sec.bars / 2) / (sec.bars / 2)) * kit.leads.length)) return;
            const p = L.pattern[(bar * 16 + s16) % L.len];
            const up = later && L.octaveUp;
            const pt = transpose ? { ...p, note: p.note + transpose } : p;
            if (L.kind === "zap") {
              if (drop && p.on && Math.random() < 0.7) zap(t);
              return;
            }
            if (!p.on) return;
            if (L.kind === "acid") acid(t, L, pt, sweep, up, step);
            else if (L.kind === "stab") stab(t, L, pt, sweep, up);
            else if (L.kind === "pluck") pluck(t, L, pt, sweep, up);
          });
        }

        // the delay follows the tempo
        if (s16 === 0) delay.delayTime.setTargetAtTime(step * kit.fx.delayDiv, t, 0.05);

        s16++;
        stepIdx++;
        if (s16 === 16) {
          s16 = 0;
          barT += step * 16;
          bar++;
        }
      }
      if (bar >= plan.bars) state.ended = true;
    };
    state.timer = setInterval(tick, 25);
    tick();
  }

  function stop(fast) {
    if (!state.running) return;
    state.running = false;
    clearInterval(state.timer);
    const ctx = state.ctx;
    if (!ctx) return;
    // nothing is cut dead: the room is given a moment to let go of it
    setTimeout(() => ctx.close().catch(() => {}), fast ? 60 : 1400);
  }

  // kick envelope 0..1 at an audio time, for the visuals
  function pulse(now) {
    const bs = state.barStep[Math.min(state.bar, state.barStep.length - 1)] || 0.1;
    const beatLen = bs * 4;
    let p = 0;
    for (let i = state.kicks.length - 1; i >= 0; i--) {
      const d = now - state.kicks[i];
      if (d < 0) continue;
      p = Math.max(0, 1 - d / (beatLen * 0.9));
      break;
    }
    return p;
  }
  // the backbeat, as a short flash
  function clapPulse(now) {
    for (let i = state.claps.length - 1; i >= 0; i--) {
      const d = now - state.claps[i];
      if (d < 0) continue;
      return d < 0.07 ? 1 - d / 0.07 : 0;
    }
    return 0;
  }

  const api = { state, start, stop, pulse, clapPulse };
  return api;
}
// debug handles: the running trip, and a way to deal a trip without
// playing it, to see what a seed would have been
if (typeof window !== "undefined") window.__thCompose = (seed) => makeTrip(seed).state;

/* ============================================================
   THE GEOMETRY — five families, every parameter seeded, and all of
   it typed. The figures are drawn as light on an offscreen sheet at
   half size, folded through a kaleidoscope, and then read back as
   brightness and set in the archive's own ramp of glyphs, one per
   ten-pixel cell — sixteen thousand characters a frame.

   And this is the one place on the site with colour in it. The
   sheet is black and bone; the tab is where the colour is. Every
   trip is dealt a palette, and a second family of figure that it
   turns into at the second drop. In the drops the kick lights the
   stock and throws the wheel round, the backbeat turns the type
   inside out in a white frame, rows of type are thrown sideways,
   the sheet shakes, cells spark, and the strobes come in eighths and
   then in sixteenths.
   ============================================================ */
const RAMP = " .:-=+*#%@";
const CELL = 10; // sheet px per glyph
const GW = SW / 2; // the offscreen sheet the figures are drawn on
const GH = SH / 2;
const GC = CELL / 2; // a cell, on the offscreen
const KCOLS = SW / CELL; // 160
const KROWS = SH / CELL; // 100
const HUES = 24; // rows of the atlas: the wheel in fifteen-degree steps
const ROW_INK = HUES; // then ink, then red
const ROW_RED = HUES + 1;
const PALETTES = ["ACID", "DUO", "HEAT", "ICE", "NEON", "STROBE", "THERMAL", "SPLIT"];

function makeVisual(seed, family, family2, DPR) {
  const r = rng(seed);
  const spin = (r() - 0.5) * 0.9;
  const twist = r() * 0.6;
  const sides = 3 + Math.floor(r() * 6);
  const ka = 2 + Math.floor(r() * 7);
  const kb = 1 + Math.floor(r() * 4);
  // few enough rings that every band is wider than a glyph
  const rings = 10 + Math.floor(r() * 8);
  // the fold: how many times the figure is mirrored round the centre.
  // The tunnel is never folded — its rings turn against each other, and
  // laid over its own mirror image the dark bands disappear under the
  // lit ones of the copy.
  const foldOf = (fam) => (fam === 0 ? 1 : [1, 2, 3, 4, 6, 8][Math.floor(r() * 6)]);
  const fold1 = foldOf(family);
  const fold2 = foldOf(family2);
  const orbits = [];
  for (let i = 0; i < 3 + Math.floor(r() * 3); i++) {
    orbits.push({
      r1: 90 + r() * 260, r2: 30 + r() * 160,
      w1: (r() - 0.5) * 2.4, w2: (r() - 0.5) * 7,
      ph: r() * Math.PI * 2, trail: [],
    });
  }
  const lattice = { nx: 12 + Math.floor(r() * 10), ny: 8 + Math.floor(r() * 6), f: 0.004 + r() * 0.01 };

  /* the palette this tab was dealt */
  const palette = Math.floor(r() * PALETTES.length);
  const hueA = Math.floor(r() * HUES);
  const wheelDir = r() > 0.5 ? 1 : -1;
  const wheelSpeed = 0.06 + r() * 0.1;
  const neon = [];
  for (let i = 0; i < 6; i++) neon.push(Math.floor(r() * HUES));

  /* offscreen: the figure, and the fold of it */
  const geo = document.createElement("canvas");
  geo.width = GW;
  geo.height = GH;
  const g = geo.getContext("2d");
  const fieldCv = document.createElement("canvas");
  fieldCv.width = GW;
  fieldCv.height = GH;
  const f = fieldCv.getContext("2d", { willReadFrequently: true });

  /* the type: the ramp set once into an atlas — a row per hue, then
     ink, then red */
  const AS = Math.ceil(CELL * DPR);
  const atlas = document.createElement("canvas");
  atlas.width = AS * RAMP.length;
  atlas.height = AS * (HUES + 2);
  const ac = atlas.getContext("2d");
  ac.font = `700 ${Math.round(CELL * 1.25 * DPR)}px ui-monospace, Menlo, monospace`;
  ac.textAlign = "center";
  ac.textBaseline = "middle";
  for (let row = 0; row < HUES + 2; row++) {
    ac.fillStyle = row === ROW_INK ? INK : row === ROW_RED ? RED : `hsl(${row * (360 / HUES)}, 100%, 62%)`;
    for (let i = 0; i < RAMP.length; i++) ac.fillText(RAMP[i], i * AS + AS / 2, row * AS + AS / 2);
  }

  /* every cell's angle round the centre and distance from it, once */
  const angle = new Float32Array(KCOLS * KROWS);
  const dist = new Float32Array(KCOLS * KROWS);
  for (let row = 0; row < KROWS; row++) {
    for (let col = 0; col < KCOLS; col++) {
      const dx = col - KCOLS / 2 + 0.5;
      const dy = (row - KROWS / 2 + 0.5) * 1.6;
      angle[row * KCOLS + col] = (Math.atan2(dy, dx) / (Math.PI * 2) + 1) % 1;
      dist[row * KCOLS + col] = Math.hypot(dx, dy) / (KCOLS / 2);
    }
  }
  const glitchRows = new Int8Array(KROWS);
  let kickShift = 0; // the wheel, kicked round
  let lastKickFrame = -1;

  const W = INK;
  function figure(fam, t, p, energy) {
    g.fillStyle = "#000";
    g.fillRect(0, 0, GW, GH);
    g.save();
    g.translate(GW / 2, GH / 2);
    g.scale(0.5, 0.5); // the families are written in sheet coordinates
    const lean = Math.sin(t * 0.21) * 0.05;
    const hurry = 1 + energy * 0.5; // the drops turn everything faster
    g.rotate(lean + t * spin * 0.1 * hurry);
    const zoom = 1 + p * (0.12 + energy * 0.06) + Math.sin(t * 0.37) * 0.03;
    g.scale(zoom, zoom);

    if (fam === 0) {
      /* tunnel: filled rings of polygon, alternating light and dark,
         pouring toward the centre and turning as they go */
      const list = [];
      for (let i = 0; i < rings; i++) {
        const u = ((i / rings + t * 0.09 * hurry) % 1 + 1) % 1;
        list.push({ u, i });
      }
      list.sort((a, b) => b.u - a.u);
      list.forEach(({ u, i }) => {
        const s = Math.pow(u, 1.6) * 900 + 8;
        const rot = i * twist + t * spin * hurry + u * 2;
        const lit = i % 2 === 0;
        const a = lit ? 0.55 + 0.45 * (1 - u) : 0.03 + 0.05 * (1 - u) + p * 0.08;
        g.fillStyle = `rgba(240,238,230,${a})`;
        g.beginPath();
        for (let k = 0; k <= sides; k++) {
          const th = rot + (k / sides) * Math.PI * 2;
          const px = Math.cos(th) * s;
          const py = Math.sin(th) * s * 0.78;
          if (k === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.closePath();
        g.fill();
      });
    } else if (fam === 1) {
      /* rose: r = cos(kθ), set thick and glowing, two of them turning
         against each other, the inside washed */
      const k = ka / kb + Math.sin(t * 0.12) * 0.08;
      const R = 330 + p * 50;
      const N = 480;
      for (let m = 0; m < 2; m++) {
        g.save();
        g.rotate((m ? -t * 0.22 : t * 0.15) * hurry);
        g.lineWidth = m ? 3 : 5.5;
        g.strokeStyle = `rgba(240,238,230,${m ? 0.5 : 0.95})`;
        g.lineJoin = "round";
        g.beginPath();
        for (let i = 0; i <= N; i++) {
          const th = (i / N) * Math.PI * 2 * kb;
          const rad = R * Math.cos((k + m * 0.5) * th + t * 0.6 * hurry);
          const px = Math.cos(th) * rad;
          const py = Math.sin(th) * rad;
          if (i === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.stroke();
        if (!m) {
          g.fillStyle = `rgba(240,238,230,${0.05 + p * 0.06})`;
          g.fill();
        }
        g.restore();
      }
    } else if (fam === 2) {
      /* lattice: a field of filled figures, every other one lit, each
         turned by its distance, so the sheet rolls with moiré */
      const { nx, ny, f: ff } = lattice;
      const gx = SW / nx;
      const gy = SH / ny;
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
          const x = (i - nx / 2 + 0.5) * gx;
          const y = (j - ny / 2 + 0.5) * gy;
          const d = Math.hypot(x, y);
          const rot = d * ff * (1 + Math.sin(t * 0.3)) + t * 1.1 * hurry * (1 + p * 0.4);
          const s = gx * 0.46 * (0.55 + 0.45 * Math.sin(d * 0.01 - t * 2.2 * hurry)) * (1 + p * 0.25);
          const lit = (i + j) % 2 === 0;
          g.fillStyle = `rgba(240,238,230,${lit ? 0.9 : 0.18 + p * 0.25})`;
          g.beginPath();
          for (let k = 0; k <= sides; k++) {
            const th = rot + (k / sides) * Math.PI * 2;
            const px = x + Math.cos(th) * s;
            const py = y + Math.sin(th) * s;
            if (k === 0) g.moveTo(px, py);
            else g.lineTo(px, py);
          }
          g.closePath();
          g.fill();
        }
      }
    } else if (fam === 3) {
      /* phyllotaxis: eleven hundred seeds at the golden angle, a wave
         of light running out through them against the spin */
      const N = 1100;
      const ga = Math.PI * (3 - Math.sqrt(5));
      const sc = 15 + p * 1.5;
      const rot = t * spin * 2 * hurry;
      for (let i = 0; i < N; i++) {
        const th = i * ga + rot;
        const rad = sc * Math.sqrt(i) * (1 + 0.03 * Math.sin(i * 0.05 + t * 3));
        const px = Math.cos(th) * rad;
        const py = Math.sin(th) * rad * 0.82;
        const wave = 0.5 + 0.5 * Math.sin(i * 0.031 - t * 4.5 * hurry);
        g.fillStyle = `rgba(240,238,230,${0.12 + 0.88 * wave})`;
        g.beginPath();
        g.arc(px, py, 3 + wave * 6 + p * 2, 0, Math.PI * 2);
        g.fill();
      }
    } else {
      /* orbits: epicycles leaving long trails — the spirograph that
         never closes, stepped finely so the curve stays a curve */
      orbits.forEach((o, oi) => {
        const SUB = 6;
        for (let s = 1; s <= SUB; s++) {
          const tt = (t - (1 / 60) * (1 - s / SUB)) * hurry;
          const a1 = tt * o.w1 + o.ph;
          const a2 = tt * o.w2;
          const x = Math.cos(a1) * o.r1 + Math.cos(a2) * o.r2 * (1 + p * 0.15);
          const y = (Math.sin(a1) * o.r1 + Math.sin(a2) * o.r2) * 0.85;
          o.trail.push([x, y]);
        }
        if (o.trail.length > 2400) o.trail.splice(0, o.trail.length - 2400);
        g.lineWidth = 5 + oi * 2;
        g.lineJoin = "round";
        g.strokeStyle = `rgba(240,238,230,${0.45 + 0.5 * ((oi + 1) / orbits.length)})`;
        g.beginPath();
        for (let i = 0; i < o.trail.length; i++) {
          const [px, py] = o.trail[i];
          if (i === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.stroke();
        const [hx, hy] = o.trail[o.trail.length - 1];
        g.fillStyle = W;
        g.beginPath();
        g.arc(hx, hy, 9 + p * 8, 0, Math.PI * 2);
        g.fill();
      });
    }
    g.restore();
  }

  /* the fold: the figure laid round the centre `fold` times, mirrored
     every other time. The passes take the brighter of each other, not
     the sum — summed, three mirrored fills are a white sheet. */
  function foldField(fold, flip) {
    f.globalCompositeOperation = "source-over";
    f.fillStyle = "#000";
    f.fillRect(0, 0, GW, GH);
    if (fold === 1) {
      if (flip) {
        f.save();
        f.translate(GW, 0);
        f.scale(-1, 1);
        f.drawImage(geo, 0, 0);
        f.restore();
      } else f.drawImage(geo, 0, 0);
      return;
    }
    f.globalCompositeOperation = "lighten";
    for (let i = 0; i < fold; i++) {
      f.save();
      f.translate(GW / 2, GH / 2);
      f.rotate((i / fold) * Math.PI * 2 + (flip ? Math.PI / fold : 0));
      if (i % 2) f.scale(1, -1);
      f.drawImage(geo, -GW / 2, -GH / 2);
      f.restore();
    }
    f.globalCompositeOperation = "source-over";
  }

  /* which row of the atlas a cell is set from */
  function hueRow(i, lum, t, energy, eighth, kickFlip) {
    const shift = kickShift;
    if (palette === 0) {
      // the wheel, turning round the fold, pulled along by brightness,
      // and kicked round by every kick
      let h = angle[i] * wheelDir + t * wheelSpeed * (1 + energy) + lum * 0.25 + dist[i] * 0.15 + shift / HUES;
      if (kickFlip) h += 0.5;
      return ((Math.floor(h * HUES) % HUES) + HUES) % HUES;
    }
    if (palette === 1) {
      const bright = lum > 0.5 !== kickFlip;
      return (hueA + shift + (bright ? 0 : HUES / 2)) % HUES;
    }
    if (palette === 2) {
      if (lum > 0.92) return ROW_INK;
      return (Math.floor(lum * 4.99) + (kickFlip ? 1 : 0)) % HUES; // 0°..60°
    }
    if (palette === 3) return (12 + Math.floor(lum * 7.99) + (kickFlip ? 2 : 0)) % HUES; // 180°..300°
    if (palette === 4) {
      // neon: six colours of the tab's own, striped round the fold
      const k = Math.floor(angle[i] * 6 + t * (0.4 + energy * 0.6) + shift + lum * 2);
      return neon[((k % 6) + 6) % 6];
    }
    if (palette === 5) {
      // strobe: one colour, the whole field, changing every eighth
      return (hueA + eighth * 7 + shift) % HUES;
    }
    if (palette === 6) {
      // thermal: blue through magenta and red to yellow, white at the top
      if (lum > 0.95) return ROW_INK;
      return (16 + Math.floor(lum * 12) + (kickFlip ? 3 : 0)) % HUES;
    }
    // split: three colours a third of the wheel apart, by brightness
    return (hueA + shift + 8 * Math.floor(lum * 2.99)) % HUES;
  }

  /* info: energy 0..3 · strobe 0 none, 1 eighths, 2 sixteenths ·
     eighth and sixteenth counters within the bar · clap 0..1 ·
     switched: past the second drop, the other family · calm */
  function draw(c, t, p, info) {
    const { energy, strobe, eighth, sixteenth, clap, switched, calm, frame } = info;
    const fam = switched ? family2 : family;
    const fold = switched ? fold2 : fold1;
    figure(fam, t, p, energy);
    const inDrop = energy >= 2 && !calm;
    const kick = p > 0.86 && inDrop;
    if (kick && frame - lastKickFrame > 6) {
      lastKickFrame = frame;
      kickShift += 5;
      const gr = rng(frame);
      for (let row = 0; row < KROWS; row++) glitchRows[row] = gr() < 0.16 ? Math.floor((gr() - 0.5) * 24) : 0;
    }
    foldField(fold, kick && energy === 3);
    const img = f.getImageData(0, 0, GW, GH).data;

    /* the stock: black, except in the drops — the kick lights it, the
       backbeat whites it out, and the strobes slam it between a colour
       and its opposite */
    const strobing = strobe > 0 && !calm;
    const strobePhase = strobe === 2 ? sixteenth : eighth;
    const clapFlash = clap > 0 && inDrop;
    if (clapFlash) {
      c.fillStyle = `rgba(240,238,230,${0.35 + clap * 0.55})`;
    } else if (strobing) {
      const h = ((hueA + kickShift + (strobePhase % 2 ? HUES / 2 : 0)) % HUES) * (360 / HUES);
      c.fillStyle = `hsl(${h}, 100%, ${strobePhase % 2 ? 52 : 6}%)`;
    } else if (kick) {
      const h = (palette === 0 || palette === 4 || palette === 5 ? (kickShift * 15 + t * 90) % 360 : palette === 1 || palette === 7 ? hueA * 15 : palette === 2 ? 10 : palette === 3 ? 200 : 280);
      c.fillStyle = `hsl(${h}, 100%, ${Math.round(14 + (p - 0.86) * 200)}%)`;
    } else c.fillStyle = "#000";
    if (clapFlash) {
      c.fillStyle = "#000";
      c.fillRect(0, 0, SW, SH);
      c.fillStyle = `rgba(240,238,230,${0.35 + clap * 0.55})`;
    }
    c.fillRect(0, 0, SW, SH);

    // the sheet shakes on the kick
    const shakeX = kick ? Math.round((rng(frame * 3)() - 0.5) * 4) : 0;
    const shakeY = kick ? Math.round((rng(frame * 5)() - 0.5) * 3) : 0;
    const invert = (strobing && strobePhase % 2 === 1) || clapFlash;
    const glitch = kick;
    const spark = inDrop ? 0.035 + energy * 0.01 : 0;
    const n = RAMP.length;
    const redR = 1.5 + p * 4;
    const cxC = KCOLS / 2;
    const cyC = KROWS / 2;
    const sparkSeed = frame * 7919;
    for (let row = 0; row < KROWS; row++) {
      const sy = row * GC + GC / 2;
      const shift = (glitch ? glitchRows[row] : 0) + shakeX;
      for (let col = 0; col < KCOLS; col++) {
        const sx = col * GC + GC / 2;
        const i0 = ((sy | 0) * GW + (sx | 0)) * 4;
        const i1 = (((sy + 1) | 0) * GW + ((sx + 1) | 0)) * 4;
        let lum = (img[i0] + img[i1]) / 510;
        if (invert) lum = 1 - lum;
        const idx = Math.min(n - 1, Math.floor(lum * n));
        if (idx === 0) continue;
        const ci = row * KCOLS + col;
        const dx = col - cxC + 0.5;
        const dy = row - cyC + 0.5;
        let atlasRow;
        if (dx * dx + dy * dy < redR * redR) atlasRow = ROW_RED;
        else if (calm || energy === 0) atlasRow = ROW_INK;
        else if (spark && hash2(ci, sparkSeed) < spark) atlasRow = Math.floor(hash2(sparkSeed, ci) * HUES);
        else atlasRow = hueRow(ci, lum, t, energy, eighth, kick);
        const x = (((col + shift) % KCOLS) + KCOLS) % KCOLS;
        const y = (((row + shakeY) % KROWS) + KROWS) % KROWS;
        c.drawImage(atlas, idx * AS, atlasRow * AS, AS, AS, x * CELL, y * CELL, CELL, CELL);
      }
    }
    // the centre always holds the beat, even over black
    c.drawImage(atlas, (n - 1) * AS, ROW_RED * AS, AS, AS, (KCOLS / 2 - 1) * CELL, (KROWS / 2 - 1) * CELL, CELL, CELL);
  }

  return { draw, palette: PALETTES[palette] };
}

const FAMILY_NAMES = ["TUNNEL", "ROSE", "LATTICE", "PHYLLO", "ORBITS"];
const SECTION_NAMES = {
  intro: "BEHIND THE WALL", build: "BUILD", tease: "TEASE", breath: "BREATH", drop: "DROP",
  breakdown: "BREAKDOWN", halftime: "HALF TIME", riser: "RISER", outro: "COMEDOWN",
};

/* ============================================================
   THE TRIP — full sheet, one tab's worth
   ============================================================ */
function Trip({ sheet, tab, onDone, reduceMotion }) {
  const ref = useRef(null);
  const [hud, setHud] = useState({ bpm: 0, bar: 0, bars: 0, fam: "", sec: "", left: 0 });

  useEffect(() => {
    const seed = Math.floor(hash2(sheet, tab) * 1e9) ^ (tab * 7919);
    const trip = makeTrip(seed);
    const canvas = ref.current;
    const DPR = Math.min(1.5, window.devicePixelRatio || 1);
    const vis = makeVisual(trip.state.visualSeed, trip.state.family, trip.state.family2, DPR);
    trip.start();
    canvas.width = SW * DPR;
    canvas.height = SH * DPR;
    const c = canvas.getContext("2d");
    c.setTransform(DPR, 0, 0, DPR, 0, 0);

    let raf;
    let hudAt = 0;
    let frame = 0;
    const tick = (ts) => {
      raf = requestAnimationFrame(tick);
      if (document.hidden) return;
      frame++;
      const st = trip.state;
      const ctx = st.ctx;
      if (!ctx) return;
      const now = ctx.currentTime;
      const t = Math.max(0, now - st.startAt);
      const bar = st.bar;
      const sec = st.sectionAt(bar);
      const energy = st.energyAt(bar);
      const bs = st.barStep[Math.min(bar, st.barStep.length - 1)];
      const inBar = Math.max(0, (t - st.barStart[Math.min(bar, st.barStart.length - 1)]) / bs);
      const p = reduceMotion ? trip.pulse(now) * 0.35 : trip.pulse(now);
      vis.draw(c, t, p, {
        energy,
        strobe: reduceMotion ? 0 : st.strobeAt(bar),
        eighth: Math.floor(inBar / 2) % 8,
        sixteenth: Math.floor(inBar) % 16,
        clap: reduceMotion ? 0 : trip.clapPulse(now),
        switched: bar >= st.switchBar,
        calm: reduceMotion,
        frame,
      });
      if (ts - hudAt > 250) {
        hudAt = ts;
        const fam = FAMILY_NAMES[bar >= st.switchBar ? st.family2 : st.family];
        setHud({
          bpm: sec.bpm,
          bar: Math.min(st.bars, bar + 1),
          bars: st.bars,
          fam: `${fam} · ${vis.palette}`,
          sec: SECTION_NAMES[sec.kind] + (sec.kind === "drop" ? " " + "I".repeat(sec.n) : ""),
          left: Math.max(0, st.totalSec - t),
        });
      }
      // the last bar plays out into the room, then the sheet comes back
      if (t > st.totalSec + 1.6) finish(false);
    };
    raf = requestAnimationFrame(tick);

    let done = false;
    const finish = (early) => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      trip.stop(early);
      onDone();
    };
    const onKey = (e) => {
      if (e.key === "Escape") finish(true);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (!done) {
        done = true;
        cancelAnimationFrame(raf);
        trip.stop(true);
      }
    };
  }, []);

  // one pass of grain over the type, drawn once: the trip is still
  // printed on the same stock as everything else
  const grainRef = useRef(null);
  useEffect(() => {
    const cv = grainRef.current;
    cv.width = SW / 2;
    cv.height = SH / 2;
    const c = cv.getContext("2d");
    const id = c.createImageData(cv.width, cv.height);
    const d = id.data;
    let s = 0x9e3779b1;
    for (let i = 0; i < d.length; i += 4) {
      s ^= s << 13;
      s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5;
      s >>>= 0;
      const v = s & 255;
      d[i] = d[i + 1] = d[i + 2] = 240;
      d[i + 3] = v < 40 ? 26 : 0;
    }
    c.putImageData(id, 0, 0);
  }, []);

  return (
    <div className="thTrip">
      <canvas ref={ref} className="thTripCanvas" style={{ width: SW, height: SH }} />
      <canvas ref={grainRef} className="thGrain" style={{ width: SW, height: SH }} />
      <div className="thTripHud thTripHudL">
        TAB {pad4(tab)} · SHEET {pad4(sheet)}
      </div>
      <div className="thTripHud thTripHudR">
        {hud.bpm} BPM · {hud.fam} · {hud.sec} · {String(hud.bar).padStart(2, "0")}/{hud.bars}
      </div>
      <div className="thTripHud thTripHudB">
        {mmss(hud.left * 1000)} <span className="thDim">· esc spits it out</span>
      </div>
    </div>
  );
}

/* ============================================================
   THE PAGE
   ============================================================ */
export default function ThumbedPage() {
  const stageRef = useRef(null);
  const sheetRef = useRef(null);
  const overRef = useRef(null);
  const [phase, setPhase] = useState("cover"); // cover | sheet | trip
  const [scale, setScale] = useState(1);
  const [clock, setClock] = useState(() => clockNow());
  const [tooSmall, setTooSmall] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [taken, setTaken] = useState(null); // {sheet, tab} this visitor took
  const [trip, setTrip] = useState(null); // {sheet, tab} playing now
  const [whisper, setWhisper] = useState("");
  const reduceMotion = useRef(false);

  // the cover clock, and whether this is a device worth the sheet
  useEffect(() => {
    setMounted(true);
    reduceMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fit = () => {
      setScale(Math.min(window.innerWidth / (SW + 24), window.innerHeight / (SH + 24)));
      setTooSmall(window.innerWidth < 900 || !window.matchMedia("(pointer: fine)").matches);
    };
    fit();
    window.addEventListener("resize", fit);
    try {
      const t = JSON.parse(localStorage.getItem("th_taken") || "null");
      if (t) setTaken(t);
    } catch {}
    const iv = setInterval(() => setClock(clockNow()), 500);
    return () => {
      window.removeEventListener("resize", fit);
      clearInterval(iv);
    };
  }, []);

  /* the sheet: printed once per sheet number, dissolved on the clock */
  useEffect(() => {
    if (phase !== "sheet") return;
    const canvas = sheetRef.current;
    const over = overRef.current;
    const stage = stageRef.current;
    const DPR = Math.min(1.5, window.devicePixelRatio || 1);
    canvas.width = SW * DPR;
    canvas.height = SH * DPR;
    over.width = SW * DPR;
    over.height = SH * DPR;
    const c = canvas.getContext("2d");
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    const o = over.getContext("2d");
    o.setTransform(DPR, 0, 0, DPR, 0, 0);
    const seedThumb = thumbSeed();

    const st = {
      sheet: 0,
      order: null,
      gone: null, // Uint8Array per tab
      dissolvedCount: 0,
      mouse: { x: -100, y: -100, in: false },
      hold: null, // { tab, since }
      tabHere: -1,
      myTab: null,
      whisperAt: 0,
    };

    const print = (sheet) => {
      st.sheet = sheet;
      st.order = dissolveOrder(sheet);
      st.gone = new Uint8Array(TABS);
      st.dissolvedCount = 0;
      drawStock(c, sheet);
      drawPerforations(c);
      for (let i = 0; i < TABS; i++) {
        const { x, y, s } = tabRect(i);
        drawTabGlyph(c, x + 2, y + 2, s - 4, (sheet * 4001 + i) | 0);
      }
      // whatever has already gone by the time this sheet is looked at
      const now = clockNow();
      if (now.sheet === sheet) catchUp(now.dissolved);
      // the tab this visitor took from this sheet is a hole as well
      try {
        const t = JSON.parse(localStorage.getItem("th_taken") || "null");
        st.myTab = t && t.sheet === sheet ? t.tab : null;
        if (st.myTab !== null && !st.gone[st.myTab]) {
          st.gone[st.myTab] = 1;
          drawHole(c, st.myTab, sheet * 97 + st.myTab);
        }
      } catch {}
    };

    const catchUp = (count) => {
      while (st.dissolvedCount < count) {
        const i = st.order[st.dissolvedCount++];
        if (!st.gone[i]) {
          st.gone[i] = 1;
          drawHole(c, i, st.sheet * 97 + i);
        }
      }
    };

    print(clockNow().sheet);

    const onMove = (e) => {
      const r = stage.getBoundingClientRect();
      st.mouse.x = ((e.clientX - r.left) / r.width) * SW;
      st.mouse.y = ((e.clientY - r.top) / r.height) * SH;
      st.mouse.in = st.mouse.x >= 0 && st.mouse.x <= SW && st.mouse.y >= 0 && st.mouse.y <= SH;
    };
    const onLeave = () => {
      st.mouse.in = false;
      st.hold = null;
    };
    const say = (text) => {
      setWhisper(text);
      st.whisperAt = performance.now();
    };
    const onDown = (e) => {
      onMove(e);
      const i = tabAt(st.mouse.x, st.mouse.y);
      if (i < 0) return;
      if (st.myTab !== null) {
        say("you've had yours. the thumb is dry until the next sheet.");
        return;
      }
      if (st.gone[i]) {
        say("that one's gone.");
        return;
      }
      st.hold = { tab: i, since: performance.now() };
    };
    const onUp = () => {
      st.hold = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    stage.addEventListener("pointerleave", onLeave);

    let raf;
    const frame = (ts) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      const now = clockNow();
      // the quarter-hour: the next sheet prints over the old one
      if (now.sheet !== st.sheet) {
        print(now.sheet);
        st.myTab = null;
      } else if (now.dissolved > st.dissolvedCount) {
        catchUp(now.dissolved);
      }

      /* the thumb, and the press */
      o.clearRect(0, 0, SW, SH);
      if (st.mouse.in) {
        const i = tabAt(st.mouse.x, st.mouse.y);
        st.tabHere = i;
        const dry = st.myTab !== null;
        if (i >= 0 && !st.gone[i] && !dry) {
          // the tab under the thumb lifts a hair
          const { x, y, s } = tabRect(i);
          o.strokeStyle = "rgba(240,238,230,0.75)";
          o.lineWidth = 1;
          o.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
        }
        let ink = dry ? 0.28 : 0.85;
        let scl = 1;
        if (st.hold) {
          const k = Math.min(1, (ts - st.hold.since) / HOLD_MS);
          ink = 1;
          scl = 1 + k * 0.35;
          const { x, y, s } = tabRect(st.hold.tab);
          // ink soaking into the tab as it is held
          o.fillStyle = `rgba(240,238,230,${k * 0.55})`;
          o.fillRect(x + 1, y + 1, s - 2, s - 2);
          if (k >= 1) {
            // taken
            const tab = st.hold.tab;
            st.hold = null;
            st.gone[tab] = 1;
            st.myTab = tab;
            drawHole(c, tab, st.sheet * 97 + tab);
            const rec = { sheet: st.sheet, tab };
            try {
              localStorage.setItem("th_taken", JSON.stringify(rec));
            } catch {}
            setTaken(rec);
            setTrip(rec);
            setPhase("trip");
            return;
          }
        }
        drawThumb(o, st.mouse.x, st.mouse.y, seedThumb, ink, scl);
      }
      if (st.whisperAt && ts - st.whisperAt > 2600) {
        st.whisperAt = 0;
        setWhisper("");
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      stage.removeEventListener("pointerleave", onLeave);
    };
  }, [phase]);

  const open = () => {
    if (phase !== "cover" || tooSmall) return;
    setPhase("sheet");
  };

  const remaining = TABS - clock.dissolved;
  const mine = taken && taken.sheet === clock.sheet;

  return (
    <div className="thRoot">
      <div
        ref={stageRef}
        className={`thStage${phase === "sheet" ? " thLive" : ""}`}
        style={{ width: SW, height: SH, transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {phase !== "cover" && (
          <>
            <canvas ref={sheetRef} className="thSheet" style={{ width: SW, height: SH }} />
            <canvas ref={overRef} className="thOver" style={{ width: SW, height: SH }} />
            <div className="thHud thHudL">
              SHEET {pad4(clock.sheet)} · {remaining.toLocaleString()} OF {TABS.toLocaleString()} REMAIN
            </div>
            <div className="thHud thHudR">
              DISSOLVES IN <span className="thRed">{mmss(clock.remainingMs)}</span>
            </div>
            <div className="thHud thHudB">
              {mine
                ? `yours was tab ${pad4(taken.tab)}. the thumb is dry until the next sheet.`
                : "hold a thumb on one that is still there."}
            </div>
            {whisper && <div className="thWhisper">{whisper}</div>}
          </>
        )}
        {phase === "trip" && trip && (
          <Trip
            sheet={trip.sheet}
            tab={trip.tab}
            reduceMotion={reduceMotion.current}
            onDone={() => {
              setTrip(null);
              setPhase("sheet");
            }}
          />
        )}
      </div>

      {phase === "cover" && (
        <div className="thCover" onClick={open}>
          <div className="thMark">exhibit c</div>
          <h1 className="thTitle">THUMBED</h1>
          <div className="thLine">four thousand tabs. fifteen minutes. no one is keeping the sheet.</div>
          {/* the clock is the client's: the server would print the moment
              it was built, and the two never agree */}
          <div className="thClock">
            {mounted
              ? `SHEET ${pad4(clock.sheet)} · ${remaining.toLocaleString()} LEFT · ${mmss(clock.remainingMs)}`
              : "SHEET ···· · ···· LEFT · ··:··"}
          </div>
          {!mounted ? (
            <div className="thWait">⌇</div>
          ) : tooSmall ? (
            <div className="thNag">
              <span className="thNagShout">FUCK OFF</span>
              <span className="thNagLine">THIS WAS NOT PERFORATED FOR A PHONE.</span>
              <span className="thNagLine">
                COME BACK ON A REAL DEVICE. THEN LEAVE.<span className="thCaret">_</span>
              </span>
            </div>
          ) : (
            <button className="thBegin" onClick={open}>
              put your thumb on it<span className="thCaret">_</span>
            </button>
          )}
          <div className="thFine">one per sheet. the clock does not wait.</div>
          <div className="thWarn">contains strobing light. not for photosensitive eyes.</div>
          <Link href="/" className="thHome" onClick={(e) => e.stopPropagation()}>
            ⟵ refoldered.com_
          </Link>
        </div>
      )}

      {phase !== "cover" && (
        <Link href="/" className="thHome">
          ⟵ refoldered.com_
        </Link>
      )}
    </div>
  );
}
