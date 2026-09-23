"use client";

import type { CSSProperties } from "react";

/** Decorative SVG icons for the certificate canvas */
export function DesignIcon({
  iconId,
  width,
  height,
  style,
}: {
  iconId: string;
  width: number;
  height: number;
  style?: CSSProperties;
}) {
  const props = { width, height, style, viewBox: "0 0 100 100" as const };

  switch (iconId) {
    case "seal-gold":
      return (
        <svg {...props} aria-hidden>
          <defs>
            <radialGradient id="gSeal" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#f6e27a" />
              <stop offset="55%" stopColor="#d4af37" />
              <stop offset="100%" stopColor="#8a6a12" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="url(#gSeal)" />
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="#fff8dc"
            strokeWidth="2"
          />
          <circle
            cx="50"
            cy="50"
            r="30"
            fill="none"
            stroke="#8a6a12"
            strokeWidth="1.5"
          />
          <text
            x="50"
            y="55"
            textAnchor="middle"
            fontSize="18"
            fill="#5c4308"
            fontFamily="Georgia, serif"
          >
            ★
          </text>
        </svg>
      );

    case "seal-ribbon":
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 100 120"
          style={style}
          aria-hidden
        >
          <defs>
            <radialGradient id="gRib" cx="40%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#f7e48a" />
              <stop offset="100%" stopColor="#b8860b" />
            </radialGradient>
          </defs>
          <polygon
            points="35,72 28,118 42,100 50,118 58,100 72,118 65,72"
            fill="#c9a227"
          />
          <circle cx="50" cy="42" r="38" fill="url(#gRib)" />
          {Array.from({ length: 16 }).map((_, i) => {
            const a = (i / 16) * Math.PI * 2;
            const x = 50 + Math.cos(a) * 38;
            const y = 42 + Math.sin(a) * 38;
            return <circle key={i} cx={x} cy={y} r="4" fill="#d4af37" />;
          })}
          <circle cx="50" cy="42" r="22" fill="#f3e5ab" />
          <circle
            cx="50"
            cy="42"
            r="16"
            fill="none"
            stroke="#8a6a12"
            strokeWidth="2"
          />
        </svg>
      );

    case "seal-red":
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 100 120"
          style={style}
          aria-hidden
        >
          <polygon
            points="35,72 28,118 42,100 50,118 58,100 72,118 65,72"
            fill="#b91c1c"
          />
          <circle cx="50" cy="42" r="36" fill="#d4af37" />
          <circle cx="50" cy="42" r="26" fill="#f5e6a3" />
          <circle
            cx="50"
            cy="42"
            r="18"
            fill="none"
            stroke="#991b1b"
            strokeWidth="3"
          />
        </svg>
      );

    case "wreath-gold":
      return (
        <svg {...props} aria-hidden>
          {Array.from({ length: 18 }).map((_, i) => {
            const a = (i / 18) * Math.PI * 2 - Math.PI / 2;
            const cx = 50 + Math.cos(a) * 34;
            const cy = 50 + Math.sin(a) * 34;
            return (
              <ellipse
                key={i}
                cx={cx}
                cy={cy}
                rx="7"
                ry="12"
                fill="#d4af37"
                transform={`rotate(${(a * 180) / Math.PI + 90} ${cx} ${cy})`}
              />
            );
          })}
          <circle
            cx="50"
            cy="50"
            r="18"
            fill="none"
            stroke="#b8860b"
            strokeWidth="2"
          />
        </svg>
      );

    case "wreath-black":
      return (
        <svg {...props} aria-hidden>
          {Array.from({ length: 18 }).map((_, i) => {
            const a = (i / 18) * Math.PI * 2 - Math.PI / 2;
            const cx = 50 + Math.cos(a) * 34;
            const cy = 50 + Math.sin(a) * 34;
            return (
              <ellipse
                key={i}
                cx={cx}
                cy={cy}
                rx="7"
                ry="12"
                fill="#1f2937"
                transform={`rotate(${(a * 180) / Math.PI + 90} ${cx} ${cy})`}
              />
            );
          })}
        </svg>
      );

    case "laurel-pair":
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 200 50"
          style={style}
          aria-hidden
        >
          {Array.from({ length: 7 }).map((_, i) => (
            <ellipse
              key={`l${i}`}
              cx={20 + i * 12}
              cy={25 - (i % 2) * 4}
              rx="8"
              ry="14"
              fill="#d4af37"
              transform={`rotate(-35 ${20 + i * 12} ${25})`}
            />
          ))}
          {Array.from({ length: 7 }).map((_, i) => (
            <ellipse
              key={`r${i}`}
              cx={180 - i * 12}
              cy={25 - (i % 2) * 4}
              rx="8"
              ry="14"
              fill="#d4af37"
              transform={`rotate(35 ${180 - i * 12} ${25})`}
            />
          ))}
        </svg>
      );

    case "medal-gold":
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 60 80"
          style={style}
          aria-hidden
        >
          <path d="M18,0 L30,28 L42,0 Z" fill="#111827" />
          <path d="M22,0 L30,22 L38,0 Z" fill="#9ca3af" />
          <circle cx="30" cy="52" r="24" fill="#d4af37" />
          <circle cx="30" cy="52" r="16" fill="#f5e6a3" />
          <text
            x="30"
            y="57"
            textAnchor="middle"
            fontSize="14"
            fill="#8a6a12"
          >
            ★
          </text>
        </svg>
      );

    case "trophy-wreath":
      return (
        <svg {...props} aria-hidden>
          {Array.from({ length: 14 }).map((_, i) => {
            const a = (i / 14) * Math.PI * 2 - Math.PI / 2;
            const cx = 50 + Math.cos(a) * 38;
            const cy = 50 + Math.sin(a) * 38;
            return (
              <ellipse
                key={i}
                cx={cx}
                cy={cy}
                rx="6"
                ry="11"
                fill="#d4af37"
                transform={`rotate(${(a * 180) / Math.PI + 90} ${cx} ${cy})`}
              />
            );
          })}
          <path
            d="M38,35 h24 v8 c0,12 -6,18 -12,20 c-6,-2 -12,-8 -12,-20 z"
            fill="#f0d060"
          />
          <rect x="45" y="62" width="10" height="8" fill="#b8860b" />
          <rect x="40" y="70" width="20" height="5" rx="1" fill="#d4af37" />
        </svg>
      );

    case "shield-wreath":
      return (
        <svg {...props} aria-hidden>
          {Array.from({ length: 14 }).map((_, i) => {
            const a = (i / 14) * Math.PI * 2 - Math.PI / 2;
            const cx = 50 + Math.cos(a) * 40;
            const cy = 50 + Math.sin(a) * 40;
            return (
              <ellipse
                key={i}
                cx={cx}
                cy={cy}
                rx="5"
                ry="10"
                fill="#c9a227"
                transform={`rotate(${(a * 180) / Math.PI + 90} ${cx} ${cy})`}
              />
            );
          })}
          <path
            d="M50,28 L68,36 V52 C68,64 58,72 50,76 C42,72 32,64 32,52 V36 Z"
            fill="#d4af37"
          />
          <path
            d="M50,34 L62,40 V52 C62,60 55,66 50,70 C45,66 38,60 38,52 V40 Z"
            fill="#f5e6a3"
          />
        </svg>
      );

    case "corner-flourish":
      return (
        <svg {...props} aria-hidden>
          <path
            d="M8,8 Q40,10 48,48 Q20,40 8,8"
            fill="none"
            stroke="#d4af37"
            strokeWidth="3"
          />
          <path
            d="M12,12 Q32,14 40,36"
            fill="none"
            stroke="#b8860b"
            strokeWidth="1.5"
          />
          <circle cx="48" cy="48" r="4" fill="#d4af37" />
          <path
            d="M8,20 Q18,22 22,32"
            fill="none"
            stroke="#c9a227"
            strokeWidth="2"
          />
          <path
            d="M20,8 Q22,18 32,22"
            fill="none"
            stroke="#c9a227"
            strokeWidth="2"
          />
        </svg>
      );

    default:
      return (
        <svg {...props} aria-hidden>
          <circle cx="50" cy="50" r="40" fill="#d4af37" />
        </svg>
      );
  }
}
