import React from 'react';

// Faint topographic contour lines drawn behind every page — the atlas
// equivalent of a background texture. Purely decorative.
export default function ContourBackdrop() {
  return (
    <svg
      className="fixed inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <g fill="none" stroke="#7C9070" strokeWidth="1.3" opacity="0.16">
        <path d="M100,120 C220,60 420,70 500,130 C570,185 420,230 300,215 C180,200 30,175 100,120 Z" />
        <path d="M150,130 C240,90 390,95 450,135 C505,172 400,205 310,195 C220,185 90,160 150,130 Z" />
        <path d="M200,140 C260,115 350,118 395,142 C435,163 360,180 310,174 C255,167 155,158 200,140 Z" />
        <path d="M780,620 C900,560 1100,580 1160,650 C1215,715 1050,760 940,745 C830,730 680,672 780,620 Z" />
        <path d="M830,630 C930,585 1080,600 1125,655 C1168,707 1040,740 950,728 C860,716 745,668 830,630 Z" />
        <path d="M880,642 C945,615 1050,625 1082,660 C1112,695 1030,715 970,707 C910,699 825,665 880,642 Z" />
        <path d="M-50,420 C200,380 450,470 700,430 C900,398 1100,440 1250,410" />
        <path d="M-50,470 C200,430 460,515 710,478 C910,448 1105,485 1250,458" />
      </g>
    </svg>
  );
}
