export type RoleName =
  | "Administrador"
  | "Analista"
  | "Comercial"
  | "Jurídico"
  | "Financiero"
  | "Técnico"
  | "Lector";

const permissions: Record<string, RoleName[]> = {
  "companies.read": ["Administrador", "Analista", "Comercial", "Jurídico", "Financiero", "Técnico", "Lector"],
  "companies.write": ["Administrador"],
  "assessments.write": ["Administrador", "Analista"],
  "decisions.write": ["Administrador", "Analista", "Comercial"],
  "opportunities.write": ["Administrador", "Comercial"],
  "admin.read": ["Administrador"],
  "secop.sync": ["Administrador"],
};

export function can(role: RoleName, permission: string) {
  return permissions[permission]?.includes(role) ?? false;
}

export function assertTenant(resourceCompanyId: string, activeCompanyId: string) {
  if (resourceCompanyId !== activeCompanyId) {
    const error = new Error("La empresa activa no puede acceder a este recurso.");
    error.name = "ForbiddenError";
    throw error;
  }
}
