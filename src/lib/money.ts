export function formatPurse(amount: number): string {
  const lakhs = amount / 100_000;
  if (lakhs >= 100) {
    return `₹${(amount / 10_000_000).toFixed(2)} Cr`;
  }
  return `₹${lakhs.toFixed(2)} L`;
}
