export const roles = [
  "Administrator",
  "Analyst",
  "Commercial",
  "Legal",
  "Financial",
  "Approver",
  "Auditor",
] as const;

export type RoleName = (typeof roles)[number];

const profileRead = ["profile.read"] as const;

export const rolePermissions: Record<RoleName, string[]> = {
  Administrator: [
    ...profileRead,
    "company.write",
    "profile.write",
    "members.read",
    "members.write",
    "audit.read",
    "rules.write",
    "workbench.read",
    "workbench.edit",
    "workbench.source",
    "workbench.commercial",
    "workbench.operations",
    "workbench.comment",
    "workbench.approve",
  ],
  Analyst: [...profileRead, "profile.write", "workbench.read", "workbench.edit", "workbench.comment", "workbench.approve"],
  Commercial: [...profileRead, "rules.write", "workbench.read", "workbench.commercial", "workbench.comment"],
  Legal: [...profileRead, "sourcepolicy.write", "workbench.read", "workbench.legal", "workbench.approve"],
  Financial: [...profileRead, "financial.read", "financial.write", "workbench.read", "workbench.finance", "workbench.approve"],
  Approver: [
    ...profileRead,
    "financial.read",
    "financial.approve",
    "rules.publish",
    "workbench.read",
    "workbench.decide",
    "workbench.approve",
  ],
  Auditor: [...profileRead, "financial.read", "audit.read", "workbench.read", "workbench.audit"],
};

export function permissionsFor(memberRoles: string[], active = true): string[] {
  if (!active) return [];
  return [...new Set(memberRoles.filter((role): role is RoleName => role in rolePermissions).flatMap((role) => rolePermissions[role]))].sort();
}

export function readPermission(kind: string): string {
  if (kind === "financial") return "financial.read";
  if (kind === "membership" || kind === "team") return "members.read";
  return "profile.read";
}

export function writePermission(kind: string): string {
  if (kind === "company") return "company.write";
  if (kind === "financial") return "financial.write";
  if (kind === "membership" || kind === "team") return "members.write";
  if (kind === "rule") return "rules.write";
  if (kind === "sourcepolicy") return "sourcepolicy.write";
  return "profile.write";
}

export function hasPermission(granted: string[], needed: string): boolean {
  return granted.includes(needed);
}
