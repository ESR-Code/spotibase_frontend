import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
// Reuses the editor's Preview styles (`.editor-root[data-preview="true"]`).
import "@/app/editor/editor-theme.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-editor-body",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-editor-display",
});

// Static on purpose: the server never fetches the snapshot (no per-view server
// cost). The client sets `document.title` from the project name.
export const metadata: Metadata = {
  title: "Spotibase tour",
  robots: { index: false, follow: false },
};

export default function ViewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${manrope.variable} ${sora.variable} h-dvh w-full overflow-hidden`}
      style={{ fontFamily: "var(--font-editor-body), sans-serif" }}
    >
      {children}
    </div>
  );
}
