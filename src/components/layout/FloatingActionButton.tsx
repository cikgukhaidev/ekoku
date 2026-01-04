import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, UserPlus, Calendar, FileText, Megaphone, School } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useNavigate, useLocation } from 'react-router-dom';

interface FABAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
}

export const FloatingActionButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getActions = (): FABAction[] => {
    const baseActions: FABAction[] = [];
    const currentPath = location.pathname;

    // Context-aware actions based on current page
    if (currentPath === '/schools' && role === 'superadmin') {
      return [{
        icon: <School className="w-5 h-5" />,
        label: 'Tambah Sekolah',
        onClick: () => navigate('/schools/add'),
      }];
    }

    if (currentPath === '/announcements') {
      if (role === 'superadmin') {
        return [{
          icon: <Megaphone className="w-5 h-5" />,
          label: 'Pengumuman Global',
          onClick: () => navigate('/announcements/add'),
        }];
      }
      if (role === 'ketua_penasihat') {
        return [{
          icon: <Megaphone className="w-5 h-5" />,
          label: 'Buat Pengumuman',
          onClick: () => navigate('/announcements/add'),
        }];
      }
    }

    // Default role-based actions for dashboard and other pages
    if (role === 'guru') {
      baseActions.push(
        {
          icon: <UserPlus className="w-5 h-5" />,
          label: 'Tambah Pelajar',
          onClick: () => navigate('/students/add'),
        },
        {
          icon: <Calendar className="w-5 h-5" />,
          label: 'Perjumpaan Baru',
          onClick: () => navigate('/meetings/add'),
        },
        {
          icon: <FileText className="w-5 h-5" />,
          label: 'Cetak Laporan',
          onClick: () => navigate('/reports'),
        }
      );
    }

    if (role === 'ketua_penasihat') {
      baseActions.push(
        {
          icon: <UserPlus className="w-5 h-5" />,
          label: 'Tambah Guru',
          onClick: () => navigate('/teachers/add'),
        },
        {
          icon: <Megaphone className="w-5 h-5" />,
          label: 'Pengumuman',
          onClick: () => navigate('/announcements/add'),
        }
      );
    }

    if (role === 'superadmin') {
      baseActions.push(
        {
          icon: <School className="w-5 h-5" />,
          label: 'Tambah Sekolah',
          onClick: () => navigate('/schools/add'),
        },
        {
          icon: <Megaphone className="w-5 h-5" />,
          label: 'Pengumuman Global',
          onClick: () => navigate('/announcements/add'),
        }
      );
    }

    return baseActions;
  };

  const actions = getActions();

  if (actions.length === 0) return null;

  return (
    <div className="fab-container md:hidden">
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/20 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Action buttons */}
            <div className="absolute bottom-16 right-0 flex flex-col gap-3 items-end">
              {actions.map((action, index) => (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.8 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    action.onClick();
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-3 bg-card shadow-lg rounded-full pl-4 pr-3 py-2.5 border border-border"
                >
                  <span className="text-sm font-medium text-foreground whitespace-nowrap">
                    {action.label}
                  </span>
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    {action.icon}
                  </div>
                </motion.button>
              ))}
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fab-button relative z-10"
        whileTap={{ scale: 0.9 }}
        animate={{ rotate: isOpen ? 45 : 0 }}
        transition={{ duration: 0.2 }}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </motion.button>
    </div>
  );
};
