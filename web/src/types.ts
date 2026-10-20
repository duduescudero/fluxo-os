export type Status =
  | "Received"
  | "Diagnosing"
  | "AwaitingApproval"
  | "Approved"
  | "Repairing"
  | "Ready"
  | "Delivered"
  | "Declined"
  | "Cancelled";
export type Priority = "Normal" | "High" | "Urgent";
export interface User {
  id: string;
  displayName: string;
  email: string;
  role: "Admin" | "Technician";
  demo: boolean;
  disabled?: boolean;
}
export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  archived: boolean;
  version: string;
}
export interface Equipment {
  id: string;
  customerId: string;
  customerName: string;
  category: string;
  brand: string;
  model: string;
  serial: string | null;
  notes: string | null;
  archived: boolean;
  version: string;
}
export interface Summary {
  id: string;
  number: number;
  customerId: string;
  customerName: string;
  equipmentName: string;
  technicianId: string | null;
  problem: string;
  priority: Priority;
  status: Status;
  createdAt: string;
  dueAt: string;
  version: string;
}
export interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}
export interface Quote {
  id: string;
  revision: number;
  status: "Draft" | "Pending" | "Approved" | "Declined" | "Superseded";
  validUntil: string;
  decidedAt: string | null;
  decisionChannel: string | null;
  decisionNote: string | null;
  total: number;
  items: QuoteItem[];
}
export interface Order extends Summary {
  phone: string;
  equipmentId: string;
  condition: string;
  accessories: string;
  diagnosis: string;
  workPerformed: string;
  receiver: string | null;
  updatedAt: string;
  quotes: Quote[];
  events: {
    id: string;
    actor: string;
    title: string;
    detail: string;
    at: string;
  }[];
}
export interface Team {
  id: string;
  displayName: string;
}
export interface Page<T> {
  items: T[];
  total: number;
  pageNumber: number;
  pageSize: number;
}
export interface Dashboard {
  open: number;
  late: number;
  groups: { status: Status; count: number }[];
  recent: Summary[];
}
