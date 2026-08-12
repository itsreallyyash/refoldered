"use client";

import { useEffect, useRef, useState } from "react";

const ARTISTS = ["Aphex Twin", "Deftones", "Boards of Canada"];
const ARTIST_URLS = {
  "Aphex Twin": "https://soundcloud.com/aphex-twin",
  Deftones: "https://soundcloud.com/deftones",
  "Boards of Canada": "https://soundcloud.com/boards-of-canada",
};

export default function SoundCloudPlayer({
  onTimeUpdate,
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
          setCurrentTrack(sound?.title || "Now playing");
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
    const artist = ARTISTS[Math.floor(Math.random() * ARTISTS.length)];
    const url = ARTIST_URLS[artist];
    console.log("Loading:", artist, url);
    widgetRef.current.load(url, { show_reposts: false, auto_play: true });
  };

  const handlePlayPause = () => {
    if (!widgetRef.current) {
      console.error("Widget not initialized");
      return;
    }
    if (playing) {
      widgetRef.current.pause();
    } else {
      widgetRef.current.play();
    }
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
        src="https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/aphex-twin&color=%23070706&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=true"
        style={{ display: "none" }}
      />

      <div
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          color: "#f0eee6",
          fontFamily: "IBM Plex Mono",
          fontSize: "12px",
          zIndex: 50,
          background: "rgba(7, 7, 6, 0.9)",
          padding: "12px",
          border: "1px dashed #d43d2a",
          borderRadius: "4px",
        }}
      >
        {currentTrack && (
          <div style={{ marginBottom: "10px", maxWidth: "180px" }}>
            <div style={{ opacity: 0.8, wordBreak: "break-word" }}>
              {currentTrack.slice(0, 40)}
              {currentTrack.length > 40 ? "..." : ""}
            </div>
          </div>
        )}
        <button
          onClick={handlePlayPause}
          style={{
            padding: "8px 12px",
            background: playing ? "#d43d2a" : "transparent",
            color: "#f0eee6",
            border: "1px solid #f0eee6",
            cursor: "pointer",
            fontFamily: "IBM Plex Mono",
            fontSize: "11px",
          }}
        >
          {playing ? "PAUSE" : "PLAY"}
        </button>
      </div>
    </>
  );
}
