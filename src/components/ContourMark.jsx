import React from 'react';

// Flat contour mark: three nested elevation lines, the same family as the page backdrop.
// One solid colour, no tile, no shadow.
export default function ContourMark({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 15.5C4 8.6 10 4 17 4.5c6.2.5 11 5.2 10.5 11-.5 6.2-5.8 11.5-12.2 11.5C8.6 27 4 22.4 4 15.5Z" />
      <path d="M9.5 15.8c0-4.2 3.4-7 7.6-6.7 3.8.3 6.4 3.2 6 6.8-.4 3.8-3.4 6.6-7.2 6.4-3.9-.2-6.4-3.1-6.4-6.5Z" />
      <path d="M14.5 16c0-1.7 1.3-2.9 2.9-2.7 1.4.2 2.3 1.3 2.1 2.7-.2 1.4-1.2 2.4-2.6 2.4-1.4 0-2.4-1.1-2.4-2.4Z" />
    </svg>
  );
}
