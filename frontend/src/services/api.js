export const API_BASE_URL = "http://localhost:3000";

const errorMessages = {
  "invalid credentials": "Credenciales inválidas.",
  unauthorized: "Sesión inválida o expirada.",
  "invalid or expired token": "Sesión inválida o expirada.",
  "authorization token is required": "Sesión inválida o expirada.",
  "failed to fetch": "No se pudo conectar con el servidor.",
};

function getFriendlyErrorMessage(message) {
  if (!message) {
    return "Error en la solicitud.";
  }

  return errorMessages[message.toLowerCase()] || message;
}

async function request(path, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, options);
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
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
}

export function getProfile(token) {
  return request("/profile", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getTickets(token) {
  try {
    return await request("/tickets", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
