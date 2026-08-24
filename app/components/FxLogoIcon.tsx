import React from "react";

export default function FxLogoIcon({
  size = 36,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 rounded-xl overflow-hidden shadow-xs ${className}`}
    >
      {/* Red Background */}
      <rect width="100" height="100" rx="16" fill="#BD2329" />

      {/* F Letter: Vertical spine + Top bar */}
      <path
        d="M18 20.5H51V32H29.5V84.5H18V20.5Z"
        fill="#FFFFFF"
      />

      {/* F Middle Bar (diamond/quadrilateral) */}
      <path
        d="M29.5 46.5H47L40 58H29.5V46.5Z"
        fill="#FFFFFF"
      />

      {/* X Top-Left Diamond/Prism */}
      <path
        d="M51 22.5L62.5 38.5L53.5 50.5L42 34.5L51 22.5Z"
        fill="#FFFFFF"
      />

      {/* Sweeping Swoosh + Upward Arrow */}
      {/* Swoosh body */}
      <path
        d="M19 94C34 85 49 68 59 48L72.5 22L76 25L84.5 4.5L64 13.5L68 17L53 43C44 60 30 75 19 82V94Z"
        fill="#FFFFFF"
      />

      {/* X Bottom-Right Leg */}
      <path
        d="M63 64.5L72.5 51L83.5 84.5H71L63 64.5Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}
