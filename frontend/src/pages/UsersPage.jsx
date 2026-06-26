import { RefreshCw, ShieldCheck, UserPlus, UsersRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  createUser,
  getUsers,
  updateUserRole,
  updateUserStatus,
} from "../services/api.js";

const roles = ["usuario", "soporte", "admin"];
const roleLabels = {
  admin: "Administrador",
  soporte: "Soporte",
  usuario: "Usuario",
  it: "Soporte",
  user: "Usuario",
};

const initialForm = {
  name: "",
  email: "",
  password: "",
  role: "usuario",
};

function normalizeRole(role) {
  const cleanRole = String(role || "").toLowerCase();
  if (cleanRole === "it") {
    return "soporte";
  }
  if (cleanRole === "user") {
    return "usuario";
  }
  return cleanRole || "usuario";
}

function getUserActiveStatus(nextUser) {
  return nextUser.is_active ?? nextUser.isActive ?? false;
}

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

function UsersPage({ token, user, onUnauthorized }) {
  const isAdmin = normalizeRole(user?.role) === "admin";
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [savingUserId, setSavingUserId] = useState("");
  const [error, setError] = useState("");

  const handleError = useCallback((nextError, fallback) => {
    if (nextError.status === 401 && onUnauthorized) {
      onUnauthorized();
      return;
    }

    setError(nextError.message || fallback);
  }, [onUnauthorized]);

  const loadUsers = useCallback(async () => {
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
      handleError(loadError, "No se pudieron cargar los usuarios.");
    } finally {
      setIsLoading(false);
    }
  }, [handleError, isAdmin, token]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleCreateUser(event) {
    event.preventDefault();
    setIsCreating(true);
    setError("");

    try {
      const data = await createUser(token, form);
      setUsers((current) => [data.user, ...current]);
      setForm(initialForm);
    } catch (createError) {
      handleError(createError, "No se pudo crear el usuario.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRoleChange(nextUser, role) {
    setSavingUserId(nextUser.id);
    setError("");

    try {
      const data = await updateUserRole(token, nextUser.id, role);
      setUsers((current) =>
        current.map((item) => (item.id === nextUser.id ? data.user : item))
      );
    } catch (updateError) {
      handleError(updateError, "No se pudo actualizar el rol.");
    } finally {
      setSavingUserId("");
    }
  }

  async function handleStatusChange(nextUser) {
    const nextStatus = !getUserActiveStatus(nextUser);
    setSavingUserId(nextUser.id);
    setError("");

    try {
      const data = await updateUserStatus(token, nextUser.id, nextStatus);
      setUsers((current) =>
        current.map((item) => (item.id === nextUser.id ? data.user : item))
      );
    } catch (updateError) {
      handleError(updateError, "No se pudo actualizar el estado.");
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
            <h2 className="text-xl font-black text-slate-950">Usuarios</h2>
            <p className="text-sm font-semibold text-slate-500">
              Esta seccion esta disponible para administradores.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const activeAdminCount = users.filter((nextUser) => {
    return normalizeRole(nextUser.role) === "admin" && getUserActiveStatus(nextUser);
  }).length;

  return (
    <div className="grid gap-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-orange-50 text-orange-600">
            <UserPlus size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-950">Nuevo usuario</h2>
            <p className="text-sm text-slate-500">
              Alta local con contrasena protegida por bcrypt
            </p>
          </div>
        </div>

        <form
          className="grid gap-3 lg:grid-cols-[1.1fr_1.2fr_1fr_180px_auto]"
          onSubmit={handleCreateUser}
        >
          <input
            className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none ring-orange-100 transition focus:border-orange-500 focus:ring-4"
            disabled={isCreating}
            onChange={(event) => updateForm("name", event.target.value)}
            placeholder="Nombre"
            required
            value={form.name}
          />
          <input
            className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none ring-orange-100 transition focus:border-orange-500 focus:ring-4"
            disabled={isCreating}
            onChange={(event) => updateForm("email", event.target.value)}
            placeholder="correo@sist.local"
            required
            type="email"
            value={form.email}
          />
          <input
            className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none ring-orange-100 transition focus:border-orange-500 focus:ring-4"
            disabled={isCreating}
            onChange={(event) => updateForm("password", event.target.value)}
            placeholder="Contrasena"
            required
            type="password"
            value={form.password}
          />
          <select
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none ring-orange-100 transition focus:border-orange-500 focus:ring-4"
            disabled={isCreating}
            onChange={(event) => updateForm("role", event.target.value)}
            value={form.role}
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {roleLabels[role]}
              </option>
            ))}
          </select>
          <button
            className="h-11 rounded-xl bg-orange-600 px-5 text-sm font-black text-white transition hover:bg-orange-700 disabled:opacity-60"
            disabled={isCreating}
            type="submit"
          >
            {isCreating ? "Creando..." : "Crear"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-orange-50 text-orange-600">
              <UsersRound size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-950">Usuarios</h2>
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
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
                <th className="px-5 py-4 font-black">Nombre</th>
                <th className="px-5 py-4 font-black">Correo</th>
                <th className="px-5 py-4 font-black">Rol</th>
                <th className="px-5 py-4 font-black">Estado</th>
                <th className="px-5 py-4 font-black">Proveedor</th>
                <th className="px-5 py-4 font-black">Alta</th>
                <th className="px-5 py-4 font-black">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((nextUser) => {
                const isCurrentUser = Number(nextUser.id) === Number(user.id);
                const isSaving = savingUserId === nextUser.id;
                const role = normalizeRole(nextUser.role);
                const isActive = getUserActiveStatus(nextUser);
                const isLastActiveAdmin = role === "admin" && isActive && activeAdminCount <= 1;
                const disableStatusAction =
                  isSaving || (isCurrentUser && isActive) || isLastActiveAdmin;

                return (
                  <tr className="border-b border-slate-100 last:border-0" key={nextUser.id}>
                    <td className="px-5 py-4 font-bold text-slate-950">
                      {nextUser.name}
                    </td>
                    <td className="px-5 py-4 text-slate-600">{nextUser.email}</td>
                    <td className="px-5 py-4">
                      <select
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none ring-orange-100 transition focus:border-orange-500 focus:ring-4"
                        disabled={isSaving || isCurrentUser}
                        onChange={(event) => handleRoleChange(nextUser, event.target.value)}
                        value={role}
                      >
                        {roles.map((nextRole) => (
                          <option key={nextRole} value={nextRole}>
                            {roleLabels[nextRole]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                          isActive
                            ? "bg-green-50 text-green-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {nextUser.provider || "local"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {formatDate(nextUser.created_at)}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 transition hover:border-orange-500 hover:text-orange-700 disabled:opacity-50"
                        disabled={disableStatusAction}
                        onClick={() => handleStatusChange(nextUser)}
                        title={
                          disableStatusAction && isActive
                            ? "No se puede desactivar este usuario"
                            : undefined
                        }
                        type="button"
                      >
                        {isActive ? "Desactivar" : "Activar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
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
    </div>
  );
}

export default UsersPage;
