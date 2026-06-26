import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Gauge,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar.jsx";
import StatCard from "../components/StatCard.jsx";
import TicketDetails from "../components/TicketDetails.jsx";
import TicketForm from "../components/TicketForm.jsx";
import TicketTable from "../components/TicketTable.jsx";
import ReportsPage from "./ReportsPage.jsx";
import UsersPage from "./UsersPage.jsx";
import {
  createTicket,
  deleteTicket,
  getTickets,
  isSessionError,
  updateTicketStatus,
} from "../services/api.js";
import { getSocket } from "../services/socket.js";

const roleLabels = {
  admin: "Administrador",
  soporte: "Soporte",
  usuario: "Usuario",
  it: "Soporte",
  user: "Usuario",
};

function normalizeRole(role) {
  const cleanRole = String(role || "").toLowerCase();
  if (cleanRole === "it") {
    return "soporte";
  }
  if (cleanRole === "user") {
    return "usuario";
  }
  return cleanRole;
}

function isAdminRole(role) {
  return normalizeRole(role) === "admin";
}

const sectionCopy = {
  dashboard: {
    title: "Panel principal",
    subtitle: "Resumen general de tickets",
  },
  tickets: {
    title: "Tickets",
    subtitle: "Crea, revisa y da seguimiento a solicitudes reales",
  },
  users: {
    title: "Usuarios",
    subtitle: "Administración mínima de roles para la demo",
  },
  reports: {
    title: "Reportes",
    subtitle: "Indicadores calculados con tickets reales",
  },
};

const sectionPaths = {
  dashboard: "/",
  tickets: "/tickets",
  users: "/users",
  reports: "/reports",
};

function getSectionFromPath(pathname) {
  const cleanPath = String(pathname || "").toLowerCase();

  if (cleanPath === "/users" || cleanPath === "/usuarios") {
    return "users";
  }

  if (cleanPath === "/tickets") {
    return "tickets";
  }

  if (cleanPath === "/reports" || cleanPath === "/reportes") {
    return "reports";
  }

  return "dashboard";
}

function replacePathForSection(section) {
  if (!window.history?.replaceState) {
    return;
  }

  window.history.replaceState(null, "", sectionPaths[section] || "/");
}

function getTicketStatus(ticket) {
  return String(ticket.status || ticket.Status || "").trim();
}

function getTicketId(ticket) {
  return ticket.id || ticket.Id;
}

