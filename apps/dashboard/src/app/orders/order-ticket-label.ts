/** "#012": the order number as the owner and customer see it. */
export function orderNoLabel(orderNo: number): string {
  return `#${String(orderNo).padStart(3, '0')}`;
}
