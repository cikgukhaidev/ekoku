import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { FloatingActionButton } from './FloatingActionButton';
import { LoadingScreen } from '@/components/ui/loading-spinner';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, profile, loading, mustChangePassword } = useAuth();
  const navigate = useNavigate();

  const isDemoAccount = !!profile?.is_demo || !!user?.email?.endsWith('@demo.com');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && user && mustChangePassword && !isDemoAccount) {
      navigate('/change-password');
    }
  }, [user, loading, mustChangePassword, isDemoAccount, navigate]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>
      <MobileNav />
      <FloatingActionButton />
    </div>
  );
};
