import { createHmac, timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { integrationReady, loadConfig } from "./config.js";
import { DomainError } from "./errors.js";
import type { Actor } from "./types.js";

const DEMO_ISSUER = "urn:tenderops:demo";
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export interface SessionToken {
  actor: Actor;
  demo: boolean;
}

function encode(payload: Record<string, unknown>, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function decodeDemo(token: string, secret: string): SessionToken {
  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) throw new DomainError(401, "authentication_required");
  const expected = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) throw new DomainError(401, "authentication_required");
  const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as {
    tid?: string;
    oid?: string;
    name?: string;
    exp?: number;
    iss?: string;
  };
  if (payload.iss !== DEMO_ISSUER || !payload.tid || !payload.oid || (payload.exp ?? 0) * 1000 < Date.now()) {
    throw new DomainError(401, "authentication_required");
  }
  return {
    demo: true,
    actor: {
      tenantId: payload.tid,
      objectId: payload.oid,
      name: payload.name ?? "Demostración",
      key: `${payload.tid}:${payload.oid}`,
    },
  };
}

export function issueDemoToken(actor: Actor, secret: string, minutes = 30): string {
  const now = Math.floor(Date.now() / 1000);
  return encode(
    {
      iss: DEMO_ISSUER,
      tid: actor.tenantId,
      oid: actor.objectId,
      name: actor.name,
      iat: now,
      exp: now + minutes * 60,
    },
    secret,
  );
}

export async function verifyBearer(authorization: string | null): Promise<SessionToken> {
  if (!authorization?.startsWith("Bearer ")) throw new DomainError(401, "authentication_required");
  const token = authorization.slice(7).trim();
  const config = loadConfig();
  if (config.demoEnabled && config.demoTokenSecret) {
    try {
      return decodeDemo(token, config.demoTokenSecret);
    } catch {
      // Fall through to Entra if configured.
    }
  }
  if (!integrationReady("entra")) throw new DomainError(401, "authentication_required");
  const issuer = `https://login.microsoftonline.com/${config.tenantId}/v2.0`;
  const jwksUrl = `https://login.microsoftonline.com/${config.tenantId}/discovery/v2.0/keys`;
  let jwks = jwksCache.get(jwksUrl);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(jwksUrl));
    jwksCache.set(jwksUrl, jwks);
  }
  const { payload } = await jwtVerify(token, jwks, {
    issuer,
    audience: config.apiAudience,
  }).catch(() => {
    throw new DomainError(401, "authentication_required");
  });
  const tid = String(payload.tid ?? "");
  const oid = String(payload.oid ?? "");
  if (tid !== config.tenantId || !oid) throw new DomainError(401, "authentication_required");
  return {
    demo: false,
    actor: {
      tenantId: tid,
      objectId: oid,
      name: String(payload.name ?? payload.preferred_username ?? "Usuario"),
      key: `${tid}:${oid}`,
    },
  };
}

export function cookieValue(header: string | null, name: string): string | null {
  if (!header) return null;
  const match = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export async function authenticate(authorization: string | null, cookieHeader: string | null): Promise<SessionToken> {
  const cookieToken = cookieValue(cookieHeader, "tenderops_session");
  if (authorization?.startsWith("Bearer ")) return verifyBearer(authorization);
  if (cookieToken) return verifyBearer(`Bearer ${cookieToken}`);
  throw new DomainError(401, "authentication_required");
}
