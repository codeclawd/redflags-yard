import type { Metadata } from "next";
import { IBM_Plex_Mono, Pirata_One, VT323 } from "next/font/google";
import "./globals.css";

const display = Pirata_One({
  variable: "--font-pirata",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const terminal = VT323({
  variable: "--font-vt323",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const mono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Red Flags — board a privacy policy",
  description:
    "Boards a privacy policy and hoists a flag on every clause that takes from you, quoting the document verbatim.",
  openGraph: {
    title: "Red Flags — board a privacy policy",
    description:
      "Boards a privacy policy and hoists a flag on every clause that takes from you, quoting the document verbatim.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${terminal.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
