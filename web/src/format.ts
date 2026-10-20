import type { Status, Priority } from "./types";
export const statuses: Record<Status, string> = {
  Received: "Recebida",
  Diagnosing: "Em diagnóstico",
  AwaitingApproval: "Aguardando aprovação",
  Approved: "Aprovada",
  Repairing: "Em manutenção",
  Ready: "Pronta para retirada",
  Delivered: "Entregue",
  Declined: "Orçamento recusado",
  Cancelled: "Cancelada",
};
export const priorities: Record<Priority, string> = {
  Normal: "Normal",
  High: "Alta",
  Urgent: "Urgente",
};
export const money = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    n,
  );
export const date = (s: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(s));
export const dateTime = (s: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(s));
export const number = (n: number) => `OS-${String(n).padStart(4, "0")}`;
export const initials = (s: string) =>
  s
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
export const late = (o: { dueAt: string; status: Status }) =>
  !["Delivered", "Cancelled"].includes(o.status) &&
  new Date(o.dueAt).getTime() < Date.now();
