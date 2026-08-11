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

const PILL_CAPTIONS = [
  "stamped in the likeness of speed",
  "euphoria, branded and unregulated",
  "a logo pressed into the tongue",
  "the counterfeit sacrament",
  "data_fragment : history_03",
  "bliss, imitation, repeat",
];

function CdIcon({ active }) {
  return (
    <svg viewBox="0 0 40 40" className={`cdIcon${active ? " active" : ""}`}>
      <circle cx="20" cy="20" r="17" />
      <circle cx="20" cy="20" r="6" />
      <circle cx="20" cy="20" r="1.4" fill="currentColor" stroke="none" />
      <line x1="20" y1="1" x2="20" y2="6" />
      <line x1="20" y1="34" x2="20" y2="39" />
      <line x1="1" y1="20" x2="6" y2="20" />
      <line x1="34" y1="20" x2="39" y2="20" />
    </svg>
  );
}

export default function Home() {
  const [entered, setEntered] = useState(false);
  const [muted, setMuted] = useState(false);
  const [activeSlot, setActiveSlot] = useState(0);
  const [readout, setReadout] = useState("NO SIGNAL");
  const [playing, setPlaying] = useState(false);
  const [capIdx, setCapIdx] = useState(0);
  const [wavePhase, setWavePhase] = useState(0);

  const playerRef = useRef(null);
  const apiReadyRef = useRef(false);
  const pendingEnterRef = useRef(false);
  const idleCounterRef = useRef(0);

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
          setReadout(`DISC ${idx + 1} // TRACK ${String(idx + 1).padStart(2, "0")}`);
          setPlaying(true);
          return;
        }
        if (typeof p.getCurrentTime === "function") {
          const t = p.getCurrentTime() || 0;
          setActiveSlot(Math.floor(t / 20) % SLOT_COUNT);
          setReadout("DISC 1 // TRACK 01");
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
    const id = setInterval(() => {
      setCapIdx((i) => (i + 1) % PILL_CAPTIONS.length);
    }, 5500);
    return () => clearInterval(id);
  }, [entered]);

  useEffect(() => {
    if (!entered) return;
    const id = setInterval(() => {
      setWavePhase((p) => p + 1);
    }, 140);
    return () => clearInterval(id);
  }, [entered]);

  function createPlayer() {
    const ids = parseYouTube(YT_URL);
    if (!ids || !window.YT?.Player) {
      setReadout("NO SIGNAL");
      return;
    }
    setReadout("CONNECTING");

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
          setReadout("DISC 1 // TRACK 01");
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

  const caption = PILL_CAPTIONS[capIdx];

  const waveCols = 64;
  const waveHeight = 46;
  let waveD = "";
  for (let i = 0; i < waveCols; i++) {
    const t = i / waveCols;
    const p = wavePhase * (playing ? 0.35 : 0.06);
    const y =
      waveHeight / 2 +
      Math.sin(t * 22 + p) * 8 * (playing ? 1 : 0.15) +
      Math.sin(t * 55 + p * 1.7) * 4 * (playing ? 1 : 0.1) +
      Math.sin(t * 9 + p * 0.6) * 5 * (playing ? 1 : 0.2);
    const x = (i / (waveCols - 1)) * 200;
    waveD += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)} `;
  }

  return (
    <div className={`root${entered ? " entered" : ""}`}>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id="grainFilter">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves="2"
              stitchTiles="stitch"
              result="noise"
              seed="7"
            >
              <animate attributeName="seed" values="1;9;3;14;6;20;2" dur="1.4s" repeatCount="indefinite" />
            </feTurbulence>
            <feColorMatrix
              in="noise"
              type="matrix"
              values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.08 0"
            />
          </filter>
          <pattern id="dotsFine" width="3" height="3" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.5" fill="white" />
          </pattern>
          <pattern id="dotsMed" width="5" height="5" patternUnits="userSpaceOnUse">
            <circle cx="1.2" cy="1.2" r="0.9" fill="white" />
          </pattern>
          <pattern id="dotsCoarse" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="white" />
          </pattern>
        </defs>
      </svg>

      <div className="gate" onClick={enter}>
        <div className="gateGlyph">&#9678;</div>
        <div className="gateText">click to enter</div>
      </div>

      <div className="stage">
        <div className="stain st1" />
        <div className="stain st2" />
        <div className="stain st3" />
        <div className="stain st4" />

        <div className="topBar">
          <div className="topBarTitle">refoldered.com</div>
          <div className="topBarNav">
            [PROJECTS] [DATA_LOG] [HISTORY] [CONTACT]
          </div>
        </div>

        <div className="layout">
          <div className="leftCol">
            {DISCS.map((label, i) => (
              <div key={label} className={`discRow${i === activeSlot ? " active" : ""}`}>
                <CdIcon active={i === activeSlot} />
                <span>
                  [CD {i + 1}] {label}
                </span>
              </div>
            ))}
            <div className="discNote">
              [DISC NAVIGATION]
              <br />
              [ACTIVE: D{activeSlot + 1}/T{String(activeSlot + 1).padStart(2, "0")}]
            </div>
          </div>

          <div className="centerCol">
            <div className="bracketLabel">[ FLIP TO REMEMBER ]</div>

            <div className="pillWrap">
              <div className="pillStage">
                <div className="pillCoin">
                  <div className="pillFace pillFront">
                    <svg viewBox="0 0 100 140">
                      <ellipse cx="50" cy="70" rx="42" ry="64" fill="url(#dotsMed)" stroke="var(--ink)" strokeWidth="1.4" />
                      <circle cx="50" cy="70" r="30" fill="var(--black)" />
                      <g className="mercStar">
                        <line x1="50" y1="70" x2="50" y2="20" />
                        <line x1="50" y1="70" x2="79.4" y2="95" />
                        <line x1="50" y1="70" x2="20.6" y2="95" />
                      </g>
                      <circle cx="50" cy="70" r="30" fill="none" stroke="var(--ink)" strokeWidth="1" />
                    </svg>
                  </div>
                  <div className="pillFace pillBack">
                    <svg viewBox="0 0 100 140">
                      <ellipse cx="50" cy="70" rx="42" ry="64" fill="url(#dotsMed)" stroke="var(--ink)" strokeWidth="1.4" />
                      <circle cx="50" cy="70" r="30" fill="var(--black)" />
                      <path d="M50,70 L50,40 A30,30 0 0 1 80,70 Z" fill="white" />
                      <path d="M50,70 L80,70 A30,30 0 0 1 50,100 Z" fill="url(#dotsFine)" />
                      <path d="M50,70 L50,100 A30,30 0 0 1 20,70 Z" fill="white" />
                      <path d="M50,70 L20,70 A30,30 0 0 1 50,40 Z" fill="url(#dotsFine)" />
                      <circle cx="50" cy="70" r="30" fill="none" stroke="var(--ink)" strokeWidth="1" />
                    </svg>
                  </div>
                </div>
              </div>

              <svg className="orbitSvg" viewBox="0 0 240 320">
                <path id="arcTop" d="M 6,78 A 420,420 0 0 1 234,78" fill="none" />
                <text className="orbitText">
                  <textPath href="#arcTop" startOffset="50%" textAnchor="middle">
                    MEMORY RECALL // EUPHORIA PROTOCOL
                  </textPath>
                </text>
              </svg>
            </div>

            <div className="wordList">
              <span>ECSTASY</span>
              <span>EUPHORIA</span>
              <span>HISTORY</span>
              <span>...</span>
            </div>

            <div className="pillCaptionWrap" key={capIdx} style={{ "--w": `${caption.length}ch` }}>
              <span className="pillCaptionText">{caption}</span>
            </div>

            <div className="holdingRow">
              <div className="bracketLabel" style={{ marginBottom: 0 }}>
                [ HOLDING PATTERN ]
              </div>
              <div className="dotsTrack">
                {DISCS.map((_, i) => (
                  <span key={i} className={i === activeSlot ? "on" : ""} />
                ))}
              </div>
            </div>
          </div>

          <div className="rightCol">
            <div className="scopeDevice">
              <div className="scopeTopRow">
                <div>Ref.0032.B</div>
                <div>{playing ? "REC ●" : "STANDBY"}</div>
              </div>
              <div className="scopeScreenBox">
                <svg viewBox="0 0 200 46" preserveAspectRatio="none" className="scopeWaveSvg">
                  <path d={waveD} />
                </svg>
              </div>
              <div className="scopeKnobs">
                {DISCS.map((_, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: "0.5rem",
                      color: i === activeSlot ? "var(--red)" : "var(--ink-dim)",
                    }}
                  >
                    {i + 1}
                  </span>
                ))}
              </div>
            </div>

            <div className="equipBox">
              <div className="equipLabel">[EQUIPMENT // ARTIFACT.001]</div>
              <div className="equipBody">
                <div className="equipDiscs">
                  {DISCS.map((_, i) => (
                    <CdIcon key={i} active={i === activeSlot} />
                  ))}
                </div>
                <div className="equipDivider" />
                <div className="equipReadout">
                  <div>[ARCHIVE PLAYER artifact]</div>
                  <div>{readout}</div>
                  <div>[{playing ? "ACTIVE" : "STANDBY"}]</div>
                </div>
              </div>
            </div>

            <div className="deviceRow">
              <div className="vialWrap">
                <svg viewBox="0 0 44 76" className="vialIcon">
                  <rect x="14" y="4" width="16" height="9" />
                  <path d="M16,13 L16,24 Q16,29 11,34 L11,64 Q11,70 17,70 L27,70 Q33,70 33,64 L33,34 Q28,29 28,24 L28,13 Z" />
                  <line x1="11" y1="46" x2="33" y2="46" />
                </svg>
                <div className="vialLabel">
                  REFERENCE
                  <br />
                  SAMPLE
                </div>
              </div>

              <div className="recallBox">
                <div className="bracketLabel" style={{ marginBottom: 0, fontSize: "0.55rem" }}>
                  [ ARCHIVE RECALL ]
                </div>
                <div className="recallArrow">&#8595;</div>
                <div className="recallSeal">E</div>
              </div>
            </div>
          </div>
        </div>

        <div className="footerNote">
          refoldered.com is an independent archive dedicated to the preservation and
          digitization of counter-culture history. All materials are cataloged for
          educational purposes.
        </div>
      </div>

      <div className="evidenceTag">
        <div className="evidenceHead">
          <span>EVIDENCE</span>
          <span>&#9888;</span>
        </div>
        <div className="evidencePills">
          <span />
          <span />
          <span className="cap" />
        </div>
        <div className="evidenceSub">CASE 000 / LOT A</div>
      </div>

      <div className="ticketTag">
        <div className="ticketHead">
          <span>EUPHORIA</span>
          <span className="ticketFace">&#9786;</span>
        </div>
        <div className="ticketSub">SERIAL 04-REF / UNCATALOGED</div>
      </div>

      <div className="chemDiagram">
        <svg viewBox="0 0 130 70">
          <polygon points="20,10 34,18 34,34 20,42 6,34 6,18" />
          <line x1="34" y1="18" x2="48" y2="10" />
          <line x1="20" y1="42" x2="20" y2="58" />
          <line x1="20" y1="58" x2="8" y2="66" />
          <line x1="20" y1="58" x2="34" y2="66" />
          <line x1="48" y1="10" x2="62" y2="18" />
          <text x="50" y="8">H3C</text>
          <text x="64" y="16">N</text>
          <text x="0" y="16">CH3</text>
        </svg>
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
