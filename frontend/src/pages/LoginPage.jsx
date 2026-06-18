import { useState } from "react";
import sistLogo from "../assets/brand/sist-logo.png";

function LoginPage({ onLogin, sessionMessage = "" }) {
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
      setError(loginError.message || "No se pudo iniciar sesión.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="login-screen">
      <section className="login-hero" aria-label="Marca SIST">
        <img src={sistLogo} alt="SIST" className="login-hero__logo" />
        <h1>Sistema Interno de Soporte Técnico</h1>
        <span>Soporte IT claro, rápido y organizado.</span>
      </section>

      <section className="login-card" aria-labelledby="login-title">
        <h1 id="login-title">Iniciar sesión</h1>
        <p>Accede con tu usuario registrado en el servidor.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Correo electrónico</span>
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
            <span>Contraseña</span>
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
            {isLoading ? "Validando..." : "Iniciar sesión"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
