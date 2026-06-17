import { API_BASE_URL } from "../services/api.js";

const roleLabels = {
  admin: "Administrador",
  it: "Soporte",
  user: "Usuario",
};

function SettingsPage({ user }) {
  const role = String(user?.role || "user").toLowerCase();
  const stack = [
    "Node.js",
    "Express",
    "SQL Server",
    "JWT",
    "Vite",
    "React",
    "Tailwind CSS",
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-black uppercase text-orange-600">
          Cuenta actual
        </p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">
          {user?.name || "Usuario"}
        </h2>
        <dl className="mt-5 grid gap-4">
          <div>
            <dt className="text-xs font-black uppercase text-slate-400">
              Correo
            </dt>
            <dd className="mt-1 font-bold text-slate-700">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-black uppercase text-slate-400">
              Rol
            </dt>
            <dd className="mt-1 font-bold text-slate-700">
              {roleLabels[role] || "Usuario"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-black uppercase text-slate-400">
              API
            </dt>
            <dd className="mt-1 break-all font-bold text-slate-700">
              {API_BASE_URL}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-black uppercase text-orange-600">
          Entrega
        </p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">
          Demo SIST
        </h2>
        <div className="mt-5 grid gap-4">
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
            <strong className="text-green-800">Sistema listo para demo local</strong>
            <p className="mt-1 text-sm font-semibold text-green-700">
              Frontend conectado a la API real con navegación local.
            </p>
          </div>
          <div>
            <h3 className="font-black text-slate-950">Stack usado</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {stack.map((item) => (
                <span
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-bold text-slate-600"
                  key={item}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <h3 className="font-black text-slate-950">Notas</h3>
            <p className="mt-1 text-sm text-slate-600">
              La configuración es informativa. No se guarda configuración del
              sistema en base de datos en esta fase.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default SettingsPage;
