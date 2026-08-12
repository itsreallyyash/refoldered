"use client";

import { useEffect, useRef, useState } from "react";

const YT_URL = "https://youtube.com/playlist?list=PLFHK1y8DXCMY";

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

const ALBUMS = [
  { key: "deftones", url: "https://www.youtube.com/results?search_query=deftones+diamond+eyes+full+album" },
  { key: "acdc", url: "https://www.youtube.com/results?search_query=ac+dc+back+in+black+full+album" },
  { key: "aphex", url: "https://www.youtube.com/results?search_query=aphex+twin+selected+ambient+works+85-92" },
  { key: "acid", url: "https://www.youtube.com/results?search_query=acid+house+classics+1988" },
  { key: "floyd", url: "https://www.youtube.com/results?search_query=pink+floyd+dark+side+of+the+moon+full+album" },
  { key: "lcd", url: "https://www.youtube.com/results?search_query=lcd+soundsystem+sound+of+silver+full+album" },
];

function parseYouTube(url) {
  try {
    const u = new URL(url);
    const listId = u.searchParams.get("list");
    let videoId = u.searchParams.get("v");
    if (!videoId && u.hostname.includes("youtu.be")) {
      videoId = u.pathname.replace("/", "");
    }
    if (!listId && !videoId) return null;
    return { videoId, listId };
  } catch {
    return null;
  }
}

const DISCS = ["PROJECTS", "DATA_LOG", "HISTORY", "CONTACT", "RECALL", "FRAGMENTS"];
const SLOT_COUNT = DISCS.length;

// Deterministic hash so SSR and client render the same dot fields.
function hash2(i, j) {
  let h = (i * 374761393 + j * 668265263) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h >>> 0) / 4294967295;
}

/* ================= ROTATING COIN =================
   Precise trig geometry rendered to an offscreen canvas, converted to a
   halftone dot field, with crisp vector linework layered on top. One coin:
   Mercedes tri-star face / BMW roundel face. */
function PillCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const W = 420;
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

    function frame(ts) {
      raf = requestAnimationFrame(frame);
      if (last && ts - last < 70) return;
      last = ts;
      theta += 0.045;

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
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} className="pillCanvas" />;
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

    const poly = (pts, fill) => {
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.closePath();
      g.fillStyle = fill;
      g.fill();
    };

    /* ---- CD tower (poster coords via tower svg scale 280/300) ---- */
    const tX = (x) => 36 + x * 0.93333;
    const tY = (y) => 76 + y * 0.93333;

    let grad = g.createLinearGradient(tX(60), 0, tX(100), 0);
    grad.addColorStop(0, "#464646");
    grad.addColorStop(1, "#181818");
    poly(
      [
        [tX(60), tY(46)],
        [tX(100), tY(70)],
        [tX(100), tY(690)],
        [tX(60), tY(666)],
      ],
      grad
    );
    for (let k = 0; k < 43; k++) {
      const y = 46 + k * 14.6;
      g.strokeStyle = k % 2 ? "#8a8a8a" : "#222222";
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(tX(60), tY(y));
      g.lineTo(tX(100), tY(y + 24));
      g.stroke();
    }
    poly(
      [
        [tX(100), tY(70)],
        [tX(60), tY(46)],
        [tX(230), tY(46)],
        [tX(270), tY(70)],
      ],
      "#4e4e4e"
    );
    grad = g.createLinearGradient(0, tY(70), 0, tY(690));
    grad.addColorStop(0, "#343434");
    grad.addColorStop(1, "#1a1a1a");
    g.fillStyle = grad;
    g.fillRect(tX(100), tY(70), 158.7, 578.7);

    for (let k = 0; k < 6; k++) {
      const cx = tX(185);
      const cy = tY(140 + k * 100);
      const r = 41;
      const rg = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      rg.addColorStop(0, "#101010");
      rg.addColorStop(0.3, "#9a9a9a");
      rg.addColorStop(0.4, "#4e4e4e");
      rg.addColorStop(0.72, "#c8c8c8");
      rg.addColorStop(0.95, "#dedede");
      rg.addColorStop(1, "#5a5a5a");
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.fillStyle = rg;
      g.fill();
      g.beginPath();
      g.arc(cx, cy, 13, 0, Math.PI * 2);
      g.fillStyle = "#060606";
      g.fill();
    }
    g.fillStyle = "#3a3a3a";
    g.fillRect(tX(112), tY(692), 26, 9.3);
    g.fillRect(tX(230), tY(692), 26, 9.3);

    /* ---- dot-trail field behind the coin ---- */
    for (let y = 180; y <= 630; y += 9) {
      for (let x = 380; x <= 990; x += 13) {
        const dx = (x - 690) / 310;
        const dy = (y - 405) / 235;
        const d2 = dx * dx + dy * dy;
        if (d2 > 1) continue;
        const ix = (x - 660) / 208;
        const iy = (y - 410) / 262;
        if (ix * ix + iy * iy < 1) continue;
        const b = 1 - d2;
        const lum = Math.round(46 + 168 * b * (0.55 + 0.45 * hash2(x, y)));
        g.fillStyle = `rgb(${lum},${lum},${lum})`;
        g.fillRect(x, y, 7.5, 1.8);
      }
    }

    /* ---- oscilloscope chassis (1:1 with scope svg at offset 1010,78) ---- */
    const sX = (x) => 1010 + x;
    const sY = (y) => 78 + y;
    grad = g.createLinearGradient(0, sY(4), 0, sY(396));
    grad.addColorStop(0, "#454545");
    grad.addColorStop(0.5, "#2e2e2e");
    grad.addColorStop(1, "#1c1c1c");
    g.beginPath();
    g.roundRect(sX(4), sY(4), 552, 392, 14);
    g.fillStyle = grad;
    g.fill();
    // bezel + screen
    g.beginPath();
    g.roundRect(sX(26), sY(42), 330, 290, 10);
    g.fillStyle = "#242424";
    g.fill();
    const srg = g.createRadialGradient(sX(191), sY(187), 30, sX(191), sY(187), 220);
    srg.addColorStop(0, "#101010");
    srg.addColorStop(1, "#040404");
    g.fillStyle = srg;
    g.fillRect(sX(42), sY(58), 298, 258);
    // panel divider shadow
    g.fillStyle = "#171717";
    g.fillRect(sX(366), sY(16), 4, 368);
    // knobs as shaded spheres
    [
      [418, 140, 16],
      [506, 140, 16],
      [462, 292, 20],
      [232, 372, 11],
    ].forEach(([kx, ky, kr]) => {
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
    g.fillRect(sX(60), sY(398), 60, 12);
    g.fillRect(sX(440), sY(398), 60, 12);

    /* ---- pills (scale 250/240 at offset 400,810) ---- */
    const ps = 1.04167;
    const pX = (x) => 400 + x * ps;
    const pY = (y) => 810 + y * ps;
    const tablet = (cx, cy, rx, ry, depth) => {
      const RX = rx * ps;
      const RY = ry * ps;
      const D = depth * ps;
      grad = g.createLinearGradient(0, pY(cy), 0, pY(cy) + D + RY);
      grad.addColorStop(0, "#8e8e8e");
      grad.addColorStop(1, "#222222");
      g.beginPath();
      g.ellipse(pX(cx), pY(cy) + D, RX, RY, 0, 0, Math.PI);
      g.lineTo(pX(cx) - RX, pY(cy));
      g.ellipse(pX(cx), pY(cy), RX, RY, 0, Math.PI, 0, true);
      g.closePath();
      g.fillStyle = grad;
      g.fill();
      const tg = g.createRadialGradient(pX(cx) - RX / 3, pY(cy) - RY / 2, 1, pX(cx), pY(cy), RX);
      tg.addColorStop(0, "#dcdcdc");
      tg.addColorStop(1, "#6a6a6a");
      g.beginPath();
      g.ellipse(pX(cx), pY(cy), RX, RY, 0, 0, Math.PI * 2);
      g.fillStyle = tg;
      g.fill();
    };
    tablet(50, 44, 24, 10, 14);
    tablet(104, 76, 20, 8, 12);
    tablet(46, 92, 17, 7, 10);
    tablet(88, 108, 14, 6, 8);
    // capsule
    g.save();
    g.translate(pX(178), pY(62));
    g.rotate((-28 * Math.PI) / 180);
    grad = g.createLinearGradient(-33 * ps, 0, 33 * ps, 0);
    grad.addColorStop(0, "#d2d2d2");
    grad.addColorStop(0.5, "#8a8a8a");
    grad.addColorStop(0.5001, "#5e5e5e");
    grad.addColorStop(1, "#1e1e1e");
    g.beginPath();
    g.roundRect(-33 * ps, -14 * ps, 66 * ps, 28 * ps, 14 * ps);
    g.fillStyle = grad;
    g.fill();
    g.restore();

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

/* ================= CD TOWER ================= */
// Minimal album marks, one per disc, drawn in dark "negative" ink over the
// bright halftone disc face — engraved-print style.
function AlbumMark({ k, cx, cy }) {
  switch (ALBUMS[k].key) {
    case "deftones": // Diamond Eyes — white diamond
      return (
        <g className="albumMark">
          <path d={`M ${cx},${cy - 19} L ${cx + 15},${cy} L ${cx},${cy + 19} L ${cx - 15},${cy} Z`} />
          <line x1={cx - 15} y1={cy} x2={cx + 15} y2={cy} />
          <line x1={cx - 7} y1={cy - 9} x2={cx + 7} y2={cy - 9} />
        </g>
      );
    case "acdc": // high-voltage bolt
      return (
        <g className="albumMark filled">
          <polygon
            points={`${cx - 1},${cy - 21} ${cx + 9},${cy - 21} ${cx + 2},${cy - 5} ${cx + 11},${cy - 5} ${cx - 7},${cy + 21} ${cx - 2},${cy + 1} ${cx - 11},${cy + 1}`}
          />
        </g>
      );
    case "aphex": // the curled A
      return (
        <g className="albumMark">
          <path
            d={`M ${cx - 15},${cy + 13} Q ${cx - 19},${cy - 15} ${cx},${cy - 17} Q ${cx + 19},${cy - 15} ${cx + 15},${cy + 13}`}
          />
          <path d={`M ${cx - 9},${cy + 2} Q ${cx},${cy - 7} ${cx + 9},${cy + 2} Q ${cx + 2},${cy + 9} ${cx - 3},${cy + 3}`} />
        </g>
      );
    case "acid": // acid house smiley
      return (
        <g className="albumMark">
          <circle cx={cx} cy={cy} r="17" />
          <circle cx={cx - 6} cy={cy - 5} r="2" className="markDot" />
          <circle cx={cx + 6} cy={cy - 5} r="2" className="markDot" />
          <path d={`M ${cx - 9},${cy + 4} A 10,10 0 0 0 ${cx + 9},${cy + 4}`} />
        </g>
      );
    case "floyd": // the prism
      return (
        <g className="albumMark">
          <path d={`M ${cx},${cy - 17} L ${cx + 17},${cy + 12} L ${cx - 17},${cy + 12} Z`} />
          <line x1={cx - 28} y1={cy + 2} x2={cx - 7} y2={cy - 2} />
          <line x1={cx + 6} y1={cy} x2={cx + 28} y2={cy - 8} />
          <line x1={cx + 6} y1={cy + 2} x2={cx + 28} y2={cy + 1} />
          <line x1={cx + 6} y1={cy + 4} x2={cx + 28} y2={cy + 10} />
        </g>
      );
    default: // lcd — disco ball
      return (
        <g className="albumMark">
          <circle cx={cx} cy={cy} r="17" />
          <line x1={cx - 15} y1={cy - 8} x2={cx + 15} y2={cy - 8} />
          <line x1={cx - 17} y1={cy} x2={cx + 17} y2={cy} />
          <line x1={cx - 15} y1={cy + 8} x2={cx + 15} y2={cy + 8} />
          <ellipse cx={cx} cy={cy} rx="7" ry="17" />
          <ellipse cx={cx} cy={cy} rx="13" ry="17" />
        </g>
      );
  }
}

function TowerSVG({ active, haunt }) {
  const fins = [];
  for (let k = 0; k < 43; k++) {
    const y = 46 + k * 14.6;
    fins.push(<line key={k} x1="62" y1={y} x2="98" y2={y + 24} />);
  }
  return (
    <svg className="towerSvg" viewBox="0 0 300 720">
      {/* glass panel behind the disc strip, BeoSound-style */}
      <rect x="88" y="44" width="204" height="656" rx="12" className="glassPanel" />
      {[[96, 54], [284, 54], [96, 690], [284, 690]].map(([sx, sy]) => (
        <circle key={sx + "-" + sy} cx={sx} cy={sy} r="2" className="glassScrew" />
      ))}
      {/* side face + fins */}
      <polygon points="100,70 60,46 60,666 100,690" className="towerFace" />
      <g className="towerFins">{fins}</g>
      {/* top face */}
      <polygon points="100,70 60,46 230,46 270,70" className="towerFace" />
      {/* front face */}
      <rect x="100" y="70" width="170" height="620" className="towerFace" />
      {/* status LEDs */}
      <circle cx="110" cy="296" r="2.4" className="ledDot" />
      <circle cx="110" cy="308" r="2.4" className="ledDot" />
      {/* discs — tone from the halftoned scene canvas; each is a link */}
      {DISCS.map((_, k) => {
        const cy = 140 + k * 100;
        const isActive = k === active;
        return (
          <a
            key={k}
            href={ALBUMS[k].url}
            target="_blank"
            rel="noopener noreferrer"
            {...(haunt ? haunt() : {})}
          >
            <g className={isActive ? "towerDisc active" : "towerDisc"}>
              <circle cx="185" cy={cy} r="44" className="discOuter" />
              <AlbumMark k={k} cx={185} cy={cy} />
              <circle cx="185" cy={cy} r="11" className="discHubRing" />
              <circle cx="185" cy={cy} r="3.2" className="discHubDot" />
              {isActive && (
                <path
                  d={`M ${185 + 47 * Math.cos(-1.1)},${cy + 47 * Math.sin(-1.1)} A 47,47 0 0 1 ${185 + 47 * Math.cos(-0.2)},${cy + 47 * Math.sin(-0.2)}`}
                  className="readerArc"
                />
              )}
              <text x="240" y={cy + 3} className="discLabel">
                {String(k + 1).padStart(2, "0")}
              </text>
            </g>
          </a>
        );
      })}
      {/* feet + vents */}
      <rect x="112" y="692" width="28" height="10" className="towerFace" />
      <rect x="230" y="692" width="28" height="10" className="towerFace" />
      {[0, 1, 2, 3, 4, 5, 6].map((k) => (
        <line key={k} x1={118 + k * 20} y1="676" x2={128 + k * 20} y2="676" className="towerVent" />
      ))}
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
        x1={cx + Math.cos(a) * (r + 3)}
        y1={cy + Math.sin(a) * (r + 3)}
        x2={cx + Math.cos(a) * (r + 7)}
        y2={cy + Math.sin(a) * (r + 7)}
      />
    );
  }
  const pa = ((angle - 90) * Math.PI) / 180;
  return (
    <g className="knob">
      <circle cx={cx} cy={cy} r={r} />
      <line x1={cx} y1={cy} x2={cx + Math.cos(pa) * r * 0.85} y2={cy + Math.sin(pa) * r * 0.85} className="knobPointer" />
      {ticks}
    </g>
  );
}

function ScopeSVG({ traceD, playing, vpp, vrms, freq, title }) {
  return (
    <svg className={`scopeSvg${playing ? " playing" : ""}`} viewBox="0 0 560 420">
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
      <text x="300" y="76" className={playing ? "scopeTextRed" : "scopeText"}>{playing ? "RUN" : "STOP"}</text>
      <text x="52" y="290" className={playing ? "scopeTitle live" : "scopeTitle"}>
        {playing ? "▶ " : "■ "}
        {title}
      </text>
      <text x="52" y="306" className="scopeText">
        Vpp {vpp}  Vrms {vrms}  Freq {freq}
      </text>
      {/* trace */}
      <path d={traceD} className="scopeTraceGlow" />
      <path d={traceD} className="scopeTrace" />

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

      <text x="462" y="248" textAnchor="middle" className="scopeLabel">HORIZONTAL</text>
      <text x="462" y="262" textAnchor="middle" className="scopeTiny">TIME/DIV</text>
      <Knob cx={462} cy={292} r={20} angle={70} />
      <text x="424" y="286" textAnchor="middle" className="scopeTiny">.5</text>
      <text x="432" y="272" textAnchor="middle" className="scopeTiny">1</text>
      <text x="497" y="272" textAnchor="middle" className="scopeTiny">3</text>
      <text x="502" y="288" textAnchor="middle" className="scopeTiny">5</text>
      <text x="424" y="322" textAnchor="middle" className="scopeTiny">ms</text>
      <text x="500" y="322" textAnchor="middle" className="scopeTiny">µs</text>

      <text x="500" y="368" className="scopeLabel">POWER</text>
      <circle cx="546" cy="364" r="4" className={playing ? "scopeLed on" : "scopeLed"} />

      {/* bottom strip */}
      <text x="60" y="352" className="scopeTiny">TRIGGER</text>
      <text x="60" y="362" className="scopeTiny">SOURCE</text>
      <text x="112" y="357" className="scopeTiny">CH1</text>
      <text x="138" y="357" className="scopeTiny">CH2</text>
      <text x="164" y="357" className="scopeTiny">LINE</text>
      <rect x="108" y="348" width="22" height="11" className={playing ? "scopeBtn on" : "scopeBtn"} />
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

/* ================= EVIDENCE TAG ================= */
function EvidenceTag() {
  // torn-edge polygon, computed zigzag
  const pts = [];
  for (let x = 0; x <= 180; x += 12) pts.push(`${x},${x % 24 === 0 ? 0 : 4}`);
  for (let y = 0; y <= 140; y += 12) pts.push(`${y % 24 === 0 ? 180 : 176},${y}`);
  for (let x = 180; x >= 0; x -= 12) pts.push(`${x},${x % 24 === 0 ? 140 : 136}`);
  for (let y = 140; y >= 0; y -= 12) pts.push(`${y % 24 === 0 ? 0 : 4},${y}`);
  return (
    <svg className="evidenceSvg" viewBox="-4 -4 188 148">
      <polygon points={pts.join(" ")} className="tornEdge" />
      <rect x="14" y="14" width="152" height="112" className="dashedBox" />
      <text x="90" y="46" textAnchor="middle" className="tagTitle">&#9668;EVIDENCE&#9658;</text>
      <text x="60" y="72" className="tagHatch">///////</text>
      <line x1="26" y1="88" x2="120" y2="88" className="tagLine" />
      <line x1="26" y1="98" x2="100" y2="98" className="tagLine" />
      <line x1="26" y1="108" x2="112" y2="108" className="tagLine" />
      <polygon points="146,112 138,98 154,98" className="tagWarn" />
      <text x="146" y="110" textAnchor="middle" className="tagWarnMark">!</text>
    </svg>
  );
}

/* ================= EUPHORIA TICKET ================= */
function EuphoriaTicket() {
  return (
    <svg className="ticketSvg" viewBox="0 0 180 220">
      <rect x="4" y="4" width="172" height="212" className="tornEdge" />
      <rect x="12" y="12" width="156" height="196" className="dashedBox" />
      <path id="euphArc" d="M 24,74 A 82,82 0 0 1 156,74" fill="none" />
      <text className="ticketArc">
        <textPath href="#euphArc" startOffset="50%" textAnchor="middle">
          EUPHORIA
        </textPath>
      </text>
      <circle cx="122" cy="128" r="26" className="smiley" />
      <circle cx="113" cy="121" r="2.6" className="smileyDot" />
      <circle cx="131" cy="121" r="2.6" className="smileyDot" />
      <path d="M 110,136 A 15,15 0 0 0 134,136" className="smileyMouth" />
      <line x1="24" y1="130" x2="80" y2="130" className="tagLine" />
      <line x1="24" y1="142" x2="72" y2="142" className="tagLine" />
      <line x1="24" y1="154" x2="80" y2="154" className="tagLine" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((k) => (
        <rect key={k} x={24 + k * 11} y="176" width={k % 3 === 0 ? 6 : 3} height="20" className="barcode" />
      ))}
    </svg>
  );
}

/* ================= CHEM DIAGRAM ================= */
function ChemDiagram() {
  // fused bicyclic drawn from exact hexagon vertices
  const hex = (cx, cy, r, rot = 0) => {
    const v = [];
    for (let k = 0; k < 6; k++) {
      const a = ((60 * k + rot) * Math.PI) / 180;
      v.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return v;
  };
  const A = hex(62, 76, 30, 0);
  const B = hex(114, 106, 30, 0);
  const edge = (v, i, j, cls = "chemBond") => (
    <line key={cls + i + "-" + j} x1={v[i][0]} y1={v[i][1]} x2={v[j][0]} y2={v[j][1]} className={cls} />
  );
  const inner = (v, i, j) => {
    const mx = (v[i][0] + v[j][0]) / 2;
    const my = (v[i][1] + v[j][1]) / 2;
    const cxm = v.reduce((s, p) => s + p[0], 0) / 6;
    const cym = v.reduce((s, p) => s + p[1], 0) / 6;
    const f = 0.72;
    return (
      <line
        key={"in" + i + j + cxm}
        x1={cxm + (v[i][0] - cxm) * f}
        y1={cym + (v[i][1] - cym) * f}
        x2={cxm + (v[j][0] - cxm) * f}
        y2={cym + (v[j][1] - cym) * f}
        className="chemBond"
      />
    );
  };
  return (
    <svg className="chemSvg" viewBox="-26 0 250 180">
      {[0, 1, 2, 3, 4, 5].map((k) => edge(A, k, (k + 1) % 6))}
      {[inner(A, 0, 1), inner(A, 2, 3), inner(A, 4, 5)]}
      {[0, 1, 2, 3, 4, 5].map((k) => edge(B, k, (k + 1) % 6, "chemBond b"))}
      {/* substituents */}
      <line x1={A[3][0]} y1={A[3][1]} x2={A[3][0] - 22} y2={A[3][1] - 12} className="chemBond" />
      <text x={A[3][0] - 42} y={A[3][1] - 10} className="chemLabel">H3C</text>
      <line x1={B[5][0]} y1={B[5][1]} x2={B[5][0] + 16} y2={B[5][1] - 22} className="chemBond" />
      <text x={B[5][0] + 20} y={B[5][1] - 26} className="chemLabel">CH3</text>
      <line x1={B[0][0]} y1={B[0][1]} x2={B[0][0] + 24} y2={B[0][1]} className="chemBond" />
      <text x={B[0][0] + 28} y={B[0][1] + 4} className="chemLabel">N&#8211;CH3</text>
      <text x={B[1][0] - 4} y={B[1][1] + 14} className="chemLabel">N</text>
    </svg>
  );
}

/* ================= PILLS CLUSTER ================= */
function PillsCluster() {
  const tablet = (cx, cy, rx, ry, depth, key) => (
    <g key={key} className="pillTablet">
      <path d={`M ${cx - rx},${cy} a ${rx},${ry} 0 0 0 ${rx * 2},0 l 0,${depth} a ${rx},${ry} 0 0 1 ${-rx * 2},0 Z`} className="tabletSide" />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} className="tabletTop" />
      <line x1={cx - rx * 0.6} y1={cy} x2={cx + rx * 0.6} y2={cy} className="tabletScore" />
    </g>
  );
  return (
    <svg className="pillsSvg" viewBox="0 0 240 130">
      {tablet(50, 44, 24, 10, 14, "t1")}
      {tablet(104, 76, 20, 8, 12, "t2")}
      {tablet(46, 92, 17, 7, 10, "t3")}
      {tablet(88, 108, 14, 6, 8, "t4")}
      {/* capsule */}
      <g transform="rotate(-28 178 62)">
        <rect x="146" y="48" width="64" height="28" rx="14" className="capsuleBody" />
        <path d="M 178,48 l 0,28" className="capsuleSeam" />
        <rect x="178" y="48" width="32" height="28" rx="14" className="capsuleHalf" />
      </g>
    </svg>
  );
}

/* ================= ARCHIVE RECALL ================= */
function ArchiveRecall() {
  return (
    <div className="recallWrap">
      <div className="recallLabel">[ ARCHIVE RECALL ]</div>
      <svg viewBox="0 0 20 44" className="recallArrowSvg">
        <line x1="10" y1="0" x2="10" y2="34" strokeDasharray="3 4" />
        <polyline points="4,32 10,42 16,32" fill="none" />
      </svg>
      <div className="recallSeal">
        <span>E</span>
      </div>
    </div>
  );
}

/* ================= PAGE ================= */
export default function Home() {
  const [entered, setEntered] = useState(false);
  const [muted, setMuted] = useState(false);
  const [activeSlot, setActiveSlot] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [wavePhase, setWavePhase] = useState(0);
  const [trackTitle, setTrackTitle] = useState("");
  const [mediaTime, setMediaTime] = useState(0);
  const [vidHash, setVidHash] = useState(1);
  const [hauntTip, setHauntTip] = useState(null);

  const playerRef = useRef(null);
  const apiReadyRef = useRef(false);
  const pendingEnterRef = useRef(false);
  const idleCounterRef = useRef(0);

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

  useEffect(() => {
    if (document.getElementById("yt-iframe-api")) {
      apiReadyRef.current = !!window.YT?.Player;
      return;
    }
    const tag = document.createElement("script");
    tag.id = "yt-iframe-api";
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => {
      apiReadyRef.current = true;
      if (pendingEnterRef.current) createPlayer();
    };
  }, []);

  useEffect(() => {
    if (!entered) return;
    const id = setInterval(() => {
      const p = playerRef.current;
      if (p && typeof p.getVideoData === "function") {
        const data = p.getVideoData();
        if (data && data.title) setTrackTitle(data.title);
        if (data && data.video_id) {
          let h = 0;
          for (const ch of data.video_id) h = (h * 31 + ch.charCodeAt(0)) | 0;
          setVidHash(Math.abs(h) || 1);
        }
      }
      if (p && typeof p.getPlaylistIndex === "function") {
        const idx = p.getPlaylistIndex();
        if (idx >= 0) {
          setActiveSlot(idx % SLOT_COUNT);
          return;
        }
        if (typeof p.getCurrentTime === "function") {
          const t = p.getCurrentTime() || 0;
          setActiveSlot(Math.floor(t / 20) % SLOT_COUNT);
          return;
        }
      }
      idleCounterRef.current = (idleCounterRef.current + 1) % SLOT_COUNT;
      setActiveSlot(idleCounterRef.current);
    }, 1500);
    return () => clearInterval(id);
  }, [entered]);

  useEffect(() => {
    if (!entered) return;
    const id = setInterval(() => {
      setWavePhase((p) => p + 1);
      const pl = playerRef.current;
      if (pl && typeof pl.getCurrentTime === "function") {
        const t = pl.getCurrentTime();
        if (typeof t === "number" && !Number.isNaN(t)) setMediaTime(t);
      }
    }, 90);
    return () => clearInterval(id);
  }, [entered]);

  function createPlayer() {
    const ids = parseYouTube(YT_URL);
    if (!ids || !window.YT?.Player) return;
    const playerVars = {
      autoplay: 1,
      mute: 0,
      controls: 0,
      playsinline: 1,
      modestbranding: 1,
      rel: 0,
    };
    const config = {
      playerVars,
      events: {
        onReady: (e) => {
          e.target.playVideo();
          setPlaying(true);
        },
        onStateChange: (e) => {
          if (!window.YT) return;
          if (e.data === window.YT.PlayerState.PLAYING) setPlaying(true);
          if (e.data === window.YT.PlayerState.PAUSED) setPlaying(false);
        },
      },
    };
    config.events.onError = () => {
      // bad/expired playlist id — fall back to just the video
      if (ids.listId && ids.videoId) {
        try {
          playerRef.current?.destroy();
        } catch {}
        const mount = document.getElementById("yt-player-mount-outer");
        const inner = document.createElement("div");
        inner.id = "yt-player-mount";
        mount.replaceChildren(inner);
        playerRef.current = new window.YT.Player("yt-player-mount", {
          videoId: ids.videoId,
          playerVars: { ...playerVars, loop: 1, playlist: ids.videoId },
          events: {
            onReady: (e) => {
              e.target.playVideo();
              setPlaying(true);
            },
            onStateChange: config.events.onStateChange,
          },
        });
      }
    };
    if (ids.listId) {
      config.playerVars.listType = "playlist";
      config.playerVars.list = ids.listId;
      if (ids.videoId) config.videoId = ids.videoId;
    } else if (ids.videoId) {
      config.videoId = ids.videoId;
      config.playerVars.loop = 1;
      config.playerVars.playlist = ids.videoId;
    }
    playerRef.current = new window.YT.Player("yt-player-mount", config);
  }

  function enter() {
    if (entered) return;
    setEntered(true);
    if (apiReadyRef.current) createPlayer();
    else pendingEnterRef.current = true;
  }

  function toggleMute() {
    const p = playerRef.current;
    if (!p || typeof p.isMuted !== "function") return;
    if (p.isMuted()) {
      p.unMute();
      setMuted(false);
    } else {
      p.mute();
      setMuted(true);
    }
  }

  // Scope trace, locked to real playback. YouTube's iframe exposes no raw
  // audio samples cross-origin, so the wave is synthesized FROM the player's
  // actual clock and track id: phase = getCurrentTime(), so it freezes on
  // pause and jumps on seek, and the energy envelope + spike heights are
  // hashed per (track, moment) — every song gets its own evolving shape.
  const N = 140;
  const p = playing ? mediaTime * 3.4 : wavePhase * 0.08;
  const segF = mediaTime * 1.8;
  const segI = Math.floor(segF);
  const eA = hash2(vidHash, segI);
  const eB = hash2(vidHash, segI + 1);
  const energy = playing ? 0.3 + 0.7 * (eA + (eB - eA) * (segF - segI)) : 0.15;
  let traceD = "";
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const seg = Math.floor(t * 14 + p * 1.1);
    const hvar = 0.35 + 0.65 * hash2(seg + (vidHash % 997), 7);
    const spike = Math.pow(Math.abs(Math.sin(t * Math.PI * 7 + p)), 8) * 92 * hvar;
    const ripple = Math.sin(t * 46 + p * 1.6) * 4 + Math.sin(t * 13 + p * 0.7) * 5;
    const y = 260 - (spike + ripple) * energy;
    const x = 42 + t * 298;
    traceD += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)} `;
  }
  const vpp = playing ? (2.04 * energy + 0.4).toFixed(2) + "V" : "--.-";
  const vrms = playing ? (0.72 * energy + 0.14).toFixed(2) + "V" : "--.-";
  const freq = playing ? (98.3 + Math.sin(p * 0.7) * 1.2).toFixed(1) + "Hz" : "--.-";

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
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id="grainFilter">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch" result="noise" seed="7">
              <animate attributeName="seed" values="1;9;3;14;6;20;2" dur="1.4s" repeatCount="indefinite" />
            </feTurbulence>
            <feColorMatrix in="noise" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.07 0" />
          </filter>
        </defs>
      </svg>

      <div className="gate" onClick={enter}>
        <div className="gateGlyph">&#9678;</div>
        <div className="gateText">click to enter</div>
      </div>

      <div className="posterViewport">
        <div className="poster">
          <div className="pageFrame" />
          <div className="stain stA" />
          <div className="stain stB" />
          <div className="stain stC" />
          <div className="stain stD" />

          <div {...haunt("siteTitle")}>refoldered.com_</div>

          <SceneCanvas />

          <div className="towerWrap">
            <TowerSVG active={activeSlot} haunt={haunt} />
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
              traceD={traceD}
              playing={playing}
              vpp={vpp}
              vrms={vrms}
              freq={freq}
              title={titleShown}
            />
          </div>

          <div {...haunt("recallPos")}>
            <ArchiveRecall />
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

          <div {...haunt("pillsPos")}>
            <PillsCluster />
          </div>

          <div {...haunt("evidencePos")}>
            <EvidenceTag />
          </div>

          <div {...haunt("ticketPos")}>
            <EuphoriaTicket />
          </div>

          <div {...haunt("chemPos")}>
            <ChemDiagram />
          </div>
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

      <div className="grain" />

      <button className="soundToggle" onClick={toggleMute}>
        {muted ? "unmute" : "mute"}
      </button>
      <div className="audioMount" id="yt-player-mount-outer">
        <div id="yt-player-mount" />
      </div>
    </div>
  );
}
