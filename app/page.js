"use client";

import { useEffect, useRef, useState } from "react";
import ArchiveAudio from "./components/ArchiveAudio";

const CRYPTIC = [
  "music piercing through my aorta",
  "euphoria is irreplaceable",
  "the bassline remembers you",
  "serotonin on layaway",
  "pressed, stamped, swallowed, gone",
  "the archive hums at 98.3",
  "we danced until the file corrupted",
  "your pupils, wide as compact discs",
  "side b is a wound",
  "the smiley never blinks",
  "signal found in an empty warehouse",
  "the comedown catalogues everything",
  "chrome tongue, vinyl heart",
  "every anthem ends in tinnitus",
  "the prism splits what's left of us",
  "looped until it meant nothing",
  "802 unlabeled minutes",
  "the changer clicks like a ribcage",
  "static is also a memory",
  "do not chew the archive",
];

// Changer geometry, shared by the scene canvas, the ASCII art canvas, and
// the SVG overlay. x/y = poster position of the wrap; the rest are local.
const TOWER = {
  x: 36,
  y: 76,
  w: 280,
  h: 680,
  discCx: 192,
  discCy0: 80,
  discDy: 102,
  discR: 48,
};

const ALBUMS = [
  { key: "deftones", url: "/albums/deftones" },
  { key: "acdc", url: "/albums/acdc" },
  { key: "aphex", url: "/albums/aphex" },
  { key: "acid", url: "/albums/acid" },
  { key: "floyd", url: "/albums/floyd" },
  { key: "lcd", url: "/albums/lcd" },
];

const DISCS = ["PROJECTS", "DATA_LOG", "HISTORY", "CONTACT", "RECALL", "FRAGMENTS"];
const SLOT_COUNT = DISCS.length;

// Math.cos/sin/atan2 are not required by the spec to be correctly rounded,
// so Node and the browser can disagree in the last ulp — enough for React
// to report a hydration mismatch. Quantise anything trig-derived that gets
// serialised into SSR'd markup so both sides emit the same string.
function q3(n) {
  return Math.round(n * 1000) / 1000;
}

/* Smooth value noise, built on hash2 with smoothstep interpolation.
   Used for the large, slow variation that makes ink and paper look
   uneven — mottling, fade, foxing — as opposed to per-pixel grain. */
function vnoise(x, y, cell, seed) {
  const gx = Math.floor(x / cell);
  const gy = Math.floor(y / cell);
  const fx = x / cell - gx;
  const fy = y / cell - gy;
  const at = (a, b) => hash2(a * 3 + seed * 9779, b * 7 + seed * 131);
  const a = at(gx, gy);
  const b = at(gx + 1, gy);
  const c = at(gx, gy + 1);
  const d = at(gx + 1, gy + 1);
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// Deterministic hash so SSR and client render the same dot fields.
function hash2(i, j) {
  let h = (i * 374761393 + j * 668265263) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h >>> 0) / 4294967295;
}

/* ---- ASCII globe data: 72×36 land mask (5° cells), rows from 90N→90S.
   Each row lists [startCol, endCol] land runs; coarse, but at ASCII
   resolution it reads unmistakably as Earth. ---- */
const LAND_ROWS = [
  [],
  [[14, 20], [24, 31]],
  [[12, 21], [23, 30], [39, 40], [50, 52], [60, 62]],
  [[10, 22], [24, 30], [40, 41], [43, 71]],
  [[3, 8], [9, 21], [25, 29], [32, 33], [38, 42], [43, 71]],
  [[2, 8], [9, 20], [26, 28], [37, 42], [43, 70]],
  [[9, 16], [19, 21], [34, 35], [38, 40], [41, 70]],
  [[10, 21], [33, 35], [36, 44], [45, 66], [68, 68]],
  [[10, 22], [34, 65]],
  [[10, 21], [33, 64]],
  [[10, 20], [33, 35], [37, 40], [41, 50], [52, 63], [64, 65]],
  [[12, 19], [33, 62], [63, 63]],
  [[11, 15], [17, 18], [32, 61]],
  [[11, 15], [16, 18], [31, 45], [46, 48], [50, 55], [56, 60], [61, 61]],
  [[13, 16], [18, 19], [31, 44], [46, 49], [51, 54], [55, 60], [61, 61]],
  [[15, 16], [19, 22], [31, 42], [44, 48], [51, 53], [55, 58], [61, 62]],
  [[19, 22], [23, 25], [34, 46], [52, 52], [56, 57], [58, 61]],
  [[19, 27], [36, 46], [55, 61], [63, 66]],
  [[19, 28], [36, 46], [55, 56], [58, 59], [63, 67]],
  [[20, 29], [37, 45], [56, 59], [64, 67]],
  [[20, 29], [37, 45], [62, 66]],
  [[21, 28], [37, 44], [46, 46], [60, 67]],
  [[21, 27], [38, 43], [46, 46], [59, 67]],
  [[21, 25], [38, 42], [59, 67]],
  [[21, 24], [39, 41], [60, 66]],
  [[21, 23], [65, 66], [69, 69]],
  [[21, 22], [66, 66], [68, 69]],
  [[21, 22], [68, 68]],
  [[21, 22]],
  [],
  [],
  [[30, 60]],
  [[10, 66]],
  [[0, 71]],
  [[0, 71]],
  [[0, 71]],
];

function landAt(latDeg, lonDeg) {
  const row = Math.min(35, Math.max(0, Math.floor((90 - latDeg) / 5)));
  const col = Math.floor(((((lonDeg + 180) % 360) + 360) % 360) / 5);
  const runs = LAND_ROWS[row];
  for (let i = 0; i < runs.length; i++) {
    if (col >= runs[i][0] && col <= runs[i][1]) return true;
  }
  return false;
}

const GLOBE_CITIES = [
  { lat: 52.37, lon: 4.9, label: "AMSTERDAM" },
  { lat: 37.57, lon: 126.98, label: "SOUTH KOREA" },
  { lat: 38.9, lon: 1.43, label: "IBIZA" },
  { lat: -23.55, lon: -46.63, label: "BRAZIL" },
];

const RING_TEXT = "REFOLDERED · REFOLDERED · ";

/* ================= ROTATING COIN → ASCII GLOBE =================
   Precise trig geometry rendered to an offscreen canvas, converted to a
   halftone dot field, with crisp vector linework layered on top. One coin:
   Mercedes tri-star face / BMW roundel face.
   Every click winds the spin faster; after 12 clicks the strobing blur
   collapses into a slowly turning ASCII globe with red site markers and
   "refoldered" orbiting it in mono. */
