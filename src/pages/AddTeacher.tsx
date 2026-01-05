import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { logActivity } from '@/lib/activityLogger';

const CATEGORIES = [
  { value: 'sukan_permainan', label: 'Sukan Dan Permainan' },
  { value: 'unit_uniform', label: 'Unit Uniform' },
  { value: 'persatuan_kelab', label: 'Persatuan Dan Kelab' },
] as const;

// Auto capitalize first letter of each word
const capitalizeWords = (str: string) => {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const AddTeacher = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [category, setCategory] = useState('');
  const [unitName, setUnitName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const fetchSchool = async () => {
      if (!user) return;

      // Get current user's school
      const { data: profileData } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileData?.school_id) {
        setSchoolId(profileData.school_id);

        // Get school name
        const { data: schoolData } = await supabase
          .from('schools')
          .select('name')
          .eq('id', profileData.school_id)
          .maybeSingle();

        if (schoolData) {
          setSchoolName(schoolData.name);
        }
      }
    };

    fetchSchool();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Sila masukkan nama penuh',
      });
      return;
    }

    if (!email.trim()) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Sila masukkan emel',
      });
      return;
    }

    if (!password || password.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Password mestilah sekurang-kurangnya 6 aksara',
      });
      return;
    }

    if (!category) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Sila pilih kategori kokurikulum',
      });
      return;
    }

    if (!unitName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Sila masukkan nama unit',
      });
      return;
    }

    if (!schoolId) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Sekolah tidak dijumpai',
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          schoolId,
          role: 'guru',
          unitName: unitName.trim(),
          kokurikulumCategory: category,
        },
      });

      if (error) throw error;

      if (data.success) {
        await logActivity({
          actionType: 'create',
          entityType: 'user',
          description: `Menambah guru: ${fullName.trim()} (${email.trim()})`,
          details: { full_name: fullName.trim(), email: email.trim(), unit_name: unitName.trim(), category, role: 'guru' },
        });

        toast({
          title: 'Berjaya!',
          description: 'Guru berjaya ditambah',
        });
        navigate('/teachers');
      } else {
        throw new Error(data.error || 'Gagal menambah guru');
      }
    } catch (error: any) {
      console.error('Error adding teacher:', error);

      await logActivity({
        actionType: 'error',
        entityType: 'user',
        description: `Gagal menambah guru: ${fullName.trim()} (${email.trim()})`,
        errorMessage: error.message,
      });

      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: error.message || 'Gagal menambah guru',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-border">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <Button variant="ghost" size="icon" onClick={() => navigate('/teachers')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display text-xl md:text-2xl font-bold">Tambah Guru</h1>
            <p className="text-sm text-muted-foreground">
              {schoolName || 'Memuatkan...'}
            </p>
          </div>
        </motion.div>
      </div>

      <div className="p-4 md:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl"
        >
          <Card>
            <CardHeader>
              <CardTitle>Maklumat Guru</CardTitle>
              <CardDescription>
                Masukkan maklumat guru penasihat yang ingin ditambah
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nama Penuh</Label>
                  <Input
                    id="fullName"
                    placeholder="Masukkan nama penuh"
                    value={fullName}
                    onChange={(e) => setFullName(capitalizeWords(e.target.value))}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Emel</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Masukkan emel"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Kategori Kokurikulum</Label>
                  <Select value={category} onValueChange={setCategory} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unitName">Nama Unit</Label>
                  <Input
                    id="unitName"
                    placeholder="Contoh: Pengakap, Bola Sepak, Kelab Komputer"
                    value={unitName}
                    onChange={(e) => setUnitName(capitalizeWords(e.target.value))}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Nama unit kokurikulum yang dikendalikan guru ini
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Masukkan password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Minimum 6 aksara
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" disabled={loading}>
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? 'Menyimpan...' : 'Simpan'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate('/teachers')} disabled={loading}>
                    Batal
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default AddTeacher;
