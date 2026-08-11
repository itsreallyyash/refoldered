import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata = {
  title: "REFOLDERED",
  description: "refoldered",
  robots: "noindex, nofollow",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={plexMono.variable}>
      <body>{children}</body>
    </html>
  );
}