function PillCanvas() {
  const canvasRef = useRef(null);
  const spinRef = useRef({ mode: "coin", clicks: 0, speed: 1, rot: 0, vel: 0, flash: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const W = 480; // wide enough that the orbiting ring type never clips
    const H = 520;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    const off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    const octx = off.getContext("2d");

    const cx = W / 2;
    const cy = H / 2;
    const R = 175;
    const T = 84; // tablet thickness — the extruded rim that makes it a cylinder

    function withDisc(c, mirror, xscale, dx, fn) {
      c.save();
      c.translate(cx + dx, cy);
      c.scale(mirror ? -xscale : xscale, 1);
      fn(c);
      c.restore();
    }

    // silhouette of the full cylinder: two face ellipses joined by tangents
    function rimPath(c, xl, xr, rw) {
      c.beginPath();
      c.moveTo(xl, -R);
      c.lineTo(xr, -R);
      c.ellipse(xr, 0, rw, R, 0, -Math.PI / 2, Math.PI / 2);
      c.lineTo(xl, R);
      c.ellipse(xl, 0, rw, R, 0, Math.PI / 2, Math.PI * 1.5);
      c.closePath();
    }

    // ---- Mercedes face: wide stippled band, black core, thin star ----
    const M_OUT = R * 0.99;
    const M_RING2 = R * 0.9;
    const M_IN = R * 0.66;

    function mercMask(c, mirror, xscale, dx) {
      withDisc(c, mirror, xscale, dx, (g) => {
        g.beginPath();
        g.arc(0, 0, M_OUT, 0, Math.PI * 2);
        g.arc(0, 0, M_IN, 0, Math.PI * 2, true);
        g.fillStyle = "#ffffff";
        g.fill("evenodd");
      });
    }

    function mercForeground(c, mirror, xscale, dx) {
      withDisc(c, mirror, xscale, dx, (g) => {
        g.strokeStyle = "#f0eee6";
        g.lineWidth = 2;
        g.beginPath();
        g.arc(0, 0, M_OUT, 0, Math.PI * 2);
        g.stroke();
        g.lineWidth = 1;
        g.beginPath();
        g.arc(0, 0, M_RING2, 0, Math.PI * 2);
        g.stroke();
        g.lineWidth = 1.4;
        g.beginPath();
        g.arc(0, 0, M_IN, 0, Math.PI * 2);
        g.stroke();

        const angles = [-90, 30, 150].map((d) => (d * Math.PI) / 180);
        const tipR = M_IN * 0.88;
        const baseR = M_IN * 0.1;
        const halfWidth = (4.5 * Math.PI) / 180;
        g.fillStyle = "#f0eee6";
        angles.forEach((a) => {
          const tx = Math.cos(a) * tipR;
          const ty = Math.sin(a) * tipR;
          g.beginPath();
          g.moveTo(Math.cos(a - halfWidth) * baseR, Math.sin(a - halfWidth) * baseR);
          g.lineTo(tx, ty);
          g.lineTo(Math.cos(a + halfWidth) * baseR, Math.sin(a + halfWidth) * baseR);
          g.closePath();
          g.fill();
          g.beginPath();
          g.arc(tx, ty, M_IN * 0.05, 0, Math.PI * 2);
          g.fill();
        });
        g.beginPath();
        g.arc(0, 0, M_IN * 0.09, 0, Math.PI * 2);
        g.fill();
      });
    }

    // ---- BMW face: stippled letter band, quartered roundel core ----
    const B_OUT = R * 0.99;
    const B_BAND_IN = R * 0.72;
    const B_CORE = R * 0.68;

    function bmwMask(c, mirror, xscale, dx) {
      withDisc(c, mirror, xscale, dx, (g) => {
        g.fillStyle = "#ffffff";
        // letter band
        g.beginPath();
        g.arc(0, 0, B_OUT, 0, Math.PI * 2);
        g.arc(0, 0, B_BAND_IN, 0, Math.PI * 2, true);
        g.fill("evenodd");
        // stippled quadrants: canvas angles, 0=right 90=down.
        [
          [0, 90],
          [180, 270],
        ].forEach(([a0, a1]) => {
          g.beginPath();
          g.moveTo(0, 0);
          g.arc(0, 0, B_CORE, (a0 * Math.PI) / 180, (a1 * Math.PI) / 180);
          g.closePath();
          g.fill();
        });
      });
    }

    function bmwForeground(c, mirror, xscale, dx) {
      withDisc(c, mirror, xscale, dx, (g) => {
        g.strokeStyle = "#f0eee6";
        g.lineWidth = 2;
        g.beginPath();
        g.arc(0, 0, B_OUT, 0, Math.PI * 2);
        g.stroke();
        g.lineWidth = 1.2;
        g.beginPath();
        g.arc(0, 0, B_BAND_IN, 0, Math.PI * 2);
        g.stroke();
        // white quadrants
        g.fillStyle = "#f0eee6";
        [
          [-90, 0],
          [90, 180],
        ].forEach(([a0, a1]) => {
          g.beginPath();
          g.moveTo(0, 0);
          g.arc(0, 0, B_CORE, (a0 * Math.PI) / 180, (a1 * Math.PI) / 180);
          g.closePath();
          g.fill();
        });
        g.lineWidth = 1.2;
        g.beginPath();
        g.arc(0, 0, B_CORE, 0, Math.PI * 2);
        g.stroke();
      });
      // letters drawn unmirrored so they always read B-M-W left to right
      c.save();
      c.translate(cx + dx, cy);
      c.scale(xscale, 1);
      c.fillStyle = "#f0eee6";
      c.font = '600 30px ui-monospace, Menlo, monospace';
      c.textAlign = "center";
      c.textBaseline = "middle";
      const letterR = (B_OUT + B_BAND_IN) / 2;
      [
        ["B", -125],
        ["M", -90],
        ["W", -55],
      ].forEach(([ch, deg]) => {
        const a = (deg * Math.PI) / 180;
        c.save();
        c.translate(Math.cos(a) * letterR, Math.sin(a) * letterR);
        c.rotate(a + Math.PI / 2);
        c.fillText(ch, 0, 0);
        c.restore();
      });
      c.restore();
    }

    const STEP = 2.4;
    function halftoneConvert() {
      const img = octx.getImageData(0, 0, W, H).data;
      ctx.fillStyle = "#e8e6de";
      for (let y = 0; y < H; y += STEP) {
        for (let x = 0; x < W; x += STEP) {
          const idx = (((y | 0) * W + (x | 0)) * 4) | 0;
          const a = img[idx + 3];
          if (a < 40) continue;
          const dotR = STEP * 0.42 * (a / 255);
          if (dotR < 0.2) continue;
          ctx.beginPath();
          ctx.arc(x, y, dotR, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    let theta = 0;
    let raf;
    let last = 0;

    // wind it up; past 12 clicks the blur collapses into the globe
    function onClick() {
      const st = spinRef.current;
      if (st.mode !== "coin") return;
      st.clicks += 1;
      st.speed = Math.min(60, st.speed * 1.35);
      if (st.clicks >= 12) {
        st.mode = "globe";
        st.vel = 4.2;
        st.flash = 1;
      }
    }
    canvas.addEventListener("click", onClick);

    const GR = 178; // globe radius

    function drawRingHalf(now, front) {
      const n = RING_TEXT.length;
      const base = now / 1700;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.3);
      ctx.font = "800 34px ui-monospace, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let i = 0; i < n; i++) {
        const a = base + (i * Math.PI * 2) / n;
        const isFront = Math.sin(a) > 0;
        if (isFront !== front) continue;
        const ch = RING_TEXT[i];
        if (ch === " ") continue;
        const ex = Math.cos(a) * GR * 1.22;
        const ey = Math.sin(a) * GR * 0.38;
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(Math.atan2(Math.cos(a) * 0.38, -Math.sin(a) * 1.22));
        // knock a dark gap out of the globe behind each glyph so the
        // heavy type stays readable against the dot field
        if (front) {
          ctx.fillStyle = "rgba(7,7,6,0.82)";
          ctx.fillRect(-13, -19, 26, 38);
        }
        ctx.fillStyle =
          ch === "·"
            ? "#d43d2a"
            : front
              ? "#f6f4ec"
              : "rgba(240,238,230,0.22)";
        ctx.fillText(ch, 0, 0);
        if (front) {
          // double-strike for extra weight
          ctx.fillText(ch, 0.6, 0);
        }
        ctx.restore();
      }
      ctx.restore();
    }

    function drawGlobe(dt, now) {
      const st = spinRef.current;
      st.rot += (st.vel * dt) / 1000;
      // spin inherits the coin's frenzy, then eases to a calm turn
      st.vel = 0.22 + (st.vel - 0.22) * Math.exp(-dt / 1500);
      ctx.clearRect(0, 0, W, H);

      drawRingHalf(now, false); // text passing behind the sphere

      const cell = 7;
      ctx.font = "700 10px ui-monospace, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const rotDeg = (st.rot * 180) / Math.PI;
      for (let py = cy - GR; py <= cy + GR; py += cell) {
        for (let px = cx - GR; px <= cx + GR; px += cell) {
          const dx = (px - cx) / GR;
          const dy = (py - cy) / GR;
          const d2 = dx * dx + dy * dy;
          if (d2 > 1) continue;
          const z = Math.sqrt(1 - d2);
          const lat = Math.asin(-dy) * (180 / Math.PI);
          const lon = Math.atan2(dx, z) * (180 / Math.PI) + rotDeg;
          const limb = Math.pow(z, 0.55); // limb darkening toward the edge
          if (landAt(lat, lon)) {
            const ch = limb > 0.75 ? "#" : limb > 0.45 ? "%" : "+";
            ctx.fillStyle = `rgba(240,238,230,${0.28 + 0.68 * limb})`;
            ctx.fillText(ch, px, py);
          } else {
            ctx.fillStyle = `rgba(240,238,230,${0.06 + 0.12 * limb})`;
            ctx.fillText("·", px, py);
          }
        }
      }
      ctx.strokeStyle = "rgba(240,238,230,0.4)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, GR + 3, 0, Math.PI * 2);
      ctx.stroke();

      // red site markers, only while on the visible hemisphere
      ctx.font = "600 11px ui-monospace, Menlo, monospace";
      GLOBE_CITIES.forEach(({ lat, lon, label }) => {
        const la = (lat * Math.PI) / 180;
        const phi = (lon * Math.PI) / 180 - st.rot;
        const mx = Math.cos(la) * Math.sin(phi);
        const mz = Math.cos(la) * Math.cos(phi);
        if (mz < 0.12) return;
        const sx2 = cx + mx * GR;
        const sy2 = cy - Math.sin(la) * GR;
        ctx.fillStyle = "#d43d2a";
        ctx.beginPath();
        ctx.arc(sx2, sy2, 3, 0, Math.PI * 2);
        ctx.fill();
        const pr = 6.5 + 2.5 * Math.sin(now / 260 + la * 7);
        ctx.strokeStyle = "rgba(212,61,42,0.8)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(sx2, sy2, pr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.textAlign = "left";
        ctx.fillText(label, sx2 + 10, sy2 - 7);
        ctx.textAlign = "center";
      });

      drawRingHalf(now, true); // text passing in front

      if (st.flash > 0) {
        ctx.fillStyle = `rgba(240,238,230,${st.flash * 0.55})`;
        ctx.beginPath();
        ctx.arc(cx, cy, GR * (1.3 - st.flash * 0.3), 0, Math.PI * 2);
        ctx.fill();
        st.flash = Math.max(0, st.flash - dt / 450);
      }
    }

    function frame(ts) {
      raf = requestAnimationFrame(frame);
      const st = spinRef.current;

      if (st.mode === "globe") {
        if (last && ts - last < 33) return;
        const dt = last ? Math.min(80, ts - last) : 16;
        last = ts;
        drawGlobe(dt, ts);
        return;
      }

      // coin: frame interval shrinks as speed climbs, so it strobes
      const interval = Math.max(18, 70 / Math.sqrt(st.speed));
      if (last && ts - last < interval) return;
      last = ts;
      theta += 0.045 * st.speed;

      const s = Math.sin(theta);
      const c = Math.cos(theta);
      const xscale = Math.max(0.04, Math.abs(c));
      const front = c >= 0;
      const mirror = !front;

      // projected face centers: face A (Mercedes) at +T/2·sinθ, face B at -T/2·sinθ
      const xA = (T / 2) * s;
      const xB = -(T / 2) * s;
      const dx = front ? xA : xB; // center of the visible face
      const xl = Math.min(xA, xB);
      const xr = Math.max(xA, xB);
      const rw = R * xscale;

      ctx.clearRect(0, 0, W, H);
      octx.clearRect(0, 0, W, H);

      // rim (side wall of the tablet): mid-density stipple across the hull
      octx.save();
      octx.translate(cx, cy);
      rimPath(octx, xl, xr, rw);
      octx.fillStyle = "rgba(255,255,255,0.5)";
      octx.fill();
      // punch out the visible face so its own mask defines the tone there
      octx.globalCompositeOperation = "destination-out";
      octx.beginPath();
      octx.ellipse(dx, 0, rw, R, 0, 0, Math.PI * 2);
      octx.fill();
      octx.globalCompositeOperation = "source-over";
      octx.restore();

      if (front) {
        mercMask(octx, mirror, xscale, dx);
        halftoneConvert();
        mercForeground(ctx, mirror, xscale, dx);
      } else {
        bmwMask(octx, mirror, xscale, dx);
        halftoneConvert();
        bmwForeground(ctx, mirror, xscale, dx);
      }

      // crisp silhouette of the whole cylinder
      ctx.save();
      ctx.translate(cx, cy);
      ctx.strokeStyle = "#f0eee6";
      ctx.lineWidth = 2;
      rimPath(ctx, xl, xr, rw);
      ctx.stroke();
      ctx.restore();
    }

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("click", onClick);
    };
  }, []);

  return <canvas ref={canvasRef} className="pillCanvas" />;
}

/* ================= FILM OVERLAY =================
   Sits above every other layer so the whole poster reads as one printed,
   aged object rather than crisp vector pieces floating on black.

   Two passes, because one blend mode can't do both jobs on near-black
   art. The light pass is screen-blended: on black it shows through as
   grain and lifts the blacks (that's the faded look), on white it does
   almost nothing, so the ASCII stays clean. The dark pass is multiplied:
   vignette, crease shadows and edge wear, which darken the bright
   artwork too and give the sheet its depth. */
function FilmOverlay() {
  const lightRef = useRef(null);
  const darkRef = useRef(null);

  useEffect(() => {
    const W = 1600;
    const H = 1000;

    /* ---- light pass: grain, dust, scratches, uneven fade ---- */
    const lc = lightRef.current;
    lc.width = W;
    lc.height = H;
    const l = lc.getContext("2d");
    l.fillStyle = "#000";
    l.fillRect(0, 0, W, H);

    // grain rendered at half res and scaled up, so the speckle has the
    // chunk of real film rather than looking like digital noise
    const GW = W / 2;
    const GH = H / 2;
    const grain = document.createElement("canvas");
    grain.width = GW;
    grain.height = GH;
    const gctx = grain.getContext("2d");
    const id = gctx.createImageData(GW, GH);
    const d = id.data;
    let s = 0x2f6e2b1 >>> 0;
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        // xorshift: fast enough to run over the whole sheet
        s ^= s << 13;
        s >>>= 0;
        s ^= s >> 17;
        s ^= s << 5;
        s >>>= 0;
        const n = (s & 255) / 255;
        // uneven fade: broad blotches where the ink sat lighter
        const mottle = vnoise(x, y, 90, 3) * 0.6 + vnoise(x, y, 260, 5) * 0.4;
        const v = Math.max(0, n * 26 + mottle * 20 - 6);
        const i = (y * GW + x) * 4;
        d[i] = v * 1.02;
        d[i + 1] = v;
        d[i + 2] = v * 0.94; // a hair warm, like aged stock
        d[i + 3] = 255;
      }
    }
    gctx.putImageData(id, 0, 0);
    l.drawImage(grain, 0, 0, W, H);

    // dust specks and short hairs caught in the scan
    for (let k = 0; k < 900; k++) {
      const x = hash2(k, 11) * W;
      const y = hash2(k, 13) * H;
      const v = 40 + hash2(k, 17) * 90;
      l.fillStyle = `rgb(${v},${v},${v})`;
      l.beginPath();
      l.arc(x, y, 0.3 + hash2(k, 19) * 1.1, 0, Math.PI * 2);
      l.fill();
    }
    for (let k = 0; k < 40; k++) {
      const x = hash2(k, 23) * W;
      const y = hash2(k, 29) * H;
      const len = 6 + hash2(k, 31) * 26;
      const a = hash2(k, 37) * Math.PI * 2;
      l.strokeStyle = `rgba(${70 + hash2(k, 41) * 70},${70},${66},0.55)`;
      l.lineWidth = 0.5;
      l.beginPath();
      l.moveTo(x, y);
      l.quadraticCurveTo(
        x + Math.cos(a) * len * 0.5 + 6,
        y + Math.sin(a) * len * 0.5,
        x + Math.cos(a) * len,
        y + Math.sin(a) * len
      );
      l.stroke();
    }
    // vertical emulsion scratches, broken along their length
    for (let k = 0; k < 16; k++) {
      const x = hash2(k, 43) * W;
      const y0 = hash2(k, 47) * H * 0.6;
      const len = 90 + hash2(k, 53) * 620;
      l.strokeStyle = `rgba(${90 + hash2(k, 59) * 80},${86},${80},0.5)`;
      l.lineWidth = 0.4 + hash2(k, 61) * 0.7;
      for (let y = y0; y < y0 + len; y += 4) {
        if (hash2(Math.floor(y), k) > 0.72) continue;
        l.beginPath();
        l.moveTo(x + Math.sin(y * 0.02) * 1.2, y);
        l.lineTo(x + Math.sin((y + 4) * 0.02) * 1.2, y + 4);
        l.stroke();
      }
    }
    // the raised side of each crease catches the light
    [
      [-60, 240, 1680, 150],
      [-60, 700, 1680, 830],
      [380, -40, 250, 1040],
      [1180, -40, 1330, 1040],
    ].forEach(([x1, y1, x2, y2], i) => {
      const gr = l.createLinearGradient(x1, y1, x2, y2);
      gr.addColorStop(0, "rgba(0,0,0,0)");
      gr.addColorStop(0.45, `rgba(150,146,138,${0.3 + i * 0.05})`);
      gr.addColorStop(1, "rgba(0,0,0,0)");
      l.strokeStyle = gr;
      l.lineWidth = 1;
      l.beginPath();
      l.moveTo(x1, y1);
      l.lineTo(x2, y2);
      l.stroke();
    });

    /* ---- dark pass: vignette, crease shadows, edge wear ---- */
    const dc = darkRef.current;
    dc.width = W;
    dc.height = H;
    const k2 = dc.getContext("2d");
    k2.fillStyle = "#fff";
    k2.fillRect(0, 0, W, H);

    // vignette
    const vg = k2.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.95);
    vg.addColorStop(0, "rgba(255,255,255,1)");
    vg.addColorStop(0.62, "rgba(190,188,182,1)");
    vg.addColorStop(1, "rgba(96,94,90,1)");
    k2.fillStyle = vg;
    k2.fillRect(0, 0, W, H);

    // broad tonal unevenness, like the sheet dried unevenly
    for (let y = 0; y < H; y += 4) {
      for (let x = 0; x < W; x += 4) {
        const n = vnoise(x, y, 150, 9);
        if (n > 0.62) {
          k2.fillStyle = `rgba(150,146,140,${(n - 0.62) * 0.5})`;
          k2.fillRect(x, y, 4, 4);
        }
      }
    }
    // the sunken side of each crease throws a shadow
    [
      [-60, 246, 1680, 156],
      [-60, 706, 1680, 836],
      [386, -40, 256, 1040],
      [1186, -40, 1336, 1040],
    ].forEach(([x1, y1, x2, y2]) => {
      const gr = k2.createLinearGradient(x1, y1, x2, y2);
      gr.addColorStop(0, "rgba(255,255,255,0)");
      gr.addColorStop(0.45, "rgba(70,68,64,0.55)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      k2.strokeStyle = gr;
      k2.lineWidth = 2.2;
      k2.beginPath();
      k2.moveTo(x1, y1);
      k2.lineTo(x2, y2);
      k2.stroke();
    });
    // worn, dirtied edges
    for (let k = 0; k < 2600; k++) {
      const edge = Math.floor(hash2(k, 67) * 4);
      const t = hash2(k, 71);
      const dep = Math.pow(hash2(k, 73), 2.4) * 90;
      let x, y;
      if (edge === 0) [x, y] = [t * W, dep];
      else if (edge === 1) [x, y] = [t * W, H - dep];
      else if (edge === 2) [x, y] = [dep, t * H];
      else [x, y] = [W - dep, t * H];
      k2.fillStyle = `rgba(60,58,54,${0.06 + hash2(k, 79) * 0.16})`;
      k2.beginPath();
      k2.arc(x, y, 1 + hash2(k, 83) * 5, 0, Math.PI * 2);
      k2.fill();
    }
  }, []);

  return (
    <>
      <canvas ref={darkRef} className="filmDark" />
      <canvas ref={lightRef} className="filmLight" />
    </>
  );
}

