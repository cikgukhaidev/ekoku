import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, LogIn, Lock, Mail, GraduationCap, Play, User, UserCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Sila masukkan emel yang sah'),
  password: z.string().min(6, 'Kata laluan mestilah sekurang-kurangnya 6 aksara'),
});

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

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showDemoDialog, setShowDemoDialog] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleDemoLogin = async (demoEmail: string) => {
    setDemoLoading(demoEmail);
    try {
      const { error } = await signIn(demoEmail, 'demo123');
      if (error) {
        sonnerToast.error('Gagal log masuk demo. Sila cuba lagi.');
        console.error('Demo login error:', error);
      } else {
        sonnerToast.success('Selamat datang ke mod demo!');
        navigate('/dashboard');
      }
    } catch (err) {
      sonnerToast.error('Ralat semasa log masuk demo');
      console.error(err);
    } finally {
      setDemoLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validate
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'email') fieldErrors.email = err.message;
        if (err.path[0] === 'password') fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    
    const { error } = await signIn(email, password);
    
    if (error) {
      let message = 'Ralat semasa log masuk. Sila cuba lagi.';
      if (error.message?.includes('Invalid login credentials')) {
        message = 'Emel atau kata laluan tidak sah.';
      } else if (error.message?.includes('Email not confirmed')) {
        message = 'Emel belum disahkan. Sila hubungi pentadbir.';
      }
      
      toast({
        variant: 'destructive',
        title: 'Log Masuk Gagal',
        description: message,
      });
    } else {
      toast({
        title: 'Berjaya!',
        description: 'Selamat datang ke e-Kokurikulum',
      });
      navigate('/dashboard');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-accent/30">
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">e-Kokurikulum</h1>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl font-bold text-foreground">
              Selamat Kembali
            </h2>
            <p className="text-muted-foreground mt-2">
              Log masuk untuk mengurus aktiviti kokurikulum anda
            </p>
          </div>

          <div className="bg-card rounded-2xl shadow-lg border border-border p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Alamat Emel
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nama@sekolah.edu.my"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 input-focus"
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Kata Laluan
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 input-focus"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 font-semibold shadow-primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Memuatkan...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn className="w-5 h-5" />
                    Log Masuk
                  </span>
                )}
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">atau</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-12"
                onClick={() => setShowDemoDialog(true)}
              >
                <Play className="w-5 h-5 mr-2" />
                Cuba Demo
              </Button>
            </form>
          </div>

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

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 text-center"
          >
            <p className="text-sm text-muted-foreground">
              Tiada akaun? Sila hubungi pentadbir sekolah anda.
            </p>
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center">
        <p className="text-xs text-muted-foreground">
          © 2026 e-Kokurikulum. Sistem Pengurusan Kokurikulum Sekolah.
        </p>
      </footer>
    </div>
  );
};

export default Auth;
