// src/app/(components)/smiley.tsx
import { DAILY_STATUSES } from "@/lib/constants";
import { useId } from "react";

interface SmileyProps {
  statusValue: number;
  color?: string;
}

export function Smiley({ statusValue, color }: SmileyProps) {
  const id = useId();
  const filterId = `face-shadow-${id}`;

  const mouths = [
    "M 33 65 Q 50 53 67 65",
    "M 34 63 Q 50 56 66 63",
    "M 34 62 L 66 62",
    "M 32 59 Q 50 73 68 59",
    "M 30 57 Q 50 77 70 57",
  ];

  const faceColor =
    color ?? DAILY_STATUSES[statusValue]?.color ?? DAILY_STATUSES[2].color;
  const featureColor = "var(--smiley-feature)";

  return (
    <svg
      viewBox="0 0 100 100"
      className="w-full h-full transition-all duration-500"
      aria-hidden="true"
    >
      <defs>
        <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow
            dx="0"
            dy="1"
            stdDeviation="2"
            floodColor="var(--smiley-shadow)"
          />
        </filter>
      </defs>

      <circle
        cx="50"
        cy="50"
        r="48"
        fill="var(--smiley-face)"
        stroke={faceColor}
        strokeWidth="2"
        strokeOpacity="0.45"
        filter={`url(#${filterId})`}
      />

      {statusValue === 0 ? (
        <>
          <line
            x1="29"
            y1="37"
            x2="39"
            y2="47"
            stroke={featureColor}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <line
            x1="39"
            y1="37"
            x2="29"
            y2="47"
            stroke={featureColor}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <line
            x1="61"
            y1="37"
            x2="71"
            y2="47"
            stroke={featureColor}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <line
            x1="71"
            y1="37"
            x2="61"
            y2="47"
            stroke={featureColor}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </>
      ) : statusValue === 4 ? (
        <>
          <path
            d="M 29 46 Q 34 39 39 46"
            fill="none"
            stroke={featureColor}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M 61 46 Q 66 39 71 46"
            fill="none"
            stroke={featureColor}
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <circle cx="34" cy="42" r="4" fill={featureColor} />
          <circle cx="66" cy="42" r="4" fill={featureColor} />
        </>
      )}

      <path
        d={mouths[statusValue]}
        fill="none"
        stroke={featureColor}
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {statusValue >= 3 && (
        <>
          <circle cx="23" cy="62" r="8" fill={faceColor} opacity="0.35" />
          <circle cx="77" cy="62" r="8" fill={faceColor} opacity="0.35" />
        </>
      )}
    </svg>
  );
}
