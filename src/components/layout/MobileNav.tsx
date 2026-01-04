import { NavLink, useLocation } from 'react-router-dom';
import { Home, Users, Calendar, Settings, BarChart3, School, Megaphone } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface NavItem {
  path: string;
  icon: React.ReactNode;
  label: string;
}

export const MobileNav = () => {
  const { role } = useAuth();
  const location = useLocation();

  const getNavItems = (): NavItem[] => {
    const items: NavItem[] = [
      { path: '/dashboard', icon: <Home className="w-5 h-5" />, label: 'Utama' },
    ];

    if (role === 'guru') {
      items.push(
        { path: '/students', icon: <Users className="w-5 h-5" />, label: 'Pelajar' },
        { path: '/meetings', icon: <Calendar className="w-5 h-5" />, label: 'Perjumpaan' },
        { path: '/reports', icon: <BarChart3 className="w-5 h-5" />, label: 'Laporan' }
      );
    }

    if (role === 'ketua_penasihat') {
      items.push(
        { path: '/teachers', icon: <Users className="w-5 h-5" />, label: 'Guru' },
        { path: '/announcements', icon: <Megaphone className="w-5 h-5" />, label: 'Pengumuman' }
      );
    }

    if (role === 'superadmin') {
      items.push(
        { path: '/schools', icon: <School className="w-5 h-5" />, label: 'Sekolah' },
        { path: '/announcements', icon: <Megaphone className="w-5 h-5" />, label: 'Pengumuman' }
      );
    }

    items.push({ path: '/settings', icon: <Settings className="w-5 h-5" />, label: 'Tetapan' });

    return items;
  };

  const navItems = getNavItems();

  return (
    <nav className="mobile-nav safe-bottom">
      <div className="flex items-center justify-around">
        {navItems.slice(0, 5).map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors",
                isActive 
                  ? "text-primary bg-accent" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