/* ================= GROUND — paper texture + blood =================
   The page it's all printed on. A black sheet with real tooth: fibre
   grain, faint scan banding and a couple of press creases, so the black
   reads as stock rather than an empty div. On top of it, blood that
   behaves like blood — pools with ragged edges built from radial noise,
   gravity drips running off their lower rim, cast-off spatter thrown
   along an axis, and fine atomised mist. Nothing here is a circle. */
function GroundCanvas() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const W = 1600;
    const H = 1000;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    const c = canvas.getContext("2d");
    c.setTransform(DPR, 0, 0, DPR, 0, 0);

    c.fillStyle = "#000";
    c.fillRect(0, 0, W, H);

    /* ---- the ink itself is uneven ----
       Black stock printed heavy still varies: patches where it laid on
       thicker, patches where it sank into the paper. Broad, slow noise
       so it reads as printing rather than noise. */
    for (let y = 0; y < H; y += 4) {
      for (let x = 0; x < W; x += 4) {
        const n = vnoise(x, y, 120, 2) * 0.65 + vnoise(x, y, 34, 4) * 0.35;
        const v = Math.round(n * 15);
        if (v <= 1) continue;
        c.fillStyle = `rgb(${v},${Math.round(v * 0.97)},${Math.round(v * 0.9)})`;
        c.fillRect(x, y, 4, 4);
      }
    }

    /* ---- paper tooth ---- */
    // fibre grain: short strokes at random angles, barely above black
    for (let i = 0; i < 26000; i++) {
      const x = hash2(i, 1) * W;
      const y = hash2(i, 2) * H;
      const a = hash2(i, 3) * Math.PI;
      const len = 1 + hash2(i, 4) * 4;
      const v = 8 + Math.floor(hash2(i, 5) * 20);
      c.strokeStyle = `rgba(${v},${v},${Math.round(v * 0.92)},0.85)`;
      c.lineWidth = 0.55;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      c.stroke();
    }
    // foxing: the brown-red age spots old stock develops
    for (let k = 0; k < 90; k++) {
      const x = hash2(k, 301) * W;
      const y = hash2(k, 307) * H;
      const r = 4 + hash2(k, 311) * 26;
      const fg = c.createRadialGradient(x, y, 0, x, y, r);
      fg.addColorStop(0, `rgba(48,30,18,${0.1 + hash2(k, 313) * 0.16})`);
      fg.addColorStop(1, "rgba(48,30,18,0)");
      c.fillStyle = fg;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    }
    // scuffs: places the surface has been rubbed lighter
    for (let k = 0; k < 46; k++) {
      const x = hash2(k, 317) * W;
      const y = hash2(k, 331) * H;
      const w = 20 + hash2(k, 337) * 130;
      const h = 3 + hash2(k, 347) * 12;
      const a = (hash2(k, 349) - 0.5) * 0.8;
      c.save();
      c.translate(x, y);
      c.rotate(a);
      const sg = c.createLinearGradient(-w / 2, 0, w / 2, 0);
      sg.addColorStop(0, "rgba(150,146,138,0)");
      sg.addColorStop(0.5, `rgba(150,146,138,${0.05 + hash2(k, 353) * 0.09})`);
      sg.addColorStop(1, "rgba(150,146,138,0)");
      c.fillStyle = sg;
      c.fillRect(-w / 2, -h / 2, w, h);
      c.restore();
    }
    // scan banding
    for (let y = 0; y < H; y += 3) {
      const v = 3 + Math.floor(hash2(y, 21) * 5);
      c.fillStyle = `rgba(${v * 3},${v * 3},${v * 3},0.5)`;
      c.fillRect(0, y, W, 1);
    }

    /* ---- blood ---- */
    const DEEP = [
      [58, 6, 8],
      [74, 8, 9],
      [44, 5, 6],
    ];
    const bloodStyle = (seed, alpha) => {
      const [r, gg, b] = DEEP[Math.floor(hash2(seed, 88) * DEEP.length) % DEEP.length];
      return `rgba(${r},${gg},${b},${alpha})`;
    };

    // an irregular pool: radius modulated by layered noise so the rim
    // is ragged, never a circle
    const pool = (cx, cy, rad, seed, alpha, squash = 1) => {
      c.beginPath();
      const N = 128;
      for (let i = 0; i <= N; i++) {
        const t = (i / N) * Math.PI * 2;
        const n =
          0.72 +
          0.2 * Math.sin(t * 3 + hash2(seed, 1) * 6) +
          0.14 * Math.sin(t * 7 + hash2(seed, 2) * 6) +
          0.09 * Math.sin(t * 13 + hash2(seed, 3) * 6);
        const rr = rad * n;
        const x = cx + Math.cos(t) * rr;
        const y = cy + Math.sin(t) * rr * squash;
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.closePath();
      c.fillStyle = bloodStyle(seed, alpha);
      c.fill();
    };

    // gravity drips off the lower rim, tapering to a rounded head
    const drips = (cx, cy, rad, seed, count, alpha) => {
      for (let k = 0; k < count; k++) {
        const t = (0.15 + hash2(seed * 7 + k, 31) * 0.7) * Math.PI; // lower arc
        const sx = cx + Math.cos(t) * rad * 0.8;
        const sy = cy + Math.sin(t) * rad * 0.7;
        const len = 18 + hash2(seed * 11 + k, 33) * 90;
        const w = 1.6 + hash2(seed * 13 + k, 37) * 3;
        const drift = (hash2(seed * 17 + k, 41) - 0.5) * 14;
        c.beginPath();
        c.moveTo(sx - w, sy);
        c.quadraticCurveTo(sx - w * 0.5 + drift, sy + len * 0.6, sx + drift * 0.7, sy + len);
        c.quadraticCurveTo(sx + w * 0.5 + drift, sy + len * 0.6, sx + w, sy);
        c.closePath();
        c.fillStyle = bloodStyle(seed + k, alpha);
        c.fill();
        // bead at the tip
        c.beginPath();
        c.ellipse(sx + drift * 0.7, sy + len, w * 0.9, w * 1.2, 0, 0, Math.PI * 2);
        c.fill();
      }
    };

    // cast-off: elongated droplets flung along a direction, each stretched
    // in its travel direction like real spatter
    const castOff = (ox, oy, dir, spread, count, seed, maxD) => {
      for (let k = 0; k < count; k++) {
        const a = dir + (hash2(seed * 3 + k, 51) - 0.5) * spread;
        const d = Math.pow(hash2(seed * 5 + k, 53), 0.65) * maxD;
        const x = ox + Math.cos(a) * d;
        const y = oy + Math.sin(a) * d;
        const s = (1 - d / maxD) * 7 + 0.8;
        c.save();
        c.translate(x, y);
        c.rotate(a);
        c.beginPath();
        c.ellipse(0, 0, s * (1 + d / maxD), s * 0.62, 0, 0, Math.PI * 2);
        c.fillStyle = bloodStyle(seed + k, 0.5 + hash2(k, 57) * 0.4);
        c.fill();
        c.restore();
      }
    };

    // atomised mist
    const mist = (ox, oy, rad, count, seed) => {
      for (let k = 0; k < count; k++) {
        const a = hash2(seed * 9 + k, 61) * Math.PI * 2;
        const d = Math.pow(hash2(seed * 11 + k, 63), 0.5) * rad;
        c.beginPath();
        c.arc(ox + Math.cos(a) * d, oy + Math.sin(a) * d, 0.4 + hash2(k, 67) * 1.1, 0, Math.PI * 2);
        c.fillStyle = bloodStyle(seed + k, 0.25 + hash2(k, 71) * 0.4);
        c.fill();
      }
    };

    // top-right: a hit against the corner, throwing spatter down-left
    pool(1455, 70, 120, 1, 0.95, 0.8);
    pool(1400, 120, 54, 2, 0.8);
    drips(1455, 70, 120, 1, 7, 0.85);
    castOff(1430, 96, Math.PI * 0.78, 1.5, 90, 3, 460);
    mist(1440, 100, 240, 320, 4);

    // left edge: a long smear running down the margin
    pool(30, 400, 130, 5, 0.9, 1.5);
    drips(30, 430, 120, 5, 9, 0.8);
    castOff(60, 430, Math.PI * 0.15, 1.2, 60, 6, 300);
    mist(60, 430, 200, 220, 7);

    // bottom-right: the heaviest pool, drips running off the page
    pool(1500, 930, 150, 8, 0.95, 0.9);
    pool(1420, 880, 60, 9, 0.75);
    drips(1500, 930, 150, 8, 8, 0.85);
    castOff(1460, 900, Math.PI * 1.15, 1.6, 80, 10, 420);
    mist(1470, 905, 260, 300, 11);

    // a few isolated droplets mid-page so it doesn't read as vignetting
    [
      [430, 250, 12],
      [880, 690, 13],
      [300, 880, 14],
      [1180, 210, 15],
    ].forEach(([x, y, seed]) => {
      pool(x, y, 7 + hash2(seed, 77) * 12, seed, 0.8);
      mist(x, y, 46, 26, seed + 40);
    });
  }, []);

  return <canvas ref={ref} className="groundCanvas" />;
}

/* ================= STATIC SCENE — grayscale render → halftone =================
   Everything with volume (tower, scope chassis, knobs, pills, dot-trail) is
   drawn as shaded grayscale geometry on an offscreen canvas, then converted
   into a halftone dot field — same technique as the coin, so the whole
   poster shares one engraved texture. Text and fine linework stay crisp
   in the SVG overlays. */
function SceneCanvas() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const W = 1600;
    const H = 1000;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    const off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    const g = off.getContext("2d");

    /* ---- BeoSound-style changer: flat wall slab, no cabinet box ----
       Speaker grille slab on the left, glass disc strip on the right.
       Poster coords = TOWER offset + local. */
    const wx = (x) => TOWER.x + x;
    const wy = (y) => TOWER.y + y;

    // speaker slab with dense horizontal fins
    let grad = g.createLinearGradient(wx(18), 0, wx(96), 0);
    grad.addColorStop(0, "#3c3c3c");
    grad.addColorStop(0.5, "#2a2a2a");
    grad.addColorStop(1, "#161616");
    g.fillStyle = grad;
    g.fillRect(wx(18), wy(30), 78, 620);
    for (let y = 34; y < 648; y += 4.2) {
      g.strokeStyle = Math.floor(y / 4.2) % 2 ? "#8f8f8f" : "#141414";
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(wx(21), wy(y));
      g.lineTo(wx(93), wy(y));
      g.stroke();
    }
    // shadow gap between slab and glass
    g.fillStyle = "#050505";
    g.fillRect(wx(96), wy(40), 16, 600);
    // glass panel: near-black with a faint edge glow
    g.fillStyle = "#141414";
    g.beginPath();
    g.roundRect(wx(112), wy(18), 160, 648, 10);
    g.fill();
    g.strokeStyle = "#2e2e2e";
    g.lineWidth = 3;
    g.beginPath();
    g.roundRect(wx(114), wy(20), 156, 644, 9);
    g.stroke();
    // discs: dark album faces with a soft top-left sheen — the ASCII art
    // canvas paints the covers on top of these
    for (let k = 0; k < 6; k++) {
      const cx = wx(TOWER.discCx);
      const cy = wy(TOWER.discCy0 + k * TOWER.discDy);
      const r = TOWER.discR;
      const rg = g.createRadialGradient(cx - r / 3, cy - r / 3, 4, cx, cy, r);
      rg.addColorStop(0, "#3d3d3d");
      rg.addColorStop(0.6, "#242424");
      rg.addColorStop(0.96, "#4a4a4a");
      rg.addColorStop(1, "#1c1c1c");
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.fillStyle = rg;
      g.fill();
      g.beginPath();
      g.arc(cx, cy, 8, 0, Math.PI * 2);
      g.fillStyle = "#060606";
      g.fill();
    }

    /* ---- dot-trail field behind the coin ---- */
    for (let y = 180; y <= 630; y += 9) {
      for (let x = 350; x <= 960; x += 13) {
        const dx = (x - 660) / 310;
        const dy = (y - 405) / 235;
        const d2 = dx * dx + dy * dy;
        if (d2 > 1) continue;
        const ix = (x - 630) / 208;
        const iy = (y - 410) / 262;
        if (ix * ix + iy * iy < 1) continue;
        const b = 1 - d2;
        const lum = Math.round(46 + 168 * b * (0.55 + 0.45 * hash2(x, y)));
        g.fillStyle = `rgb(${lum},${lum},${lum})`;
        g.fillRect(x, y, 7.5, 1.8);
      }
    }

    /* ---- oscilloscope chassis (matches scope svg: 500 wide at 1070,78) ---- */
    const sc = 500 / 560;
    const sX = (x) => 1070 + x * sc;
    const sY = (y) => 78 + y * sc;
    grad = g.createLinearGradient(0, sY(4), 0, sY(396));
    grad.addColorStop(0, "#454545");
    grad.addColorStop(0.5, "#2e2e2e");
    grad.addColorStop(1, "#1c1c1c");
    g.beginPath();
    g.roundRect(sX(4), sY(4), 552 * sc, 392 * sc, 14 * sc);
    g.fillStyle = grad;
    g.fill();
    // bezel + screen
    g.beginPath();
    g.roundRect(sX(26), sY(42), 330 * sc, 290 * sc, 10 * sc);
    g.fillStyle = "#242424";
    g.fill();
    const srg = g.createRadialGradient(sX(191), sY(187), 30 * sc, sX(191), sY(187), 220 * sc);
    srg.addColorStop(0, "#101010");
    srg.addColorStop(1, "#040404");
    g.fillStyle = srg;
    g.fillRect(sX(42), sY(58), 298 * sc, 258 * sc);
    // panel divider shadow
    g.fillStyle = "#171717";
    g.fillRect(sX(366), sY(16), 4 * sc, 368 * sc);
    // knobs as shaded spheres
    [
      [418, 140, 16],
      [506, 140, 16],
      [462, 292, 20],
      [232, 372, 11],
    ].forEach(([kx, ky, kr0]) => {
      const kr = kr0 * sc;
      const kg = g.createRadialGradient(sX(kx) - kr / 3, sY(ky) - kr / 3, kr * 0.15, sX(kx), sY(ky), kr);
      kg.addColorStop(0, "#e0e0e0");
      kg.addColorStop(0.55, "#7a7a7a");
      kg.addColorStop(1, "#1f1f1f");
      g.beginPath();
      g.arc(sX(kx), sY(ky), kr, 0, Math.PI * 2);
      g.fillStyle = kg;
      g.fill();
    });
    g.fillStyle = "#2e2e2e";
    g.fillRect(sX(60), sY(398), 60 * sc, 12 * sc);
    g.fillRect(sX(440), sY(398), 60 * sc, 12 * sc);

    /* ---- pills render in their own canvas (PillsBreak) so they can shatter ---- */

    /* ---- halftone conversion of the whole scene ---- */
    const img = g.getImageData(0, 0, W, H).data;
    const CELL = 3.4;
    ctx.fillStyle = "#e8e6de";
    for (let y = 0; y < H; y += CELL) {
      for (let x = 0; x < W; x += CELL) {
        const i = (((y | 0) * W + (x | 0)) * 4) | 0;
        const lum = img[i];
        if (lum < 14) continue;
        const r = CELL * 0.52 * Math.pow(lum / 255, 0.85);
        if (r < 0.22) continue;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, []);

  return <canvas ref={ref} className="sceneCanvas" />;
}

