import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  Settings,
  UsersRound,
} from "lucide-react";
import sistLogo from "../assets/brand/sist-logo.png";

const menuItems = [
  { id: "dashboard", label: "Panel principal", icon: LayoutDashboard },
  { id: "tickets", label: "Tickets", icon: ClipboardList },
  { id: "users", label: "Usuarios", icon: UsersRound },
  { id: "reports", label: "Reportes", icon: BarChart3 },
  { id: "settings", label: "Configuración", icon: Settings },
];

function Sidebar({ activeSection, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <img src={sistLogo} alt="SIST" className="sidebar__logo" />
      </div>

      <nav className="sidebar__nav" aria-label="Menú principal">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              className={`sidebar__link ${isActive ? "is-active" : ""}`}
              key={item.id}
              onClick={() => onNavigate(item.id)}
              type="button"
              aria-current={isActive ? "page" : undefined}
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
          <small>Soporte técnico</small>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
