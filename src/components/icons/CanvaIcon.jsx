export function CanvaIcon({ className = 'h-4 w-4' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="10" fill="url(#canva-gradient)" />
      <path
        d="M7.5 15.5c1.2-2.4 2.4-4.8 4.1-6.9.5-.6 1.2-1.1 2-1.1.8 0 1.3.5 1.3 1.2 0 .7-.5 1.3-1.1 1.8-1.5 1.3-2.8 2.9-3.8 4.6-.3.5-.8.8-1.4.8-.6 0-1.1-.4-1.1-1.4zM12.8 15.5c.9-1.8 1.9-3.5 3.1-5 .4-.5 1-.9 1.6-.9.6 0 1 .4 1 .9 0 .5-.3 1-.7 1.4-1.1 1.1-2 2.4-2.7 3.8-.2.4-.6.7-1 .7-.5 0-.9-.3-.9-.9z"
        fill="white"
      />
      <defs>
        <linearGradient id="canva-gradient" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00C4CC" />
          <stop offset="1" stopColor="#7D2AE8" />
        </linearGradient>
      </defs>
    </svg>
  );
}
