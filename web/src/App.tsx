import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  ChartNoAxesCombined,
  ChevronDown,
  ClipboardList,
  Columns3,
  LayoutDashboard,
  LogOut,
  Menu,
  Monitor,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, body } from "./api";
import type { User } from "./types";
import { initials } from "./format";
import { ErrorBox, Loading, Toast } from "./components";
import {
  DashboardPage,
  OrdersPage,
  CustomersPage,
  EquipmentPage,
  UsersPage,
} from "./pages";
import { OrderDetail } from "./order-detail";

const Session = createContext<{ user: User; notify: (s: string) => void }>({
  user: null!,
  notify: () => {},
});
export const useSession = () => useContext(Session);
export function Logo() {
  return (
    <span className="logo">
      <span className="logo-mark">
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path d="M9 25V8h18M9 16h13" />
          <circle cx="25" cy="25" r="3" />
        </svg>
      </span>
      <span>
        fluxo<span className="logo-os">os</span>
        <small>GESTÃO DE SERVIÇOS</small>
      </span>
    </span>
  );
}
const loginSchema = z.object({
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe sua senha."),
});
function Login({ onLogin }: { onLogin: () => void }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: () => api<{ demo: boolean }>("/auth/csrf"),
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });
  async function enter(input?: z.infer<typeof loginSchema>, role = "Admin") {
    setBusy(true);
    setError(null);
    try {
      await api(input ? "/auth/login" : "/auth/demo", {
        method: "POST",
        body: body(input ?? { role }),
      });
      onLogin();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-layout">
      <section className="login-story">
        <Logo />
        <div className="story-content">
          <span className="story-kicker">
            <span /> MENOS RUÍDO. MAIS FLUXO.
          </span>
          <h1>
            Cada atendimento.
            <br />
            No lugar certo.
          </h1>
          <p>
            Do primeiro diagnóstico à última entrega.
            <br />
            Uma visão clara de tudo o que acontece na sua assistência.
          </p>
          <div className="story-card">
            <div>
              <span className="story-dot" />
              ASSISTÊNCIA EM MOVIMENTO
              <Wrench size={18} />
            </div>
            <div className="story-steps">
              <span>
                <CheckCircle />
                Receber
              </span>
              <i />
              <span>
                <CheckCircle />
                Reparar
              </span>
              <i />
              <span>
                <CheckCircle />
                Entregar
              </span>
            </div>
            <footer>
              <ShieldCheck size={16} />
              Histórico preservado em cada etapa.
            </footer>
          </div>
        </div>
        <span className="story-foot">
          FLUXO OS <span>SOFTWARE QUE ACOMPANHA O SEU TRABALHO.</span>
        </span>
      </section>
      <section className="login-form">
        <div className="login-box">
          <span className="eyebrow">BEM-VINDO AO SEU ESPAÇO DE TRABALHO</span>
          <h2>
            Vamos colocar
            <br />o dia em ordem.
          </h2>
          <p>Entre para acompanhar seus atendimentos.</p>
          {error != null && <ErrorBox error={error} />}
          {config?.demo ? (
            <>
              <div className="demo-intro">
                <Sparkles size={20} />
                <div>
                  <strong>Explore o Fluxo OS</strong>
                  <p>
                    Ambiente somente leitura com dados fictícios. Escolha um
                    perfil para conhecer as telas e permissões.
                  </p>
                </div>
              </div>
              <button
                className="button primary wide"
                disabled={busy}
                onClick={() => void enter()}
              >
                {busy ? "Entrando…" : "Explorar como administrador"}
                <ArrowRight size={18} />
              </button>
              <button
                className="button secondary wide"
                disabled={busy}
                onClick={() => void enter(undefined, "Technician")}
              >
                Explorar como técnico
              </button>
            </>
          ) : (
            <form onSubmit={handleSubmit((input) => enter(input))}>
              <label>
                E-mail
                <input
                  type="email"
                  autoComplete="username"
                  placeholder="voce@suaassistencia.com"
                  {...register("email")}
                />
                {errors.email && (
                  <span className="field-error">{errors.email.message}</span>
                )}
              </label>
              <label>
                Senha
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="Sua senha"
                  {...register("password")}
                />
                {errors.password && (
                  <span className="field-error">{errors.password.message}</span>
                )}
              </label>
              <button className="button primary wide" disabled={busy}>
                {busy ? "Entrando…" : "Entrar no Fluxo OS"}
                <ArrowRight size={18} />
              </button>
            </form>
          )}
          <div className="login-assurance">
            <ShieldCheck size={16} />
            Seu acesso respeita as permissões da equipe.
          </div>
        </div>
        <footer>Feito para quem cuida de cada detalhe.</footer>
      </section>
    </div>
  );
}
function CheckCircle() {
  return <span className="step-circle">✓</span>;
}
function Shell({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [open, setOpen] = useState(false),
    [toast, setToast] = useState("");
  const closeToast = useCallback(() => setToast(""), []);
  const links = [
    ["/", "Visão geral", LayoutDashboard],
    ["/ordens", "Ordens de serviço", ClipboardList],
    ["/quadro", "Acompanhamento", Columns3],
    ["/clientes", "Clientes", Users],
    ["/equipamentos", "Equipamentos", Monitor],
  ] as const;
  return (
    <Session.Provider value={{ user, notify: setToast }}>
      <div className="app-layout">
        <a className="skip-link" href="#main">
          Ir para o conteúdo
        </a>
        {open && (
          <button
            className="sidebar-scrim"
            aria-label="Fechar navegação"
            onClick={() => setOpen(false)}
          />
        )}
        <aside className={`sidebar ${open ? "is-open" : ""}`}>
          <div className="sidebar-logo">
            <Logo />
            <button
              className="icon-button mobile-only"
              aria-label="Fechar menu"
              onClick={() => setOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
          <div className="workspace">
            <span className="workspace-avatar">
              <Wrench size={17} />
            </span>
            <div>
              <strong>Oficina Modelo</strong>
              <small>
                {user.demo ? "AMBIENTE DE DEMONSTRAÇÃO" : "ESPAÇO DE TRABALHO"}
              </small>
            </div>
          </div>
          <span className="nav-label">OPERAÇÃO</span>
          <nav aria-label="Navegação principal">
            {links.map(([to, label, Icon]) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                onClick={() => setOpen(false)}
              >
                <Icon size={19} />
                {label}
              </NavLink>
            ))}
            {user.role === "Admin" && (
              <>
                <span className="nav-label settings-label">ADMINISTRAÇÃO</span>
                <NavLink to="/equipe" onClick={() => setOpen(false)}>
                  <ShieldCheck size={19} />
                  Equipe e acessos
                </NavLink>
              </>
            )}
          </nav>
          <div className="sidebar-bottom">
            <div className="sidebar-note">
              <ChartNoAxesCombined size={20} />
              <strong>Clareza em cada etapa.</strong>
              <p>Do recebimento à entrega, sem perder o histórico.</p>
            </div>
            <button
              className="profile-button"
              onClick={() =>
                void api("/auth/logout", { method: "POST" })
                  .then(onLogout)
                  .catch(setToast)
              }
            >
              <span className="avatar">{initials(user.displayName)}</span>
              <span>
                <strong>{user.displayName}</strong>
                <small>
                  {user.role === "Admin" ? "Administrador" : "Técnico"}
                </small>
              </span>
              <LogOut size={16} />
            </button>
          </div>
        </aside>
        <div className="main-wrap">
          <header className="topbar">
            <div>
              <button
                className="icon-button mobile-only"
                aria-label="Abrir menu"
                onClick={() => setOpen(true)}
              >
                <Menu size={21} />
              </button>
              <span className="breadcrumb">
                Workspace <span>/</span> Oficina Modelo
              </span>
            </div>
            <div className="topbar-right">
              <span className="operating">
                <i />
                {user.demo ? "Demonstração" : "Operação ativa"}
              </span>
              <span className="avatar small-avatar">
                {initials(user.displayName)}
              </span>
              <ChevronDown size={14} />
            </div>
          </header>
          {user.demo && (
            <div className="demo-banner">
              <Sparkles size={15} />
              <span>
                Dados fictícios · Demonstração somente leitura. O fluxo completo
                está disponível na execução local.
              </span>
            </div>
          )}
          <main id="main" className="main-content">
            <Outlet />
          </main>
          <footer className="app-footer">
            <span>Fluxo OS · Cada etapa sob controle.</span>
            <span>
              <ShieldCheck size={12} />
              Dados protegidos por permissões
            </span>
          </footer>
        </div>
        {toast && (
          <Toast
            message={
              typeof toast === "string" ? toast : "Não foi possível concluir."
            }
            onClose={closeToast}
          />
        )}
      </div>
    </Session.Provider>
  );
}
export default function App() {
  const client = useQueryClient(),
    navigate = useNavigate();
  const [expired, setExpired] = useState(false);
  const { data: user, isPending } = useQuery({
    queryKey: ["session"],
    queryFn: () => api<User>("/auth/me").catch(() => null),
  });
  useEffect(() => {
    const listener = () => {
      client.setQueryData(["session"], null);
      setExpired(true);
    };
    window.addEventListener("session-expired", listener);
    return () => window.removeEventListener("session-expired", listener);
  }, [client]);
  const refresh = () => {
    setExpired(false);
    client.clear();
    navigate("/");
    void client.invalidateQueries();
  };
  if (isPending) return <Loading />;
  if (!user)
    return (
      <>
        {expired && (
          <div className="session-alert" role="alert">
            Sua sessão expirou. Entre novamente.
          </div>
        )}
        <Login onLogin={refresh} />
      </>
    );
  return (
    <Routes>
      <Route element={<Shell user={user} onLogout={refresh} />}>
        <Route index element={<DashboardPage />} />
        <Route path="ordens" element={<OrdersPage />} />
        <Route path="ordens/:id" element={<OrderDetail />} />
        <Route path="quadro" element={<OrdersPage board />} />
        <Route path="clientes" element={<CustomersPage />} />
        <Route path="equipamentos" element={<EquipmentPage />} />
        <Route
          path="equipe"
          element={
            user.role === "Admin" ? <UsersPage /> : <Navigate to="/" replace />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
