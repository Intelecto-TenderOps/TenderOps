import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  Compass,
  FileStack,
  Gauge,
  LayoutDashboard,
  ListChecks,
  MessageSquareText,
  Scale,
  Settings2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export interface NavChild {
  id: string;
  label: string;
  to: string;
}

export interface NavItem {
  id: string;
  label: string;
  to: string;
  icon: LucideIcon;
  children?: NavChild[];
}

export const navigation: NavItem[] = [
  { id: "panorama", label: "Panorama", to: "/panorama", icon: LayoutDashboard },
  { id: "explorar", label: "Exploración", to: "/explorar", icon: Compass },
  { id: "calificacion", label: "Calificación", to: "/calificacion", icon: Gauge },
  {
    id: "procesos",
    label: "Procesos",
    to: "/procesos",
    icon: Scale,
    children: [
      { id: "procesos-lista", label: "Expedientes", to: "/procesos" },
      { id: "procesos-matriz", label: "Matrices", to: "/procesos/SECOP-LP-2026-041/matriz" },
      { id: "procesos-decision", label: "Decisiones", to: "/procesos/SECOP-LP-2026-041/decision" },
    ],
  },
  { id: "documentos", label: "Documentos", to: "/documentos", icon: FileStack },
  { id: "preparacion", label: "Preparación", to: "/preparacion", icon: ListChecks },
  { id: "oportunidades", label: "Oportunidades", to: "/oportunidades", icon: BriefcaseBusiness },
  { id: "tareas", label: "Tareas", to: "/tareas", icon: Bell },
  { id: "analitica", label: "Analítica", to: "/analitica", icon: BarChart3 },
  { id: "copilot", label: "Copilot", to: "/copilot", icon: MessageSquareText },
  {
    id: "administracion",
    label: "Administración",
    to: "/administracion",
    icon: Settings2,
    children: [
      { id: "admin-usuarios", label: "Usuarios y roles", to: "/administracion/usuarios" },
      { id: "admin-empresas", label: "Empresas", to: "/administracion/empresas" },
      { id: "admin-fuentes", label: "Fuentes", to: "/administracion/fuentes" },
      { id: "admin-parametros", label: "Parámetros", to: "/administracion/parametros" },
      { id: "admin-auditoria", label: "Auditoría", to: "/administracion/auditoria" },
      { id: "admin-integraciones", label: "Integraciones", to: "/administracion/integraciones" },
    ],
  },
  {
    id: "empresa",
    label: "Empresa",
    to: "/empresa",
    icon: Building2,
    children: [
      { id: "empresa-datos", label: "Datos legales", to: "/empresa" },
      { id: "empresa-capacidades", label: "Capacidades", to: "/empresa/capacidades" },
      { id: "empresa-experiencia", label: "Experiencia", to: "/empresa/experiencia" },
      { id: "empresa-financiera", label: "Capacidad financiera", to: "/empresa/financiera" },
      { id: "empresa-cobertura", label: "Cobertura", to: "/empresa/cobertura" },
      { id: "empresa-reglas", label: "Reglas", to: "/empresa/reglas" },
      { id: "empresa-documentos", label: "Documentos", to: "/empresa/documentos" },
      { id: "empresa-usuarios", label: "Usuarios y equipos", to: "/empresa/usuarios" },
    ],
  },
];

export const alertShortcut = {
  id: "alertas",
  label: "Alertas",
  to: "/alertas",
  icon: Sparkles,
};
