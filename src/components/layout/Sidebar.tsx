import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, Users, Calendar, Settings, BarChart3, 
  School, Megaphone, LogOut, ChevronRight, Activity 
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface NavItem {
  path: string;
  icon: React.ReactNode;
  label: string;
}

export const Sidebar = () => {
  const { role, profile, signOut } = useAuth();
  const location = useLocation();

  const getNavItems = (): NavItem[] => {
    const items: NavItem[] = [
      { path: '/dashboard', icon: <Home className="w-5 h-5" />, label: 'Dashboard' },
    ];

    if (role === 'guru') {
      items.push(
        { path: '/students', icon: <Users className="w-5 h-5" />, label: 'Senarai Pelajar' },
        { path: '/meetings', icon: <Calendar className="w-5 h-5" />, label: 'Perjumpaan' },
        { path: '/reports', icon: <BarChart3 className="w-5 h-5" />, label: 'Laporan' }
      );
    }

    if (role === 'ketua_penasihat') {
      items.push(
        { path: '/teachers', icon: <Users className="w-5 h-5" />, label: 'Pengurusan Guru' },
        { path: '/announcements', icon: <Megaphone className="w-5 h-5" />, label: 'Pengumuman' }
      );
    }

    if (role === 'superadmin') {
      items.push(
        { path: '/schools', icon: <School className="w-5 h-5" />, label: 'Senarai Sekolah' },
        { path: '/announcements', icon: <Megaphone className="w-5 h-5" />, label: 'Pengumuman' }
      );
    }

    items.push(
      { path: '/activity-logs', icon: <Activity className="w-5 h-5" />, label: 'Log Aktiviti' },
      { path: '/settings', icon: <Settings className="w-5 h-5" />, label: 'Tetapan' }
    );

    return items;
  };

  const navItems = getNavItems();

  const getRoleBadge = () => {
    switch (role) {
      case 'superadmin':
        return <span className="text-xs px-2 py-0.5 rounded-full badge-superadmin">Superadmin</span>;
      case 'ketua_penasihat':
        return <span className="text-xs px-2 py-0.5 rounded-full badge-ketua">Ketua Penasihat</span>;
      case 'guru':
        return <span className="text-xs px-2 py-0.5 rounded-full badge-guru">Guru</span>;
      default:
        return null;
    }
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border h-screen sticky top-0">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="font-display text-xl font-bold text-sidebar-foreground">
          e-Kokurikulum
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Sistem Pengurusan Kokurikulum</p>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
            {profile?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.full_name || 'Pengguna'}
            </p>
            {getRoleBadge()}
          </div>
        </div>
        {profile?.unit_name && (
          <p className="text-xs text-muted-foreground mt-2 pl-13">
            Unit: {profile.unit_name}
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <span className={cn(
                "transition-colors",
                isActive ? "text-sidebar-primary" : "text-muted-foreground group-hover:text-sidebar-foreground"
              )}>
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-4 h-4 text-sidebar-primary" />}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={signOut}
        >
          <LogOut className="w-5 h-5" />
          Log Keluar
        </Button>
      </div>
    </aside>
  );
};
