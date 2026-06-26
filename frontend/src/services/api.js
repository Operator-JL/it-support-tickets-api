export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const errorMessages = {
  "credenciales invalidas": "Credenciales invalidas.",
  "invalid credentials": "Credenciales invalidas.",
  unauthorized: "Sesion invalida o expirada.",
  "invalid or expired token": "Sesion invalida o expirada.",
  "authorization token is required": "Sesion invalida o expirada.",
  "you do not have permission to perform this action": "No tienes permiso para realizar esta accion.",
  "user is inactive": "Esta cuenta esta desactivada.",
  "google login is not configured": "Google no esta configurado en el servidor.",
  "google credential is required": "Google no devolvio credencial.",
  "invalid google credential": "Credencial de Google invalida.",
  "google account is not linked to this user": "Esta cuenta de Google no esta vinculada a este usuario.",
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
      error.data = data;
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

function buildSessionError() {
  const error = new Error("Sesion invalida o expirada.");
  error.status = 401;
  return error;
}

function isSessionError(error) {
  return error.status === 401 ||
    (error.status === 403 && error.data?.message === "User is inactive");
}

export function login(email, password) {
  return request("/login", {
    method: "POST",
    body: { email, password },
  });
}

export function googleLogin(credential) {
  return request("/auth/google", {
    method: "POST",
    body: { credential },
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
    if (isSessionError(error)) {
      throw buildSessionError();
    }

    if (
      error.message === "Sesion invalida o expirada." ||
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

export function createUser(token, user) {
  return request("/users", {
    method: "POST",
    token,
    body: user,
  });
}

export function updateUser(token, userId, user) {
  return request(`/users/${userId}`, {
    method: "PUT",
    token,
    body: user,
  });
}

export function updateUserRole(token, userId, role) {
  return request(`/users/${userId}/role`, {
    method: "PATCH",
    token,
    body: { role },
  });
}

export function updateUserStatus(token, userId, isActive) {
  return request(`/users/${userId}/status`, {
    method: "PATCH",
    token,
    body: { is_active: isActive },
  });
}

export function updateUserPassword(token, userId, password) {
  return request(`/users/${userId}/password`, {
    method: "PATCH",
    token,
    body: { password },
  });
}

export { isSessionError };
