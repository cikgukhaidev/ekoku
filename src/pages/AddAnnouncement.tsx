import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Megaphone, Save, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

const AddAnnouncement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isGlobal, setIsGlobal] = useState(role === 'superadmin');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Sila isi tajuk dan kandungan',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.from('announcements').insert({
        title: title.trim(),
        content: content.trim(),
        author_id: user?.id,
        school_id: role === 'superadmin' ? null : profile?.school_id,
        is_global: role === 'superadmin' ? isGlobal : false,
      });

      if (error) throw error;

      toast({
        title: 'Berjaya',
        description: 'Pengumuman berjaya dibuat',
      });

      navigate('/announcements');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: error.message || 'Gagal membuat pengumuman',
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
            onClick={() => navigate('/announcements')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display text-xl md:text-2xl font-bold">
              {role === 'superadmin' ? 'Pengumuman Global' : 'Buat Pengumuman'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {role === 'superadmin' 
                ? 'Buat pengumuman untuk semua pengguna'
                : 'Buat pengumuman untuk sekolah anda'}
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
                <Megaphone className="w-5 h-5 text-primary" />
                Maklumat Pengumuman
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Tajuk *</Label>
                  <Input
                    id="title"
                    placeholder="Masukkan tajuk pengumuman"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <Label htmlFor="content">Kandungan *</Label>
                  <Textarea
                    id="content"
                    placeholder="Tulis kandungan pengumuman..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={5}
                  />
                </div>

                {/* Global Toggle (Superadmin only) */}
                {role === 'superadmin' && (
                  <div className="flex items-center justify-between p-4 bg-accent/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium text-sm">Pengumuman Global</p>
                        <p className="text-xs text-muted-foreground">
                          Paparkan kepada semua pengguna
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={isGlobal}
                      onCheckedChange={setIsGlobal}
                    />
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/announcements')}
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    <Save className="w-4 h-4 mr-2" />
                    {isLoading ? 'Menyimpan...' : 'Terbitkan'}
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

export default AddAnnouncement;
