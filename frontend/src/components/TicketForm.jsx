import { useState } from "react";

const blankTicket = {
  title: "",
  category: "",
  priority: "Media",
  description: "",
};
const categories = ["Correo", "Hardware", "Software", "Red", "Accesos", "Otro"];
const priorities = ["Baja", "Media", "Alta", "Urgente"];
const inputClass =
  "rounded-xl border border-slate-200 px-4 py-3 outline-none ring-orange-100 transition focus:border-orange-500 focus:ring-4";

function TicketForm({ onSubmit, saving }) {
  const [form, setForm] = useState(blankTicket);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await onSubmit(form);
    setForm(blankTicket);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-black text-slate-950">Nuevo ticket</h2>
        <p className="text-sm text-slate-500">
          Registra una solicitud de soporte con prioridad y categoría.
        </p>
      </div>

      <form className="grid gap-3 lg:grid-cols-4" onSubmit={handleSubmit}>
        <input
          className={`${inputClass} lg:col-span-2`}
          disabled={saving}
          onChange={(event) => update("title", event.target.value)}
          placeholder="Título del problema"
          required
          value={form.title}
        />
        <select
          className={inputClass}
          disabled={saving}
          onChange={(event) => update("category", event.target.value)}
          required
          value={form.category}
        >
          <option value="">Categoría</option>
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
        <select
          className={inputClass}
          disabled={saving}
          onChange={(event) => update("priority", event.target.value)}
          value={form.priority}
        >
          {priorities.map((priority) => (
            <option key={priority}>{priority}</option>
          ))}
        </select>
        <textarea
          className={`${inputClass} min-h-28 resize-y lg:col-span-3`}
          disabled={saving}
          onChange={(event) => update("description", event.target.value)}
          placeholder="Describe el problema"
          required
          value={form.description}
        />
        <button
          className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white transition hover:bg-orange-700 disabled:opacity-60"
          disabled={saving}
          type="submit"
        >
          {saving ? "Guardando..." : "Crear ticket"}
        </button>
      </form>
    </section>
  );
}

export default TicketForm;
