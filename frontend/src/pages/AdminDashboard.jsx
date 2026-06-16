import { AlertTriangle, ClipboardList, Gauge, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import Sidebar from "../components/Sidebar.jsx";
import StatCard from "../components/StatCard.jsx";
import TicketTable from "../components/TicketTable.jsx";
import { demoTickets } from "../data/mockData.js";

function AdminDashboard() {
  const [tickets, setTickets] = useState(demoTickets);

  const stats = useMemo(() => {
    const highPriority = tickets.filter((ticket) =>
      ["Alta", "Urgente"].includes(ticket.priority)
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
        title: "Alta prioridad",
        value: highPriority,
        helper: "Incluye urgentes",
        icon: ShieldAlert,
        tone: "red",
      },
      {
        title: "Media prioridad",
        value: tickets.filter((ticket) => ticket.priority === "Media").length,
        helper: "Requieren seguimiento",
        icon: Gauge,
        tone: "amber",
      },
      {
        title: "Baja prioridad",
        value: tickets.filter((ticket) => ticket.priority === "Baja").length,
        helper: "Atencion programable",
        icon: AlertTriangle,
        tone: "green",
      },
    ];
  }, [tickets]);

  const handleStatusChange = (ticketId, nextStatus) => {
    setTickets((currentTickets) =>
      currentTickets.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, status: nextStatus } : ticket
      )
    );
  };

  const handleDeleteTicket = (ticketId) => {
    setTickets((currentTickets) =>
      currentTickets.filter((ticket) => ticket.id !== ticketId)
    );
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Sistema Interno de Soporte Tecnico</p>
            <h1>Dashboard</h1>
            <p>Resumen general de tickets</p>
          </div>
          <div className="current-user" aria-label="Usuario actual">
            <span>Admin</span>
          </div>
        </header>

        <section className="stats-grid" aria-label="Estadisticas de tickets">
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

        <TicketTable
          tickets={tickets}
          onStatusChange={handleStatusChange}
          onDeleteTicket={handleDeleteTicket}
        />
      </main>
    </div>
  );
}

export default AdminDashboard;
