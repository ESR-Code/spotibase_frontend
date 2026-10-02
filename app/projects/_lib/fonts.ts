import { Manrope, Newsreader } from "next/font/google";

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-studio-body",
});

const display = Newsreader({
  subsets: ["latin"],
  variable: "--font-studio-display",
  weight: ["500", "600"],
});

/** Apply to `.studio-root` and to portaled menus/dialogs (they render outside it). */
export const studioFontClass = `${body.variable} ${display.variable}`;
