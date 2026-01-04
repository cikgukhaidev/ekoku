import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Save, Settings as SettingsIcon, Key, Calendar, GraduationCap, Plus, Trash2, GripVertical } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

const Settings = () => {
  const { user, profile, role, markPasswordChanged } = useAuth();
  const { toast } = useToast();
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [totalMeetings, setTotalMeetings] = useState(12);
  const [classNames, setClassNames] = useState<string[]>([]);
  const [newClassName, setNewClassName] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user?.id) return;
      
      if (role === 'ketua_penasihat') {
        const { data } = await supabase
          .from('teacher_settings')
          .select('total_meetings, class_structure')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (data) {
          setTotalMeetings(data.total_meetings ?? 12);
          if (data.class_structure && Array.isArray(data.class_structure)) {
            // Handle both old format (with form_level) and new format (just strings)
            const classes = data.class_structure as any[];
            if (classes.length > 0 && typeof classes[0] === 'string') {
              setClassNames(classes as string[]);
            } else if (classes.length > 0 && typeof classes[0] === 'object') {
              // Convert old format to new - extract unique class names in order
              const uniqueNames: string[] = [];
              classes.forEach((c: any) => {
                if (c.class_name && !uniqueNames.includes(c.class_name)) {
                  uniqueNames.push(c.class_name);
                }
              });
              setClassNames(uniqueNames);
            }
          }
        }
      }
    };

    fetchSettings();
  }, [user, role]);

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
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ must_change_password: false })
        .eq('user_id', user?.id);

      if (!profileError) {
        markPasswordChanged();
      }

      toast({
        title: 'Berjaya',
        description: 'Kata laluan berjaya ditukar',
      });
      setPasswordForm({
        newPassword: '',
        confirmPassword: '',
      });
    }

    setIsLoading(false);
  };

  const handleSaveMeetings = async () => {
    if (!user?.id) return;

    const { data: existing } = await supabase
      .from('teacher_settings')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    let error;
    if (existing) {
      const result = await supabase
        .from('teacher_settings')
        .update({ total_meetings: totalMeetings })
        .eq('user_id', user.id);
      error = result.error;
    } else {
      const result = await supabase
        .from('teacher_settings')
        .insert({ user_id: user.id, total_meetings: totalMeetings });
      error = result.error;
    }

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

  const handleAddClass = () => {
    const trimmed = newClassName.trim();
    if (!trimmed) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Sila masukkan nama kelas',
      });
      return;
    }

    if (classNames.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Kelas ini sudah wujud',
      });
      return;
    }

    setClassNames([...classNames, trimmed]);
    setNewClassName('');
  };

  const handleRemoveClass = (index: number) => {
    setClassNames(classNames.filter((_, i) => i !== index));
  };

  const handleMoveClass = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= classNames.length) return;
    
    const newList = [...classNames];
    [newList[index], newList[newIndex]] = [newList[newIndex], newList[index]];
    setClassNames(newList);
  };

  const handleSaveClassStructure = async () => {
    if (!user?.id) return;

    const { data: existing } = await supabase
      .from('teacher_settings')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    let error;
    if (existing) {
      const result = await supabase
        .from('teacher_settings')
        .update({ class_structure: classNames })
        .eq('user_id', user.id);
      error = result.error;
    } else {
      const result = await supabase
        .from('teacher_settings')
        .insert([{ user_id: user.id, class_structure: classNames }]);
      error = result.error;
    }

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Gagal menyimpan struktur kelas',
      });
    } else {
      toast({
        title: 'Berjaya',
        description: 'Struktur kelas berjaya disimpan',
      });
    }
  };

  const renderPasswordSection = () => (
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
  );

  const renderMeetingsSection = () => (
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
  );

  const renderClassStructureSection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary" />
          Susunan Kelas
        </CardTitle>
        <CardDescription>
          Tetapkan senarai nama kelas mengikut susunan. Susunan ini akan digunakan untuk semua tingkatan.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new class */}
        <div className="flex gap-3">
          <Input
            placeholder="Nama kelas (cth: Zuhal)"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddClass()}
            className="flex-1"
          />
          <Button onClick={handleAddClass} size="icon">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Display classes */}
        {classNames.length > 0 ? (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Senarai Kelas (mengikut susunan)</Label>
            <div className="space-y-1">
              {classNames.map((className, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg"
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <span className="flex-1 text-sm font-medium">{className}</span>
                  <span className="text-xs text-muted-foreground bg-primary/10 px-2 py-0.5 rounded">#{idx + 1}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleMoveClass(idx, 'up')}
                    disabled={idx === 0}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleMoveClass(idx, 'down')}
                    disabled={idx === classNames.length - 1}
                  >
                    ↓
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleRemoveClass(idx)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Tiada kelas ditambah. Contoh: Zuhal, Utarid, Bumi
          </p>
        )}

        <Button onClick={handleSaveClassStructure} disabled={classNames.length === 0}>
          <Save className="w-4 h-4 mr-2" />
          Simpan Susunan Kelas
        </Button>
      </CardContent>
    </Card>
  );

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

        {/* Ketua Penasihat Settings with Tabs */}
        {role === 'ketua_penasihat' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Tabs defaultValue="password" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="password" className="text-xs sm:text-sm">
                  <Key className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Kata Laluan</span>
                  <span className="sm:hidden">Laluan</span>
                </TabsTrigger>
                <TabsTrigger value="meetings" className="text-xs sm:text-sm">
                  <Calendar className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Perjumpaan</span>
                  <span className="sm:hidden">Jumpa</span>
                </TabsTrigger>
                <TabsTrigger value="classes" className="text-xs sm:text-sm">
                  <GraduationCap className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Susunan Kelas</span>
                  <span className="sm:hidden">Kelas</span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="password">
                {renderPasswordSection()}
              </TabsContent>
              <TabsContent value="meetings">
                {renderMeetingsSection()}
              </TabsContent>
              <TabsContent value="classes">
                {renderClassStructureSection()}
              </TabsContent>
            </Tabs>
          </motion.div>
        )}

        {/* Non-ketua roles: Just password section */}
        {role !== 'ketua_penasihat' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            {renderPasswordSection()}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Settings;
