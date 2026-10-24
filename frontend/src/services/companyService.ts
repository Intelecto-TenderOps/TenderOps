import type {
  Capability,
  Company,
  CompanyDocument,
  Experience,
  FinancialSnapshot,
  GeoCoverage,
  Membership,
  ParticipationRule,
} from "@/contracts";
import { createId } from "@/lib/ids";
import { apiGet } from "./http";
import { readWorkspace, simulateLatency, writeWorkspace } from "./workspace";

export const companyService = {
  async list() {
    try {
      const result = await apiGet<{ configured?: boolean; message?: string }>("/api/v1/companies");
      return {
        items: readWorkspace().companies,
        source: result.configured ? ("live" as const) : ("unconfigured" as const),
        message: result.message,
      };
    } catch {
      return { items: readWorkspace().companies, source: "demo" as const };
    }
  },
  async saveCompany(company: Company) {
    writeWorkspace((workspace) => ({
      ...workspace,
      companies: workspace.companies.map((item) => (item.id === company.id ? company : item)),
    }));
    return simulateLatency(company);
  },
  async saveCapability(capability: Capability) {
    const record = { ...capability, id: capability.id || createId("cap") };
    writeWorkspace((workspace) => ({
      ...workspace,
      capabilities: workspace.capabilities.some((item) => item.id === record.id)
        ? workspace.capabilities.map((item) => (item.id === record.id ? record : item))
        : [record, ...workspace.capabilities],
    }));
    return simulateLatency(record);
  },
  async saveExperience(experience: Experience) {
    const record = { ...experience, id: experience.id || createId("exp") };
    writeWorkspace((workspace) => ({
      ...workspace,
      experiences: workspace.experiences.some((item) => item.id === record.id)
        ? workspace.experiences.map((item) => (item.id === record.id ? record : item))
        : [record, ...workspace.experiences],
    }));
    return simulateLatency(record);
  },
  async saveFinancial(snapshot: FinancialSnapshot) {
    writeWorkspace((workspace) => ({
      ...workspace,
      financials: [snapshot, ...workspace.financials.filter((item) => item.id !== snapshot.id)],
    }));
    return simulateLatency(snapshot);
  },
  async saveCoverage(item: GeoCoverage) {
    writeWorkspace((workspace) => ({
      ...workspace,
      coverage: workspace.coverage.some((row) => row.id === item.id)
        ? workspace.coverage.map((row) => (row.id === item.id ? item : row))
        : [item, ...workspace.coverage],
    }));
    return simulateLatency(item);
  },
  async saveRule(rule: ParticipationRule) {
    writeWorkspace((workspace) => ({
      ...workspace,
      rules: workspace.rules.some((item) => item.id === rule.id)
        ? workspace.rules.map((item) => (item.id === rule.id ? rule : item))
        : [rule, ...workspace.rules],
    }));
    return simulateLatency(rule);
  },
  async saveDocument(document: CompanyDocument) {
    writeWorkspace((workspace) => ({
      ...workspace,
      companyDocuments: workspace.companyDocuments.some((item) => item.id === document.id)
        ? workspace.companyDocuments.map((item) => (item.id === document.id ? document : item))
        : [document, ...workspace.companyDocuments],
    }));
    return simulateLatency(document);
  },
  async saveMember(member: Membership) {
    writeWorkspace((workspace) => ({
      ...workspace,
      memberships: workspace.memberships.some((item) => item.id === member.id)
        ? workspace.memberships.map((item) => (item.id === member.id ? member : item))
        : [member, ...workspace.memberships],
    }));
    return simulateLatency(member);
  },
};
