import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  Settings,
  UsersRound,
} from "lucide-react";
import sistLogo from "../assets/brand/sist-logo.png";

const menuItems = [
  { label: "Panel principal", icon: LayoutDashboard, active: true },
  { label: "Tickets", icon: ClipboardList },
  { label: "Usuarios", icon: UsersRound },
  { label: "Reportes", icon: BarChart3 },
  { label: "Configuración", icon: Settings },
];

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <img src={sistLogo} alt="SIST" className="sidebar__logo" />
      </div>

      <nav className="sidebar__nav" aria-label="Menú principal">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              className={`sidebar__link ${item.active ? "is-active" : ""}`}
              key={item.label}
              type="button"
              aria-current={item.active ? "page" : undefined}
            >
              <Icon size={20} strokeWidth={2.1} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar__footer">
        <span className="sidebar__status-dot" />
        <div>
          <strong>SIST Administración</strong>
          <small>Demo local</small>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
