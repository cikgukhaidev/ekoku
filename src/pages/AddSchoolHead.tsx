import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, UserPlus, Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SchoolData {
  id: string;
  name: string;
}

const AddSchoolHead = () => {
  const navigate = useNavigate();
  const { schoolId } = useParams<{ schoolId: string }>();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [school, setSchool] = useState<SchoolData | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const fetchSchool = async () => {
      if (!schoolId) return;

      const { data, error } = await supabase
        .from('schools')
        .select('id, name')
        .eq('id', schoolId)
        .single();

      if (error || !data) {
        toast({
          variant: 'destructive',
          title: 'Ralat',
          description: 'Sekolah tidak dijumpai',
        });
        navigate('/schools');
        return;
      }

      setSchool(data);
    };

    fetchSchool();
  }, [schoolId]);

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
        description: 'Kata laluan mestilah sekurang-kurangnya 6 aksara',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Create user via edge function
      const { data: result, error: fnError } = await supabase.functions.invoke('create-user', {
        body: {
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          schoolId,
          role: 'ketua_penasihat',
        },
      });

      if (fnError) throw fnError;
      if (result?.error) throw new Error(result.error);

      toast({
        title: 'Berjaya',
        description: 'Ketua penasihat berjaya ditambah',
      });

      navigate(`/schools/${schoolId}/heads`);
    } catch (error: any) {
      console.error('Error creating head:', error);
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: error.message || 'Gagal menambah ketua penasihat',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-border">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/schools/${schoolId}/heads`)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display text-xl md:text-2xl font-bold">Tambah Ketua Penasihat</h1>
            <p className="text-sm text-muted-foreground">
              {school?.name || 'Memuatkan...'}
            </p>
          </div>
        </motion.div>
      </div>

      <div className="p-4 md:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Maklumat Ketua Penasihat
              </CardTitle>
              <CardDescription>
                Daftar ketua penasihat baru untuk sekolah ini
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="full-name">Nama Penuh *</Label>
                  <Input
                    id="full-name"
                    placeholder="cth: Ahmad bin Ali"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    maxLength={100}
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Emel *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="cth: ahmad@sekolah.edu.my"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={255}
                  />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">Kata Laluan *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimum 6 aksara"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    Pengguna akan diminta menukar kata laluan semasa log masuk pertama
                  </p>
                </div>

                {/* Submit Button */}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(`/schools/${schoolId}/heads`)}
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    <Save className="w-4 h-4 mr-2" />
                    {isLoading ? 'Menyimpan...' : 'Simpan'}
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

export default AddSchoolHead;
