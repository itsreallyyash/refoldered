import "./globals.css";

export const metadata = {
  title: "REFOLDERED",
  description: "refoldered",
  robots: "noindex, nofollow",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