/* ================= ASCII IMAGE ENGINE + ALBUM COVERS =================
   A real image→ASCII converter: the source image is drawn (or loaded) onto
   an offscreen canvas, luminance-sampled on a character grid, mapped through
   a density ramp, clipped to a circle, and typed onto the disc. Sources here
   are procedurally drawn grayscale covers; swap drawCover for a same-origin
   <img> (e.g. /covers/deftones.jpg) and the engine works unchanged. */
const ASCII_RAMP = " .:-=+*#%@";

function asciiCircle(ctx, sourceCanvas, cx, cy, r, cell, font) {
  const S = sourceCanvas.width;
  const img = sourceCanvas.getContext("2d").getImageData(0, 0, S, S).data;
  const scale = S / (r * 2);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 1.5, 0, Math.PI * 2);
  ctx.clip();
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(240,238,230,0.95)";
  for (let yy = 0; yy < r * 2; yy += cell) {
    for (let xx = 0; xx < r * 2; xx += cell) {
      const dx = xx - r;
      const dy = yy - r;
      if (dx * dx + dy * dy > r * r) continue;
      const sx = Math.min(S - 1, Math.floor(xx * scale));
      const sy = Math.min(S - 1, Math.floor(yy * scale));
      const lum = img[(sy * S + sx) * 4];
      const ci = Math.min(ASCII_RAMP.length - 1, Math.floor((lum / 255) * ASCII_RAMP.length));
      const ch = ASCII_RAMP[ci];
      if (ch === " ") continue;
      ctx.fillText(ch, cx - r + xx + cell / 2, cy - r + yy + cell / 2);
    }
  }
  ctx.restore();
}

