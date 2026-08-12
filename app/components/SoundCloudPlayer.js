"use client";

import { useEffect, useRef, useState } from "react";

const ARTISTS = ["Aphex Twin", "Deftones", "Boards of Canada"];

export default function SoundCloudPlayer({
  onTimeUpdate,
  playing,
  setPlaying,
}) {
  const iframeRef = useRef(null);
  const widgetRef = useRef(null);
  const [currentTrack, setCurrentTrack] = useState("");
  const [isReady, setIsReady] = useState(false);

  // Load SoundCloud Widget API
  useEffect(() => {
    if (window.SC) {
      setIsReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://w.soundcloud.com/player/api.js";
    script.onload = () => {
      window.SC.Widget.bind(window.SC.Widget.Events.READY, () => {
        setIsReady(true);
      });
    };
    document.body.appendChild(script);
  }, []);

  // Initialize player and load tracks
  useEffect(() => {
    if (!isReady || !iframeRef.current || !window.SC) return;

    const widget = window.SC.Widget(iframeRef.current);
    widgetRef.current = widget;

    // Listen for track changes
    widget.bind(window.SC.Widget.Events.READY, () => {
      widget.bind(window.SC.Widget.Events.FINISH, () => {
        // Auto-play next when track ends
        loadRandomTrack(widget);
      });

      widget.bind(
        window.SC.Widget.Events.PLAY_PROGRESS,
        ({ relativePosition }) => {
          if (onTimeUpdate) {
            onTimeUpdate(relativePosition / 1000);
          }
        }
      );

      widget.bind(window.SC.Widget.Events.PLAY, () => {
        setPlaying(true);
        widget.getCurrentSound((sound) => {
          setCurrentTrack(sound.title);
        });
      });

      widget.bind(window.SC.Widget.Events.PAUSE, () => {
        setPlaying(false);
      });

      // Load first track
      loadRandomTrack(widget);
    });
  }, [isReady, onTimeUpdate, setPlaying]);

  const loadRandomTrack = async (widget) => {
    const artist = ARTISTS[Math.floor(Math.random() * ARTISTS.length)];
    const query = artist;

    try {
      const response = await fetch(
        `https://soundcloud.com/oembed?format=json&url=https://soundcloud.com/search?q=${encodeURIComponent(query)}&show_reposts=false`
      );

      // Alternative: Use a direct API call (requires OAuth in production, but works for public streams)
      // For now, we'll use pre-built SoundCloud URLs for these artists

      const artistUrls = {
        "Aphex Twin": "https://soundcloud.com/aphex-twin",
        Deftones: "https://soundcloud.com/deftones",
        "Boards of Canada": "https://soundcloud.com/boards-of-canada",
      };

      const url = artistUrls[artist];
      if (url) {
        widget.load(url, {
          show_reposts: false,
          auto_play: true,
        });
      }
    } catch (err) {
      console.error("Failed to load track:", err);
    }
  };

  const handlePlayPause = () => {
    if (!widgetRef.current) return;
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
