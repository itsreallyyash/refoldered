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

const FRAGMENTS = [
  { text: "entry 04 — subject refoldered", cls: "f1" },
  { text: "the archive does not forget", cls: "f2" },
  { text: "status: unrecovered", cls: "f3" },
  { text: "do not reopen this file", cls: "f4" },
  { text: "last seen: never", cls: "f5" },
  { text: "[redacted]", cls: "f6" },
  { text: "we buried it under the index", cls: "f7" },
  { text: "re. fold. re. fold. re. fold.", cls: "f8" },
];

const QUAALUDE_ASCII = ` ______________
/              \\
|     714      |
\\ ____________ /`;

const PILL_CAPTIONS = [
  "stamped in the likeness of speed",
  "euphoria, branded and unregulated",
  "a logo pressed into the tongue",
  "the counterfeit sacrament",
  "history wore a different badge each night",
  "bliss, imitation, repeat",
];

const SLOT_COUNT = 8;

export default function Home() {
  const [entered, setEntered] = useState(false);
  const [muted, setMuted] = useState(false);
  const [activeSlot, setActiveSlot] = useState(0);
  const [readout, setReadout] = useState("NO SIGNAL");
  const [playing, setPlaying] = useState(false);
  const [capIdx, setCapIdx] = useState(0);

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

  // Idle / real-playback driven slot + track animation.
  useEffect(() => {
    if (!entered) return;
    const id = setInterval(() => {
      const p = playerRef.current;
      if (p && typeof p.getPlaylistIndex === "function") {
        const idx = p.getPlaylistIndex();
        if (idx >= 0) {
          setActiveSlot(idx % SLOT_COUNT);
          setReadout(`TRACK ${String(idx + 1).padStart(2, "0")}`);
          setPlaying(true);
          return;
        }
        if (typeof p.getCurrentTime === "function") {
          const t = p.getCurrentTime() || 0;
          setActiveSlot(Math.floor(t / 20) % SLOT_COUNT);
          setReadout("TRACK 01");
          setPlaying(true);
          return;
        }
      }
      idleCounterRef.current = (idleCounterRef.current + 1) % SLOT_COUNT;
      setActiveSlot(idleCounterRef.current);
    }, 1500);
    return () => clearInterval(id);
  }, [entered]);

  // Pill caption cycle.
  useEffect(() => {
    if (!entered) return;
    const id = setInterval(() => {
      setCapIdx((i) => (i + 1) % PILL_CAPTIONS.length);
    }, 5500);
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
          setReadout("TRACK 01");
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

  return (
    <div className={`root${entered ? " entered" : ""}`}>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id="grainFilter">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.7"
            numOctaves="2"
            stitchTiles="stitch"
            result="noise"
            seed="7"
          >
            <animate
              attributeName="seed"
              values="1;9;3;14;6;20;2"
              dur="1.1s"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.18 0"
          />
        </filter>
      </svg>

      <div className="gate" onClick={enter}>
        <div className="gateGlyph">&#9678;</div>
        <div className="gateText">click to enter</div>
      </div>

      <div className="stage">
        <div className="bgGradient" />
        <div className="horizonGlow" />
        <div className="stain s1" />
        <div className="stain s2" />
        <div className="stain s3" />
        <div className="stain s4" />
        <div className="stain s5" />

        {FRAGMENTS.map((f) => (
          <div key={f.cls} className={`frag ${f.cls}`}>
            {f.text}
          </div>
        ))}

        <div className="exhibit exhibitB">
          <pre>{QUAALUDE_ASCII}</pre>
          <div className="exhibitCaption">exhibit b — mfr mark 714</div>
        </div>

        <div className="pillZone">
          <div className="pillStage">
            <div className="pillCoin">
              <div className="pillFace pillFront">
                <svg viewBox="0 0 100 100">
                  <circle className="mercRing" cx="50" cy="50" r="42" />
                  <g className="mercStar">
                    <line x1="50" y1="50" x2="50" y2="10" />
                    <line x1="50" y1="50" x2="85" y2="70" />
                    <line x1="50" y1="50" x2="15" y2="70" />
                  </g>
                </svg>
              </div>
              <div className="pillFace pillBack">
                <div className="bmwDisc" />
              </div>
            </div>
          </div>
          <div className="pillCaptionWrap" key={capIdx} style={{ "--w": `${caption.length}ch` }}>
            <span className="pillCaptionText">{caption}</span>
          </div>
        </div>

        <div className="scope">
          <div className="scopeBezel">
            <div className="scopeHeader">
              <div className="scopeLabel">&#9671; signal trace</div>
              <div className="scopeCh">CH1 · AC</div>
            </div>
            <div className="scopeScreen">
              <div className={`scopeAmp ${playing ? "playing" : "idle"}`}>
                <svg viewBox="0 0 200 40" preserveAspectRatio="none" className="scopeWave">
                  <path
                    className="scopeTrack"
                    d="M0,20 C8,5 17,5 25,20 C33,35 42,35 50,20 C58,5 67,5 75,20 C83,35 92,35 100,20 C108,5 117,5 125,20 C133,35 142,35 150,20 C158,5 167,5 175,20 C183,35 192,35 200,20"
                    fill="none"
                  />
                </svg>
              </div>
            </div>
            <div className="scopeFooter">
              <div className="scopeTrackId">{readout}</div>
              <div className="scopeMeta">{playing ? "PLAYING" : "STANDBY"}</div>
            </div>
          </div>
        </div>

        <div className="deckZone">
          <div className="deckInfo">
            <div className="deckLabel">&#9671; archive player</div>
            <div className="deckReadout">{readout}</div>
          </div>
          <div className="cdRow">
            {Array.from({ length: SLOT_COUNT }).map((_, i) => (
              <div
                key={i}
                data-n={i + 1}
                className={`cd${i === activeSlot ? " active" : ""}`}
              />
            ))}
          </div>
          <div className="eq">
            {Array.from({ length: SLOT_COUNT }).map((_, i) => (
              <div key={i} className={`eqBar eqBar${i}`} />
            ))}
          </div>
        </div>

        <div className="scanlines" />
        <div className="vignette" />

        <div className="stamp">
          <div className="glitch">REFOLDERED</div>
          <div>CASE FILE NO. 000</div>
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
