export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / (60 * 1000));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;

  return new Date(iso).toLocaleDateString();
}

export function formatCurrency(value: number): string {
  return `$${(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
