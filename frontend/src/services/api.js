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
      throw new Error(getFriendlyErrorMessage(data.message));
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
