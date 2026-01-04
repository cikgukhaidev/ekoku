import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, School, Upload, Save, X, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { resizeImage, formatFileSize } from '@/lib/imageUtils';

const AddSchool = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [logoFile, setLogoFile] = useState<Blob | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [resizedSize, setResizedSize] = useState<number>(0);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsResizing(true);
    setOriginalSize(file.size);

    try {
      // Resize image to 256x256 max
      const resizedBlob = await resizeImage(file, 256, 0.85);
      setResizedSize(resizedBlob.size);
      setLogoFile(resizedBlob);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(resizedBlob);

      toast({
        title: 'Logo diproses',
        description: `Saiz: ${formatFileSize(file.size)} → ${formatFileSize(resizedBlob.size)}`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Gagal memproses gambar',
      });
    } finally {
      setIsResizing(false);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setOriginalSize(0);
    setResizedSize(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!schoolName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Sila masukkan nama sekolah',
      });
      return;
    }

    setIsLoading(true);

    try {
      let logoUrl = null;

      // Upload logo if provided
      if (logoFile) {
        const fileName = `${Date.now()}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from('school-logos')
          .upload(fileName, logoFile, {
            contentType: 'image/jpeg',
          });

        if (uploadError) throw uploadError;

        const { data: publicUrl } = supabase.storage
          .from('school-logos')
          .getPublicUrl(fileName);

        logoUrl = publicUrl.publicUrl;
      }

      // Insert school with uppercase name
      const { error } = await supabase.from('schools').insert({
        name: schoolName.trim().toUpperCase(),
        logo_url: logoUrl,
      });

      if (error) throw error;

      toast({
        title: 'Berjaya',
        description: 'Sekolah berjaya ditambah',
      });

      navigate('/schools');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: error.message || 'Gagal menambah sekolah',
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
            onClick={() => navigate('/schools')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display text-xl md:text-2xl font-bold">Tambah Sekolah</h1>
            <p className="text-sm text-muted-foreground">
              Daftar sekolah baru dalam sistem
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
                <School className="w-5 h-5 text-primary" />
                Maklumat Sekolah
              </CardTitle>
              <CardDescription>
                Logo akan dioptimumkan secara automatik (256x256px)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* School Name */}
                <div className="space-y-2">
                  <Label htmlFor="school-name">Nama Sekolah *</Label>
                  <Input
                    id="school-name"
                    placeholder="cth: SMK Dato' Onn"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                  />
                </div>

                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label>Logo Sekolah (Pilihan)</Label>
                  {logoPreview ? (
                    <div className="space-y-3">
                      <div className="relative w-32 h-32">
                        <img
                          src={logoPreview}
                          alt="Preview"
                          className="w-full h-full object-cover rounded-lg border border-border"
                        />
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <ImageIcon className="w-3 h-3 inline mr-1" />
                        Saiz asal: {formatFileSize(originalSize)} → {formatFileSize(resizedSize)}
                      </p>
                    </div>
                  ) : (
                    <label className={`flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors ${isResizing ? 'opacity-50' : ''}`}>
                      {isResizing ? (
                        <>
                          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                          <span className="text-xs text-muted-foreground">Memproses...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                          <span className="text-xs text-muted-foreground text-center px-2">
                            Muat naik logo
                          </span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                        disabled={isResizing}
                      />
                    </label>
                  )}
                </div>

                {/* Submit Button */}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/schools')}
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={isLoading || isResizing}>
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

export default AddSchool;
