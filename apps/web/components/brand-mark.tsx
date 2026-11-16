/** The product's mark: a ledger page with its last line ticked off. */
export function BrandMark({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="3" y="2" width="18" height="20" rx="3" fill="var(--primary)" />
      <rect x="7" y="7" width="10" height="1.75" rx="0.875" fill="#ffffff" opacity="0.55" />
      <rect x="7" y="11" width="7" height="1.75" rx="0.875" fill="#ffffff" opacity="0.55" />
      <path
        d="M7.5 16.2l2 2 4.5-4.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
