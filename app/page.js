"use client";

import { useEffect, useRef, useState } from "react";

// Paste the YouTube video or playlist URL here.
const YT_URL = "PLACEHOLDER_YOUTUBE_URL";

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
    const W = 380;
    const H = 460;
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
    const R = 168;

    function withDisc(c, mirror, xscale, fn) {
      c.save();
      c.translate(cx, cy);
      c.scale(mirror ? -xscale : xscale, 1);
      fn(c);
      c.restore();
    }

    // ---- Mercedes face: wide stippled band, black core, thin star ----
    const M_OUT = R * 0.99;
    const M_RING2 = R * 0.9;
    const M_IN = R * 0.66;

    function mercMask(c, mirror, xscale) {
      withDisc(c, mirror, xscale, (g) => {
        g.beginPath();
        g.arc(0, 0, M_OUT, 0, Math.PI * 2);
        g.arc(0, 0, M_IN, 0, Math.PI * 2, true);
        g.fillStyle = "#ffffff";
        g.fill("evenodd");
      });
    }

    function mercForeground(c, mirror, xscale) {
      withDisc(c, mirror, xscale, (g) => {
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

    function bmwMask(c, mirror, xscale) {
      withDisc(c, mirror, xscale, (g) => {
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

    function bmwForeground(c, mirror, xscale) {
      withDisc(c, mirror, xscale, (g) => {
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
      c.translate(cx, cy);
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

      const xscale = Math.max(0.04, Math.abs(Math.cos(theta)));
      const front = Math.cos(theta) >= 0;
      const mirror = !front;

      ctx.clearRect(0, 0, W, H);
      octx.clearRect(0, 0, W, H);

      if (front) {
        mercMask(octx, mirror, xscale);
        halftoneConvert();
        mercForeground(ctx, mirror, xscale);
      } else {
        bmwMask(octx, mirror, xscale);
        halftoneConvert();
        bmwForeground(ctx, mirror, xscale);
      }
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} className="pillCanvas" />;
}

/* ================= DOT-TRAIL FIELD ================= */
function StreakField() {
  let d = "";
  const CW = 560;
  const CH = 440;
  const cx = CW / 2;
  const cy = CH / 2;
  for (let i = 0; i < 56; i++) {
    for (let j = 0; j < 44; j++) {
      const x = i * 10 + 5;
      const y = j * 10 + 5;
      const nx = (x - cx) / (CW / 2);
      const ny = (y - cy) / (CH / 2);
      const r2 = nx * nx + ny * ny;
      if (r2 > 1) continue;
      const h = hash2(i, j);
      if (h < r2 * 0.85) continue;
      d += `M${x},${y}h0.01`;
    }
  }
  return (
    <svg className="streakField" viewBox="0 0 560 440" aria-hidden="true">
      <path d={d} strokeLinecap="round" />
    </svg>
  );
}

/* ================= CD TOWER ================= */
function TowerSVG({ active }) {
  const fins = [];
  for (let k = 0; k < 43; k++) {
    const y = 46 + k * 14.6;
    fins.push(<line key={k} x1="62" y1={y} x2="98" y2={y + 24} />);
  }
  const sheenAngles = [40, 160, 280];
  return (
    <svg className="towerSvg" viewBox="0 0 300 720">
      {/* side face + fins */}
      <polygon points="100,70 60,46 60,666 100,690" className="towerFace" />
      <g className="towerFins">{fins}</g>
      {/* top face */}
      <polygon points="100,70 60,46 230,46 270,70" className="towerFace" />
      {/* front face */}
      <rect x="100" y="70" width="170" height="620" className="towerFace" />
      {/* discs */}
      {DISCS.map((_, k) => {
        const cy = 140 + k * 100;
        const isActive = k === active;
        return (
          <g key={k} className={isActive ? "towerDisc active" : "towerDisc"}>
            <circle cx="185" cy={cy} r="44" className="discOuter" />
            <circle cx="185" cy={cy} r="44" className="discFill" />
            {sheenAngles.map((deg) => {
              const a = (deg * Math.PI) / 180;
              return (
                <line
                  key={deg}
                  x1={185 + Math.cos(a) * 18}
                  y1={cy + Math.sin(a) * 18}
                  x2={185 + Math.cos(a) * 41}
                  y2={cy + Math.sin(a) * 41}
                  className="discSheen"
                />
              );
            })}
            <circle cx="185" cy={cy} r="15" className="discHubRing" />
            <circle cx="185" cy={cy} r="3.2" className="discHubDot" />
            <text x="240" y={cy + 3} className="discLabel">
              {String(k + 1).padStart(2, "0")}
            </text>
          </g>
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

function ScopeSVG({ traceD, playing, vpp, vrms, freq }) {
  return (
    <svg className="scopeSvg" viewBox="0 0 560 420">
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
      if (p && typeof p.getPlaylistIndex === "function") {
        const idx = p.getPlaylistIndex();
        if (idx >= 0) {
          setActiveSlot(idx % SLOT_COUNT);
          setPlaying(true);
          return;
        }
        if (typeof p.getCurrentTime === "function") {
          const t = p.getCurrentTime() || 0;
          setActiveSlot(Math.floor(t / 20) % SLOT_COUNT);
          setPlaying(true);
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
    const id = setInterval(() => setWavePhase((p) => p + 1), 140);
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
    if (ids.listId) {
      config.playerVars.listType = "playlist";
      config.playerVars.list = ids.listId;
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

  // scope trace: periodic sharp spikes + ripple, like the reference CRT
  const N = 140;
  const p = wavePhase * (playing ? 0.5 : 0.08);
  let traceD = "";
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const spike = Math.pow(Math.abs(Math.sin(t * Math.PI * 7 + p)), 10) * 96;
    const ripple = Math.sin(t * 46 + p * 1.6) * 5 + Math.sin(t * 13 + p * 0.7) * 6;
    const amp = playing ? 1 : 0.18;
    const y = 260 - spike * amp - ripple * amp;
    const x = 42 + t * 298;
    traceD += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)} `;
  }
  const vpp = playing ? (2.04 + Math.sin(p) * 0.08).toFixed(2) + "V" : "--.-";
  const vrms = playing ? (0.72 + Math.sin(p * 1.3) * 0.03).toFixed(2) + "V" : "--.-";
  const freq = playing ? (98.3 + Math.sin(p * 0.7) * 1.2).toFixed(1) + "Hz" : "--.-";

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
          <pattern id="towerDots" width="4" height="4" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.7" fill="rgba(232,230,222,0.8)" />
          </pattern>
          <pattern id="pillDots" width="3.4" height="3.4" patternUnits="userSpaceOnUse">
            <circle cx="0.9" cy="0.9" r="0.65" fill="rgba(232,230,222,0.85)" />
          </pattern>
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

          <div className="siteTitle">refoldered.com_</div>

          <div className="towerWrap">
            <TowerSVG active={activeSlot} />
          </div>

          <div className="flipLabel">[&nbsp;&nbsp;FLIP TO REMEMBER&nbsp;&nbsp;&nbsp;]</div>

          <div className="streakWrap">
            <StreakField />
          </div>
          <div className="coinWrap">
            <PillCanvas />
          </div>

          <div className="wordList">
            <div>ECSTASY</div>
            <div>EUPHORIA</div>
            <div>HISTORY</div>
            <div className="wordDots">...</div>
          </div>

          <div className="scopeWrap">
            <ScopeSVG traceD={traceD} playing={playing} vpp={vpp} vrms={vrms} freq={freq} />
          </div>

          <div className="recallPos">
            <ArchiveRecall />
          </div>

          <div className="holdingWrap">
            <div className="holdingLabel">[&nbsp;&nbsp;HOLDING PATTERN&nbsp;&nbsp;]</div>
            <div className="holdingTrack">
              <div className="holdingDots" />
              <div
                className="holdingMarker"
                style={{ left: `${(activeSlot / (SLOT_COUNT - 1)) * 100}%` }}
              />
            </div>
          </div>

          <div className="pillsPos">
            <PillsCluster />
          </div>

          <div className="evidencePos">
            <EvidenceTag />
          </div>

          <div className="ticketPos">
            <EuphoriaTicket />
          </div>

          <div className="chemPos">
            <ChemDiagram />
          </div>
        </div>
      </div>

      <div className="grain" />

      <button className="soundToggle" onClick={toggleMute}>
        {muted ? "unmute" : "mute"}
      </button>
      <div className="audioMount">
        <div id="yt-player-mount" />
      </div>
    </div>
  );
}
