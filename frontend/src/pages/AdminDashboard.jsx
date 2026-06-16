import { AlertTriangle, CheckCircle2, ClipboardList, Gauge } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar.jsx";
import StatCard from "../components/StatCard.jsx";
import TicketTable from "../components/TicketTable.jsx";
import { getTickets } from "../services/api.js";

const roleLabels = {
  admin: "Administrador",
  it: "Soporte",
  user: "Usuario",
};

function getTicketStatus(ticket) {
  return String(ticket.status || ticket.Status || "").trim();
}

function AdminDashboard({ token, user, onLogout }) {
  const [tickets, setTickets] = useState([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [ticketsError, setTicketsError] = useState("");
  const userName = user?.name || user?.email || "Usuario";
  const userRole = roleLabels[(user?.role || "").toLowerCase()] || "Usuario";

  useEffect(() => {
    let isActive = true;

    async function loadTickets() {
      setIsLoadingTickets(true);
      setTicketsError("");

      try {
        const ticketsData = await getTickets(token);
        const nextTickets = Array.isArray(ticketsData.tickets)
          ? ticketsData.tickets
          : [];

        if (isActive) {
          setTickets(nextTickets);
        }
      } catch (error) {
        if (isActive) {
          setTickets([]);
          setTicketsError(error.message || "No se pudieron cargar los tickets.");
        }
      } finally {
        if (isActive) {
          setIsLoadingTickets(false);
        }
      }
    }

    loadTickets();

    return () => {
      isActive = false;
    };
  }, [token]);

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

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Sistema Interno de Soporte Técnico</p>
            <h1>Panel principal</h1>
            <p>Resumen general de tickets</p>
          </div>
          <div className="current-user" aria-label="Usuario actual">
            <div className="current-user__details">
              <span>{userName}</span>
              <small>{userRole}</small>
            </div>
            <button className="logout-button" onClick={onLogout} type="button">
              Salir
            </button>
          </div>
        </header>

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

        {isLoadingTickets && (
          <section className="tickets-panel">
            <div className="empty-state">Cargando tickets...</div>
          </section>
        )}

        {!isLoadingTickets && ticketsError && (
          <section className="tickets-panel">
            <div className="empty-state empty-state--error">{ticketsError}</div>
          </section>
        )}

        {!isLoadingTickets && !ticketsError && <TicketTable tickets={tickets} />}
      </main>
    </div>
  );
}

export default AdminDashboard;
