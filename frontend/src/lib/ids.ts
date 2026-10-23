export function createId(prefix: string): string {
  const random = crypto.randomUUID().slice(0, 8);
  return `${prefix}-${random}`;
}
