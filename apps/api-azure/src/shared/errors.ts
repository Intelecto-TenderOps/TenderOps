export class DomainError extends Error {
  constructor(
    public status: number,
    public code: string,
    public transient = false,
    public retryAfter?: number,
  ) {
    super(code);
  }
}

export function problem(status: number, code: string, correlationId: string, extras: Record<string, unknown> = {}) {
  return {
    type: `urn:tenderops:problem:${code}`,
    title: code,
    status,
    code,
    correlationId,
    ...extras,
  };
}

export function isTransientStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}
