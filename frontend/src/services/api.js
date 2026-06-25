export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const errorMessages = {
  "invalid credentials": "Credenciales inválidas.",
  unauthorized: "Sesión inválida o expirada.",
  "invalid or expired token": "Sesión inválida o expirada.",
  "authorization token is required": "Sesión inválida o expirada.",
  "you do not have permission to perform this action": "No tienes permiso para realizar esta acción.",
  "ticket not found": "Ticket no encontrado.",
  "user not found": "Usuario no encontrado.",
  "failed to fetch": "No se pudo conectar con el servidor.",
};

function getFriendlyErrorMessage(message) {
  if (!message) {
    return "Error en la solicitud.";
  }

  return errorMessages[String(message).toLowerCase()] || message;
}

async function request(path, options = {}) {
  const { body, token, headers = {}, ...fetchOptions } = options;
  const requestHeaders = {
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(getFriendlyErrorMessage(data.message));
      error.status = response.status;
      throw error;
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("No se pudo conectar con el servidor.");
    }

    throw error;
  }
}

export function login(email, password) {
  return request("/login", {
    method: "POST",
    body: { email, password },
  });
}

export function logout(token) {
  return request("/logout", {
    method: "POST",
    token,
  });
}

export function getProfile(token) {
  return request("/profile", {
    token,
  });
}

export async function getTickets(token) {
  try {
    return await request("/tickets", {
      token,
    });
  } catch (error) {
    if (error.status === 401) {
      throw new Error("Sesión inválida o expirada.");
    }

    if (
      error.message === "Sesión inválida o expirada." ||
      error.message === "No se pudo conectar con el servidor."
    ) {
      throw error;
    }

    throw new Error("No se pudieron cargar los tickets.");
  }
}

export function createTicket(token, ticket) {
  return request("/tickets", {
    method: "POST",
    token,
    body: ticket,
  });
}

export function updateTicket(token, ticketId, ticket) {
  return request(`/tickets/${ticketId}`, {
    method: "PUT",
    token,
    body: ticket,
  });
}

export function updateTicketStatus(token, ticketId, status) {
  return request(`/tickets/${ticketId}/status`, {
    method: "PATCH",
    token,
    body: { status },
  });
}

export function deleteTicket(token, ticketId) {
  return request(`/tickets/${ticketId}`, {
    method: "DELETE",
    token,
  });
}

export function getComments(token, ticketId) {
  return request(`/tickets/${ticketId}/comments`, {
    token,
  });
}

export function addComment(token, ticketId, comment) {
  return request(`/tickets/${ticketId}/comments`, {
    method: "POST",
    token,
    body: { comment },
  });
}

export function getUsers(token) {
  return request("/users", {
    token,
  });
}

export function updateUserRole(token, userId, role) {
  return request(`/users/${userId}/role`, {
    method: "PATCH",
    token,
    body: { role },
  });
}
