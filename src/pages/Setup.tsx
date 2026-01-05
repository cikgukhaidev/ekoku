import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Shield, User, Mail, Lock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Setup key for additional security (optional - only required if configured in Supabase)
const SETUP_KEY = import.meta.env.VITE_SETUP_SECRET_KEY || '';

const Setup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [setupKey, setSetupKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Sila isi email dan password',
      });
      return;
    }

    // Validate strong password (8+ chars, uppercase, lowercase, number)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Password mestilah sekurang-kurangnya 8 aksara dengan huruf besar, huruf kecil, dan nombor',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Build headers with setup key if provided
      const headers: Record<string, string> = {};
      if (setupKey || SETUP_KEY) {
        headers['x-setup-key'] = setupKey || SETUP_KEY;
      }

      const { data, error } = await supabase.functions.invoke('setup-superadmin', {
        body: { email, password, fullName },
        headers,
      });

      if (error) throw error;

      if (data.success) {
        setIsSuccess(true);
        toast({
          title: 'Berjaya!',
          description: 'Superadmin berjaya dicipta. Anda boleh log masuk sekarang.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Ralat',
          description: data.error || 'Gagal mencipta superadmin',
        });
      }
    } catch (error: any) {
      console.error('Setup error:', error);
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: error.message || 'Gagal mencipta superadmin',
      });
    }

    setIsLoading(false);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/30 p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">
            Superadmin Berjaya Dicipta!
          </h2>
          <p className="text-muted-foreground mb-6">
            Anda boleh log masuk dengan akaun yang dicipta
          </p>
          <Button onClick={() => navigate('/auth')} size="lg">
            Log Masuk Sekarang
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-accent/30">
      <main className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">
              Setup Awal
            </h2>
            <p className="text-muted-foreground mt-2">
              Cipta akaun Superadmin pertama untuk sistem e-Kokurikulum
            </p>
          </div>

          <div className="bg-card rounded-2xl shadow-lg border border-border p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nama Penuh</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Nama Superadmin"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Alamat Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@sekolah.edu.my"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Kata Laluan</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 8 aksara (Aa1...)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={isLoading}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Huruf besar, huruf kecil, dan nombor diperlukan
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="setupKey">Kunci Setup (Pilihan)</Label>
                <Input
                  id="setupKey"
                  type="password"
                  placeholder="Masukkan kunci jika diperlukan"
                  value={setupKey}
                  onChange={(e) => setSetupKey(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Hanya diperlukan jika SETUP_SECRET_KEY dikonfigurasi
                </p>
              </div>

              <div className="bg-accent/50 rounded-lg p-4 text-sm">
                <p className="font-medium text-foreground mb-1">⚠️ Penting</p>
                <p className="text-muted-foreground">
                  Function ini hanya boleh digunakan sekali untuk setup awal. 
                  Simpan maklumat login anda dengan selamat.
                </p>
              </div>

              <Button type="submit" className="w-full h-12" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Mencipta...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Cipta Superadmin
                  </span>
                )}
              </Button>
            </form>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/auth')}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Sudah ada akaun? Log masuk
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Setup;
