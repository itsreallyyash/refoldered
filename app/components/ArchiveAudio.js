"use client";

import { useEffect, useRef, useState } from "react";

/* Real, analysable audio.
   The SoundCloud widget plays inside a cross-origin iframe, so its signal
   is unreachable — any "visualizer" on top of it can only ever be fake.
   This plays MP3s straight from the Internet Archive's mirror of the
   user18081971 uploads (the tracks Richard D. James put up for free
   download himself). archive.org serves both its metadata API and its
   media with Access-Control-Allow-Origin: *, which is exactly what
   createMediaElementSource + AnalyserNode need to expose the true
   waveform instead of silence. */

// Two independent mirrors of the same dump; pooling them means a dead
// file on one node just skips to a track on the other.
const ITEMS = [
  "AphexTwinAllUser18081971SoundcloudTracks",
  "aphex_twin_user18081971_soundcloud",
];

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function ArchiveAudio({
  controlRef,
  analyserRef,
  onTrackChange,
  playing,
  setPlaying,
}) {
  const audioRef = useRef(null);
  const ctxRef = useRef(null);
  const listRef = useRef([]);
  const idxRef = useRef(0);
  const pendingStartRef = useRef(false);
  const errorStreakRef = useRef(0);
  const onTrackChangeRef = useRef(onTrackChange);
  onTrackChangeRef.current = onTrackChange;
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const audio = new Audio();
    audio.crossOrigin = "anonymous"; // required or the analyser reads silence
    audio.preload = "auto";
    audioRef.current = audio;
    if (typeof window !== "undefined") window.__archiveAudio = audio; // debug handle

    let retriedRef = false;

    const load = (i, autoplay, cacheBust) => {
      const t = listRef.current[i];
      if (!t) return;
      audio.src = cacheBust ? t.url + "?r=" + Date.now() : t.url;
      onTrackChangeRef.current?.(t.title);
      if (autoplay) {
        audio
          .play()
          .then(() => setBlocked(false))
          .catch((e) => {
            if (e.name === "NotAllowedError") setBlocked(true);
            // NotSupportedError etc. fall through to the error handler
          });
      }
    };

    const next = () => {
      if (!listRef.current.length) return;
      retriedRef = false;
      idxRef.current = (idxRef.current + 1) % listRef.current.length;
      load(idxRef.current, true);
    };

    audio.addEventListener("playing", () => {
      errorStreakRef.current = 0;
      setPlaying(true);
    });
    audio.addEventListener("pause", () => setPlaying(false));
    audio.addEventListener("ended", next);
    audio.addEventListener("error", () => {
      if (!audio.src || cancelled) return; // ignore the teardown error
      // archive nodes 500 intermittently (and their error pages carry no
      // CORS headers, so it surfaces as a CORS failure). Retry the same
      // file once with a cache-buster, then skip to the next track.
      errorStreakRef.current += 1;
      if (errorStreakRef.current > 20) return; // archive down — stop hammering
      if (!retriedRef) {
        retriedRef = true;
        setTimeout(() => load(idxRef.current, true, true), 700);
      } else {
        setTimeout(next, 400);
      }
    });

    const start = () => {
      if (!listRef.current.length) {
        pendingStartRef.current = true; // metadata still in flight
        return;
      }
      if (!ctxRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        const ctx = new Ctx();
        const srcNode = ctx.createMediaElementSource(audio);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.5;
        srcNode.connect(analyser);
        analyser.connect(ctx.destination);
        ctxRef.current = ctx;
        if (analyserRef) analyserRef.current = analyser;
      }
      ctxRef.current.resume();
      if (audio.paused) load(idxRef.current, true);
    };
    if (controlRef) controlRef.current = { start };

    Promise.allSettled(
      ITEMS.map((item) =>
        fetch(`https://archive.org/metadata/${item}`)
          .then((r) => r.json())
          .then((j) =>
            (j.files || [])
              .filter((f) => f.name && f.name.toLowerCase().endsWith(".mp3"))
              .map((f) => ({
                url: `https://archive.org/download/${item}/${encodeURIComponent(f.name)}`,
                // "017 - 0125 - Tha Milk Float.mp3" → "Tha Milk Float"
                title: f.name
                  .replace(/\.mp3$/i, "")
                  .replace(/^\d+[\s-]*\d*[\s-]*/, "")
                  .trim() || f.name.replace(/\.mp3$/i, ""),
              }))
          )
      )
    ).then((results) => {
      if (cancelled) return;
      const pool = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
      if (!pool.length) return;
      listRef.current = shuffle(pool);
      if (pendingStartRef.current) {
        pendingStartRef.current = false;
        start();
      }
    });

    return () => {
      cancelled = true;
      audio.pause();
      audio.removeAttribute("src");
      if (controlRef) controlRef.current = null;
      if (analyserRef) analyserRef.current = null;
      ctxRef.current?.close().catch(() => {});
    };
  }, []);

  // playback starts on the gate click; this button only appears if the
  // browser refused that autoplay (or the archive was slow to answer)
  if (playing || !blocked) return null;
  return (
    <button
      onClick={() => controlRef?.current?.start()}
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
  );
}
