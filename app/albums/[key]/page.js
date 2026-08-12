"use client";

import Link from "next/link";

export default function AlbumPage({ params }) {
  const { key } = params;
  const titles = {
    deftones: "Deftones — Diamond Eyes",
    acdc: "AC/DC — Back in Black",
    aphex: "Aphex Twin — Selected Ambient Works 85–92",
    acid: "Acid House Classics (1988)",
    floyd: "Pink Floyd — The Dark Side of the Moon",
    lcd: "LCD Soundsystem — Sound of Silver",
  };

  return (
    <div style={{ background: "#070706", color: "#f0eee6", minHeight: "100vh", padding: "40px 20px", fontFamily: "IBM Plex Mono" }}>
      <Link href="/" style={{ color: "#d43d2a", textDecoration: "none" }}>
        ← back to archive
      </Link>
      <h1 style={{ marginTop: "40px", fontSize: "24px", letterSpacing: "2px" }}>{titles[key] || "unknown album"}</h1>
      <p style={{ marginTop: "20px", opacity: 0.6 }}>content coming soon</p>
    </div>
  );
}
