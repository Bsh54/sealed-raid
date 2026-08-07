export function Spinner({ size = 48 }: { size?: number }) {
  return (
    <svg
      className="animate-spin"
      width={size}
      height={size}
      viewBox="0 0 50 50"
      fill="none"
      aria-label="loading"
    >
      <circle cx="25" cy="25" r="20" stroke="var(--line-strong)" strokeWidth="4" />
      <circle
        cx="25"
        cy="25"
        r="20"
        stroke="var(--shard)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="90 150"
      />
    </svg>
  );
}
