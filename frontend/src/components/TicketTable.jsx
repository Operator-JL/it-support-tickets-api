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

function TicketTable({ tickets }) {
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
              <th>Categoría</th>
              <th>Usuario</th>
              <th>Prioridad</th>
              <th>Estado</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket, index) => {
              const id = getField(ticket, ["id", "Id"]);
              const title = getField(ticket, ["title", "Title"], "Sin título");
              const description = getField(ticket, [
                "description",
                "Description",
              ]);
              const category = getField(ticket, ["category", "Category"], "-");
              const priority = getField(ticket, ["priority", "Priority"], "-");
              const status = getField(ticket, ["status", "Status"], "-");
              const createdAt = getField(ticket, ["created_at", "CreatedAt"]);

              return (
                <tr key={id || `ticket-${index}`}>
                  <td className="ticket-table__id">{id}</td>
                  <td className="ticket-table__title">
                    <span>{title}</span>
                    {description && (
                      <small className="ticket-table__description">
                        {description}
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
                    <span className={getStatusClass(status)}>{status}</span>
                  </td>
                  <td>{formatDate(createdAt)}</td>
                </tr>
              );
            })}
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
