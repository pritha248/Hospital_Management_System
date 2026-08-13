import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Calendar, FileText, FileSpreadsheet, CreditCard, Sparkles, UserCheck, Stethoscope } from 'lucide-react';

const Sidebar = () => {
  const { user } = useAuth();
  if (!user) return null;

  const roleKey = (user.role === 'admin' || user.role === 'manager') ? 'manager' : user.role;

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['patient', 'doctor', 'manager', 'admin'] },
    { to: '/appointments', label: 'Appointments', icon: Calendar, roles: ['patient', 'doctor', 'manager', 'admin'] },
    { to: '/prescriptions', label: 'Prescriptions', icon: FileText, roles: ['patient', 'doctor'] },
    { to: '/reports', label: 'Medical Reports', icon: FileSpreadsheet, roles: ['patient', 'doctor'] }, // REMOVED for manager/admin
    { to: '/billing', label: 'Billing & Insurance', icon: CreditCard, roles: ['patient', 'manager', 'admin'] },
    { to: '/ai-hub', label: 'AI Clinical Hub', icon: Sparkles, roles: ['patient', 'doctor'], highlight: true }, // REMOVED for manager/admin
  ];

  const filteredItems = navItems.filter(item => item.roles.includes(roleKey) || item.roles.includes(user.role));

  return (
    <aside style={{
      width: '240px',
      background: 'rgba(11, 15, 25, 0.95)',
      borderRight: '1px solid var(--glass-border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '1.5rem 1rem',
      gap: '0.5rem'
    }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', padding: '0 0.75rem 0.5rem 0.75rem' }}>
        Navigation
      </div>

      {filteredItems.map(item => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'all 0.2s ease',
              background: isActive 
                ? (item.highlight ? 'var(--gradient-ai)' : 'var(--gradient-primary)')
                : item.highlight ? 'rgba(124, 58, 237, 0.12)' : 'transparent',
              color: isActive ? '#ffffff' : item.highlight ? '#c084fc' : 'var(--text-muted)',
              border: item.highlight && !isActive ? '1px solid rgba(124, 58, 237, 0.3)' : '1px solid transparent'
            })}
          >
            <Icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        );
      })}

      <div style={{ marginTop: 'auto', background: 'rgba(31, 41, 55, 0.4)', borderRadius: '12px', padding: '1rem', border: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', color: '#38bdf8', fontWeight: 700, fontSize: '0.85rem' }}>
          <Stethoscope size={16} /> EMR Mode
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Logged in as <strong style={{ color: 'white' }}>{(roleKey === 'manager') ? 'MANAGER' : user.role.toUpperCase()}</strong>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
