export interface CommercialOpportunity {
  id: string;
  tenderId: string;
  dynamicsOpportunityId: string;
  dynamicsAccountId: string;
  account: string;
  name: string;
  value: number;
  owner: string;
  stage: "calificación" | "propuesta" | "negociación" | "ganada" | "perdida";
  status: "abierta" | "cerrada";
  outcome: "ganada" | "perdida" | null;
  activities: number;
  tasks: number;
  documents: number;
  createdAt: string;
}
