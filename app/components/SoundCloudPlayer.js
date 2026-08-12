"use client";

import { useEffect, useRef } from "react";

// The SoundCloud Widget API only loads direct track/playlist ("sets") URLs —
// a profile URL (e.g. soundcloud.com/deftones_official) silently fails.
//
// It also matters WHOSE upload it is: official label uploads stream as
// 30-second SNIP previews unless the listener has Go+, which is why
// playback used to die after ~15s. These are all full-length user
// uploads (policy ALLOW, 50–170 min each), verified by probing
// getCurrentSound().duration — long mixes suit a page meant to be
// left running.
const TRACKS = [
  "https://soundcloud.com/selectabwoy/aphex-twin-selected-ambient-works-25-part-one",
  "https://soundcloud.com/selectabwoy/aphex-twin-selected-ambient-works-25-part-two",
  "https://soundcloud.com/sensei_rebel/aphex-twin-selected-ambient",
  "https://soundcloud.com/meta-house/recommended-01-aphex-twin-live-fuse-acid-house-dj-set",
  "https://soundcloud.com/asleepfromdaytoronto/boards-of-canada-essential-mix",
  "https://soundcloud.com/user-213366428-867150662/deftones-white-pony-full-album",
  "https://soundcloud.com/snsmix/sns-deftones-white-pony-black-stallion-project",
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
  const skipStreakRef = useRef(0);

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
        widget.getCurrentSound((sound) => {
          // safety net in case an upload later turns into a preview:
          // skip anything SNIP-policy or suspiciously short (cap the
          // streak so a bad run can't loop forever)
          const isSnip =
            sound &&
            (sound.policy === "SNIP" ||
              (typeof sound.duration === "number" && sound.duration < 120000));
          if (isSnip && skipStreakRef.current < 6) {
            skipStreakRef.current += 1;
            loadRandomTrack();
            return;
          }
          skipStreakRef.current = 0;
          setPlaying(true);
          const title = sound?.title || "Now playing";
          onTrackChange?.(title, sound?.permalink_url || "");
        });
      });

      widget.bind(window.SC.Widget.Events.PAUSE, () => {
        setPlaying(false);
      });

      widget.bind(window.SC.Widget.Events.FINISH, () => {
        // Auto-load next track when current finishes
        loadRandomTrack();
      });

      // currentPosition is ms into the track; relativePosition is a 0–1
      // fraction, so it must not be used as a clock.
      widget.bind(
        window.SC.Widget.Events.PLAY_PROGRESS,
        ({ currentPosition }) => {
          if (onTimeUpdate && typeof currentPosition === "number") {
            onTimeUpdate(currentPosition / 1000);
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

      {/* track title lives on the oscilloscope readout; while playing this
          corner stays empty — the only control is starting it */}
      {!playing && (
        <button
          onClick={handlePlay}
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            zIndex: 50,
            padding: "9px 16px",
            background: "rgba(7, 7, 6, 0.85)",
            color: "#f0eee6",
            border: "1px dashed rgba(212, 61, 42, 0.55)",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: "11px",
            letterSpacing: "0.2em",
          }}
        >
          PLAY
        </button>
      )}
    </>
  );
}
