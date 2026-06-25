import { useEffect, useState } from "react";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import { getProfile, login, logout } from "./services/api.js";
import { disconnectSocket, getSocket } from "./services/socket.js";

const TOKEN_STORAGE_KEY = "sist_auth_token";

function getStoredToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY) || "";
}

function App() {
  const [token, setToken] = useState(getStoredToken);
  const [user, setUser] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(() =>
    Boolean(getStoredToken())
  );
  const [sessionMessage, setSessionMessage] = useState("");

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
          setUser(profileData.user);
          setSessionMessage("");
        }
      } catch (error) {
        if (isActive) {
          disconnectSocket();
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          setToken("");
          setUser(null);
          setSessionMessage("Tu sesión expiró. Inicia sesión otra vez.");
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
  }, [token]);

  const handleLogin = async ({ email, password }) => {
    const loginData = await login(email, password);

    if (!loginData.token) {
      throw new Error("El servidor no devolvió token.");
    }

    const profileData = await getProfile(loginData.token);

    localStorage.setItem(TOKEN_STORAGE_KEY, loginData.token);
    setToken(loginData.token);
    setUser(profileData.user || loginData.user);
    setSessionMessage("");
    getSocket(loginData.token).catch(() => {});
  };

  const handleLogout = async () => {
    const currentToken = token;

    try {
      if (currentToken) {
        await logout(currentToken);
      }
    } catch (error) {
      // Aunque falle el endpoint, la sesión local se limpia.
    }

    disconnectSocket();
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken("");
    setUser(null);
    setSessionMessage("");
  };

  if (isCheckingSession) {
    return <div className="auth-loading">Cargando sesión...</div>;
  }

  if (!token || !user) {
    return <LoginPage onLogin={handleLogin} sessionMessage={sessionMessage} />;
  }

  return <AdminDashboard onLogout={handleLogout} token={token} user={user} />;
}

export default App;
