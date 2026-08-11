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

const PILL_ASCII = `      .-""""-.
    /   o  o   \\
   |     __     |
   |    (__)    |
    \\          /
      '-....-'`;

const QUAALUDE_ASCII = ` ______________
/              \\
|     714      |
\\ ____________ /`;

const SLOT_COUNT = 8;

export default function Home() {
  const [entered, setEntered] = useState(false);
  const [muted, setMuted] = useState(false);
  const [activeSlot, setActiveSlot] = useState(0);
  const [readout, setReadout] = useState("NO SIGNAL");

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

  // Idle / real-playback driven slot animation.
  useEffect(() => {
    if (!entered) return;
    const id = setInterval(() => {
      const p = playerRef.current;
      if (p && typeof p.getPlaylistIndex === "function") {
        const idx = p.getPlaylistIndex();
        if (idx >= 0) {
          setActiveSlot(idx % SLOT_COUNT);
          setReadout(`TRACK ${String(idx + 1).padStart(2, "0")}`);
          return;
        }
        if (typeof p.getCurrentTime === "function") {
          const t = p.getCurrentTime() || 0;
          setActiveSlot(Math.floor(t / 20) % SLOT_COUNT);
          setReadout("PLAYING");
          return;
        }
      }
      idleCounterRef.current = (idleCounterRef.current + 1) % SLOT_COUNT;
      setActiveSlot(idleCounterRef.current);
    }, 1500);
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

    const config = { playerVars, events: {
      onReady: (e) => {
        e.target.playVideo();
        setReadout("PLAYING");
      },
      onStateChange: (e) => {
        if (window.YT && e.data === window.YT.PlayerState.PLAYING) setReadout("PLAYING");
      },
    } };

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

        <div className="exhibit exhibitA">
          <pre>{PILL_ASCII}</pre>
          <div className="exhibitCaption">exhibit a — unidentified tablet</div>
        </div>

        <div className="exhibit exhibitB">
          <pre>{QUAALUDE_ASCII}</pre>
          <div className="exhibitCaption">exhibit b — mfr mark 714</div>
        </div>

        <div className="deck">
          <div className="deckLabel">&#9671; archive player &#9671;</div>
          <div className="slots">
            {Array.from({ length: SLOT_COUNT }).map((_, i) => (
              <div key={i} className={`slot${i === activeSlot ? " active" : ""}`}>
                {i + 1}
              </div>
            ))}
          </div>
          <div className="eq">
            {Array.from({ length: SLOT_COUNT }).map((_, i) => (
              <div key={i} className={`eqBar eqBar${i}`} />
            ))}
          </div>
          <div className="deckReadout">{readout}</div>
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
