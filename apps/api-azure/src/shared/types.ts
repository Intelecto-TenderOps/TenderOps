export interface Actor {
  tenantId: string;
  objectId: string;
  name: string;
  key: string;
}

export interface Resource<T = Record<string, unknown>> {
  id: string;
  companyId: string;
  kind: string;
  version: number;
  data: T;
}

export interface CommandReceipt {
  id: string;
  companyId: string;
  fingerprint: string;
  resourceId: string;
  kind: string;
}

export interface AuditEntry {
  id: string;
  companyId: string;
  entityId: string;
  actor: string;
  action: string;
  occurredAt: string;
  correlationId: string;
  before: Resource | null;
  after: Resource;
}

export interface IntegrationEvent {
  eventId: string;
  eventType: string;
  schemaVersion: number;
  companyId: string;
  entityId: string;
  entityVersion: number;
  occurredAt: string;
  source: string;
  correlationId: string;
}

export interface MembershipData {
  tenantId: string;
  objectId: string;
  roles: string[];
  active: boolean;
}

export interface CompanyData {
  legalName: string;
  countryCode: string;
  taxId: string;
}

export interface Page<T> {
  items: T[];
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  source?: "catalog" | "secop" | "hybrid";
  simulated?: boolean;
  fetchedAt?: string;
}

export interface ServiceMeta {
  source: "demo" | "azure-functions";
  simulated: boolean;
}
