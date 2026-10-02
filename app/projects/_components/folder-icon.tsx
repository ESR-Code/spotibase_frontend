"use client";

import { useId } from "react";

export function FolderIcon({
  color,
  size = 44,
  className,
}: {
  color: string;
  size?: number;
  className?: string;
}) {
  const gradientId = `folder-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;

  return (
    <svg
      width={size}
      height={(size * 40) / 48}
      viewBox="0 0 48 40"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="10" x2="0" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity="0.78" />
        </linearGradient>
      </defs>
      <path
        d="M3 7a5 5 0 0 1 5-5h9.6a5 5 0 0 1 3.54 1.46L24 6.3h16a5 5 0 0 1 5 5V33a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V7Z"
        fill={color}
        fillOpacity="0.5"
      />
      <path
        d="M3 15a5 5 0 0 1 5-5h32a5 5 0 0 1 5 5v18a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V15Z"
        fill={`url(#${gradientId})`}
      />
      <path d="M8 14.5h32" stroke="#fff" strokeOpacity="0.32" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