function AdminDashboard({ token, user, onLogout, onUnauthorized }) {
  const [activeSection, setActiveSection] = useState(() =>
    getSectionFromPath(window.location.pathname)
  );
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [isSavingTicket, setIsSavingTicket] = useState(false);
  const [updatingTicketId, setUpdatingTicketId] = useState("");
  const [ticketsError, setTicketsError] = useState("");
  const [actionError, setActionError] = useState("");
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const userName = user?.name || user?.email || "Usuario";
  const userEmail = user?.email || "Sin correo";
  const normalizedRole = normalizeRole(user?.role);
  const userRole = roleLabels[normalizedRole] || "Usuario";
  const currentSection = sectionCopy[activeSection] || sectionCopy.dashboard;

  const loadTickets = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) {
      setIsLoadingTickets(true);
    }

    setTicketsError("");
    if (showLoading) {
      setActionError("");
    }

    try {
      const ticketsData = await getTickets(token);
      const nextTickets = Array.isArray(ticketsData.tickets)
        ? ticketsData.tickets
        : [];

      setTickets(nextTickets);
    } catch (error) {
      if (isSessionError(error) && onUnauthorized) {
        onUnauthorized();
        return;
      }

      setTickets([]);
      setTicketsError(error.message || "No se pudieron cargar los tickets.");
    } finally {
      if (showLoading) {
        setIsLoadingTickets(false);
      }
    }
  }, [onUnauthorized, token]);

  useEffect(() => {
    if (activeSection === "users" && !isAdminRole(user?.role)) {
      setActiveSection("dashboard");
      replacePathForSection("dashboard");
    }
  }, [activeSection, user?.role]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    let isActive = true;
    let socketConnection = null;
    const refreshTickets = () => loadTickets({ showLoading: false });
    const handleTicketDeleted = (payload = {}) => {
      setSelectedTicket((current) =>
        Number(getTicketId(current || {})) === Number(payload.ticketId)
          ? null
          : current
      );
      refreshTickets();
    };
    const handleConnect = () => setIsRealtimeActive(true);
    const handleDisconnect = () => setIsRealtimeActive(false);

    getSocket(token)
      .then((socket) => {
        if (!isActive) {
          return;
        }

        socketConnection = socket;
        setIsRealtimeActive(socket.connected);
        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        socket.on("ticket:created", refreshTickets);
        socket.on("ticket:updated", refreshTickets);
        socket.on("ticket:status-updated", refreshTickets);
        socket.on("ticket:deleted", handleTicketDeleted);
      })
      .catch(() => {
        if (isActive) {
          setIsRealtimeActive(false);
        }
      });

    return () => {
      isActive = false;

      if (socketConnection) {
        socketConnection.off("connect", handleConnect);
        socketConnection.off("disconnect", handleDisconnect);
        socketConnection.off("ticket:created", refreshTickets);
        socketConnection.off("ticket:updated", refreshTickets);
        socketConnection.off("ticket:status-updated", refreshTickets);
        socketConnection.off("ticket:deleted", handleTicketDeleted);
      }
    };
  }, [loadTickets, token]);

  const stats = useMemo(() => {
    const countByStatus = (status) =>
      tickets.filter(
        (ticket) => getTicketStatus(ticket).toLowerCase() === status.toLowerCase()
      ).length;

    return [
      {
        title: "Tickets totales",
        value: tickets.length,
        helper: "Solicitudes registradas",
        icon: ClipboardList,
        tone: "orange",
      },
      {
        title: "Abiertos",
        value: countByStatus("Abierto"),
        helper: "Pendientes de atención",
        icon: AlertTriangle,
        tone: "red",
      },
      {
        title: "En proceso",
        value: countByStatus("En proceso"),
        helper: "En seguimiento",
        icon: Gauge,
        tone: "amber",
      },
      {
        title: "Cerrados",
        value: countByStatus("Cerrado"),
        helper: "Finalizados",
        icon: CheckCircle2,
        tone: "green",
      },
    ];
  }, [tickets]);

  function replaceTicket(nextTicket) {
    setTickets((current) =>
      current.map((ticket) =>
        Number(getTicketId(ticket)) === Number(getTicketId(nextTicket))
          ? nextTicket
          : ticket
      )
    );
  }

  async function handleCreateTicket(ticketData) {
    setIsSavingTicket(true);
    setActionError("");

    try {
      const data = await createTicket(token, ticketData);
      setTickets((current) => [data.ticket, ...current]);
      setActiveSection("tickets");
    } catch (error) {
      if (isSessionError(error) && onUnauthorized) {
        onUnauthorized();
        return;
      }

      setActionError(error.message || "No se pudo crear el ticket.");
      throw error;
    } finally {
      setIsSavingTicket(false);
    }
  }

  async function handleStatusChange(ticket, status) {
    const ticketId = getTicketId(ticket);
    setUpdatingTicketId(ticketId);
    setActionError("");

    try {
      const data = await updateTicketStatus(token, ticketId, status);
      replaceTicket(data.ticket);
      if (Number(getTicketId(selectedTicket || {})) === Number(ticketId)) {
        setSelectedTicket(data.ticket);
      }
    } catch (error) {
      if (isSessionError(error) && onUnauthorized) {
        onUnauthorized();
        return;
      }

      setActionError(error.message || "No se pudo actualizar el estado.");
    } finally {
      setUpdatingTicketId("");
    }
  }

  function handleTicketSaved(ticket) {
    replaceTicket(ticket);
    setSelectedTicket(ticket);
  }

  async function handleDeleteTicket(ticket) {
    const ticketId = getTicketId(ticket);
    const title = ticket.title || ticket.Title || `ticket #${ticketId}`;

    if (!window.confirm(`¿Eliminar "${title}"?`)) {
      return;
    }

    setUpdatingTicketId(ticketId);
    setActionError("");

    try {
      await deleteTicket(token, ticketId);
      setTickets((current) =>
        current.filter((item) => Number(getTicketId(item)) !== Number(ticketId))
      );
      if (Number(getTicketId(selectedTicket || {})) === Number(ticketId)) {
        setSelectedTicket(null);
      }
    } catch (error) {
      if (isSessionError(error) && onUnauthorized) {
        onUnauthorized();
        return;
      }

      setActionError(error.message || "No se pudo eliminar el ticket.");
    } finally {
      setUpdatingTicketId("");
    }
  }

  function renderTicketsTable({ compact = false } = {}) {
    if (isLoadingTickets) {
      return (
        <section className="tickets-panel">
          <div className="empty-state">Cargando tickets...</div>
        </section>
      );
    }

    if (ticketsError) {
      return (
        <section className="tickets-panel">
          <div className="empty-state empty-state--error">{ticketsError}</div>
        </section>
      );
    }

    return (
      <TicketTable
        tickets={compact ? tickets.slice(0, 6) : tickets}
        user={user}
        title={compact ? "Últimos tickets" : "Tickets registrados"}
        description={
          compact
            ? "Actividad reciente del sistema"
            : "Seguimiento completo de solicitudes de soporte"
        }
        emptyMessage="No hay tickets registrados."
        onView={setSelectedTicket}
        onStatusChange={handleStatusChange}
        onDelete={handleDeleteTicket}
        updatingTicketId={updatingTicketId}
      />
    );
  }

  function renderContent() {
    if (activeSection === "tickets") {
      return (
        <div className="view-stack">
          {actionError && (
            <div className="empty-state empty-state--error rounded-lg bg-white">
              {actionError}
            </div>
          )}
          <TicketForm onSubmit={handleCreateTicket} saving={isSavingTicket} />
          {renderTicketsTable()}
        </div>
      );
    }

    if (activeSection === "users") {
      return (
        <UsersPage
          onUnauthorized={onUnauthorized}
          token={token}
          user={user}
        />
      );
    }

    if (activeSection === "reports") {
      return (
        <ReportsPage
          error={ticketsError}
          tickets={tickets}
          isLoading={isLoadingTickets}
        />
      );
    }

    return (
      <div className="view-stack">
        <section className="stats-grid" aria-label="Estadísticas de tickets">
          {stats.map((stat) => (
            <StatCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              helper={stat.helper}
              icon={stat.icon}
              tone={stat.tone}
            />
          ))}
        </section>
        {actionError && (
          <div className="empty-state empty-state--error rounded-lg bg-white">
            {actionError}
          </div>
        )}
        {renderTicketsTable({ compact: true })}
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <Sidebar
        activeSection={activeSection}
        onNavigate={(section) => {
          setActiveSection(section);
          replacePathForSection(section);
          setActionError("");
        }}
        user={user}
      />

      <main className="dashboard-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Sistema Interno de Soporte Técnico</p>
            <h1>{currentSection.title}</h1>
            <p>{currentSection.subtitle}</p>
          </div>
          <div className="topbar__actions">
            <span className={`realtime-pill ${isRealtimeActive ? "is-active" : ""}`}>
              Tiempo real {isRealtimeActive ? "activo" : "conectando"}
            </span>
            <button
              className="refresh-button"
              disabled={isLoadingTickets}
              onClick={loadTickets}
              type="button"
            >
              <RefreshCw size={16} />
              Actualizar
            </button>
            <div className="current-user" aria-label="Usuario actual">
              <div className="current-user__details">
                <span>{userName}</span>
                <small>{userEmail}</small>
                <small>{userRole}</small>
              </div>
              <button className="logout-button" onClick={onLogout} type="button">
                Salir
              </button>
            </div>
          </div>
        </header>

        {renderContent()}
      </main>

      {selectedTicket && (
        <TicketDetails
          ticket={selectedTicket}
          token={token}
          user={user}
          onClose={() => setSelectedTicket(null)}
          onUnauthorized={onUnauthorized}
          onSaved={handleTicketSaved}
        />
      )}
    </div>
  );
}

export default AdminDashboard;
