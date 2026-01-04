import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Key, Shield } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const ChangePassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { user, profile, signOut, markPasswordChanged } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isDemoAccount = !!profile?.is_demo || !!user?.email?.endsWith('@demo.com');

  useEffect(() => {
    if (isDemoAccount) {
      navigate('/dashboard', { replace: true });
    }
  }, [isDemoAccount, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Kata laluan tidak sepadan',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Kata laluan mestilah sekurang-kurangnya 6 aksara',
      });
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Gagal menukar kata laluan. Sila cuba lagi.',
      });
    } else {
      // Update must_change_password flag
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ must_change_password: false })
        .eq('user_id', user?.id);

      if (profileError) {
        toast({
          variant: 'destructive',
          title: 'Ralat',
          description: 'Kata laluan berjaya ditukar tetapi gagal kemaskini status. Sila cuba lagi.',
        });
        setIsLoading(false);
        return;
      }

      // Prevent DashboardLayout from redirecting back to /change-password
      markPasswordChanged();

      toast({
        title: 'Berjaya!',
        description: 'Kata laluan berjaya ditukar',
      });
      navigate('/dashboard', { replace: true });
    }

    setIsLoading(false);
  };

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
              Tukar Kata Laluan
            </h2>
            <p className="text-muted-foreground mt-2">
              Untuk keselamatan, sila tukar kata laluan anda sekarang
            </p>
          </div>

          <div className="bg-card rounded-2xl shadow-lg border border-border p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="new-password">Kata Laluan Baru</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Sahkan Kata Laluan</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-12" disabled={isLoading}>
                {isLoading ? 'Memuatkan...' : 'Tukar Kata Laluan'}
              </Button>
            </form>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={signOut}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Log keluar
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default ChangePassword;
