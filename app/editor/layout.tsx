import { Manrope, Sora } from "next/font/google";
import "./editor-theme.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-editor-body",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-editor-display",
});

export default function EditorLayout({
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
