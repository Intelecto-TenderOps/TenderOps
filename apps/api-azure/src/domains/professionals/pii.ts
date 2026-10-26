import { createHash } from "node:crypto";

export function identityHash(companyId: string, documentType: string, documentNumber: string): string {
  return createHash("sha256")
    .update(`${companyId}|${documentType.trim().toUpperCase()}|${documentNumber.trim()}`)
    .digest("hex");
}

export function maskDocument(value: string): string {
  const digits = value.replace(/\s+/g, "");
  if (digits.length <= 4) return "****";
  return `****${digits.slice(-4)}`;
}

export function maskEmail(value: string): string {
  const [user, domain] = value.split("@");
  if (!user || !domain) return "***";
  return `${user.slice(0, 1)}***@${domain}`;
}

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `***${digits.slice(-4)}`;
}

export function fullName(givenName: string, middleName: string, familyName: string): string {
  return [givenName, middleName, familyName].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}
