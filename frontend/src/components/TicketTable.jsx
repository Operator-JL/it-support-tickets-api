import { Eye, Trash2 } from "lucide-react";

const statuses = ["Abierto", "En proceso", "Cerrado"];

function getField(ticket, fields, fallback = "") {
  for (const field of fields) {
    if (ticket[field] !== undefined && ticket[field] !== null) {
      return ticket[field];
    }
  }

  return fallback;
}

function getClassValue(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

function getPriorityClass(priority) {
  return `badge badge--priority-${getClassValue(priority)}`;
}

function getStatusClass(status) {
  return `status-pill status-pill--${getClassValue(status)}`;
}

function getStatusSelectClass(status) {
  return `ticket-select ticket-select--${getClassValue(status)}`;
}

function formatDate(value) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
  }).format(date);
}

function getUserLabel(ticket) {
  const userName = getField(ticket, ["user", "User", "user_name", "UserName"]);
  const userId = getField(ticket, ["user_id", "UserId", "userId"]);

  return userName || (userId ? `Usuario #${userId}` : "Sin usuario");
}

function TicketTable({
  tickets,
  user,
  title = "Tickets recientes",
  description = "Administración visual de solicitudes de soporte",
  emptyMessage = "No hay tickets para mostrar.",
  onView,
  onStatusChange,
  onDelete,
  updatingTicketId,
}) {
  const role = String(user?.role || "").toLowerCase();
  const canSupport = ["it", "admin"].includes(role);
  const canDelete = role === "admin";
  const hasActions = Boolean(onView || onDelete);

  return (
    <section className="tickets-panel">
      <div className="section-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span>{tickets.length} registros</span>
      </div>

      <div className="table-wrap">
        <table className="ticket-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Título</th>
              <th>Categoría</th>
              <th>Usuario</th>
              <th>Prioridad</th>
              <th>Estado</th>
              <th>Fecha</th>
              {hasActions && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket, index) => {
              const id = getField(ticket, ["id", "Id"]);
              const titleValue = getField(ticket, ["title", "Title"], "Sin título");
              const descriptionValue = getField(ticket, [
                "description",
                "Description",
              ]);
              const category = getField(ticket, ["category", "Category"], "-");
              const priority = getField(ticket, ["priority", "Priority"], "-");
              const status = getField(ticket, ["status", "Status"], "-");
              const createdAt = getField(ticket, ["created_at", "CreatedAt"]);
              const isUpdating = Number(updatingTicketId) === Number(id);

              return (
                <tr key={id || `ticket-${index}`}>
                  <td className="ticket-table__id">{id}</td>
                  <td className="ticket-table__title">
                    <span>{titleValue}</span>
                    {descriptionValue && (
                      <small className="ticket-table__description">
                        {descriptionValue}
                      </small>
                    )}
                  </td>
                  <td>{category}</td>
                  <td>{getUserLabel(ticket)}</td>
                  <td>
                    <span className={getPriorityClass(priority)}>
                      {priority}
                    </span>
                  </td>
                  <td>
                    {canSupport && onStatusChange ? (
                      <select
                        className={getStatusSelectClass(status)}
                        disabled={isUpdating}
                        onChange={(event) => onStatusChange(ticket, event.target.value)}
                        value={status}
                      >
                        {statuses.map((nextStatus) => (
                          <option key={nextStatus} value={nextStatus}>
                            {nextStatus}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={getStatusClass(status)}>{status}</span>
                    )}
                  </td>
                  <td>{formatDate(createdAt)}</td>
                  {hasActions && (
                    <td>
                      <div className="ticket-actions">
                        {onView && (
                          <button
                            className="icon-button"
                            onClick={() => onView(ticket)}
                            type="button"
                            aria-label={`Ver ticket ${id}`}
                          >
                            <Eye size={18} />
                          </button>
                        )}
                        {canDelete && onDelete && (
                          <button
                            className="icon-button icon-button--danger"
                            onClick={() => onDelete(ticket)}
                            type="button"
                            aria-label={`Eliminar ticket ${id}`}
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {tickets.length === 0 && (
          <div className="empty-state">{emptyMessage}</div>
        )}
      </div>
    </section>
  );
}

export default TicketTable;
