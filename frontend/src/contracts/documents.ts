export interface ProcessDocument {
  id: string;
  tenderId: string;
  name: string;
  category: string;
  version: number;
  status: "disponible" | "en_revision" | "cuarentena";
  reviewed: boolean;
  sizeKb: number;
  uploadedAt: string;
  sharePointId: string | null;
  excerpt: string;
}

export interface Evidence {
  id: string;
  documentId: string;
  tenderId: string;
  label: string;
  locator: string;
  note: string;
}