// Grayscale renderings of each cover, tonal enough for the ramp to bite.
function drawCover(key, g, S) {
  const c = S / 2;
  g.fillStyle = "#000";
  g.fillRect(0, 0, S, S);
  if (key === "deftones") {
    // Diamond Eyes — white diamond on black
    g.fillStyle = "#e6e6e6";
    g.beginPath();
    g.moveTo(c, c - S * 0.3);
    g.lineTo(c + S * 0.26, c);
    g.lineTo(c, c + S * 0.3);
    g.lineTo(c - S * 0.26, c);
    g.closePath();
    g.fill();
    g.strokeStyle = "#333";
    g.lineWidth = S * 0.02;
    g.beginPath();
    g.moveTo(c - S * 0.26, c);
    g.lineTo(c + S * 0.26, c);
    g.moveTo(c - S * 0.13, c - S * 0.15);
    g.lineTo(c + S * 0.13, c - S * 0.15);
    g.moveTo(c, c - S * 0.3);
    g.lineTo(c - S * 0.13, c - S * 0.15);
    g.moveTo(c, c - S * 0.3);
    g.lineTo(c + S * 0.13, c - S * 0.15);
    g.stroke();
  } else if (key === "acdc") {
    // Back in Black — bolt, faint gray ground
    g.fillStyle = "#1c1c1c";
    g.fillRect(0, 0, S, S);
    g.fillStyle = "#ececec";
    g.beginPath();
    g.moveTo(c - S * 0.02, c - S * 0.36);
    g.lineTo(c + S * 0.16, c - S * 0.36);
    g.lineTo(c + S * 0.04, c - S * 0.08);
    g.lineTo(c + S * 0.2, c - S * 0.08);
    g.lineTo(c - S * 0.12, c + S * 0.36);
    g.lineTo(c - S * 0.03, c + S * 0.02);
    g.lineTo(c - S * 0.19, c + S * 0.02);
    g.closePath();
    g.fill();
  } else if (key === "aphex") {
    // SAW 85-92 — embossed circular logo
    const rg = g.createRadialGradient(c, c, S * 0.05, c, c, S * 0.48);
    rg.addColorStop(0, "#4a4a4a");
    rg.addColorStop(1, "#101010");
    g.fillStyle = rg;
    g.fillRect(0, 0, S, S);
    g.strokeStyle = "#dcdcdc";
    g.lineWidth = S * 0.07;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(c - S * 0.24, c + S * 0.22);
    g.quadraticCurveTo(c - S * 0.3, c - S * 0.24, c, c - S * 0.27);
    g.quadraticCurveTo(c + S * 0.3, c - S * 0.24, c + S * 0.24, c + S * 0.22);
    g.stroke();
    g.lineWidth = S * 0.055;
    g.beginPath();
    g.moveTo(c - S * 0.14, c + S * 0.03);
    g.quadraticCurveTo(c, c - S * 0.12, c + S * 0.14, c + S * 0.03);
    g.quadraticCurveTo(c + S * 0.04, c + S * 0.14, c - S * 0.04, c + S * 0.05);
    g.stroke();
  } else if (key === "acid") {
    // acid house — bright smiley
    g.fillStyle = "#161616";
    g.fillRect(0, 0, S, S);
    g.fillStyle = "#ececec";
    g.beginPath();
    g.arc(c, c, S * 0.38, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#0a0a0a";
    g.beginPath();
    g.arc(c - S * 0.13, c - S * 0.11, S * 0.06, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(c + S * 0.13, c - S * 0.11, S * 0.06, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#0a0a0a";
    g.lineWidth = S * 0.06;
    g.lineCap = "round";
    g.beginPath();
    g.arc(c, c + S * 0.03, S * 0.22, Math.PI * 0.15, Math.PI * 0.85);
    g.stroke();
  } else if (key === "floyd") {
    // Dark Side — prism and beams
    g.strokeStyle = "#efefef";
    g.lineWidth = S * 0.045;
    g.beginPath();
    g.moveTo(c, c - S * 0.28);
    g.lineTo(c + S * 0.3, c + S * 0.22);
    g.lineTo(c - S * 0.3, c + S * 0.22);
    g.closePath();
    g.stroke();
    g.lineWidth = S * 0.05;
    g.beginPath();
    g.moveTo(0, c + S * 0.06);
    g.lineTo(c - S * 0.15, c - S * 0.02);
    g.stroke();
    [0.6, 0.8, 1].forEach((br, i) => {
      g.strokeStyle = `rgba(239,239,239,${br})`;
      g.lineWidth = S * 0.045;
      g.beginPath();
      g.moveTo(c + S * 0.11, c + S * 0.02);
      g.lineTo(S, c - S * 0.16 + i * S * 0.14);
      g.stroke();
    });
  } else {
    // LCD — disco ball
    const rg = g.createRadialGradient(c - S * 0.12, c - S * 0.14, S * 0.03, c, c, S * 0.4);
    rg.addColorStop(0, "#f0f0f0");
    rg.addColorStop(0.6, "#8a8a8a");
    rg.addColorStop(1, "#1a1a1a");
    g.fillStyle = rg;
    g.beginPath();
    g.arc(c, c, S * 0.36, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#0c0c0c";
    g.lineWidth = S * 0.014;
    for (let i = -2; i <= 2; i++) {
      g.beginPath();
      g.ellipse(c, c, S * 0.36, S * 0.36, 0, 0, Math.PI * 2);
      g.moveTo(c - S * 0.36, c + i * S * 0.12);
      g.lineTo(c + S * 0.36, c + i * S * 0.12);
      g.stroke();
      g.beginPath();
      g.ellipse(c, c, Math.abs(i) === 2 ? S * 0.14 : S * 0.26, S * 0.36, 0, 0, Math.PI * 2);
      g.stroke();
    }
  }
}

function AlbumArtCanvas({ spin }) {
  const ref = useRef(null);
  const spinRef = useRef(spin);
  spinRef.current = spin;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = TOWER.w * DPR;
    canvas.height = TOWER.h * DPR;
    canvas.style.width = TOWER.w + "px";
    canvas.style.height = TOWER.h + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    const src = document.createElement("canvas");
    src.width = 192;
    src.height = 192;
    const g = src.getContext("2d");

    // each cover's ASCII art pre-rendered to its own layer, so the
    // hovered disc can be redrawn rotated every frame without paying
    // for the char sampling again
    const D = TOWER.discR * 2 + 8;
    const layers = ALBUMS.map((a) => {
      g.clearRect(0, 0, 192, 192);
      drawCover(a.key, g, 192);
      const layer = document.createElement("canvas");
      layer.width = D * DPR;
      layer.height = D * DPR;
      const lctx = layer.getContext("2d");
      lctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      asciiCircle(lctx, src, D / 2, D / 2, TOWER.discR, 5, "7px ui-monospace, Menlo, monospace");
      return layer;
    });

    let raf;
    let angle = 0;
    let last = 0;

    function draw() {
      ctx.clearRect(0, 0, TOWER.w, TOWER.h);
      layers.forEach((layer, k) => {
        const cx = TOWER.discCx;
        const cy = TOWER.discCy0 + k * TOWER.discDy;
        ctx.save();
        ctx.translate(cx, cy);
        if (k === spinRef.current) ctx.rotate(angle);
        ctx.drawImage(layer, -D / 2, -D / 2, D, D);
        ctx.restore();
      });
    }

    function frame(ts) {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(80, ts - last) : 16;
      last = ts;
      // whichever disc is engaged keeps turning, like a loaded platter
      angle += dt * 0.0022; // ~1 rev / 2.9s, CD-player lazy
      draw();
    }

    draw();
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} className="albumArtCanvas" />;
}

/* ================= CD CHANGER (BeoSound-style wall unit) ================= */
function TowerSVG({ active, haunt, onHover }) {
  const { discCx, discCy0, discDy, discR } = TOWER;
  return (
    <svg className="towerSvg" viewBox={`0 0 ${TOWER.w} ${TOWER.h}`}>
      {/* speaker slab outline */}
      <rect x="18" y="30" width="78" height="620" className="slabEdge" />
      {/* glass panel + screws */}
      <rect x="112" y="18" width="160" height="648" rx="10" className="glassPanel" />
      {[[122, 30], [262, 30], [122, 654], [262, 654]].map(([sx, sy]) => (
        <circle key={sx + "-" + sy} cx={sx} cy={sy} r="2" className="glassScrew" />
      ))}
      {/* status LEDs in the gap */}
      <circle cx="104" cy="330" r="2.4" className="ledDot" />
      <circle cx="104" cy="342" r="2.4" className="ledDot" />
      {/* discs — ASCII covers painted by the art canvas; each is a link */}
      {DISCS.map((_, k) => {
        const cy = discCy0 + k * discDy;
        const isActive = k === active;
        const h = haunt ? haunt() : {};
        return (
          <a
            key={k}
            href={ALBUMS[k].url}
            target="_blank"
            rel="noopener noreferrer"
            {...h}
            onMouseEnter={(e) => {
              h.onMouseEnter?.(e);
              onHover?.(k); // engaging a disc is sticky — it keeps playing
            }}
          >
            <g className={isActive ? "towerDisc active" : "towerDisc"}>
              <circle cx={discCx} cy={cy} r={discR} className="discOuter" />
              <circle cx={discCx} cy={cy} r="8" className="discHubRing" />
              <circle cx={discCx} cy={cy} r="2.6" className="discHubDot" />
              {isActive && (
                <g className="readerHead">
                  <rect x="116" y={cy - 5} width="152" height="10" rx="3" className="readerBar" />
                  <circle cx={discCx} cy={cy} r="13" className="readerClamp" />
                  <path
                    d={`M ${q3(discCx + (discR + 3) * Math.cos(-1.05))},${q3(cy + (discR + 3) * Math.sin(-1.05))} A ${discR + 3},${discR + 3} 0 0 1 ${q3(discCx + (discR + 3) * Math.cos(-0.25))},${q3(cy + (discR + 3) * Math.sin(-0.25))}`}
                    className="readerArc"
                  />
                </g>
              )}
              <text x="258" y={cy + 3} className="discLabel">
                {String(k + 1).padStart(2, "0")}
              </text>
            </g>
          </a>
        );
      })}
    </svg>
  );
}

/* ================= OSCILLOSCOPE ================= */
function Knob({ cx, cy, r, angle = -40 }) {
  const ticks = [];
  for (let d = -135; d <= 135; d += 33.75) {
    const a = ((d - 90) * Math.PI) / 180;
    ticks.push(
      <line
        key={d}
        x1={q3(cx + Math.cos(a) * (r + 3))}
        y1={q3(cy + Math.sin(a) * (r + 3))}
        x2={q3(cx + Math.cos(a) * (r + 7))}
        y2={q3(cy + Math.sin(a) * (r + 7))}
      />
    );
  }
  const pa = ((angle - 90) * Math.PI) / 180;
  return (
    <g className="knob">
      <circle cx={cx} cy={cy} r={r} />
      <line
        x1={cx}
        y1={cy}
        x2={q3(cx + Math.cos(pa) * r * 0.85)}
        y2={q3(cy + Math.sin(pa) * r * 0.85)}
        className="knobPointer"
      />
      {ticks}
    </g>
  );
}

function ScopeSVG({ playing, vpp, vrms, freq, title, volume, onVolume, power, onPower }) {
  // Volume knob: it's a rotary pot, so it tracks the angle of the cursor
  // around the knob's centre — sweep it round the dial and the pointer
  // follows your hand. Travel is the usual 270°, from -135° to +135°,
  // and the unwrapping stops a sweep past an end from wrapping around.
  const svgRef = useRef(null);
  const knobCx = 462;
  const knobCy = 292;
  function angleAt(ev) {
    const svg = svgRef.current;
    const r = svg.getBoundingClientRect();
    // client px → viewBox units (viewBox is 560x420)
    const x = ((ev.clientX - r.left) / r.width) * 560 - knobCx;
    const y = ((ev.clientY - r.top) / r.height) * 420 - knobCy;
    // 0° at the top of the dial, positive clockwise
    return (Math.atan2(x, -y) * 180) / Math.PI;
  }
  function knobDown(e) {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    let prev = angleAt(e);
    let deg = -135 + volume * 270; // current pointer position on the dial
    const move = (ev) => {
      const a = angleAt(ev);
      let d = a - prev;
      if (d > 180) d -= 360; // shortest way round
      if (d < -180) d += 360;
      prev = a;
      deg = Math.max(-135, Math.min(135, deg + d));
      onVolume((deg + 135) / 270);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }
  const on = playing && power;
  return (
    <svg ref={svgRef} className={`scopeSvg${on ? " playing" : ""}`} viewBox="0 0 560 420">
      {/* body */}
      <rect x="4" y="4" width="552" height="392" rx="14" className="scopeBody" />
      <rect x="10" y="10" width="540" height="380" rx="10" className="scopeBodyInner" />
      {/* feet */}
      <rect x="60" y="398" width="60" height="12" className="scopeBody" />
      <rect x="440" y="398" width="60" height="12" className="scopeBody" />

      {/* screen bezel */}
      <rect x="26" y="42" width="330" height="290" rx="10" className="scopeBezel" />
      <rect x="42" y="58" width="298" height="258" className="scopeScreen" />
      {/* graticule */}
      <g className="scopeGrid">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => (
          <line key={"v" + k} x1={42 + k * 29.8} y1="58" x2={42 + k * 29.8} y2="316" />
        ))}
        {[1, 2, 3, 4, 5, 6, 7].map((k) => (
          <line key={"h" + k} x1="42" y1={58 + k * 32.25} x2="340" y2={58 + k * 32.25} />
        ))}
      </g>
      {/* scale marks */}
      <text x="20" y="80" className="scopeTiny">100</text>
      <text x="24" y="112" className="scopeTiny">90</text>
      <text x="28" y="290" className="scopeTiny">10</text>
      <text x="26" y="314" className="scopeTiny">0%</text>
      {/* screen header / footer */}
      <text x="52" y="76" className="scopeText">CH1  1.00V   5.00ms</text>
      <text x="300" y="76" className={on ? "scopeTextRed" : "scopeText"}>
        {power ? (playing ? "RUN" : "STOP") : "OFF"}
      </text>
      {power && (
        <>
          <text x="52" y="290" className={on ? "scopeTitle live" : "scopeTitle"}>
            {on ? "▶ " : "■ "}
            {title}
          </text>
          <text x="52" y="306" className="scopeText">
            Vpp {vpp}  Vrms {vrms}  {freq}
          </text>
        </>
      )}
      {/* right panel */}
      <line x1="368" y1="20" x2="368" y2="380" className="scopeDivider" />
      <text x="462" y="38" textAnchor="middle" className="scopeLabelBig">TYPE 465</text>
      <text x="462" y="54" textAnchor="middle" className="scopeLabelBig">OSCILLOSCOPE</text>
      <text x="462" y="70" textAnchor="middle" className="scopeLabel">10MHz</text>
      <line x1="380" y1="80" x2="546" y2="80" className="scopeDivider" />

      <text x="462" y="96" textAnchor="middle" className="scopeLabel">VERTICAL</text>
      <text x="418" y="112" textAnchor="middle" className="scopeLabel">CH 1</text>
      <text x="506" y="112" textAnchor="middle" className="scopeLabel">CH 2</text>
      <Knob cx={418} cy={140} r={16} angle={-50} />
      <Knob cx={506} cy={140} r={16} angle={20} />
      <text x="418" y="172" textAnchor="middle" className="scopeTiny">VOLTS/DIV</text>
      <text x="506" y="172" textAnchor="middle" className="scopeTiny">VOLTS/DIV</text>
      <text x="462" y="188" textAnchor="middle" className="scopeTiny">.5  1  2  3  5</text>
      <text x="418" y="202" textAnchor="middle" className="scopeTiny">mV</text>
      <text x="462" y="202" textAnchor="middle" className="scopeTiny">V</text>
      <text x="506" y="202" textAnchor="middle" className="scopeTiny">V</text>

      <text x="418" y="222" textAnchor="middle" className="scopeTiny">INVERT</text>
      <text x="506" y="222" textAnchor="middle" className="scopeTiny">AC GND DC</text>
      <line x1="380" y1="232" x2="546" y2="232" className="scopeDivider" />

      <text x="462" y="248" textAnchor="middle" className="scopeLabel">OUTPUT</text>
      <text x="462" y="262" textAnchor="middle" className="scopeTiny">VOLUME</text>
      <g onPointerDown={knobDown} className="knobGrab">
        <Knob cx={knobCx} cy={knobCy} r={20} angle={-135 + volume * 270} />
        <circle cx={knobCx} cy={knobCy} r={30} fill="transparent" />
      </g>
      <text x="424" y="286" textAnchor="middle" className="scopeTiny">2</text>
      <text x="432" y="272" textAnchor="middle" className="scopeTiny">4</text>
      <text x="497" y="272" textAnchor="middle" className="scopeTiny">8</text>
      <text x="502" y="288" textAnchor="middle" className="scopeTiny">10</text>
      <text x="424" y="322" textAnchor="middle" className="scopeTiny">min</text>
      <text x="500" y="322" textAnchor="middle" className="scopeTiny">max</text>

      <g onClick={onPower} className="powerCtl">
        <text x="500" y="368" className="scopeLabel">POWER</text>
        <circle cx="546" cy="364" r="4" className={on ? "scopeLed on" : "scopeLed"} />
        <rect x="492" y="352" width="64" height="22" fill="transparent" />
      </g>

      {/* bottom strip */}
      <text x="60" y="352" className="scopeTiny">TRIGGER</text>
      <text x="60" y="362" className="scopeTiny">SOURCE</text>
      <text x="112" y="357" className="scopeTiny">CH1</text>
      <text x="138" y="357" className="scopeTiny">CH2</text>
      <text x="164" y="357" className="scopeTiny">LINE</text>
      <rect x="108" y="348" width="22" height="11" className={on ? "scopeBtn on" : "scopeBtn"} />
      <text x="220" y="352" className="scopeTiny">LEVEL</text>
      <Knob cx={232} cy={372} r={11} angle={-10} />
      <text x="280" y="352" className="scopeTiny">SLOPE</text>
      <text x="318" y="352" className="scopeTiny">MODE</text>
      <text x="284" y="368" className="scopeTiny">＿/￣</text>
      <text x="322" y="368" className="scopeTiny">NORM</text>
      <text x="322" y="380" className="scopeTiny">TV</text>
    </svg>
  );
}

/* ================= CRT SCOPE SCREEN =================
   A real oscilloscope. The AnalyserNode taps the actual audio graph, so
   every frame draws the true time-domain waveform of what is coming out
   of the speakers — nothing synthesized. Classic scope trigger (first
   rising zero-crossing) holds the display steady; bass energy from the
   FFT blooms the beam; Vpp/Vrms/frequency are measured off the buffer. */
function ScopeScreen({ analyserRef, playing, power, onMeasure }) {
  const ref = useRef(null);
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const powerRef = useRef(power);
  powerRef.current = power;
  const measureRef = useRef(onMeasure);
  measureRef.current = onMeasure;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const W = 596; // 2x the SVG screen rect (298x258)
    const H = 516;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // persistent phosphor layer: faded a little each frame, so bright
    // strokes decay into trails instead of vanishing
    const trail = document.createElement("canvas");
    trail.width = W;
    trail.height = H;
    const tctx = trail.getContext("2d");

    const wave = new Uint8Array(2048);
    const spec = new Uint8Array(1024);
    let raf;
    let lastMeasure = 0;
    // auto-gain (the VOLTS/DIV knob turning itself): track a slowly
    // decaying peak so quiet ambient passages still fill the screen and
    // loud ones don't clip
    let agcPeak = 0.3;

    function frame(now) {
      raf = requestAnimationFrame(frame);
      const an = analyserRef.current;
      const pw = powerRef.current;
      const live = !!(playingRef.current && an && pw);

      // fade the phosphor
      tctx.globalCompositeOperation = "destination-out";
      tctx.fillStyle = `rgba(0,0,0,${live ? 0.34 : 0.3})`;
      tctx.fillRect(0, 0, W, H);
      tctx.globalCompositeOperation = "source-over";

      // powered down: no beam at all — the last trace decays into the dark
      if (!pw) {
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(trail, 0, 0);
        if (now - lastMeasure > 250 && measureRef.current) {
          lastMeasure = now;
          measureRef.current({ vpp: "--.-", vrms: "--.-", freq: "---" });
        }
        return;
      }

      let trig = 0;
      let bass = 0;
      let gain = 1;
      if (live) {
        an.getByteTimeDomainData(wave);
        an.getByteFrequencyData(spec);
        // bass energy 0..1 from the bottom FFT bins (~20–500Hz)
        let b = 0;
        for (let i = 1; i < 24; i++) b += spec[i];
        bass = b / (23 * 255);
        // frame peak drives the AGC: fast attack, slow release
        let pk = 0;
        for (let i = 0; i < wave.length; i += 4) {
          const d = Math.abs(wave[i] - 128) / 128;
          if (d > pk) pk = d;
        }
        agcPeak = pk > agcPeak ? pk : agcPeak * 0.995 + pk * 0.005;
        gain = Math.min(14, 0.72 / Math.max(0.02, agcPeak));
        // trigger on the first rising crossing through center, like a
        // scope's NORM mode — keeps a periodic signal steady on screen
        for (let i = 1; i < wave.length / 2; i++) {
          if (wave[i - 1] < 128 && wave[i] >= 128) {
            trig = i;
            break;
          }
        }
      }

      const SPAN = 1024; // samples across the screen (~23ms at 44.1k)
      const nf = Math.floor(now / 16);
      tctx.beginPath();
      for (let i = 0; i <= SPAN; i++) {
        const v = live
          ? (wave[Math.min(wave.length - 1, trig + i)] - 128) * gain
          : (hash2(i * 3 + 1, nf) - 0.5) * 5;
        const clipped = Math.max(-128, Math.min(128, v));
        const y = H / 2 + (clipped / 128) * H * 0.46;
        const x = (i / SPAN) * W;
        if (i === 0) tctx.moveTo(x, y);
        else tctx.lineTo(x, y);
      }
      // glow pass then hot core, like a real CRT beam — the beam blooms
      // and thickens with bass energy
      tctx.shadowColor = "#ff2d12";
      tctx.shadowBlur = 10 + bass * 30;
      tctx.strokeStyle = live
        ? `rgba(255,${Math.round(60 + bass * 70)},34,0.9)`
        : "rgba(255,64,34,0.35)";
      tctx.lineWidth = 2 + bass * 2;
      tctx.stroke();
      tctx.shadowBlur = 0;
      tctx.strokeStyle = live
        ? "rgba(255,216,200,0.9)"
        : "rgba(255,216,200,0.25)";
      tctx.lineWidth = 1;
      tctx.stroke();

      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(trail, 0, 0);

      // real measurements off the same buffer, a few times a second
      if (now - lastMeasure > 250 && measureRef.current) {
        lastMeasure = now;
        if (live) {
          let mn = 255;
          let mx = 0;
          let sum = 0;
          let cross = 0;
          for (let i = 0; i < wave.length; i++) {
            const v = wave[i];
            if (v < mn) mn = v;
            if (v > mx) mx = v;
            const d = (v - 128) / 128;
            sum += d * d;
            if (i > 0 && wave[i - 1] < 128 !== v < 128) cross++;
          }
          const sr = an.context.sampleRate;
          const f = (cross * sr) / (2 * wave.length);
          measureRef.current({
            vpp: (((mx - mn) / 255) * 2).toFixed(2) + "V",
            vrms: Math.sqrt(sum / wave.length).toFixed(2) + "V",
            freq: f >= 1000 ? (f / 1000).toFixed(2) + "kHz" : Math.round(f) + "Hz",
          });
        } else {
          measureRef.current({ vpp: "--.-", vrms: "--.-", freq: "---" });
        }
      }
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} className="scopeScreenCanvas" />;
}

/* ================= RAVE FLYER =================
   A photocopied early-90s rave flyer, in the spirit of the ones that got
   handed out at petrol stations: black field, stacked wireframe spheres
   receding into the floor, vertical type up the left edge, the headline
   set sideways up the right. Links out to the instagram.
   The spheres are drawn as real latitude/longitude wireframes projected
   with perspective, so the moiré comes from the geometry, not a texture. */
function RaveFlyer() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const W = 208;
    const H = 286;
    // drawn large, displayed smaller so it fits under the changer without
    // losing the fine wireframe detail
    const S = 0.78;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W * S + "px";
    canvas.style.height = H * S + "px";
    const c = canvas.getContext("2d");
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.clearRect(0, 0, W, H);

    // art window
    const AX = 22;
    const AY = 40;
    const AW = 128;
    const AH = 168;
    c.fillStyle = "#000";
    c.fillRect(AX, AY, AW, AH);
    c.save();
    c.beginPath();
    c.rect(AX, AY, AW, AH);
    c.clip();

    // three spheres, shrinking and flattening as they recede
    const spheres = [
      { cx: AX + AW * 0.5, cy: AY + 52, r: 46, sq: 1, w: 0.85 },
      { cx: AX + AW * 0.46, cy: AY + 116, r: 38, sq: 0.62, w: 0.6 },
      { cx: AX + AW * 0.42, cy: AY + 152, r: 30, sq: 0.34, w: 0.4 },
    ];

    spheres.forEach(({ cx, cy, r, sq, w }) => {
      c.strokeStyle = `rgba(255,255,255,${w})`;
      c.lineWidth = 0.5;
      // latitude rings: circles of decreasing radius, squashed vertically
      for (let k = -8; k <= 8; k++) {
        const lat = (k / 9) * (Math.PI / 2);
        const rr = r * Math.cos(lat);
        const yy = cy + r * Math.sin(lat) * sq;
        c.beginPath();
        c.ellipse(cx, yy, rr, rr * 0.3 * sq, 0, 0, Math.PI * 2);
        c.stroke();
      }
      // longitude arcs: ellipses of varying width through the poles
      for (let k = 0; k < 12; k++) {
        const ph = (k / 12) * Math.PI;
        c.beginPath();
        c.ellipse(cx, cy, Math.abs(r * Math.cos(ph)), r * sq, 0, 0, Math.PI * 2);
        c.stroke();
      }
    });
    c.restore();

    // window rule
    c.strokeStyle = "rgba(255,255,255,0.9)";
    c.lineWidth = 1;
    c.strokeRect(AX + 0.5, AY + 0.5, AW - 1, AH - 1);

    // registration dots, pushed to the outer corners clear of the headline
    c.fillStyle = "#f0eee6";
    [
      [12, 21],
      [W - 12, 21],
    ].forEach(([x, y]) => {
      c.beginPath();
      c.arc(x, y, 7, 0, Math.PI * 2);
      c.fill();
    });

    const mono = (px, weight = 700) =>
      `${weight} ${px}px ui-monospace, Menlo, monospace`;

    // headline across the top
    c.fillStyle = "#f0eee6";
    c.font = mono(11);
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("A WORLD BEYOND", W / 2, 21);

    // vertical credits up the left edge
    c.save();
    c.translate(13, AY + AH);
    c.rotate(-Math.PI / 2);
    c.textAlign = "left";
    c.font = mono(9, 600);
    c.fillText("AT  ", 0, 0);
    c.font = mono(15);
    c.fillText("REFOLDERED", 20, 0);
    c.font = mono(9, 600);
    c.fillText("· LONDON RD ·", 122, 0);
    c.restore();

    // headline up the right edge
    c.save();
    c.translate(W - 14, AY + AH);
    c.rotate(-Math.PI / 2);
    c.textAlign = "left";
    c.font = mono(26, 800);
    c.fillText("RAVE", 0, 0);
    c.font = mono(8, 600);
    c.fillText("···TECHNO WIZOS···", 56, -8);
    c.restore();

    // price line + destination footer
    c.textAlign = "center";
    c.font = mono(7.5, 600);
    c.fillStyle = "rgba(240,238,230,0.75)";
    c.fillText("£2.00 · £1.50 WITH FLYER · 9.30 START", W / 2, AY + AH + 12);

    c.font = mono(13, 800);
    c.fillStyle = "#f0eee6";
    c.fillText("DESTINATION:", W / 2, AY + AH + 30);
    c.fillStyle = "#d43d2a";
    c.font = mono(15, 800);
    c.fillText("@REFOLDERED", W / 2, AY + AH + 47);
  }, []);

  return (
    <a
      href="https://instagram.com/refoldered"
      target="_blank"
      rel="noopener noreferrer"
      className="flyerLink"
    >
      <canvas ref={ref} className="flyerCanvas" />
    </a>
  );
}

