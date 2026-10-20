import { useDeferredValue, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCheck,
  Clock3,
  ClipboardList,
  Filter,
  Monitor,
  Plus,
  Search,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { api, body } from "./api";
import { useSession } from "./App";
import {
  Badge,
  Empty,
  ErrorBox,
  Loading,
  Modal,
  PageHeading,
  Pagination,
  PriorityBadge,
} from "./components";
import { date, initials, late, number, priorities, statuses } from "./format";
import type {
  Customer,
  Dashboard,
  Equipment,
  Order,
  Page,
  Status,
  Summary,
  Team,
  User,
} from "./types";

function Readonly() {
  return (
    <div className="readonly-note">
      <ShieldCheck size={16} />
      Demonstração somente leitura. Alterações estão disponíveis no ambiente
      local.
    </div>
  );
}
export function OrderTable({ items }: { items: Summary[] }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Ordem / equipamento</th>
            <th>Cliente</th>
            <th>Status</th>
            <th>Prioridade</th>
            <th>Prazo</th>
            <th>
              <span className="sr-only">Abrir</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((o) => (
            <tr key={o.id}>
              <td>
                <Link className="order-link" to={`/ordens/${o.id}`}>
                  {number(o.number)}
                </Link>
                <small>{o.equipmentName}</small>
              </td>
              <td>
                <span className="customer-cell">
                  <span className="avatar table-avatar">
                    {initials(o.customerName)}
                  </span>
                  {o.customerName}
                </span>
              </td>
              <td>
                <Badge status={o.status} />
              </td>
              <td>
                <PriorityBadge value={o.priority} />
              </td>
              <td>
                <span className={late(o) ? "overdue" : ""}>
                  {date(o.dueAt)}
                  {late(o) && <small>Em atraso</small>}
                </span>
              </td>
              <td>
                <Link
                  className="icon-link"
                  aria-label={`Abrir ${number(o.number)}`}
                  to={`/ordens/${o.id}`}
                >
                  <ArrowUpRight size={17} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function DashboardPage() {
  const { user } = useSession();
  const { data, error, isPending } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<Dashboard>("/dashboard"),
  });
  if (isPending) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const count = (s: Status) =>
    data?.groups.find((g) => g.status === s)?.count ?? 0;
  const cards = [
    {
      label: "Ordens em aberto",
      value: data?.open,
      Icon: ClipboardList,
      text: "Acompanhar atendimentos",
      to: "/ordens",
      color: "green",
    },
    {
      label: "Aguardando aprovação",
      value: count("AwaitingApproval"),
      Icon: Clock3,
      text: "Orçamentos para decidir",
      to: "/ordens?status=AwaitingApproval",
      color: "amber",
    },
    {
      label: "Em manutenção",
      value: count("Repairing"),
      Icon: Wrench,
      text: "Serviços em execução",
      to: "/ordens?status=Repairing",
      color: "blue",
    },
    {
      label: "Prontas para retirada",
      value: count("Ready"),
      Icon: CheckCheck,
      text: "Finalizar com o cliente",
      to: "/ordens?status=Ready",
      color: "purple",
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow="SEU DIA, COM MAIS CLAREZA"
        title={`Bom trabalho, ${user.displayName.split(" ")[0]}.`}
        description="Aqui está o que acontece na sua assistência."
        action={
          user.role === "Admin" && (
            <Link className="button primary" to="/ordens?nova=1">
              <Plus size={17} />
              Nova ordem de serviço
            </Link>
          )
        }
      />
      <div className="dashboard-summary">
        <span>
          <i />
          VISÃO DA OPERAÇÃO
        </span>
        <span>
          {new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(
            new Date(),
          )}
        </span>
      </div>
      <div className="stats-grid">
        {cards.map(({ label, value, Icon, text, to, color }) => (
          <Link to={to} key={label} className={`stat-card ${color}`}>
            <div className="stat-top">
              <span>{label}</span>
              <span className="stat-icon">
                <Icon size={19} />
              </span>
            </div>
            <strong>{String(value ?? 0).padStart(2, "0")}</strong>
            <span className="stat-bottom">
              {text}
              <ArrowUpRight size={15} />
            </span>
          </Link>
        ))}
      </div>
      <div className="dashboard-columns">
        <section className="panel recent-panel">
          <div className="panel-heading">
            <div>
              <h2>Atendimentos recentes</h2>
              <p>O que se movimentou por aqui.</p>
            </div>
            <Link to="/ordens" className="text-link">
              Ver todas
              <ArrowRight size={15} />
            </Link>
          </div>
          {data?.recent.length ? (
            <OrderTable items={data.recent} />
          ) : (
            <Empty
              title="Seu primeiro atendimento começa aqui"
              text="Cadastre um cliente e abra uma ordem de serviço."
            />
          )}
          <div className="panel-foot">
            <span className="tiny-dot" />
            Informações atualizadas a partir das ordens registradas.
          </div>
        </section>
        <aside className="dashboard-side">
          <section className="attention-card">
            <div className="eyebrow">
              MERECE SUA ATENÇÃO
              <Clock3 size={17} />
            </div>
            <strong>{String(data?.late ?? 0).padStart(2, "0")}</strong>
            <h3>atendimentos fora do prazo</h3>
            <p>Confira o andamento e mantenha o cliente informado.</p>
            <Link to="/ordens?overdue=true" className="button attention-button">
              Revisar prioridades
              <ArrowUpRight size={16} />
            </Link>
          </section>
          <section className="panel distribution">
            <h2>Etapas do atendimento</h2>
            <p>Cada ordem, no seu momento.</p>
            {data?.groups
              .filter((g) => g.count > 0)
              .map((g) => (
                <Link key={g.status} to={`/ordens?status=${g.status}`}>
                  <span className={`distribution-dot s-${g.status}`} />
                  <span>{statuses[g.status]}</span>
                  <strong>{g.count}</strong>
                </Link>
              ))}
          </section>
        </aside>
      </div>
      <section className="workflow-strip">
        <span className="workflow-icon">
          <ArrowDownRight size={24} />
        </span>
        <div>
          <strong>Um bom atendimento deixa tudo registrado.</strong>
          <p>
            Diagnóstico, orçamento e entrega conectados pelo mesmo histórico.
          </p>
        </div>
        <Link to="/quadro" className="text-link">
          Acompanhar etapas
          <ArrowRight size={16} />
        </Link>
      </section>
    </>
  );
}
export function OrdersPage({ board = false }: { board?: boolean }) {
  const { user } = useSession();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") ?? "");
  const deferred = useDeferredValue(search);
  const [creating, setCreating] = useState(params.get("nova") === "1");
  const page = Number(params.get("page") ?? 1);
  const size = board ? 50 : 10;
  const qs = new URLSearchParams(params);
  qs.delete("nova");
  qs.set("pageSize", String(size));
  qs.set("search", deferred);
  const { data, error, isPending } = useQuery({
    queryKey: ["orders", qs.toString()],
    queryFn: () => api<Page<Summary>>("/orders?" + qs),
  });
  const { data: team } = useQuery({
    queryKey: ["team"],
    queryFn: () => api<Team[]>("/team"),
  });
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.set("page", "1");
    setParams(next);
  }
  return (
    <>
      <PageHeading
        eyebrow="OPERAÇÃO"
        title={board ? "Cada etapa, à vista." : "Ordens de serviço"}
        description={
          board
            ? "Acompanhe o caminho de cada atendimento."
            : "Do recebimento à entrega, tudo em um só lugar."
        }
        action={
          user.role === "Admin" && (
            <button
              className="button primary"
              onClick={() => setCreating(true)}
            >
              <Plus size={17} />
              Nova ordem
            </button>
          )
        }
      />
      <section className="panel">
        <div className="list-toolbar">
          <div className="search-field">
            <Search size={17} />
            <input
              aria-label="Buscar ordens"
              placeholder="Buscar ordem, cliente ou equipamento…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                filter("page", "1");
              }}
            />
          </div>
          <div className="toolbar-filters">
            <Filter size={16} />
            <select
              aria-label="Filtrar por status"
              value={params.get("status") ?? ""}
              onChange={(e) => filter("status", e.target.value)}
            >
              <option value="">Todas as etapas</option>
              {Object.entries(statuses).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtrar por técnico"
              value={params.get("technicianId") ?? ""}
              onChange={(e) => filter("technicianId", e.target.value)}
            >
              <option value="">Todos os técnicos</option>
              {team?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.displayName}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtrar por prioridade"
              value={params.get("priority") ?? ""}
              onChange={(e) => filter("priority", e.target.value)}
            >
              <option value="">Todas as prioridades</option>
              {Object.entries(priorities).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="list-subhead">
          <strong>{data?.total ?? 0} atendimentos</strong>
          <div>
            <label className="check-label">
              <input
                type="checkbox"
                checked={params.get("overdue") === "true"}
                onChange={(e) =>
                  filter("overdue", e.target.checked ? "true" : "")
                }
              />
              Somente atrasados
            </label>
            <select
              aria-label="Ordenar ordens"
              value={params.get("sort") ?? ""}
              onChange={(e) => filter("sort", e.target.value)}
            >
              <option value="">Mais recentes</option>
              <option value="due">Menor prazo</option>
            </select>
          </div>
        </div>
        {isPending ? (
          <Loading />
        ) : error ? (
          <ErrorBox error={error} />
        ) : !data?.items.length ? (
          <Empty
            title="Nenhuma ordem encontrada"
            text="Tente ajustar os filtros ou abra um novo atendimento."
          />
        ) : board ? (
          <div
            className="board"
            tabIndex={0}
            aria-label="Quadro de acompanhamento com rolagem horizontal"
          >
            {Object.entries(statuses).map(([key, label]) => {
              const orders = data.items.filter((o) => o.status === key);
              return (
                <section className="board-column" key={key}>
                  <h2>
                    <span className={`distribution-dot s-${key}`} />
                    {label}
                    <span>{orders.length}</span>
                  </h2>
                  {orders.map((o) => (
                    <Link
                      className="board-card"
                      to={`/ordens/${o.id}`}
                      key={o.id}
                    >
                      <div>
                        <span className="order-link">{number(o.number)}</span>
                        <PriorityBadge value={o.priority} />
                      </div>
                      <h3>{o.equipmentName}</h3>
                      <p>{o.problem}</p>
                      <footer>
                        <span>{o.customerName}</span>
                        <span className={late(o) ? "overdue" : ""}>
                          {date(o.dueAt)}
                        </span>
                      </footer>
                    </Link>
                  ))}
                  {!orders.length && (
                    <span className="board-empty">Sem ordens nesta página</span>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <OrderTable items={data.items} />
        )}
        <Pagination
          page={page}
          total={data?.total ?? 0}
          size={size}
          onPage={(n) => {
            const next = new URLSearchParams(params);
            next.set("page", String(n));
            setParams(next);
          }}
        />
      </section>
      {creating && (
        <CreateOrder
          onClose={() => {
            setCreating(false);
            const next = new URLSearchParams(params);
            next.delete("nova");
            setParams(next, { replace: true });
          }}
        />
      )}
    </>
  );
}
function CreateOrder({ onClose }: { onClose: () => void }) {
  const { user } = useSession();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(""),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  const { register, handleSubmit } = useForm<Record<string, string>>();
  const { data: customers } = useQuery({
    queryKey: ["customers", "all"],
    queryFn: () => api<Page<Customer>>("/customers?pageSize=100"),
  });
  const { data: equipment } = useQuery({
    queryKey: ["equipment", customer],
    queryFn: () =>
      api<Page<Equipment>>(`/equipment?customerId=${customer}&pageSize=100`),
    enabled: !!customer,
  });
  const { data: team } = useQuery({
    queryKey: ["users"],
    queryFn: () => api<User[]>("/users"),
    enabled: user.role === "Admin",
  });
  async function save(v: Record<string, string>) {
    setBusy(true);
    try {
      const order = await api<Order>("/orders", {
        method: "POST",
        body: body({
          ...v,
          customerId: customer,
          technicianId: v.technicianId || null,
          dueAt: new Date(v.dueAt + "T18:00:00").toISOString(),
        }),
      });
      onClose();
      navigate("/ordens/" + order.id);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Nova ordem de serviço" onClose={onClose}>
      {user.demo || user.role !== "Admin" ? (
        <Readonly />
      ) : (
        <form onSubmit={handleSubmit(save)}>
          {error != null && <ErrorBox error={error} />}
          <p className="form-intro">
            Registre a entrada. O histórico começa aqui.
          </p>
          <div className="form-grid">
            <label>
              Cliente
              <select
                aria-label="Cliente"
                required
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
              >
                <option value="">Selecione um cliente</option>
                {customers?.items
                  .filter((c) => !c.archived)
                  .map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Equipamento
              <select
                aria-label="Equipamento"
                key={customer}
                required
                disabled={!customer}
                {...register("equipmentId")}
              >
                <option value="">Selecione o equipamento</option>
                {equipment?.items
                  .filter((e) => !e.archived)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.brand} {e.model}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <label>
            Problema relatado
            <textarea
              required
              maxLength={4000}
              rows={3}
              placeholder="O que o cliente relatou?"
              {...register("problem")}
            />
          </label>
          <label>
            Condição na entrada
            <textarea
              required
              maxLength={2000}
              rows={2}
              placeholder="Marcas de uso, danos aparentes…"
              {...register("condition")}
            />
          </label>
          <label>
            Acessórios recebidos
            <input
              required
              maxLength={1000}
              placeholder="Carregador, capa ou nenhum"
              {...register("accessories")}
            />
          </label>
          <div className="form-grid">
            <label>
              Prioridade
              <select {...register("priority")}>
                <option value="Normal">Normal</option>
                <option value="High">Alta</option>
                <option value="Urgent">Urgente</option>
              </select>
            </label>
            <label>
              Prazo estimado
              <input
                required
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                {...register("dueAt")}
              />
            </label>
          </div>
          <label>
            Técnico responsável
            <select
              aria-label="Técnico responsável"
              {...register("technicianId")}
            >
              <option value="">Atribuir depois</option>
              {team
                ?.filter((t) => t.role === "Technician" && !t.disabled)
                .map((t) => (
                  <option value={t.id} key={t.id}>
                    {t.displayName}
                  </option>
                ))}
            </select>
          </label>
          <p className="helper">
            Não encontrou o cliente ou equipamento? Cadastre nas respectivas
            telas antes de abrir a ordem.
          </p>
          <div className="modal-actions">
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button className="button primary" disabled={busy}>
              {busy ? "Registrando…" : "Abrir ordem de serviço"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
type Field = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  maxLength?: number;
};
function RecordEditor({
  title,
  fields,
  initial,
  onClose,
  onSave,
}: {
  title: string;
  fields: Field[];
  initial?: Record<string, string>;
  onClose: () => void;
  onSave: (v: Record<string, string>) => Promise<unknown>;
}) {
  const { register, handleSubmit } = useForm<Record<string, string>>({
    defaultValues: initial,
  });
  const [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  const { user } = useSession();
  return (
    <Modal title={title} onClose={onClose}>
      {user.demo ? (
        <Readonly />
      ) : (
        <form
          onSubmit={handleSubmit(async (v) => {
            setBusy(true);
            try {
              await onSave(v);
              onClose();
            } catch (e) {
              setError(e);
            } finally {
              setBusy(false);
            }
          })}
        >
          {error != null && <ErrorBox error={error} />}
          <div className="form-grid">
            {fields.map((f) => (
              <label
                key={f.name}
                className={f.type === "textarea" ? "full-width" : ""}
              >
                {f.label}
                {f.options ? (
                  <select
                    aria-label={f.label}
                    required={f.required}
                    {...register(f.name)}
                  >
                    {f.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    rows={3}
                    maxLength={f.maxLength ?? 2000}
                    {...register(f.name)}
                  />
                ) : (
                  <input
                    aria-label={f.label}
                    type={f.type ?? "text"}
                    required={f.required}
                    minLength={f.type === "password" ? 12 : undefined}
                    maxLength={f.maxLength ?? 160}
                    autoComplete={
                      f.type === "password" ? "new-password" : undefined
                    }
                    {...register(f.name)}
                  />
                )}
              </label>
            ))}
          </div>
          <div className="modal-actions">
            <button
              className="button secondary"
              type="button"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button className="button primary" disabled={busy}>
              {busy ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
export function CustomersPage() {
  const { user, notify } = useSession(),
    client = useQueryClient();
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [editing, setEditing] = useState<Customer | "new" | null>(null),
    [error, setError] = useState<unknown>(null);
  const term = useDeferredValue(search);
  const {
    data,
    isPending,
    error: loadError,
  } = useQuery({
    queryKey: ["customers", term, page],
    queryFn: () =>
      api<Page<Customer>>(
        `/customers?search=${encodeURIComponent(term)}&page=${page}&pageSize=10`,
      ),
  });
  async function refresh() {
    await client.invalidateQueries({ queryKey: ["customers"] });
    notify("Cliente atualizado.");
  }
  const fields: Field[] = [
    { name: "name", label: "Nome completo", required: true },
    { name: "phone", label: "Telefone", required: true, maxLength: 30 },
    {
      name: "email",
      label: "E-mail (opcional)",
      type: "email",
      maxLength: 254,
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow="RELACIONAMENTO"
        title="Clientes"
        description="Pessoas, equipamentos e um histórico que faz sentido."
        action={
          user.role === "Admin" && (
            <button
              className="button primary"
              onClick={() => setEditing("new")}
            >
              <Plus size={17} />
              Novo cliente
            </button>
          )
        }
      />
      {error != null && <ErrorBox error={error} />}
      <section className="panel">
        <div className="list-toolbar">
          <div className="search-field">
            <Search size={17} />
            <input
              aria-label="Buscar clientes"
              placeholder="Buscar por nome ou telefone…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <span className="muted">{data?.total ?? 0} clientes</span>
        </div>
        {isPending ? (
          <Loading />
        ) : loadError ? (
          <ErrorBox error={loadError} />
        ) : !data?.items.length ? (
          <Empty title="Nenhum cliente encontrado" />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Telefone</th>
                  <th>E-mail</th>
                  <th>Situação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className="customer-cell">
                        <span className="avatar table-avatar">
                          {initials(c.name)}
                        </span>
                        <strong>{c.name}</strong>
                      </span>
                    </td>
                    <td>{c.phone}</td>
                    <td>{c.email ?? "—"}</td>
                    <td>
                      <span
                        className={`record-status ${c.archived ? "archived" : ""}`}
                      >
                        {c.archived ? "Arquivado" : "Ativo"}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link
                          to={`/ordens?customerId=${c.id}`}
                          className="text-link"
                        >
                          Histórico
                        </Link>
                        {user.role === "Admin" && (
                          <>
                            <button
                              className="text-link"
                              onClick={() => setEditing(c)}
                            >
                              Editar
                            </button>
                            <button
                              disabled={user.demo}
                              className="text-link muted"
                              onClick={() => {
                                void api(`/customers/${c.id}`, {
                                  method: "PUT",
                                  body: body({ ...c, archived: !c.archived }),
                                })
                                  .then(refresh)
                                  .catch(setError);
                              }}
                            >
                              {c.archived ? "Reativar" : "Arquivar"}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          total={data?.total ?? 0}
          size={10}
          onPage={setPage}
        />
      </section>
      {editing && (
        <RecordEditor
          title={editing === "new" ? "Novo cliente" : "Editar cliente"}
          fields={fields}
          initial={
            editing === "new"
              ? undefined
              : {
                  name: editing.name,
                  phone: editing.phone,
                  email: editing.email ?? "",
                }
          }
          onClose={() => setEditing(null)}
          onSave={async (v) => {
            await api(
              editing === "new" ? "/customers" : `/customers/${editing.id}`,
              {
                method: editing === "new" ? "POST" : "PUT",
                body: body({
                  ...v,
                  ...(editing === "new"
                    ? {}
                    : { archived: editing.archived, version: editing.version }),
                }),
              },
            );
            await refresh();
          }}
        />
      )}
    </>
  );
}
export function EquipmentPage() {
  const { user, notify } = useSession(),
    client = useQueryClient();
  const [page, setPage] = useState(1),
    [editing, setEditing] = useState<Equipment | "new" | null>(null),
    [filter, setFilter] = useState(""),
    [error, setError] = useState<unknown>(null);
  const {
    data,
    isPending,
    error: loadError,
  } = useQuery({
    queryKey: ["equipment-list", page, filter],
    queryFn: () =>
      api<Page<Equipment>>(
        `/equipment?page=${page}&pageSize=10${filter ? "&customerId=" + filter : ""}`,
      ),
  });
  const { data: customers } = useQuery({
    queryKey: ["customers", "all"],
    queryFn: () => api<Page<Customer>>("/customers?pageSize=100"),
  });
  const fields: Field[] = [
    {
      name: "customerId",
      label: "Cliente",
      required: true,
      options: [
        { value: "", label: "Selecione o cliente" },
        ...(customers?.items
          .filter(
            (c) =>
              !c.archived ||
              (editing !== "new" && editing?.customerId === c.id),
          )
          .map((c) => ({ value: c.id, label: c.name })) ?? []),
      ],
    },
    {
      name: "category",
      label: "Categoria",
      required: true,
      options: [
        { value: "Notebook", label: "Notebook" },
        { value: "Desktop", label: "Desktop" },
        { value: "Monitor", label: "Monitor" },
        { value: "Outro", label: "Outro" },
      ],
    },
    { name: "brand", label: "Marca", required: true, maxLength: 100 },
    { name: "model", label: "Modelo", required: true },
    { name: "serial", label: "Número de série (opcional)" },
    { name: "notes", label: "Observações", type: "textarea" },
  ];
  async function refresh() {
    await client.invalidateQueries({ queryKey: ["equipment-list"] });
    await client.invalidateQueries({ queryKey: ["equipment"] });
    notify("Equipamento atualizado.");
  }
  return (
    <>
      <PageHeading
        eyebrow="PATRIMÔNIO DO CLIENTE"
        title="Equipamentos"
        description="Cada equipamento com sua identificação e trajetória."
        action={
          user.role === "Admin" && (
            <button
              className="button primary"
              onClick={() => setEditing("new")}
            >
              <Plus size={17} />
              Novo equipamento
            </button>
          )
        }
      />
      {error != null && <ErrorBox error={error} />}
      <section className="panel">
        <div className="list-toolbar">
          <span>
            <strong>{data?.total ?? 0}</strong> equipamentos
          </span>
          <select
            aria-label="Filtrar equipamentos por cliente"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos os clientes</option>
            {customers?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {isPending ? (
          <Loading />
        ) : loadError ? (
          <ErrorBox error={loadError} />
        ) : !data?.items.length ? (
          <Empty title="Nenhum equipamento encontrado" />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Equipamento</th>
                  <th>Cliente</th>
                  <th>Identificação</th>
                  <th>Situação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <span className="equipment-cell">
                        <span className="equipment-icon">
                          <Monitor size={18} />
                        </span>
                        <span>
                          <strong>
                            {e.brand} {e.model}
                          </strong>
                          <small>{e.category}</small>
                        </span>
                      </span>
                    </td>
                    <td>{e.customerName}</td>
                    <td>{e.serial ?? "Não informado"}</td>
                    <td>
                      <span
                        className={`record-status ${e.archived ? "archived" : ""}`}
                      >
                        {e.archived ? "Arquivado" : "Ativo"}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link
                          className="text-link"
                          to={`/ordens?equipmentId=${e.id}`}
                        >
                          Histórico
                        </Link>
                        {user.role === "Admin" && (
                          <>
                            <button
                              className="text-link"
                              onClick={() => setEditing(e)}
                            >
                              Editar
                            </button>
                            <button
                              disabled={user.demo}
                              className="text-link muted"
                              onClick={() => {
                                void api(`/equipment/${e.id}`, {
                                  method: "PUT",
                                  body: body({ ...e, archived: !e.archived }),
                                })
                                  .then(refresh)
                                  .catch(setError);
                              }}
                            >
                              {e.archived ? "Reativar" : "Arquivar"}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          total={data?.total ?? 0}
          size={10}
          onPage={setPage}
        />
      </section>
      {editing && (
        <RecordEditor
          title={editing === "new" ? "Novo equipamento" : "Editar equipamento"}
          fields={
            editing === "new"
              ? fields
              : fields.filter((f) => f.name !== "customerId")
          }
          initial={
            editing === "new"
              ? { category: "Notebook" }
              : {
                  category: editing.category,
                  brand: editing.brand,
                  model: editing.model,
                  serial: editing.serial ?? "",
                  notes: editing.notes ?? "",
                }
          }
          onClose={() => setEditing(null)}
          onSave={async (v) => {
            await api(
              editing === "new" ? "/equipment" : `/equipment/${editing.id}`,
              {
                method: editing === "new" ? "POST" : "PUT",
                body: body({
                  ...v,
                  ...(editing === "new"
                    ? {}
                    : {
                        customerId: editing.customerId,
                        version: editing.version,
                        archived: editing.archived,
                      }),
                }),
              },
            );
            await refresh();
          }}
        />
      )}
    </>
  );
}
export function UsersPage() {
  const { user, notify } = useSession(),
    client = useQueryClient();
  const [editing, setEditing] = useState<User | "new" | null>(null),
    [error, setError] = useState<unknown>(null);
  const {
    data,
    isPending,
    error: loadError,
  } = useQuery({ queryKey: ["users"], queryFn: () => api<User[]>("/users") });
  const fields: Field[] = [
    { name: "displayName", label: "Nome", required: true },
    {
      name: "email",
      label: "E-mail",
      type: "email",
      required: true,
      maxLength: 254,
    },
    {
      name: "password",
      label: "Senha inicial",
      type: "password",
      required: true,
    },
    {
      name: "role",
      label: "Perfil",
      options: [
        { value: "Technician", label: "Técnico" },
        { value: "Admin", label: "Administrador" },
      ],
    },
  ];
  async function refresh() {
    await client.invalidateQueries({ queryKey: ["users"] });
    await client.invalidateQueries({ queryKey: ["team"] });
    notify("Acesso atualizado. Sessões anteriores são invalidadas.");
  }
  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRAÇÃO"
        title="Equipe e acessos"
        description="Responsabilidades claras. Acesso na medida certa."
        action={
          <button className="button primary" onClick={() => setEditing("new")}>
            <Plus size={17} />
            Adicionar pessoa
          </button>
        }
      />
      {error != null && <ErrorBox error={error} />}
      <div className="info-banner">
        <ShieldCheck size={18} />
        Administradores gerenciam a operação. Técnicos acessam os atendimentos
        atribuídos a eles.
      </div>
      <section className="panel">
        {isPending ? (
          <Loading />
        ) : loadError ? (
          <ErrorBox error={loadError} />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Pessoa</th>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>Acesso</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <span className="customer-cell">
                        <span className="avatar table-avatar">
                          {initials(u.displayName)}
                        </span>
                        <strong>{u.displayName}</strong>
                      </span>
                    </td>
                    <td>{u.email}</td>
                    <td>{u.role === "Admin" ? "Administrador" : "Técnico"}</td>
                    <td>
                      <span
                        className={`record-status ${u.disabled ? "archived" : ""}`}
                      >
                        {u.disabled ? "Desativado" : "Ativo"}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="text-link"
                          onClick={() => setEditing(u)}
                        >
                          Editar
                        </button>
                        <button
                          disabled={user.demo}
                          className="text-link muted"
                          onClick={() => {
                            void api(`/users/${u.id}`, {
                              method: "PUT",
                              body: body({ ...u, disabled: !u.disabled }),
                            })
                              .then(refresh)
                              .catch(setError);
                          }}
                        >
                          {u.disabled ? "Reativar" : "Desativar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {editing && (
        <RecordEditor
          title={editing === "new" ? "Adicionar pessoa" : "Editar acesso"}
          fields={
            editing === "new"
              ? fields
              : fields.filter((f) => !["email", "password"].includes(f.name))
          }
          initial={
            editing === "new"
              ? { role: "Technician" }
              : { displayName: editing.displayName, role: editing.role }
          }
          onClose={() => setEditing(null)}
          onSave={async (v) => {
            await api(editing === "new" ? "/users" : `/users/${editing.id}`, {
              method: editing === "new" ? "POST" : "PUT",
              body: body({
                ...v,
                ...(editing === "new" ? {} : { disabled: editing.disabled }),
              }),
            });
            await refresh();
          }}
        />
      )}
    </>
  );
}
