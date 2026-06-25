import { RefreshCw, ShieldCheck, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { getUsers, updateUserRole } from "../services/api.js";

const roles = ["user", "it", "admin"];
const roleLabels = {
  admin: "Administrador",
  it: "Soporte",
  user: "Usuario",
};

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

function UsersPage({ token, user }) {
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [savingUserId, setSavingUserId] = useState("");
  const [error, setError] = useState("");

  async function loadUsers() {
    if (!isAdmin) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const data = await getUsers(token);
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (loadError) {
      setUsers([]);
      setError(loadError.message || "No se pudieron cargar los usuarios.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [isAdmin, token]);

  async function handleRoleChange(nextUser, role) {
    setSavingUserId(nextUser.id);
    setError("");

    try {
      const data = await updateUserRole(token, nextUser.id, role);
      setUsers((current) =>
        current.map((item) => (item.id === nextUser.id ? data.user : item))
      );
    } catch (updateError) {
      setError(updateError.message || "No se pudo actualizar el rol.");
    } finally {
      setSavingUserId("");
    }
  }

  if (!isAdmin) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-orange-600" size={24} />
          <div>
            <h2 className="text-xl font-black text-slate-950">
              Usuarios
            </h2>
            <p className="text-sm font-semibold text-slate-500">
              Esta sección está disponible para administradores.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-orange-50 text-orange-600">
            <UsersRound size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-950">
              Usuarios
            </h2>
            <p className="text-sm text-slate-500">
              {users.length} cuentas registradas
            </p>
          </div>
        </div>
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 text-sm font-black text-orange-700 transition hover:bg-orange-600 hover:text-white"
          disabled={isLoading}
          onClick={loadUsers}
          type="button"
        >
          <RefreshCw size={16} />
          Actualizar
        </button>
      </div>

      {error && (
        <p className="m-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
              <th className="px-5 py-4 font-black">Nombre</th>
              <th className="px-5 py-4 font-black">Correo</th>
              <th className="px-5 py-4 font-black">Rol</th>
              <th className="px-5 py-4 font-black">Estado</th>
              <th className="px-5 py-4 font-black">Alta</th>
            </tr>
          </thead>
          <tbody>
            {users.map((nextUser) => (
              <tr className="border-b border-slate-100 last:border-0" key={nextUser.id}>
                <td className="px-5 py-4 font-bold text-slate-950">
                  {nextUser.name}
                </td>
                <td className="px-5 py-4 text-slate-600">{nextUser.email}</td>
                <td className="px-5 py-4">
                  <select
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none ring-orange-100 transition focus:border-orange-500 focus:ring-4"
                    disabled={savingUserId === nextUser.id}
                    onChange={(event) => handleRoleChange(nextUser, event.target.value)}
                    value={nextUser.role}
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {roleLabels[role]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                      nextUser.is_active
                        ? "bg-green-50 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {nextUser.is_active ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {formatDate(nextUser.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!isLoading && users.length === 0 && (
          <div className="p-6 text-center font-semibold text-slate-500">
            No hay usuarios para mostrar.
          </div>
        )}
        {isLoading && (
          <div className="p-6 text-center font-semibold text-slate-500">
            Cargando usuarios...
          </div>
        )}
      </div>
    </section>
  );
}

export default UsersPage;
