/** The app's mark: a yellow paddle and a white ball on Swedish blue (same drawing as app/icon.svg). */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden focusable="false">
      <rect width="64" height="64" rx="14" fill="#005B99" />
      <g transform="translate(-2 3) rotate(38 29 33) scale(0.92) translate(2.5 2.8)">
        <rect x="24.5" y="40" width="9" height="17" rx="4" fill="#FECC02" />
        <ellipse cx="29" cy="28" rx="14" ry="16" fill="#FECC02" />
      </g>
      <circle cx="48" cy="15.5" r="5.5" fill="#FFFFFF" />
    </svg>
  );
}
