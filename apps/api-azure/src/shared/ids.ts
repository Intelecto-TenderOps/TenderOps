import { createHash, randomUUID } from "node:crypto";

export function stableId(text: string): string {
  const hex = createHash("sha256").update(text).digest("hex").slice(0, 32);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

export function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function newId(): string {
  return randomUUID();
}

export function createPrefixedId(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}