/* ================= CUT LIP IMPRINT =================
   A lipstick kiss pressed onto the page, typed in ASCII — creased,
   stippled like a real imprint, with a slit cut across the lower lip.
   Hover and the whole kiss heats up glowing red. */
function AsciiLips() {
  const [hot, setHot] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const SW = 220;
    const SH = 160;
    const SCALE = 1.36;
    const W = Math.round(SW * SCALE);
    const H = Math.round(SH * SCALE);
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);

    /* ---- the two lip shapes, as flat blocks of pigment ----
       A stain is not a lit object: there is no gloss, no shading, only
       pigment that did or didn't transfer. So the shapes are filled flat
       and all the character comes from how the coverage breaks up. */
    const L = 24; // corners pulled in and sharpened
    const R = 196;
    const CXm = 110;
    const MY = 80;
    // the parted mouth: a clear gap where no pigment lands
    const mouthTop = (x) => {
      const t = (x - L) / (R - L);
      return MY + Math.sin(t * Math.PI) * 9 - 5.5;
    };
    const mouthBot = (x) => {
      const t = (x - L) / (R - L);
      return MY + Math.sin(t * Math.PI) * 9 + 5.5;
    };

    // Upper lip: control points sit close to each corner so the curve
    // leaves at a shallow angle and the corner comes to a point.
    const upper = new Path2D();
    upper.moveTo(L, MY);
    upper.bezierCurveTo(30, 66, 62, 30, 88, 32); // left peak of the bow
    upper.quadraticCurveTo(110, 56, 132, 32); // philtrum dip, then right peak
    upper.bezierCurveTo(158, 30, 190, 66, R, MY);
    upper.bezierCurveTo(164, MY + 6, 56, MY + 6, L, MY);
    upper.closePath();

    // Lower lip: fuller, widest just below the mouth line.
    const lower = new Path2D();
    lower.moveTo(L, MY);
    lower.bezierCurveTo(56, MY + 12, 164, MY + 12, R, MY);
    lower.bezierCurveTo(186, 126, 150, 152, 110, 152);
    lower.bezierCurveTo(70, 152, 34, 126, L, MY);
    lower.closePath();

    // Blurred copy of the shapes: its alpha is a cheap stand-in for
    // "how far inside the lip am I", which is exactly how hard the lip
    // pressed — full in the belly, feathering out at the rim.
    const soft = document.createElement("canvas");
    soft.width = SW;
    soft.height = SH;
    const sc = soft.getContext("2d");
    sc.filter = "blur(6px)";
    sc.fillStyle = "#fff";
    sc.fill(upper);
    sc.fill(lower);
    sc.filter = "none";
    const softData = sc.getImageData(0, 0, SW, SH).data;

    // Hard mask, so pigment never strays outside the lip outline.
    const mask = document.createElement("canvas");
    mask.width = SW;
    mask.height = SH;
    const mc = mask.getContext("2d");
    mc.fillStyle = "#fff";
    mc.fill(upper);
    mc.fill(lower);
    // carve the mouth line out — the lips part there, so no ink lands
    mc.globalCompositeOperation = "destination-out";
    mc.beginPath();
    mc.moveTo(L, mouthTop(L));
    for (let x = L; x <= R; x += 4) mc.lineTo(x, mouthTop(x));
    for (let x = R; x >= L; x -= 4) mc.lineTo(x, mouthBot(x));
    mc.closePath();
    mc.fill();
    mc.globalCompositeOperation = "source-over";
    const maskData = mc.getImageData(0, 0, SW, SH).data;

    /* ---- type the stain ---- */
    const RAMP = " .:-=+*#%@";
    // the slit cut across the lower lip
    const A = [96, 96];
    const B = [142, 134];
    const distToCut = (x, y) => {
      const vx = B[0] - A[0];
      const vy = B[1] - A[1];
      const t = Math.max(0, Math.min(1, ((x - A[0]) * vx + (y - A[1]) * vy) / (vx * vx + vy * vy)));
      return Math.hypot(x - (A[0] + vx * t), y - (A[1] + vy * t));
    };

    const cell = 2.6;
    ctx.font = `700 ${(cell * SCALE * 1.7).toFixed(1)}px ui-monospace, Menlo, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let y = 0; y < SH; y += cell) {
      for (let x = 0; x < SW; x += cell) {
        const xi = Math.round(x);
        const yi = Math.round(y);
        const i = (yi * SW + xi) * 4;
        if (maskData[i + 3] < 100) continue;

        // base coverage: how hard the lip pressed here
        let cov = softData[i + 3] / 255;
        cov = Math.pow(cov, 0.7);

        // Striations — the signature of a lipstick print: the lip's
        // creases leave lines the pigment never reaches. They splay away
        // from the mouth line rather than running dead vertical.
        const fan = ((x - CXm) / (R - L)) * 1.5;
        const sx = x + (y - MY) * fan;
        const jitter = vnoise(x, y, 26, 12) * 5;
        const phase = (sx + jitter) / 5.2;
        const st = Math.abs(phase - Math.floor(phase) - 0.5) * 2; // 0 at gap centre
        const striation = 0.28 + 0.72 * Math.pow(st, 0.55);
        cov *= striation;

        // blotchy transfer: some patches took, some skipped
        const blotch = vnoise(x, y, 15, 21) * 0.55 + vnoise(x, y, 5, 33) * 0.45;
        cov *= 0.45 + blotch * 0.85;

        // ragged rim: near the edge, transfer becomes hit-and-miss
        const edge = softData[i + 3] / 255;
        if (edge < 0.55 && hash2(xi * 7, yi * 13) > edge * 1.7) continue;

        if (cov < 0.13) continue;

        const px = x * SCALE;
        const py = y * SCALE;
        const d = distToCut(x, y);
        if (d < 2) continue; // the wound: open, no pigment
        if (d < 5) {
          ctx.fillStyle = hot ? "#ff2210" : "#8a1410";
          ctx.fillText("#", px, py);
          continue;
        }
        const ci = Math.min(RAMP.length - 1, Math.max(1, Math.floor(cov * RAMP.length)));
        ctx.fillStyle = hot
          ? `rgba(255,${70 + cov * 60},${44 + cov * 30},${0.55 + cov * 0.45})`
          : `rgba(240,238,230,${0.42 + cov * 0.55})`;
        ctx.fillText(RAMP[ci], px, py);
      }
    }

    // a few flecks of pigment thrown clear of the print
    for (let k = 0; k < 26; k++) {
      const x = 8 + hash2(k, 91) * (SW - 16);
      const y = 24 + hash2(k, 93) * (SH - 40);
      const i = (Math.round(y) * SW + Math.round(x)) * 4;
      if (maskData[i + 3] > 60) continue;
      ctx.fillStyle = hot ? "rgba(255,90,58,0.65)" : "rgba(240,238,230,0.4)";
      ctx.fillText(hash2(k, 97) > 0.5 ? "." : ":", x * SCALE, y * SCALE);
    }
  }, [hot]);

  return (
    <canvas
      ref={ref}
      className={hot ? "lipsCanvas hot" : "lipsCanvas"}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
    />
  );
}

/* ================= MDMA STRUCTURE =================
   The real thing: 3,4-methylenedioxy-N-methylamphetamine, C11H15NO2.
   A benzodioxole (benzene with an –O–CH2–O– bridge fused across C3–C4)
   carrying a –CH2–CH(CH3)–NH–CH3 chain at C1. Every vertex is computed:
   the hexagon from 60° steps, the fused five-ring as a regular pentagon
   sharing the C3–C4 edge, the chain as a 30° zig-zag off the ring axis. */
function ChemDiagram() {
  const L = 30; // bond length
  const CX = 104;
  const CY = 74;

  const q = q3; // see q3: keeps SSR and client markup byte-identical

  // benzene: v0 right, then every 60° clockwise in screen coords
  const v = [];
  for (let k = 0; k < 6; k++) {
    const a = (k * 60 * Math.PI) / 180;
    v.push([CX + L * Math.cos(a), CY + L * Math.sin(a)]);
  }
  // C1 bears the chain (v0); the dioxole is fused across C3–C4 (v3–v2)
  const A = v[3];
  const B = v[2];

  // regular pentagon on edge A–B, bulging away from the ring center
  const mx = (A[0] + B[0]) / 2;
  const my = (A[1] + B[1]) / 2;
  const nl = Math.hypot(mx - CX, my - CY);
  const nx = (mx - CX) / nl;
  const ny = (my - CY) / nl;
  const apo = L / (2 * Math.tan(Math.PI / 5));
  const P = [mx + nx * apo, my + ny * apo];
  const R5 = L / (2 * Math.sin(Math.PI / 5));
  const angA = Math.atan2(A[1] - P[1], A[0] - P[0]);
  // B sits at angA + 72°, so the three free vertices run the other way
  const pent = (k) => [
    P[0] + R5 * Math.cos(angA - (k * 72 * Math.PI) / 180),
    P[1] + R5 * Math.sin(angA - (k * 72 * Math.PI) / 180),
  ];
  const O1 = pent(1); // bonded to A
  const CH2ring = pent(2);
  const O2 = pent(3); // bonded to B

  // side chain off C1, zig-zagging ±30° about the ring axis
  const step = (p, deg) => [
    p[0] + L * Math.cos((deg * Math.PI) / 180),
    p[1] + L * Math.sin((deg * Math.PI) / 180),
  ];
  const c1 = v[0];
  const cB = step(c1, -30); // benzylic CH2
  const cA = step(cB, 30); // CH bearing the methyl
  const me = step(cA, 90); // α-methyl, pointing down
  const N = step(cA, -30); // secondary amine
  const nMe = step(N, 30); // N-methyl

  // pull a bond back from a labelled atom so it doesn't collide with text
  const trim = (p, r, pad) => {
    const d = Math.hypot(r[0] - p[0], r[1] - p[1]);
    const f = pad / d;
    return [p[0] + (r[0] - p[0]) * f, p[1] + (r[1] - p[1]) * f];
  };
  const bond = (p, r, key, padP = 0, padQ = 0) => {
    const a = padP ? trim(p, r, padP) : p;
    const b = padQ ? trim(r, p, padQ) : r;
    return (
      <line
        key={key}
        x1={q(a[0])}
        y1={q(a[1])}
        x2={q(b[0])}
        y2={q(b[1])}
        className="chemBond"
      />
    );
  };
  // inner stroke of an aromatic double bond, inset toward the ring center
  const arom = (i, j) => {
    const f = 0.76;
    return (
      <line
        key={"ar" + i + j}
        x1={q(CX + (v[i][0] - CX) * f)}
        y1={q(CY + (v[i][1] - CY) * f)}
        x2={q(CX + (v[j][0] - CX) * f)}
        y2={q(CY + (v[j][1] - CY) * f)}
        className="chemBond"
      />
    );
  };

  return (
    <svg className="chemSvg" viewBox="14 16 244 132">
      {[0, 1, 2, 3, 4, 5].map((k) => bond(v[k], v[(k + 1) % 6], "r" + k))}
      {[arom(0, 1), arom(2, 3), arom(4, 5)]}

      {/* methylenedioxy bridge */}
      {bond(A, O1, "d1", 0, 9)}
      {bond(O1, CH2ring, "d2", 9, 0)}
      {bond(CH2ring, O2, "d3", 0, 9)}
      {bond(O2, B, "d4", 9, 0)}
      <text x={q(O1[0])} y={q(O1[1])} className="chemAtom" textAnchor="middle" dominantBaseline="central">O</text>
      <text x={q(O2[0])} y={q(O2[1])} className="chemAtom" textAnchor="middle" dominantBaseline="central">O</text>

      {/* N-methylpropan-2-amine chain */}
      {bond(c1, cB, "s1")}
      {bond(cB, cA, "s2")}
      {bond(cA, me, "s3")}
      {bond(cA, N, "s4", 0, 10)}
      {bond(N, nMe, "s5", 10, 0)}
      <text x={q(N[0])} y={q(N[1] - 1)} className="chemAtom" textAnchor="middle" dominantBaseline="central">N</text>
      <text x={q(N[0] + 8)} y={q(N[1] - 11)} className="chemH" textAnchor="middle">H</text>

      <text x="150" y="140" className="chemName">MDMA · C₁₁H₁₅NO₂</text>
    </svg>
  );
}

/* ================= PILLS — DRAG THE CARD TO CUT =================
   The Amex is in your hand: it tracks the cursor, tilting with the
   direction you drag it. Cutting is caused, not scheduled — each pill
   keeps its own state, and only breaks down a level when the blade
   actually passes across it at the right height. So you can chop one
   pill to powder and leave the one beside it whole.

   whole → halves → thirds → quarters → crumbs → powder, then further
   passes drag the powder out into a line.

   The pill layer is cached and only re-rendered when something changes,
   so following the cursor at 60fps costs one blit and the card. */
function PillsBreak() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const W = 430;
    const H = 210;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    // shade buffer (halftoned) and the cached pill layer
    const off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    const g = off.getContext("2d");
    const layer = document.createElement("canvas");
    layer.width = W * DPR;
    layer.height = H * DPR;
    const lx = layer.getContext("2d");
    lx.setTransform(DPR, 0, 0, DPR, 0, 0);

    const OX = 40;
    const OY = 14;
    const TABLETS = [
      [OX + 46, OY + 46, 24, 10, 14],
      [OX + 104, OY + 74, 20, 8, 12],
      [OX + 44, OY + 96, 17, 7, 10],
      [OX + 92, OY + 116, 14, 6, 8],
    ];
    const CAP = { x: OX + 176, y: OY + 62, rot: (-28 * Math.PI) / 180, half: 33, r: 14 };
    const ink = "rgba(240,238,230,0.9)";
    const ease = (t) => 1 - Math.pow(1 - t, 3);

    // per-pill state: level 0..5, anim 0..1 since the last break, smear
    const pill = TABLETS.map(() => ({ lvl: 0, anim: 1, smear: 0, cool: 0 }));
    const cap = { lvl: 0, anim: 1, cool: 0 };
    let dirty = true;

    /* ---- the cutter ---- */
    const CW = 122;
    const CH = 78;
    const card = document.createElement("canvas");
    card.width = CW;
    card.height = CH;
    const cg = card.getContext("2d");
    {
      const lg = cg.createLinearGradient(0, 0, CW, CH);
      lg.addColorStop(0, "#8f8f8f");
      lg.addColorStop(0.42, "#e2e2e2");
      lg.addColorStop(0.55, "#6f6f6f");
      lg.addColorStop(1, "#bdbdbd");
      cg.fillStyle = lg;
      cg.beginPath();
      cg.roundRect(4, 4, CW - 8, CH - 8, 8);
      cg.fill();
      cg.fillStyle = "#3a3a3a";
      cg.fillRect(14, 26, 22, 17);
      cg.strokeStyle = "#141414";
      cg.lineWidth = 1.3;
      cg.strokeRect(14, 26, 22, 17);
      cg.beginPath();
      cg.moveTo(14, 34.5);
      cg.lineTo(36, 34.5);
      cg.moveTo(25, 26);
      cg.lineTo(25, 43);
      cg.stroke();
      cg.fillStyle = "#0e0e0e";
      cg.font = "900 17px ui-monospace, Menlo, monospace";
      cg.fillText("AMEX", 66, 23);
      cg.font = "700 9px ui-monospace, Menlo, monospace";
      cg.fillText("3782 822463 10005", 13, 58);
      cg.font = "600 7px ui-monospace, Menlo, monospace";
      cg.fillText("MEMBER SINCE ∞", 13, 70);
      cg.fillText("R D JAMES", 82, 70);
    }
    const cardImg = cg.getImageData(0, 0, CW, CH).data;
    const RAMP = " .:-=+*#%@";

    const asciiCard = (x0, y0, rot) => {
      ctx.save();
      ctx.translate(x0, y0);
      ctx.rotate(rot);
      // a whisper of shadow so it sits above the desk
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.beginPath();
      ctx.roundRect(-CW / 2 + 4, -CH / 2 + 6, CW - 8, CH - 8, 8);
      ctx.fill();
      ctx.font = "700 6px ui-monospace, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(240,238,230,0.92)";
      const cell = 4;
      for (let y = 0; y < CH; y += cell) {
        for (let x = 0; x < CW; x += cell) {
          const i = (y * CW + x) * 4;
          if (cardImg[i + 3] < 40) continue;
          const ch = RAMP[Math.min(RAMP.length - 1, Math.floor((cardImg[i] / 255) * RAMP.length))];
          if (ch === " ") continue;
          ctx.fillText(ch, x - CW / 2, y - CH / 2);
        }
      }
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(-CW / 2 + 3, -CH / 2 + 3, CW - 6, CH - 6, 8);
      ctx.stroke();
      // the working edge, picked out brighter
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-CW / 2 + 3, CH / 2 - 3);
      ctx.lineTo(CW / 2 - 3, CH / 2 - 3);
      ctx.stroke();
      ctx.restore();
    };

    /* ---- pieces ---- */
    const wedge = (t, mode, cx, cy, rx, ry, a0, a1, gap, jit) => {
      const am = (a0 + a1) / 2;
      t.save();
      t.translate(cx + Math.cos(am) * gap, cy + Math.sin(am) * gap * (ry / rx));
      t.scale(1, ry / rx);
      t.rotate(jit);
      t.beginPath();
      t.moveTo(0, 0);
      t.arc(0, 0, rx, a0, a1);
      t.closePath();
      if (mode === "shade") {
        const tg = t.createRadialGradient(-rx / 3, -rx / 2, 1, 0, 0, rx);
        tg.addColorStop(0, "#d6d6d6");
        tg.addColorStop(1, "#5e5e5e");
        t.fillStyle = tg;
        t.fill();
      } else {
        t.strokeStyle = ink;
        t.lineWidth = 1.1;
        t.stroke();
      }
      t.restore();
    };

    const dust = (cx, cy, spread, count, seed) => {
      for (let k = 0; k < count; k++) {
        const a = hash2(seed * 31 + k, 44) * Math.PI * 2;
        const d = spread * (0.4 + hash2(seed * 17 + k, 47) * 0.9);
        const lum = 120 + Math.floor(hash2(k, seed) * 110);
        g.fillStyle = `rgb(${lum},${lum},${lum})`;
        g.beginPath();
        g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.5, 0.7 + hash2(k * 3, seed) * 1.1, 0, Math.PI * 2);
        g.fill();
      }
    };

    const capsule = (t, mode, sep, spill) => {
      t.save();
      t.translate(CAP.x, CAP.y);
      t.rotate(CAP.rot);
      const { half, r } = CAP;
      [
        [-half - sep, [r, 0, 0, r]],
        [sep, [0, r, r, 0]],
      ].forEach(([x0, radii]) => {
        t.beginPath();
        t.roundRect(x0, -r, half, r * 2, radii);
        if (mode === "shade") {
          const lg = t.createLinearGradient(0, -r, 0, r);
          lg.addColorStop(0, "#cfcfcf");
          lg.addColorStop(1, "#3a3a3a");
          t.fillStyle = lg;
          t.fill();
        } else {
          t.strokeStyle = ink;
          t.lineWidth = 1.2;
          t.stroke();
        }
      });
      if (mode === "shade" && spill > 0) {
        for (let k = 0; k < spill; k++) {
          const lum = 130 + Math.floor(hash2(k, 91) * 100);
          t.fillStyle = `rgb(${lum},${lum},${lum})`;
          t.beginPath();
          t.arc((hash2(k * 7, 5) - 0.5) * sep * 2, (hash2(k * 11, 9) - 0.5) * r * 1.6, 0.8 + hash2(k, 13) * 1, 0, Math.PI * 2);
          t.fill();
        }
      }
      t.restore();
    };

    // powder for one pill: a ridge of grains that the blade drags wider
    const powder = (cx, cy, smear, p) => {
      const len = 42 + smear * 96;
      const x0 = cx - len * 0.34;
      lx.save();
      lx.beginPath();
      lx.rect(OX - 24, OY - 10, 268, 176);
      lx.clip();
      for (let gi = 0; gi < 340 + smear * 260; gi++) {
        const u = hash2(gi * 13 + cx, 3);
        const x = x0 + u * len;
        const edge = Math.min(u, 1 - u) * 6;
        if (hash2(gi * 7 + cx, 5) > Math.min(1, 0.3 + edge)) continue;
        const g1 = hash2(gi * 3, 11) + hash2(gi * 5, 17) - 1;
        const halo = hash2(gi * 11, 23) < 0.11 ? (hash2(gi, 29) - 0.5) * 13 : 0;
        const clump = hash2(gi * 17, 37) < 0.05;
        const size = 0.45 + hash2(gi, 41) * 0.75 + (clump ? 1 : 0);
        const alpha = (0.5 + hash2(gi, 43) * 0.5) * p;
        const lum = 175 + Math.floor(hash2(gi, 61) * 80);
        lx.fillStyle = `rgba(${lum},${lum},${lum},${alpha})`;
        lx.beginPath();
        lx.arc(x, cy + g1 * (2.4 + smear * 1.2) + halo, size, 0, Math.PI * 2);
        lx.fill();
      }
      // the heap that hasn't been drawn out yet
      for (let k = 0; k < 40; k++) {
        const a = hash2(k * 3 + cx, 67) * Math.PI * 2;
        const d = Math.pow(hash2(k * 7 + cx, 71), 0.6) * 8;
        const lum = 180 + Math.floor(hash2(k, 73) * 65);
        lx.fillStyle = `rgba(${lum},${lum},${lum},${0.7 * p * Math.max(0.25, 1 - smear * 0.5)})`;
        lx.beginPath();
        lx.arc(x0 - 3 + Math.cos(a) * d, cy + Math.sin(a) * d * 0.5, 0.6 + hash2(k, 79) * 1, 0, Math.PI * 2);
        lx.fill();
      }
      lx.restore();
    };

    const halftone = () => {
      const img = g.getImageData(0, 0, W, H).data;
      const CELL = 3;
      lx.fillStyle = "#e8e6de";
      for (let y = 0; y < H; y += CELL) {
        for (let x = 0; x < W; x += CELL) {
          const i = (((y | 0) * W + (x | 0)) * 4) | 0;
          const lum = img[i];
          if (lum < 14) continue;
          const r = CELL * 0.52 * Math.pow(lum / 255, 0.85);
          if (r < 0.22) continue;
          lx.beginPath();
          lx.arc(x, y, r, 0, Math.PI * 2);
          lx.fill();
        }
      }
    };

    // re-draw the cached pill layer
    const buildLayer = () => {
      lx.clearRect(0, 0, W, H);
      g.clearRect(0, 0, W, H);

      const solid = (t, mode) => {
        TABLETS.forEach(([cx, cy, rx, ry, depth], i) => {
          const st = pill[i];
          if (st.lvl >= 5) return;
          const e = ease(st.anim);
          if (st.lvl === 0) {
            if (mode === "shade") {
              const grad = t.createLinearGradient(0, cy, 0, cy + depth + ry);
              grad.addColorStop(0, "#8e8e8e");
              grad.addColorStop(1, "#222222");
              t.beginPath();
              t.ellipse(cx, cy + depth, rx, ry, 0, 0, Math.PI);
              t.lineTo(cx - rx, cy);
              t.ellipse(cx, cy, rx, ry, 0, Math.PI, 0, true);
              t.closePath();
              t.fillStyle = grad;
              t.fill();
              const tg = t.createRadialGradient(cx - rx / 3, cy - ry / 2, 1, cx, cy, rx);
              tg.addColorStop(0, "#dcdcdc");
              tg.addColorStop(1, "#6a6a6a");
              t.beginPath();
              t.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
              t.fillStyle = tg;
              t.fill();
            } else {
              t.strokeStyle = ink;
              t.lineWidth = 1.1;
              t.beginPath();
              t.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
              t.stroke();
              t.beginPath();
              t.ellipse(cx, cy + depth, rx, ry, 0, 0, Math.PI);
              t.stroke();
              t.strokeStyle = "rgba(240,238,230,0.5)";
              t.lineWidth = 1;
              t.beginPath();
              t.moveTo(cx - rx * 0.6, cy);
              t.lineTo(cx + rx * 0.6, cy);
              t.stroke();
            }
          } else if (st.lvl <= 3) {
            const n = st.lvl + 1;
            const rot0 = hash2(i, 40 + st.lvl) * Math.PI * 2;
            for (let k = 0; k < n; k++) {
              const a0 = rot0 + (k * 2 * Math.PI) / n;
              const a1 = a0 + (2 * Math.PI) / n;
              const gap = (4 + st.lvl * 2.5 + hash2(i * 7 + k, st.lvl) * 3) * e;
              const jit = (hash2(i * 13 + k, st.lvl) - 0.5) * 0.3 * e;
              wedge(t, mode, cx, cy, rx, ry, a0, a1, gap, jit);
            }
            if (mode === "shade") dust(cx, cy, rx * 1.3 * e, Math.round(5 * st.lvl * e), i);
          } else {
            for (let k = 0; k < 7; k++) {
              const a = hash2(i * 19 + k, 71) * Math.PI * 2;
              const d = rx * (0.3 + hash2(i * 23 + k, 73) * 1.1) * e;
              const s = rx * (0.16 + hash2(i + k, 77) * 0.22);
              t.save();
              t.translate(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.55);
              t.rotate(hash2(i * 29 + k, 79) * Math.PI * e);
              t.beginPath();
              t.moveTo(-s, 0);
              t.lineTo(-s * 0.2, -s * 0.9);
              t.lineTo(s, -s * 0.2);
              t.lineTo(s * 0.5, s * 0.8);
              t.closePath();
              if (mode === "shade") {
                const lum = 110 + Math.floor(hash2(k, i) * 110);
                t.fillStyle = `rgb(${lum},${lum},${lum})`;
                t.fill();
              } else {
                t.strokeStyle = ink;
                t.lineWidth = 1;
                t.stroke();
              }
              t.restore();
            }
            if (mode === "shade") dust(cx, cy, rx * 1.6 * e, Math.round(26 * e), i);
          }
        });
        const ce = ease(cap.anim);
        capsule(t, mode, Math.min(cap.lvl, 4) * 6 * ce, Math.round(cap.lvl * 8 * ce));
      };

      solid(g, "shade");
      halftone();
      solid(lx, "line");
      // powdered pills draw on top, crisp
      TABLETS.forEach(([cx, cy], i) => {
        const st = pill[i];
        if (st.lvl >= 5) powder(cx, cy, st.smear, ease(st.anim));
      });
    };

    /* ---- input ---- */
    const PARK = { x: W - 74, y: H - 52 };
    const mouse = { x: PARK.x, y: PARK.y, inside: false };
    let cardX = PARK.x;
    let cardY = PARK.y;
    let prevX = PARK.x;
    let prevY = PARK.y;
    let rot = -0.12;

    const toLocal = (ev) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = ((ev.clientX - r.left) / r.width) * W;
      mouse.y = ((ev.clientY - r.top) / r.height) * H;
    };
    const onMove = (ev) => {
      toLocal(ev);
      mouse.inside = true;
    };
    const onEnter = (ev) => {
      toLocal(ev);
      mouse.inside = true;
      // drop the card straight to the cursor on entry, no fly-in
      cardX = mouse.x;
      cardY = mouse.y;
      prevX = cardX;
      prevY = cardY;
    };
    const onLeave = () => {
      mouse.inside = false;
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerenter", onEnter);
    canvas.addEventListener("pointerleave", onLeave);

    // did the blade sweep across this point since the last frame?
    const crossed = (cx, cy, band) => {
      if (Math.abs(cardY - cy) > band) return false;
      return (prevX - cx) * (cardX - cx) < 0;
    };

    let raf;
    let last = 0;
    const frame = (ts) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(60, ts - last) : 16;
      last = ts;

      prevX = cardX;
      prevY = cardY;
      const tx = mouse.inside ? mouse.x : PARK.x;
      const ty = mouse.inside ? mouse.y : PARK.y;
      // a little lag, so it feels like something being dragged
      cardX += (tx - cardX) * Math.min(1, dt * 0.022);
      cardY += (ty - cardY) * Math.min(1, dt * 0.022);
      // tilt into the direction of travel
      const vx = cardX - prevX;
      const targetRot = mouse.inside ? Math.max(-0.5, Math.min(0.5, -vx * 0.03)) : -0.12;
      rot += (targetRot - rot) * Math.min(1, dt * 0.012);

      // cutting
      if (mouse.inside) {
        TABLETS.forEach(([cx, cy, rx], i) => {
          const st = pill[i];
          st.cool -= dt;
          if (st.cool > 0 || st.lvl >= 5 + 4) return;
          if (!crossed(cx, cy, 40)) return;
          st.cool = 180;
          if (st.lvl < 5) {
            st.lvl += 1;
            st.anim = 0;
          } else {
            st.smear = Math.min(1, st.smear + 0.25);
            st.anim = 0.999;
          }
          dirty = true;
        });
        cap.cool -= dt;
        if (cap.cool <= 0 && cap.lvl < 4 && crossed(CAP.x, CAP.y, 40)) {
          cap.cool = 180;
          cap.lvl += 1;
          cap.anim = 0;
          dirty = true;
        }
      }

      // ease the break animations
      pill.forEach((st) => {
        if (st.anim < 1) {
          st.anim = Math.min(1, st.anim + dt / 420);
          dirty = true;
        }
      });
      if (cap.anim < 1) {
        cap.anim = Math.min(1, cap.anim + dt / 420);
        dirty = true;
      }

      if (dirty) {
        buildLayer();
        dirty = false;
      }

      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(layer, 0, 0, W, H);
      asciiCard(cardX, cardY, rot);
    };

    buildLayer();
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerenter", onEnter);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={ref} className="pillsCanvas" />;
}

/* ================= PAGE ================= */
export default function Home() {
  const [entered, setEntered] = useState(false);
  // the engaged disc: 01 to start, and hovering another moves the reader
  // head to it for good — it keeps playing after the cursor leaves
  const [activeSlot, setActiveSlot] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [trackTitle, setTrackTitle] = useState("");
  const [hauntTip, setHauntTip] = useState(null);
  // real scope readouts, measured off the analyser buffer
  const [meas, setMeas] = useState({ vpp: "--.-", vrms: "--.-", freq: "---" });
  // scope front panel
  const [volume, setVolume] = useState(0.8);
  const [power, setPower] = useState(true);

  const analyserRef = useRef(null);
  const audioCtlRef = useRef(null);

  function togglePower() {
    setPower((p) => {
      const next = !p;
      audioCtlRef.current?.setPower(next);
      return next;
    });
  }

  // poster scale-to-fit
  useEffect(() => {
    function onResize() {
      const s = Math.min(window.innerWidth / 1620, window.innerHeight / 1020);
      document.documentElement.style.setProperty("--poster-scale", String(s));
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function enter() {
    if (entered) return;
    setEntered(true);
    // the gate click is the user gesture — start the audio graph on it
    audioCtlRef.current?.start();
  }

  // hover haunt: every element highlights and whispers a random line
  function haunt(base = "") {
    return {
      className: `${base} haunt`.trim(),
      onMouseEnter: (e) =>
        setHauntTip({
          x: e.clientX,
          y: e.clientY,
          text: CRYPTIC[Math.floor(Math.random() * CRYPTIC.length)],
        }),
      onMouseMove: (e) =>
        setHauntTip((h) => (h ? { ...h, x: e.clientX, y: e.clientY } : h)),
      onMouseLeave: () => setHauntTip(null),
    };
  }
  const titleShown = trackTitle
    ? trackTitle.toUpperCase().slice(0, 30) + (trackTitle.length > 30 ? "…" : "")
    : "AWAITING SIGNAL";

  return (
    <div className={`root${entered ? " entered" : ""}`}>
      <div className="gate" onClick={enter}>
        <div className="gateGlyph">&#9678;</div>
        <div className="gateText">click to enter</div>
      </div>

      <div className="posterViewport">
        <div className="poster">
          <GroundCanvas />
          <div className="pageFrame" />

          <div {...haunt("siteTitle")}>refoldered.com_</div>

          <SceneCanvas />

          <div className="towerWrap">
            <AlbumArtCanvas spin={activeSlot} />
            <TowerSVG active={activeSlot} haunt={haunt} onHover={setActiveSlot} />
          </div>

          <div {...haunt("flipLabel")}>[&nbsp;&nbsp;FLIP TO REMEMBER&nbsp;&nbsp;&nbsp;]</div>

          <div {...haunt("coinWrap")}>
            <PillCanvas />
          </div>

          <div {...haunt("wordList")}>
            <div>ECSTASY</div>
            <div>EUPHORIA</div>
            <div>HISTORY</div>
            <div className="wordDots">...</div>
          </div>

          <div {...haunt("scopeWrap")}>
            <ScopeSVG
              playing={playing}
              vpp={meas.vpp}
              vrms={meas.vrms}
              freq={meas.freq}
              title={titleShown}
              volume={volume}
              onVolume={setVolume}
              power={power}
              onPower={togglePower}
            />
            <ScopeScreen
              analyserRef={analyserRef}
              playing={playing}
              power={power}
              onMeasure={setMeas}
            />
          </div>

          <div {...haunt("holdingWrap")}>
            <div className="holdingLabel">[&nbsp;&nbsp;HOLDING PATTERN&nbsp;&nbsp;]</div>
            <div className="holdingTrack">
              <div className="holdingDots" />
              <div
                className="holdingMarker"
                style={{ left: `${(activeSlot / (SLOT_COUNT - 1)) * 100}%` }}
              />
            </div>
          </div>

          {/* no haunt tooltip here — it would sit over the thing you're
              actually manipulating */}
          <div className="pillsPos">
            <PillsBreak />
          </div>

          <div className="flyerPos">
            <RaveFlyer />
          </div>

          <div {...haunt("lipsPos")}>
            <AsciiLips />
          </div>

          <div {...haunt("chemPos")}>
            <ChemDiagram />
          </div>

          {/* printed, aged, and scanned — over everything above */}
          <FilmOverlay />
        </div>
      </div>

      {hauntTip && (
        <div
          className="hauntTip"
          style={{ left: hauntTip.x + 16, top: hauntTip.y + 18 }}
        >
          {hauntTip.text}
        </div>
      )}

      <ArchiveAudio
        controlRef={audioCtlRef}
        analyserRef={analyserRef}
        onTrackChange={setTrackTitle}
        playing={playing}
        setPlaying={setPlaying}
        volume={volume}
      />
    </div>
  );
}
