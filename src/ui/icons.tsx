import type { ReactNode } from 'react';

// Iconografía propia: trazos de 24×24, mismo grosor en todo el juego.

const PATHS: Record<string, ReactNode> = {
  scrap: (
    <>
      <path d="M4 15l4-9 5 3 3-4 4 7-3 7H7z" />
      <path d="M9 12l3 2 3-3" />
    </>
  ),
  energy: <path d="M13 2L5 14h6l-1 8 8-12h-6z" />,
  alloys: (
    <>
      <path d="M3 17l4-8h10l4 8z" />
      <path d="M7 9l2-4h6l2 4" />
    </>
  ),
  data: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 9h3M8 12h8M8 15h5" />
    </>
  ),
  core: (
    <>
      <path d="M12 2l7 5v10l-7 5-7-5V7z" />
      <path d="M12 7l3 2.5v5L12 17l-3-2.5v-5z" />
    </>
  ),
  drone: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 9V5M12 15v4M9 12H5M15 12h4" />
      <circle cx="5" cy="5" r="2" />
      <circle cx="19" cy="5" r="2" />
      <circle cx="5" cy="19" r="2" />
      <circle cx="19" cy="19" r="2" />
    </>
  ),
  solar: (
    <>
      <rect x="3" y="6" width="18" height="10" rx="1" />
      <path d="M9 6v10M15 6v10M3 11h18M12 16v5M8 21h8" />
    </>
  ),
  sorter: (
    <>
      <path d="M4 5h16l-6 7v6l-4 2v-8z" />
    </>
  ),
  foundry: (
    <>
      <path d="M4 20V10l5 3V10l5 3V6h4v14z" />
      <path d="M16 3c0 1 1 1 1 2" />
    </>
  ),
  lab: (
    <>
      <path d="M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3" />
      <path d="M7.5 15h9" />
    </>
  ),
  fabricator: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
    </>
  ),
  reactor: (
    <>
      <circle cx="12" cy="12" r="2.5" />
      <ellipse cx="12" cy="12" rx="9" ry="3.5" />
      <ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(-60 12 12)" />
    </>
  ),
  harvester: (
    <>
      <path d="M3 12l5-4h8l5 4-5 4H8z" />
      <path d="M8 8l-2-4M16 8l2-4M8 16l-2 4M16 16l2 4" />
    </>
  ),
  station: (
    <>
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="8" strokeDasharray="3 2" />
      <path d="M12 1v4M12 19v4M1 12h4M19 12h4" />
    </>
  ),
  workshop: (
    <>
      <path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z" />
    </>
  ),
  research: (
    <>
      <circle cx="12" cy="12" r="2" />
      <path d="M12 3a9 9 0 019 9M12 21a9 9 0 01-9-9" />
      <path d="M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </>
  ),
  expedition: (
    <>
      <path d="M12 2c3 3 4 7 4 11l-4 3-4-3c0-4 1-8 4-11z" />
      <path d="M8 13l-3 3 1 4 3-2M16 13l3 3-1 4-3-2" />
      <circle cx="12" cy="9" r="1.5" />
    </>
  ),
  modules: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M17.5 14v7M14 17.5h7" />
    </>
  ),
  log: (
    <>
      <path d="M4 20V4M4 20h16" />
      <path d="M7 15l4-4 3 3 5-6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
  soundOn: (
    <>
      <path d="M4 9h4l5-4v14l-5-4H4z" />
      <path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11" />
    </>
  ),
  soundOff: (
    <>
      <path d="M4 9h4l5-4v14l-5-4H4z" />
      <path d="M17 9l5 6M22 9l-5 6" />
    </>
  ),
  bolt: <path d="M13 2L5 14h6l-1 8 8-12h-6z" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 018 0v4" />
    </>
  ),
  check: <path d="M4 12l5 5L20 6" />,
  hull: <path d="M12 2l8 4v6c0 5-4 9-8 10-4-1-8-5-8-10V6z" />,
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  power: (
    <>
      <path d="M12 3v8" />
      <path d="M6.3 7.3a8 8 0 1011.4 0" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4h8v5a4 4 0 01-8 0z" />
      <path d="M8 6H4a3 3 0 003 4M16 6h4a3 3 0 01-3 4M12 13v4M8 21h8M9 17h6" />
    </>
  ),
};

export function Icon({ name, size = 18, className }: { name: string; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name] ?? PATHS.target}
    </svg>
  );
}
