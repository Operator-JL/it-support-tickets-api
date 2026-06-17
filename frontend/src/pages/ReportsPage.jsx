import { BarChart3, CheckCircle2, Gauge, PieChart } from "lucide-react";

function getField(ticket, fields, fallback = "") {
  for (const field of fields) {
    if (ticket[field] !== undefined && ticket[field] !== null) {
      return ticket[field];
    }
  }

  return fallback;
}

function countBy(tickets, fields) {
  return tickets.reduce((totals, ticket) => {
    const value = String(getField(ticket, fields, "Sin dato")).trim() || "Sin dato";
    totals[value] = (totals[value] || 0) + 1;
    return totals;
  }, {});
}

function ReportCard({ title, value, helper, icon: Icon, tone }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    orange: "bg-orange-50 text-orange-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <article className="flex min-h-32 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-bold text-slate-500">{title}</p>
        <strong className="mt-2 block text-4xl font-black leading-none text-slate-950">
          {value}
        </strong>
        <span className="mt-2 block text-sm text-slate-500">{helper}</span>
      </div>
      <div className={`grid h-12 w-12 place-items-center rounded-xl ${tones[tone]}`}>
        <Icon size={24} />
      </div>
    </article>
  );
}

function BarList({ title, items, total }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
      <div className="mt-4 grid gap-3">
        {items.map(([label, count]) => {
          const percent = total > 0 ? Math.round((count / total) * 100) : 0;

          return (
            <div key={label}>
              <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                <span className="font-bold text-slate-700">{label}</span>
                <span className="font-black text-slate-950">
                  {count} ({percent}%)
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-orange-600"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <p className="text-sm font-semibold text-slate-500">
            No hay datos para calcular.
          </p>
        )}
      </div>
    </section>
  );
}

function ReportsPage({ tickets, isLoading }) {
  const total = tickets.length;
  const statusCounts = countBy(tickets, ["status", "Status"]);
  const priorityCounts = Object.entries(countBy(tickets, ["priority", "Priority"]));
  const categoryCounts = Object.entries(countBy(tickets, ["category", "Category"]));
  const open = statusCounts.Abierto || 0;
  const inProgress = statusCounts["En proceso"] || 0;
  const closed = statusCounts.Cerrado || 0;
  const closedPercent = total > 0 ? Math.round((closed / total) * 100) : 0;

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center font-bold text-slate-500 shadow-sm">
        Cargando reportes...
      </section>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 xl:grid-cols-4 sm:grid-cols-2">
        <ReportCard
          title="Tickets totales"
          value={total}
          helper="Registros reales"
          icon={BarChart3}
          tone="orange"
        />
        <ReportCard
          title="Abiertos"
          value={open}
          helper="Pendientes"
          icon={PieChart}
          tone="red"
        />
        <ReportCard
          title="En proceso"
          value={inProgress}
          helper="En seguimiento"
          icon={Gauge}
          tone="blue"
        />
        <ReportCard
          title="Cerrados"
          value={`${closedPercent}%`}
          helper={`${closed} tickets finalizados`}
          icon={CheckCircle2}
          tone="green"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <BarList title="Por prioridad" items={priorityCounts} total={total} />
        <BarList title="Por categoría" items={categoryCounts} total={total} />
      </div>
    </div>
  );
}

export default ReportsPage;
