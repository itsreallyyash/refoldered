"use client";

import { useEffect, useRef, useState } from "react";

// The SoundCloud Widget API only loads direct track/playlist ("sets") URLs —
// a profile URL (e.g. soundcloud.com/deftones_official) silently fails to
// load anything, which is why playback never started before.
const TRACKS = [
  "https://soundcloud.com/aphex-twin-official/introduction",
  "https://soundcloud.com/boardsofcanada/the-process",
  "https://soundcloud.com/boardsofcanada/open-the-light",
  "https://soundcloud.com/boardsofcanada/seven-forty-seven",
  "https://soundcloud.com/deftones_official/sets/deftones-1",
  "https://soundcloud.com/deftones_official/sets/white-pony-2",
  "https://soundcloud.com/deftones_official/ceremony",
  "https://soundcloud.com/deftones_official/headup",
  "https://soundcloud.com/deftones_official/risk",
  "https://soundcloud.com/deftones_official/prince",
  "https://soundcloud.com/deftones_official/ecdysis",
];

export default function SoundCloudPlayer({
  onTimeUpdate,
  onTrackChange,
  playing,
  setPlaying,
}) {
  const iframeRef = useRef(null);
  const widgetRef = useRef(null);
  const initializedRef = useRef(false);
  const [currentTrack, setCurrentTrack] = useState("Loading...");

  // Load SoundCloud Widget API. Guarded against React StrictMode's dev-only
  // double-invoke, which would otherwise bind two widgets to the same
  // iframe and race each other loading different tracks.
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (window.SC?.Widget) {
      initPlayer();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://w.soundcloud.com/player/api.js";
    script.async = true;
    script.onload = () => {
      setTimeout(initPlayer, 500);
    };
    document.body.appendChild(script);
  }, []);

  const initPlayer = () => {
    if (!iframeRef.current || !window.SC?.Widget) return;

    const widget = window.SC.Widget(iframeRef.current);
    widgetRef.current = widget;

    widget.bind(window.SC.Widget.Events.READY, () => {
      console.log("SoundCloud widget ready");
      loadRandomTrack();

      widget.bind(window.SC.Widget.Events.PLAY, () => {
        setPlaying(true);
        widget.getCurrentSound((sound) => {
          const title = sound?.title || "Now playing";
          setCurrentTrack(title);
          onTrackChange?.(title);
        });
      });

      widget.bind(window.SC.Widget.Events.PAUSE, () => {
        setPlaying(false);
      });

      widget.bind(window.SC.Widget.Events.FINISH, () => {
        // Auto-load next track when current finishes
        loadRandomTrack();
      });

      widget.bind(
        window.SC.Widget.Events.PLAY_PROGRESS,
        ({ relativePosition }) => {
          if (onTimeUpdate && relativePosition < 500000) {
            onTimeUpdate(relativePosition / 1000);
          }
        }
      );
    });

    widget.bind(window.SC.Widget.Events.ERROR, (err) => {
      console.error("SoundCloud error:", err);
    });
  };

  const loadRandomTrack = () => {
    if (!widgetRef.current) return;
    const url = TRACKS[Math.floor(Math.random() * TRACKS.length)];
    console.log("Loading:", url);
    widgetRef.current.load(url, { show_reposts: false, auto_play: true });
  };

  // play-only: once the archive is playing there is no stopping it
  const handlePlay = () => {
    if (!widgetRef.current || playing) return;
    widgetRef.current.play();
  };

  return (
    <>
      <iframe
        ref={iframeRef}
        width="100%"
        height="166"
        scrolling="no"
        frameBorder="no"
        allow="autoplay"
        src="https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/aphex-twin-official/introduction&color=%23070706&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=true"
        style={{ display: "none" }}
      />

      <div
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          color: "#f0eee6",
          fontFamily: "inherit",
          fontSize: "11px",
          letterSpacing: "0.12em",
          zIndex: 50,
          background: "rgba(7, 7, 6, 0.85)",
          padding: "9px 12px",
          border: "1px dashed rgba(212, 61, 42, 0.55)",
          maxWidth: "230px",
        }}
      >
        {playing ? (
          <div style={{ opacity: 0.85, wordBreak: "break-word", textTransform: "uppercase" }}>
            <span style={{ color: "#d43d2a" }}>▸ </span>
            {currentTrack.slice(0, 40)}
            {currentTrack.length > 40 ? "…" : ""}
          </div>
        ) : (
          <button
            onClick={handlePlay}
            style={{
              padding: "8px 14px",
              background: "transparent",
              color: "#f0eee6",
              border: "1px solid #f0eee6",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "11px",
              letterSpacing: "0.2em",
            }}
          >
            PLAY
          </button>
        )}
      </div>
    </>
  );
}
