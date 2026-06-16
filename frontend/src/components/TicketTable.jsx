import { Trash2 } from "lucide-react";

const statusOptions = ["Abierto", "En proceso", "Cerrado"];

function getPriorityClass(priority) {
  return `badge badge--priority-${priority.toLowerCase()}`;
}

function getStatusClass(status) {
  return `ticket-select ticket-select--${status
    .toLowerCase()
    .replace(" ", "-")}`;
}

function TicketTable({ tickets, onStatusChange, onDeleteTicket }) {
  return (
    <section className="tickets-panel">
      <div className="section-heading">
        <div>
          <h2>Tickets recientes</h2>
          <p>Administración visual de solicitudes de soporte</p>
        </div>
        <span>{tickets.length} registros</span>
      </div>

      <div className="table-wrap">
        <table className="ticket-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Título</th>
              <th>Usuario</th>
              <th>Prioridad</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id}>
                <td className="ticket-table__id">{ticket.id}</td>
                <td className="ticket-table__title">{ticket.title}</td>
                <td>{ticket.user}</td>
                <td>
                  <span className={getPriorityClass(ticket.priority)}>
                    {ticket.priority}
                  </span>
                </td>
                <td>
                  <select
                    className={getStatusClass(ticket.status)}
                    value={ticket.status}
                    onChange={(event) =>
                      onStatusChange(ticket.id, event.target.value)
                    }
                    aria-label={`Cambiar estado de ${ticket.id}`}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{ticket.createdAt}</td>
                <td>
                  <button
                    className="icon-button icon-button--danger"
                    type="button"
                    onClick={() => onDeleteTicket(ticket.id)}
                    aria-label={`Eliminar ${ticket.id}`}
                    title="Eliminar ticket"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {tickets.length === 0 && (
          <div className="empty-state">No hay tickets para mostrar.</div>
        )}
      </div>
    </section>
  );
}

export default TicketTable;
