import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  History,
  Monitor,
  Plus,
  Printer,
  Send,
  ShieldCheck,
  Trash2,
  UserRound,
  Wrench,
} from "lucide-react";
import { api, body } from "./api";
import { useSession } from "./App";
import { Badge, ErrorBox, Loading, Modal, PriorityBadge } from "./components";
import { date, dateTime, money, number, statuses } from "./format";
import type { Order, Status, User } from "./types";

export function OrderDetail() {
  const { id } = useParams();
  const { user, notify } = useSession();
  const client = useQueryClient();
  const [tab, setTab] = useState("overview"),
    [dialog, setDialog] = useState(""),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  const {
    data: o,
    isPending,
    error: loadError,
  } = useQuery({
    queryKey: ["order", id],
    queryFn: () => api<Order>("/orders/" + id),
  });
  const { data: team } = useQuery({
    queryKey: ["users"],
    queryFn: () => api<User[]>("/users"),
    enabled: user.role === "Admin",
  });
  if (isPending) return <Loading />;
  if (loadError || !o) return <ErrorBox error={loadError} />;
  const closed = ["Delivered", "Cancelled"].includes(o.status);
  const quote = o.quotes[0];
  async function mutate(path: string, value: unknown) {
    setBusy(true);
    setError(null);
    try {
      await api(`/orders/${id}/${path}`, { method: "POST", body: body(value) });
      await client.invalidateQueries({ queryKey: ["order", id] });
      await client.invalidateQueries({ queryKey: ["orders"] });
      await client.invalidateQueries({ queryKey: ["dashboard"] });
      setDialog("");
      notify("Atendimento atualizado. Histórico preservado.");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  const command = (action: string, extra: Record<string, unknown> = {}) =>
    mutate("actions/" + action, { version: o.version, ...extra });
  const actions: { label: string; status: Status }[] =
    o.status === "Received"
      ? [{ label: "Iniciar diagnóstico", status: "Diagnosing" }]
      : o.status === "Approved"
        ? [{ label: "Iniciar manutenção", status: "Repairing" }]
        : o.status === "Repairing"
          ? [{ label: "Concluir manutenção", status: "Ready" }]
          : (o.status === "Ready" || o.status === "Declined") &&
              user.role === "Admin"
            ? [
                {
                  label:
                    o.status === "Declined"
                      ? "Registrar devolução"
                      : "Registrar entrega",
                  status: "Delivered",
                },
              ]
            : [];
  const steps: Status[] = [
    "Received",
    "Diagnosing",
    "AwaitingApproval",
    "Approved",
    "Repairing",
    "Ready",
    "Delivered",
  ];
  const active = steps.indexOf(o.status);
  return (
    <>
      <Link to="/ordens" className="back-link">
        <ArrowLeft size={15} />
        Voltar para ordens de serviço
      </Link>
      <div className="detail-heading">
        <div>
          <div className="eyebrow">ATENDIMENTO EM DETALHES</div>
          <h1>
            {number(o.number)} <Badge status={o.status} />
          </h1>
          <p>
            Aberta em {dateTime(o.createdAt)} · {o.customerName}
          </p>
        </div>
        <button className="button secondary" onClick={() => window.print()}>
          <Printer size={16} />
          Imprimir resumo
        </button>
      </div>
      <div className="order-steps" aria-label="Etapas do atendimento">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`${i === active ? "current" : ""} ${i < active ? "done" : ""}`}
          >
            <span>{i < active ? <Check size={12} /> : i + 1}</span>
            <strong>{statuses[s]}</strong>
            {i < steps.length - 1 && <ChevronRight size={15} />}
          </div>
        ))}
      </div>
      {user.demo && (
        <div className="info-banner">
          <ShieldCheck size={17} />
          Demonstração somente leitura. Todas as informações são fictícias.
        </div>
      )}
      {error != null && !dialog && <ErrorBox error={error} />}
      <div className="detail-actions">
        <div>
          <PriorityBadge value={o.priority} />
          <span>
            <Clock3 size={15} />
            Prazo: {date(o.dueAt)}
          </span>
        </div>
        <div>
          {user.role === "Admin" && !closed && (
            <button
              className="button secondary small"
              disabled={user.demo}
              onClick={() => setDialog("assign")}
            >
              Atribuir técnico
            </button>
          )}
          {actions.map((a) => (
            <button
              className="button primary small"
              key={a.status}
              disabled={user.demo || busy}
              onClick={() =>
                a.status === "Ready" || a.status === "Delivered"
                  ? setDialog(a.status)
                  : void command("transition", { status: a.status, text: "" })
              }
            >
              {a.label}
              <ArrowRight size={15} />
            </button>
          ))}
          {user.role === "Admin" && !closed && (
            <button
              className="button danger-ghost small"
              disabled={user.demo}
              onClick={() => setDialog("Cancelled")}
            >
              Cancelar ordem
            </button>
          )}
        </div>
      </div>
      <div className="detail-columns">
        <div>
          <div className="tabs" role="tablist" aria-label="Seções da ordem">
            {[
              ["overview", "Visão geral", Monitor],
              ["quote", "Orçamentos", FileText],
              ["history", "Histórico", History],
            ].map(([key, label, Icon]) => (
              <button
                key={String(key)}
                role="tab"
                aria-selected={tab === key}
                className={tab === key ? "active" : ""}
                onClick={() => setTab(String(key))}
              >
                {typeof Icon !== "string" && <Icon size={16} />}
                <span>{String(label)}</span>
              </button>
            ))}
          </div>
          {tab === "overview" && (
            <>
              <section className="panel detail-panel">
                <h2>
                  <Monitor size={18} />
                  Equipamento e entrada
                </h2>
                <h3 className="equipment-title">{o.equipmentName}</h3>
                <dl className="detail-grid">
                  <div>
                    <dt>PROBLEMA RELATADO</dt>
                    <dd>{o.problem}</dd>
                  </div>
                  <div>
                    <dt>CONDIÇÃO NA ENTRADA</dt>
                    <dd>{o.condition}</dd>
                  </div>
                  <div>
                    <dt>ACESSÓRIOS RECEBIDOS</dt>
                    <dd>{o.accessories}</dd>
                  </div>
                  <div>
                    <dt>RETIRADA</dt>
                    <dd>{o.receiver ?? "Ainda não registrada"}</dd>
                  </div>
                </dl>
              </section>
              <section className="panel detail-panel">
                <div className="section-title">
                  <h2>
                    <Wrench size={18} />
                    Diagnóstico técnico
                  </h2>
                  {o.status === "Diagnosing" && (
                    <button
                      className="text-link"
                      disabled={user.demo}
                      onClick={() => setDialog("diagnosis")}
                    >
                      {o.diagnosis
                        ? "Editar diagnóstico"
                        : "Registrar diagnóstico"}
                    </button>
                  )}
                </div>
                <p className={o.diagnosis ? "content-text" : "muted"}>
                  {o.diagnosis ||
                    "O diagnóstico será registrado após a avaliação do técnico responsável."}
                </p>
                {o.workPerformed && (
                  <>
                    <h3>Serviço realizado</h3>
                    <p className="content-text">{o.workPerformed}</p>
                  </>
                )}
              </section>
              <section className="panel detail-panel">
                <div className="section-title">
                  <h2>
                    <History size={18} />
                    Últimas movimentações
                  </h2>
                  <button
                    className="text-link"
                    onClick={() => setTab("history")}
                  >
                    Ver histórico
                  </button>
                </div>
                <Timeline events={o.events.slice(0, 3)} />
              </section>
            </>
          )}
          {tab === "quote" && (
            <section className="panel detail-panel">
              <div className="section-title">
                <div>
                  <h2>
                    <FileText size={18} />
                    Orçamentos
                  </h2>
                  <p className="muted">Versões anteriores são preservadas.</p>
                </div>
                {[
                  "Diagnosing",
                  "AwaitingApproval",
                  "Approved",
                  "Declined",
                ].includes(o.status) && (
                  <button
                    className="button secondary small"
                    disabled={user.demo || !o.diagnosis}
                    onClick={() => setDialog("quote")}
                  >
                    <Plus size={15} />
                    {quote ? "Nova versão" : "Criar orçamento"}
                  </button>
                )}
              </div>
              {!o.quotes.length ? (
                <p className="muted">
                  Registre o diagnóstico e prepare o primeiro orçamento.
                </p>
              ) : (
                o.quotes.map((q, index) => (
                  <article
                    className={`quote-version ${index === 0 ? "current-quote" : ""}`}
                    key={q.id}
                  >
                    <div className="quote-version-heading">
                      <strong>
                        Versão {q.revision}
                        {index === 0 && (
                          <span className="current-label">ATUAL</span>
                        )}
                      </strong>
                      <span className="quote-status">
                        {
                          {
                            Draft: "Rascunho",
                            Pending: "Aguardando decisão",
                            Approved: "Aprovado",
                            Declined: "Recusado",
                            Superseded: "Substituído",
                          }[q.status]
                        }
                      </span>
                    </div>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Descrição</th>
                            <th>Qtd.</th>
                            <th>Unitário</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {q.items.map((item, i) => (
                            <tr key={i}>
                              <td>{item.description}</td>
                              <td>{item.quantity}</td>
                              <td>{money(item.unitPrice)}</td>
                              <td>{money(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="quote-total">
                      <span>Válido até {date(q.validUntil)}</span>
                      <strong>{money(q.total)}</strong>
                    </div>
                    {q.decisionNote && (
                      <div className="decision-record">
                        <ShieldCheck size={16} />
                        <div>
                          <strong>
                            Decisão registrada internamente ·{" "}
                            {q.decisionChannel}
                          </strong>
                          <p>{q.decisionNote}</p>
                          <small>
                            {q.decidedAt && dateTime(q.decidedAt)} · Não
                            constitui assinatura digital do cliente.
                          </small>
                        </div>
                      </div>
                    )}
                    {index === 0 && q.status === "Draft" && (
                      <button
                        className="button primary"
                        disabled={user.demo || busy}
                        onClick={() => void command("submit-quote")}
                      >
                        <Send size={15} />
                        Enviar para aprovação
                      </button>
                    )}
                    {index === 0 &&
                      q.status === "Pending" &&
                      user.role === "Admin" && (
                        <div className="button-group">
                          <button
                            className="button primary"
                            disabled={user.demo}
                            onClick={() => setDialog("approve")}
                          >
                            Registrar aprovação
                          </button>
                          <button
                            className="button secondary"
                            disabled={user.demo}
                            onClick={() => setDialog("decline")}
                          >
                            Registrar recusa
                          </button>
                        </div>
                      )}
                  </article>
                ))
              )}
            </section>
          )}
          {tab === "history" && (
            <section className="panel detail-panel">
              <div className="section-title">
                <h2>
                  <History size={18} />
                  Histórico do atendimento
                </h2>
                <button
                  className="button secondary small"
                  disabled={user.demo}
                  onClick={() => setDialog("note")}
                >
                  <Plus size={15} />
                  Observação
                </button>
              </div>
              <Timeline events={o.events} />
            </section>
          )}
        </div>
        <aside className="order-aside">
          <section className="panel detail-panel">
            <h2>
              <UserRound size={18} />
              Cliente
            </h2>
            <span className="aside-client">{o.customerName}</span>
            <p>{o.phone}</p>
            <Link
              className="text-link"
              to={`/ordens?customerId=${o.customerId}`}
            >
              Ver atendimentos
              <ArrowUpRightIcon />
            </Link>
          </section>
          <section className="panel detail-panel">
            <h2>Responsável pelo serviço</h2>
            <div className="assigned-tech">
              <span className="avatar">{o.technicianId ? "TC" : "—"}</span>
              <div>
                <strong>
                  {team?.find((t) => t.id === o.technicianId)?.displayName ??
                    (o.technicianId
                      ? o.technicianId === user.id
                        ? user.displayName
                        : "Técnico atribuído"
                      : "Não atribuído")}
                </strong>
                <small>
                  {o.technicianId
                    ? "Técnico responsável"
                    : "Atribua antes do diagnóstico"}
                </small>
              </div>
            </div>
          </section>
          <section className="order-tip">
            <ShieldCheck size={23} />
            <strong>Histórico que acompanha.</strong>
            <p>
              Alterações de etapa e orçamento ficam registradas para manter o
              atendimento rastreável.
            </p>
          </section>
        </aside>
      </div>
      <div className="print-only">
        <h2>Resumo do atendimento</h2>
        <p>
          <strong>Cliente:</strong> {o.customerName} · {o.phone}
        </p>
        <p>
          <strong>Equipamento:</strong> {o.equipmentName}
        </p>
        <p>
          <strong>Problema:</strong> {o.problem}
        </p>
        <p>
          <strong>Condição:</strong> {o.condition} · Acessórios: {o.accessories}
        </p>
        <p>
          <strong>Diagnóstico:</strong> {o.diagnosis || "Ainda não registrado"}
        </p>
        <p>
          <strong>Serviço realizado:</strong>{" "}
          {o.workPerformed || "Não registrado"}
        </p>
        <p>
          <strong>Retirada por:</strong> {o.receiver || "Ainda não registrada"}
        </p>
        {quote && (
          <>
            <h3>Orçamento versão {quote.revision}</h3>
            {quote.items.map((item, i) => (
              <p key={i}>
                {item.quantity} × {item.description}: {money(item.total)}
              </p>
            ))}
            <p>
              <strong>Total: {money(quote.total)}</strong>
            </p>
          </>
        )}
        <h2>Histórico completo</h2>
        {o.events.map((e) => (
          <p key={e.id}>
            {dateTime(e.at)} · {e.title} · {e.detail}
          </p>
        ))}
      </div>
      {dialog && (
        <Modal
          title={
            {
              assign: "Atribuir responsável",
              diagnosis: "Registrar diagnóstico",
              Ready: "Concluir manutenção",
              Delivered:
                o.status === "Declined"
                  ? "Devolver sem reparo"
                  : "Registrar entrega",
              Cancelled: "Cancelar ordem",
              note: "Adicionar observação",
              approve: "Registrar aprovação",
              decline: "Registrar recusa",
              quote: "Preparar orçamento",
            }[dialog] ?? dialog
          }
          onClose={() => {
            setDialog("");
            setError(null);
          }}
        >
          {error != null && <ErrorBox error={error} />}
          <ActionForm
            key={dialog}
            action={dialog}
            order={o}
            team={
              team?.filter((t) => t.role === "Technician" && !t.disabled) ?? []
            }
            busy={busy}
            onSubmit={async (value) => {
              if (dialog === "quote")
                await mutate("quotes", { ...value, version: o.version });
              else if (dialog === "approve" || dialog === "decline")
                await mutate("decision", {
                  ...value,
                  version: o.version,
                  approved: dialog === "approve",
                });
              else if (["Ready", "Delivered", "Cancelled"].includes(dialog))
                await command("transition", { ...value, status: dialog });
              else await command(dialog, value);
            }}
          />
        </Modal>
      )}
    </>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={14} />;
}
function Timeline({ events }: { events: Order["events"] }) {
  return (
    <ol className="timeline">
      {events.map((e, i) => (
        <li key={e.id}>
          <span className={`timeline-node ${i === 0 ? "latest" : ""}`}>
            <Check size={11} />
          </span>
          <div>
            <div>
              <strong>{e.title}</strong>
              <time dateTime={e.at}>{dateTime(e.at)}</time>
            </div>
            <p>{e.detail}</p>
            <span>{e.actor}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
function ActionForm({
  action,
  order,
  team,
  busy,
  onSubmit,
}: {
  action: string;
  order: Order;
  team: User[];
  busy: boolean;
  onSubmit: (v: Record<string, unknown>) => Promise<void>;
}) {
  const [items, setItems] = useState(
    order.quotes[0]?.items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    })) ?? [{ description: "", quantity: 1, unitPrice: 0 }],
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const values = Object.fromEntries(new FormData(e.currentTarget));
        if (action === "quote")
          void onSubmit({
            items,
            validUntil: new Date(
              String(values.validUntil) + "T23:59:00",
            ).toISOString(),
          });
        else if (action === "approve" || action === "decline")
          void onSubmit({
            ...values,
            decidedAt: new Date(String(values.decidedAt)).toISOString(),
          });
        else void onSubmit(values);
      }}
    >
      {action === "assign" && (
        <label>
          Técnico responsável
          <select
            aria-label="Técnico responsável"
            name="technicianId"
            required
            defaultValue={order.technicianId ?? ""}
          >
            <option value="">Selecione</option>
            {team.map((t) => (
              <option key={t.id} value={t.id}>
                {t.displayName}
              </option>
            ))}
          </select>
        </label>
      )}
      {["diagnosis", "Ready", "Cancelled", "note", "Delivered"].includes(
        action,
      ) && (
        <>
          <label>
            {action === "diagnosis"
              ? "Diagnóstico"
              : action === "Ready"
                ? "Serviço realizado"
                : action === "Cancelled"
                  ? "Justificativa"
                  : action === "Delivered"
                    ? "Observação da retirada"
                    : "Observação interna"}
            <textarea
              name="text"
              rows={4}
              maxLength={
                action === "diagnosis" || action === "Ready" ? 4000 : 2000
              }
              required={action !== "Delivered"}
              defaultValue={action === "diagnosis" ? order.diagnosis : ""}
            />
          </label>
          {action === "Delivered" && (
            <label>
              Quem retirou o equipamento?
              <input name="receiver" required maxLength={200} />
            </label>
          )}
          {action === "Cancelled" && (
            <p className="helper">
              O cancelamento encerra a ordem e preserva o histórico. Esta ação
              não pode ser desfeita.
            </p>
          )}
        </>
      )}
      {(action === "approve" || action === "decline") && (
        <>
          <p className="form-intro">
            Registre a decisão recebida do cliente. Este registro interno não é
            uma assinatura digital.
          </p>
          <div className="form-grid">
            <label>
              Canal
              <select aria-label="Canal" name="channel" required>
                <option>Telefone</option>
                <option>Presencial</option>
                <option>E-mail</option>
                <option>Mensagem</option>
              </select>
            </label>
            <label>
              Data e hora
              <input
                type="datetime-local"
                step="0.001"
                name="decidedAt"
                required
                defaultValue={new Date(
                  Date.now() - new Date().getTimezoneOffset() * 60000,
                )
                  .toISOString()
                  .slice(0, 23)}
              />
            </label>
          </div>
          <label>
            Como a decisão foi recebida?
            <textarea required name="note" maxLength={1000} rows={3} />
          </label>
        </>
      )}
      {action === "quote" && (
        <>
          <p className="form-intro">
            Uma nova versão substitui a anterior e exige nova aprovação.
          </p>
          <label>
            Validade
            <input
              type="date"
              name="validUntil"
              required
              min={new Date().toISOString().slice(0, 10)}
              defaultValue={new Date(Date.now() + 7 * 86400000)
                .toISOString()
                .slice(0, 10)}
            />
          </label>
          <div className="quote-items">
            {items.map((item, i) => (
              <div className="quote-item-form" key={i}>
                <label>
                  Descrição
                  <input
                    required
                    maxLength={200}
                    value={item.description}
                    onChange={(e) =>
                      setItems(
                        items.map((x, j) =>
                          j === i ? { ...x, description: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Qtd.
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    required
                    value={item.quantity}
                    onChange={(e) =>
                      setItems(
                        items.map((x, j) =>
                          j === i
                            ? { ...x, quantity: Number(e.target.value) }
                            : x,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Valor unitário
                  <input
                    type="number"
                    min="0"
                    max="100000"
                    step="0.01"
                    required
                    value={item.unitPrice}
                    onChange={(e) =>
                      setItems(
                        items.map((x, j) =>
                          j === i
                            ? { ...x, unitPrice: Number(e.target.value) }
                            : x,
                        ),
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remover item ${i + 1}`}
                  disabled={items.length === 1}
                  onClick={() => setItems(items.filter((_, j) => j !== i))}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="text-link"
            disabled={items.length >= 30}
            onClick={() =>
              setItems([
                ...items,
                { description: "", quantity: 1, unitPrice: 0 },
              ])
            }
          >
            <Plus size={15} />
            Adicionar item
          </button>
          <div className="quote-total">
            <span>Prévia do total · validado novamente no servidor</span>
            <strong>
              {money(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0))}
            </strong>
          </div>
        </>
      )}
      <div className="modal-actions">
        <button className="button primary" disabled={busy}>
          {busy ? "Salvando…" : "Confirmar e registrar"}
        </button>
      </div>
    </form>
  );
}
