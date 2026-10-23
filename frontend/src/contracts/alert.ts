export type AlertKind =
  | "nueva"
  | "cambio"
  | "adenda"
  | "vencimiento"
  | "riesgo";

export interface AlertItem {
  id: string;
  tenderId: string;
  kind: AlertKind;
  title: string;
  detail: string;
  urgency: "baja" | "media" | "alta";
  read: boolean;
  silenced: boolean;
  createdAt: string;
}
