import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, ChevronRight, Users, Calendar, FileText, Shield, Play, User, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const Index = () => {
  const { user, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const [showDemoDialog, setShowDemoDialog] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const demoAccounts = [
    { 
      email: 'ketua@demo.com', 
      role: 'Ketua Penasihat',
      description: 'Urus guru, tetapan sekolah & pengumuman',
      icon: <UserCheck className="w-5 h-5" />
    },
    { 
      email: 'guru1@demo.com', 
      role: 'Guru (Sukan & Permainan)',
      description: 'Unit: Bola Sepak',
      icon: <User className="w-5 h-5" />
    },
    { 
      email: 'guru3@demo.com', 
      role: 'Guru (Unit Uniform)',
      description: 'Unit: Pengakap',
      icon: <User className="w-5 h-5" />
    },
    { 
      email: 'guru5@demo.com', 
      role: 'Guru (Persatuan & Kelab)',
      description: 'Unit: Kelab Sains',
      icon: <User className="w-5 h-5" />
    },
  ];

  const handleDemoLogin = async (email: string) => {
    setDemoLoading(email);
    try {
      const { error } = await signIn(email, 'demo123');
      if (error) {
        toast.error('Gagal log masuk demo. Sila cuba lagi.');
        console.error('Demo login error:', error);
      } else {
        toast.success('Selamat datang ke mod demo!');
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error('Ralat semasa log masuk demo');
      console.error(err);
    } finally {
      setDemoLoading(null);
    }
  };

  const features = [
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Pengurusan Pelajar',
      description: 'CRUD pelajar dengan carian dan penapis tingkatan',
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: 'Kehadiran Pantas',
      description: 'Ambil kehadiran dengan satu klik untuk setiap perjumpaan',
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: 'Laporan PDF',
      description: 'Jana laporan akhir tahun dengan logo dan maklumat sekolah',
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Akses Berasaskan Peranan',
      description: 'Superadmin, Ketua Penasihat, dan Guru Penasihat',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/30">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="font-display text-xl font-bold text-foreground">
              e-Kokurikulum
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowDemoDialog(true)}>
              <Play className="w-4 h-4 mr-1" />
              Cuba Demo
            </Button>
            <Button onClick={() => navigate('/auth')}>
              Log Masuk
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Hero */}
      <main className="px-6 py-12 md:py-20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center max-w-3xl mx-auto"
          >
            <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6">
              Sistem Pengurusan Kokurikulum Sekolah
            </span>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground leading-tight">
              Urus Aktiviti Kokurikulum dengan{' '}
              <span className="text-primary">Mudah & Pantas</span>
            </h2>
            <p className="text-muted-foreground text-lg mt-6 max-w-2xl mx-auto">
              Penyelesaian digital untuk pendaftaran pelajar, kehadiran perjumpaan, 
              dan laporan akhir tahun. Tiada lagi kertas dan Excel!
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => setShowDemoDialog(true)}
                className="w-full sm:w-auto"
              >
                <Play className="w-5 h-5 mr-2" />
                Cuba Demo
              </Button>
              <Button 
                size="lg" 
                onClick={() => navigate('/auth')}
                className="shadow-primary w-full sm:w-auto"
              >
                Mula Sekarang
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          </motion.div>

      {/* Demo Dialog */}
      <Dialog open={showDemoDialog} onOpenChange={setShowDemoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-primary" />
              Cuba Demo
            </DialogTitle>
            <DialogDescription>
              Pilih peranan untuk mencuba sistem. Data akan reset setiap 24 jam.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                onClick={() => handleDemoLogin(account.email)}
                disabled={demoLoading !== null}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors text-left disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  {account.icon}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{account.role}</p>
                  <p className="text-sm text-muted-foreground">{account.description}</p>
                </div>
                {demoLoading === account.email && (
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Password: demo123 | Sekolah: SK DEMO MALAYSIA
          </p>
        </DialogContent>
      </Dialog>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="bg-card border border-border rounded-2xl p-6 shadow-card hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-display font-semibold text-lg text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>

        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center border-t border-border mt-12">
        <p className="text-sm text-foreground font-medium mb-1">Made by MKH</p>
        <p className="text-sm text-muted-foreground">
          © 2026 e-Kokurikulum. Sistem Pengurusan Kokurikulum Sekolah.
        </p>
      </footer>
    </div>
  );
};

export default Index;
