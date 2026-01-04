import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { School, Plus, Users, MoreVertical, Trash2, Edit, Calendar, Megaphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SchoolData {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
  head_count?: number;
  teacher_count?: number;
}

const Schools = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchSchools = async () => {
    // Fetch schools
    const { data: schoolsData, error } = await supabase
      .from('schools')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching schools:', error);
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Gagal memuatkan senarai sekolah',
      });
      setLoading(false);
      return;
    }

    // For each school, get counts
    const schoolsWithCounts = await Promise.all(
      (schoolsData || []).map(async (school) => {
        // Count heads (ketua_penasihat) for this school
        const { count: headCount } = await supabase
          .from('profiles')
          .select('*, user_roles!inner(role)', { count: 'exact', head: true })
          .eq('school_id', school.id)
          .eq('user_roles.role', 'ketua_penasihat');

        // Count teachers (guru) for this school  
        const { count: teacherCount } = await supabase
          .from('profiles')
          .select('*, user_roles!inner(role)', { count: 'exact', head: true })
          .eq('school_id', school.id)
          .eq('user_roles.role', 'guru');

        return {
          ...school,
          head_count: headCount || 0,
          teacher_count: teacherCount || 0,
        };
      })
    );

    setSchools(schoolsWithCounts);
    setLoading(false);
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase
      .from('schools')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Gagal memadam sekolah',
      });
    } else {
      toast({
        title: 'Berjaya',
        description: 'Sekolah berjaya dipadam',
      });
      fetchSchools();
    }
    setDeleteId(null);
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-border">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="font-display text-xl md:text-2xl font-bold">Senarai Sekolah</h1>
            <p className="text-sm text-muted-foreground">
              {schools.length} sekolah berdaftar
            </p>
          </div>
          <Button onClick={() => navigate('/schools/add')} className="hidden md:flex">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Sekolah
          </Button>
        </motion.div>
      </div>

      <div className="p-4 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : schools.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <School className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg">Tiada Sekolah</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Tambah sekolah pertama untuk bermula
            </p>
            <Button onClick={() => navigate('/schools/add')} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Sekolah
            </Button>
          </motion.div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {schools.map((school, index) => (
              <motion.div
                key={school.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="overflow-hidden hover:shadow-md transition-shadow h-full">
                  <CardContent className="p-0">
                    {/* Header with logo */}
                    <div className="p-4 border-b border-border bg-accent/30">
                      <div className="flex items-start gap-4">
                        {/* Logo */}
                        <div className="w-16 h-16 rounded-xl bg-background flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm border border-border">
                          {school.logo_url ? (
                            <img
                              src={school.logo_url}
                              alt={school.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <School className="w-8 h-8 text-muted-foreground" />
                          )}
                        </div>

                        {/* Name & Actions */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base leading-tight line-clamp-2">
                            {school.name}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {new Date(school.created_at).toLocaleDateString('ms-MY', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>

                        {/* Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/schools/${school.id}/edit`)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Sekolah
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteId(school.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Padam
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="gap-1">
                          <Users className="w-3 h-3" />
                          {school.head_count} Ketua
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          <Users className="w-3 h-3" />
                          {school.teacher_count} Guru
                        </Badge>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => navigate(`/schools/${school.id}/heads`)}
                        >
                          <Users className="w-3 h-3 mr-1" />
                          Urus Ketua
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Padam Sekolah?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak boleh dibatalkan. Semua data berkaitan sekolah ini akan dipadam termasuk ketua penasihat dan guru.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Padam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Schools;
