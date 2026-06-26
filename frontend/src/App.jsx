import { useCallback, useEffect, useState } from "react";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import { getProfile, googleLogin, login, logout } from "./services/api.js";
import { disconnectSocket, getSocket } from "./services/socket.js";

const TOKEN_STORAGE_KEY = "sist_auth_token";
const USER_STORAGE_KEY = "sist_auth_user";

function getStoredToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY) || "";
}

function getStoredUser() {
  try {
    const rawUser = localStorage.getItem(USER_STORAGE_KEY);
    return rawUser ? JSON.parse(rawUser) : null;
  } catch (error) {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
}

function saveSession(nextToken, nextUser) {
  localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
}

function clearStoredSession() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

function App() {
  const [token, setToken] = useState(getStoredToken);
  const [user, setUser] = useState(getStoredUser);
  const [isCheckingSession, setIsCheckingSession] = useState(() =>
    Boolean(getStoredToken())
  );
  const [sessionMessage, setSessionMessage] = useState("");

  const clearSession = useCallback((message = "") => {
    disconnectSocket();
    clearStoredSession();
    setToken("");
    setUser(null);
    setSessionMessage(message);
  }, []);

  const startSession = useCallback(async (loginData) => {
    if (!loginData.token) {
      throw new Error("El servidor no devolvio token.");
    }

    const profileData = await getProfile(loginData.token);
    const nextUser = profileData.user || loginData.user;

    saveSession(loginData.token, nextUser);
    setToken(loginData.token);
    setUser(nextUser);
    setSessionMessage("");
    getSocket(loginData.token).catch(() => {});
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      if (!token) {
        disconnectSocket();
        setUser(null);
        setIsCheckingSession(false);
        return;
      }

      setIsCheckingSession(true);

      try {
        const profileData = await getProfile(token);

        if (isActive) {
          const nextUser = profileData.user;
          setUser(nextUser);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
          setSessionMessage("");
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        if ([401, 403, 404].includes(error.status)) {
          clearSession("Tu sesion expiro. Inicia sesion otra vez.");
          return;
        }

        const storedUser = getStoredUser();
        if (storedUser) {
          setUser(storedUser);
          setSessionMessage("");
        } else {
          clearSession("No se pudo validar la sesion con el servidor.");
        }
      } finally {
        if (isActive) {
          setIsCheckingSession(false);
        }
      }
    }

    loadProfile();

    return () => {
      isActive = false;
    };
  }, [clearSession, token]);

  const handleLogin = async ({ email, password }) => {
    const loginData = await login(email, password);
    await startSession(loginData);
  };

  const handleGoogleLogin = async (credential) => {
    const loginData = await googleLogin(credential);
    await startSession(loginData);
  };

  const handleUnauthorized = useCallback(() => {
    clearSession("Tu sesion expiro. Inicia sesion otra vez.");
  }, [clearSession]);

  const handleLogout = async () => {
    const currentToken = token;

    try {
      if (currentToken) {
        await logout(currentToken);
      }
    } catch (error) {
      // Aunque falle el endpoint, la sesion local se limpia.
    }

    clearSession("");
  };

  if (isCheckingSession) {
    return <div className="auth-loading">Cargando sesion...</div>;
  }

  if (!token || !user) {
    return (
      <LoginPage
        onGoogleLogin={handleGoogleLogin}
        onLogin={handleLogin}
        sessionMessage={sessionMessage}
      />
    );
  }

  return (
    <AdminDashboard
      onLogout={handleLogout}
      onUnauthorized={handleUnauthorized}
      token={token}
      user={user}
    />
  );
}

export default App;
