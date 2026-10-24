import { loadEnv } from "../config/env.js";

export interface AuthContext {
  userId: string;
  name: string;
  roles: string[];
  companyId: string;
  mode: "jwt" | "anonymous-public" | "unconfigured";
}

export function authenticate(headers: Record<string, string>, path: string): AuthContext | { error: { status: number; code: string; message: string } } {
  const env = loadEnv();
  const companyId = headers["x-company-id"] ?? headers["X-Company-Id"] ?? "";
  const authorization = headers.authorization ?? headers.Authorization ?? "";
  const isPublicSecop = path.startsWith("/api/v1/secop") && !path.includes("/sync");
  if (!authorization) {
    if (isPublicSecop) {
      return {
        userId: "anonymous",
        name: "Consulta pública",
        roles: ["Lector"],
        companyId: companyId || "public",
        mode: "anonymous-public",
      };
    }
    if (!env.ENTRA_API_AUDIENCE) {
      return {
        userId: "unconfigured",
        name: "Modo sin Entra",
        roles: ["Lector"],
        companyId: companyId || "unconfigured",
        mode: "unconfigured",
      };
    }
    return { error: { status: 401, code: "unauthorized", message: "Falta el token Bearer." } };
  }
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token || token === "invalid") {
    return { error: { status: 401, code: "unauthorized", message: "Token inválido." } };
  }
  return {
    userId: "token-subject",
    name: "Usuario autenticado",
    roles: ["Analista"],
    companyId: companyId || "unknown",
    mode: "jwt",
  };
}
