export function formatPercent(value: number): string {
  if (isNaN(value)) return '0%';
  return `${(value * 100).toFixed(1)}%`;
}

export function formatScore(value: number): string {
  if (isNaN(value)) return '0.0';
  return value.toFixed(1);
}
