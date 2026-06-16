function StatCard({ title, value, helper, icon: Icon, tone = "orange" }) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <div>
        <p className="stat-card__label">{title}</p>
        <strong className="stat-card__value">{value}</strong>
        <span className="stat-card__helper">{helper}</span>
      </div>
      <div className="stat-card__icon" aria-hidden="true">
        <Icon size={24} strokeWidth={2.2} />
      </div>
    </article>
  );
}

export default StatCard;
