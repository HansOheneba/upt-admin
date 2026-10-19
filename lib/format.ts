export function ghs(value: number) {
  const formatted = new Intl.NumberFormat("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  return `GH₵${formatted}`;
}
