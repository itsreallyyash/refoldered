"use client";

import { useEffect, useRef, useState } from "react";

const SPOTIFY_CLIENT_ID = "c2668ed29a8e49d89b33a53482d53469";
const SPOTIFY_REDIRECT_URI = "https://refoldered.com/callback";
const SPOTIFY_AUTH_URL = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(SPOTIFY_REDIRECT_URI)}&scope=streaming%20user-read-private%20user-read-email%20user-modify-playback-state`;

export default function SpotifyPlayer({ onTimeUpdate, onPlay, onPause, playing, setPlaying }) {
  const [token, setToken] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [playlistUri, setPlaylistUri] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const playerRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Check for existing token
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("spotify_access_token");
    const expiresAt = localStorage.getItem("spotify_expires_at");

    if (stored && expiresAt && Date.now() < parseInt(expiresAt)) {
      setToken(stored);
      setLoggedIn(true);
      initializePlayer(stored);
    }
  }, []);

  // Load Spotify Web Playback SDK
  useEffect(() => {
    if (!window.Spotify) {
      const script = document.createElement("script");
      script.src = "https://sdk.scdn.co/spotify-player.js";
      document.body.appendChild(script);

      window.onSpotifyWebPlaybackSDKReady = () => {
        console.log("Spotify SDK ready");
      };
    }
  }, []);

  const initializePlayer = (accessToken) => {
    if (!window.Spotify) {
      setTimeout(() => initializePlayer(accessToken), 500);
      return;
    }

    const player = new window.Spotify.Player({
      name: "refoldered",
      getOAuthToken: (callback) => callback(accessToken),
      volume: 0.5,
    });

    player.addListener("player_state_changed", (state) => {
      if (!state) return;
      const current = state.track_window.current_track;
      setCurrentTrack(current);
      setPlaying(!state.paused);

      if (!state.paused && onTimeUpdate) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = setInterval(() => {
          player.getCurrentState().then((state) => {
            if (state && onTimeUpdate) {
              onTimeUpdate(state.position / 1000);
            }
          });
        }, 90);
      }
    });

    player.addListener("initialization_error", ({ message }) => {
      console.error("Failed to initialize:", message);
    });

    player.addListener("authentication_error", ({ message }) => {
      console.error("Failed to authenticate:", message);
    });

    player.connect();
    playerRef.current = player;
  };

  const handleLogin = () => {
    window.location.href = SPOTIFY_AUTH_URL;
  };

  const handlePlayPlaylist = async () => {
    if (!playerRef.current || !token) return;

    // Search for "refoldered" playlist
    try {
      const response = await fetch(
        "https://api.spotify.com/v1/me/playlists?limit=50",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      const refoldered = data.items?.find(
        (p) => p.name.toLowerCase().includes("refoldered")
      );

      if (refoldered) {
        setPlaylistUri(refoldered.uri);
        await playerRef.current.addListener(
          "player_state_changed",
          async (state) => {
            if (state?.paused) {
              // Play the playlist
              await fetch("https://api.spotify.com/v1/me/player/play", {
                method: "PUT",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  context_uri: refoldered.uri,
                }),
              });
            }
          }
        );

        // Start playback
        await fetch("https://api.spotify.com/v1/me/player/play", {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            context_uri: refoldered.uri,
          }),
        });

        setPlaying(true);
      }
    } catch (err) {
      console.error("Failed to play playlist:", err);
    }
  };

  const handlePlayPause = async () => {
    if (!playerRef.current) return;

    if (playing) {
      await fetch("https://api.spotify.com/v1/me/player/pause", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
    } else {
      if (!playlistUri) {
        await handlePlayPlaylist();
      } else {
        await fetch("https://api.spotify.com/v1/me/player/play", {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    }
  };

  if (!loggedIn) {
    return (
      <button
        onClick={handleLogin}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          padding: "10px 16px",
          background: "#1DB954",
          color: "#000",
          border: "none",
          cursor: "pointer",
          fontFamily: "IBM Plex Mono",
          fontSize: "12px",
          fontWeight: "bold",
          borderRadius: "20px",
          zIndex: 50,
        }}
      >
        Login with Spotify
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        color: "#f0eee6",
        fontFamily: "IBM Plex Mono",
        fontSize: "12px",
        zIndex: 50,
      }}
    >
      {currentTrack && (
        <div style={{ marginBottom: "10px", textAlign: "right" }}>
          <div style={{ opacity: 0.8 }}>{currentTrack.name}</div>
          <div style={{ opacity: 0.6 }}>
            {currentTrack.artists.map((a) => a.name).join(", ")}
          </div>
        </div>
      )}
      <button
        onClick={
          !playlistUri && loggedIn ? handlePlayPlaylist : handlePlayPause
        }
        style={{
          padding: "8px 12px",
          background: playing ? "#d43d2a" : "#1DB954",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          fontFamily: "IBM Plex Mono",
          fontSize: "11px",
        }}
      >
        {!playlistUri ? "Play Playlist" : playing ? "Pause" : "Play"}
      </button>
    </div>
  );
}
