"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SpotifyCallback() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      console.error("Spotify auth error:", error);
      router.push("/");
      return;
    }

    if (code) {
      // Send code to backend to exchange for access token
      fetch("/api/spotify/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.access_token) {
            // Store token in localStorage
            localStorage.setItem("spotify_access_token", data.access_token);
            localStorage.setItem("spotify_expires_at", Date.now() + data.expires_in * 1000);
            router.push("/");
          } else {
            console.error("Failed to get access token");
            router.push("/");
          }
        })
        .catch((e) => {
          console.error("Token exchange error:", e);
          router.push("/");
        });
    }
  }, [router]);

  return (
    <div style={{ background: "#070706", color: "#f0eee6", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "IBM Plex Mono" }}>
      <div>authenticating...</div>
    </div>
  );
}
