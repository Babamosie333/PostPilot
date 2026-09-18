export default function Logo({ size = 22, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="postpilot-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4f7cff" />
          <stop offset="100%" stopColor="#9b5cf6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#postpilot-logo-grad)" />
      <path
        d="M11 7.5h7.6c3 0 5.1 2 5.1 4.9 0 2.9-2.1 4.9-5.1 4.9h-3.7v6.2H11V7.5Zm3.9 2.9v4h3.4c1.5 0 2.5-.8 2.5-2s-1-2-2.5-2h-3.4Z"
        fill="white"
      />
    </svg>
  );
}