import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth';

interface DashboardHeaderProps {
  schoolLogo?: string;
  schoolName?: string;
}

export const DashboardHeader = ({ schoolLogo, schoolName }: DashboardHeaderProps) => {
  const { profile, role } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat Pagi';
    if (hour < 18) return 'Selamat Petang';
    return 'Selamat Malam';
  };

  const getRoleTitle = () => {
    switch (role) {
      case 'superadmin':
        return 'Superadmin';
      case 'ketua_penasihat':
        return 'Ketua Penasihat';
      case 'guru':
        return 'Guru Penasihat';
      default:
        return '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="dashboard-header"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {schoolLogo && (
            <img 
              src={schoolLogo} 
              alt="Logo Sekolah" 
              className="w-12 h-12 rounded-full bg-white/20 object-cover"
            />
          )}
          <div>
            <p className="text-primary-foreground/80 text-sm">{getGreeting()},</p>
            <h1 className="text-xl font-display font-bold">
              {profile?.full_name || 'Pengguna'}
            </h1>
            <p className="text-primary-foreground/70 text-sm mt-0.5">
              {getRoleTitle()} {profile?.unit_name && `• ${profile.unit_name}`}
            </p>
          </div>
        </div>
      </div>
      {schoolName && (
        <p className="text-primary-foreground/60 text-xs mt-4">
          {schoolName}
        </p>
      )}
    </motion.div>
  );
};
