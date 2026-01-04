import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Save, Settings as SettingsIcon, Bell, Key, Calendar } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

const Settings = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [totalMeetings, setTotalMeetings] = useState(12);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('teacher_settings')
        .select('total_meetings')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) {
        setTotalMeetings(data.total_meetings);
      }
    };

    fetchSettings();
  }, [user]);

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Kata laluan baru tidak sepadan',
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Kata laluan mestilah sekurang-kurangnya 6 aksara',
      });
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: passwordForm.newPassword,
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Gagal menukar kata laluan',
      });
    } else {
      // Update must_change_password flag
      await supabase
        .from('profiles')
        .update({ must_change_password: false })
        .eq('user_id', user?.id);

      toast({
        title: 'Berjaya',
        description: 'Kata laluan berjaya ditukar',
      });
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }

    setIsLoading(false);
  };

  const handleSaveMeetings = async () => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('teacher_settings')
      .upsert({
        user_id: user.id,
        total_meetings: totalMeetings,
      });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Gagal menyimpan tetapan',
      });
    } else {
      toast({
        title: 'Berjaya',
        description: 'Tetapan berjaya disimpan',
      });
    }
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-border">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-xl md:text-2xl font-bold">Tetapan</h1>
          <p className="text-sm text-muted-foreground">
            Urus tetapan akaun dan sistem
          </p>
        </motion.div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* Profile Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-primary" />
                Maklumat Akaun
              </CardTitle>
              <CardDescription>
                Maklumat akaun anda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                  {profile?.full_name?.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="font-semibold text-lg">{profile?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{profile?.email}</p>
                  {profile?.unit_name && (
                    <p className="text-sm text-muted-foreground">Unit: {profile.unit_name}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Change Password */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                Tukar Kata Laluan
              </CardTitle>
              <CardDescription>
                Kemaskini kata laluan akaun anda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Kata Laluan Baru</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                    }
                    className="pl-9 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Sahkan Kata Laluan</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                    }
                    className="pl-9"
                  />
                </div>
              </div>
              <Button onClick={handleChangePassword} disabled={isLoading}>
                <Save className="w-4 h-4 mr-2" />
                Tukar Kata Laluan
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Meeting Settings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Tetapan Perjumpaan
              </CardTitle>
              <CardDescription>
                Tetapkan bilangan perjumpaan untuk sesi ini
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="total-meetings">Jumlah Perjumpaan</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="total-meetings"
                    type="number"
                    min={1}
                    max={52}
                    value={totalMeetings}
                    onChange={(e) => setTotalMeetings(parseInt(e.target.value) || 12)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">perjumpaan setahun</span>
                </div>
              </div>
              <Button onClick={handleSaveMeetings}>
                <Save className="w-4 h-4 mr-2" />
                Simpan Tetapan
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
