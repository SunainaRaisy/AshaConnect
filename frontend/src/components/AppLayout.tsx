import { Outlet, Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Home, Users, UserPlus, ClipboardList, Activity, LogOut, Wifi, WifiOff } from 'lucide-react';
import type { User } from '../types';
import './AppLayout.css';

export default function AppLayout({ user, onLogout }: { user: User | null; onLogout: () => void }) {
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/households', label: 'Households', icon: Home },
    { path: '/patients', label: 'Patients', icon: Users },
    { path: '/visit', label: 'Start Field Visit', icon: UserPlus },
    { path: '/registers', label: 'ASHA Registers', icon: ClipboardList },
    { path: '/followups', label: 'Follow-ups', icon: Activity },
  ];

  useEffect(() => {
    const setOnline = () => setIsOnline(true);
    const setOffline = () => setIsOnline(false);
    window.addEventListener('online', setOnline);
    window.addEventListener('offline', setOffline);
    return () => {
      window.removeEventListener('online', setOnline);
      window.removeEventListener('offline', setOffline);
    };
  }, []);

  return (
    <div className="workspace-shell">
      <aside className="workspace-sidebar">
        <div className="workspace-brand">
          <span className="workspace-brand-mark"><Activity size={19} /></span>
          <div><h1>asha<span>connect</span></h1><p>COMMUNITY HEALTH</p></div>
        </div>
        <nav className="workspace-nav" aria-label="Workspace navigation">
          <p className="workspace-nav-label">WORKSPACE</p>
          {navItems.map((item) => (
            <Link key={item.path} to={item.path} className={`workspace-nav-link ${location.pathname === item.path ? 'is-active' : ''}`}>
              <item.icon size={18} strokeWidth={1.8} />{item.label}
            </Link>
          ))}
        </nav>
        <div className="workspace-sidebar-bottom">
          <div className={`connection-status ${isOnline ? 'is-online' : 'is-offline'}`}>
            {isOnline ? <Wifi size={15} /> : <WifiOff size={15} />}
            {isOnline ? 'Connected' : 'Offline'}
          </div>
          <div className="workspace-profile">
            <span className="profile-avatar">{user?.name?.charAt(0) || 'A'}</span>
            <div className="profile-copy"><p>{user?.name || 'Health worker'}</p><span>{user?.role || 'ASHA'}</span></div>
            <button type="button" onClick={onLogout} aria-label="Sign out" title="Sign out" className="profile-logout"><LogOut size={17} /></button>
          </div>
        </div>
      </aside>

      <div className="workspace-content">
        <header className="workspace-header">
          <Link to="/dashboard" className="workspace-mobile-brand"><span className="workspace-brand-mark"><Activity size={17} /></span> asha<span>connect</span></Link>
          <p>Community health <span>/</span> {navItems.find((item) => item.path === location.pathname)?.label ?? 'Workspace'}</p>
          <div className={`header-presence ${isOnline ? 'is-online' : 'is-offline'}`}><i />{isOnline ? 'Online' : 'Offline'}</div>
        </header>
        <main className="workspace-main">
          <Outlet />
        </main>
      </div>
      <nav className="workspace-mobile-nav" aria-label="Mobile workspace navigation">
        {navItems.map((item) => (
          <Link key={item.path} to={item.path} aria-label={item.label} className={location.pathname === item.path ? 'is-active' : ''}>
            <item.icon size={19} strokeWidth={1.8} /><span>{item.label === 'Start Field Visit' ? 'Visit' : item.label === 'ASHA Registers' ? 'Registers' : item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
