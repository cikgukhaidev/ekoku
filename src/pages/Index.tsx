import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, ChevronRight, Users, Calendar, FileText, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

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
          <Button onClick={() => navigate('/auth')}>
            Log Masuk
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
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
                onClick={() => navigate('/auth')}
                className="shadow-primary w-full sm:w-auto"
              >
                Mula Sekarang
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          </motion.div>

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
        <p className="text-sm text-foreground font-medium">Made by MKH</p>
      </footer>
    </div>
  );
};

export default Index;
