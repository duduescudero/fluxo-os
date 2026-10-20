import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { statuses, priorities } from "./format";
import type { Status, Priority } from "./types";
export function Badge({ status }: { status: Status }) {
  return (
    <span className={`badge s-${status}`}>
      <i />
      {statuses[status]}
    </span>
  );
}
export function PriorityBadge({ value }: { value: Priority }) {
  return <span className={`priority p-${value}`}>{priorities[value]}</span>;
}
export function ErrorBox({ error }: { error: unknown }) {
  return (
    <div className="error-box" role="alert">
      <AlertCircle size={18} />
      <span>
        {error instanceof Error
          ? error.message
          : "Não foi possível carregar. Tente novamente."}
      </span>
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      Carregando informações…
    </div>
  );
}
export function Empty({
  title = "Nada por aqui ainda",
  text = "Os registros aparecerão nesta área.",
  action,
}: {
  title?: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">↗</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Pagination({
  page,
  total,
  size,
  onPage,
}: {
  page: number;
  total: number;
  size: number;
  onPage: (n: number) => void;
}) {
  return (
    <div className="pagination">
      <span>
        {total
          ? `${(page - 1) * size + 1}–${Math.min(page * size, total)} de ${total} registros`
          : "Nenhum registro"}
      </span>
      <div>
        <button
          className="button secondary small"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label="Página anterior"
        >
          <ArrowLeft size={15} />
        </button>
        <span>Página {page}</span>
        <button
          className="button secondary small"
          disabled={page * size >= total}
          onClick={() => onPage(page + 1)}
          aria-label="Próxima página"
        >
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Fechar" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Toast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [message, onClose]);
  return (
    <div className="toast" role="status">
      <Check size={18} />
      {message}
      <button
        className="icon-button"
        onClick={onClose}
        aria-label="Fechar aviso"
      >
        <X size={16} />
      </button>
    </div>
  );
}
