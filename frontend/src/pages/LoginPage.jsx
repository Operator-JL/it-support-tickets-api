import { GoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import sistLogo from "../assets/brand/sist-logo.png";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

function LoginPage({ onGoogleLogin, onLogin, sessionMessage = "" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await onLogin({ email, password });
    } catch (loginError) {
      setError(loginError.message || "No se pudo iniciar sesion.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");

    if (!credentialResponse.credential) {
      setError("Google no devolvio credencial.");
      return;
    }

    setIsLoading(true);

    try {
      await onGoogleLogin(credentialResponse.credential);
    } catch (loginError) {
      setError(loginError.message || "No se pudo iniciar sesion con Google.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="login-screen">
      <section className="login-hero" aria-label="Marca SIST">
        <img src={sistLogo} alt="SIST" className="login-hero__logo" />
        <h1>Sistema Interno de Soporte Tecnico</h1>
        <span>Soporte IT claro, rapido y organizado.</span>
      </section>

      <section className="login-card" aria-labelledby="login-title">
        <h1 id="login-title">Iniciar sesion</h1>
        <p>Accede con tu usuario registrado en el servidor.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Correo electronico</span>
            <input
              autoComplete="email"
              disabled={isLoading}
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          <label className="form-field">
            <span>Contrasena</span>
            <input
              autoComplete="current-password"
              disabled={isLoading}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          {(error || sessionMessage) && (
            <p className="login-error" role="alert">
              {error || sessionMessage}
            </p>
          )}

          <button className="login-button" disabled={isLoading} type="submit">
            {isLoading ? "Validando..." : "Iniciar sesion"}
          </button>
        </form>

        {googleClientId && (
          <div className="google-login-wrap">
            <div className="login-divider" aria-hidden="true">
              <span />
              <strong>o</strong>
              <span />
            </div>
            <GoogleLogin
              onError={() => setError("No se pudo iniciar sesion con Google.")}
              onSuccess={handleGoogleSuccess}
              theme="filled_black"
              width="100%"
            />
          </div>
        )}
      </section>
    </main>
  );
}

export default LoginPage;
