import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Trash2, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
import { useAuth } from '@/lib/auth';

interface TeacherData {
  id: string;
  full_name: string;
  email: string;
  unit_name: string | null;
  is_active: boolean;
  created_at: string;
  user_id: string;
}

const Teachers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<TeacherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string>('');

  const fetchData = async () => {
    if (!user) return;

    try {
      // Get current user's school
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError || !profileData?.school_id) {
        console.error('Error fetching profile:', profileError);
        setLoading(false);
        return;
      }

      const schoolId = profileData.school_id;

      // Get school name
      const { data: schoolData } = await supabase
        .from('schools')
        .select('name')
        .eq('id', schoolId)
        .maybeSingle();

      if (schoolData) {
        setSchoolName(schoolData.name);
      }

      // Fetch all profiles in same school
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, unit_name, is_active, created_at, user_id')
        .eq('school_id', schoolId);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        setLoading(false);
        return;
      }

      if (!profilesData || profilesData.length === 0) {
        setTeachers([]);
        setLoading(false);
        return;
      }

      // Get user_ids to fetch their roles
      const userIds = profilesData.map(p => p.user_id);

      // Fetch roles for these users
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds)
        .eq('role', 'guru');

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        setLoading(false);
        return;
      }

      // Filter profiles to only include guru
      const guruUserIds = new Set(rolesData?.map(r => r.user_id) || []);
      const filteredTeachers = profilesData.filter(p => guruUserIds.has(p.user_id));

      setTeachers(filteredTeachers);
    } catch (error) {
      console.error('Error in fetchData:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleDelete = async () => {
    if (!deleteId) return;

    const teacher = teachers.find(t => t.id === deleteId);
    if (!teacher) return;

    const { error: roleError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', teacher.user_id)
      .eq('role', 'guru');

    if (roleError) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Gagal memadam guru',
      });
    } else {
      toast({
        title: 'Berjaya',
        description: 'Guru berjaya dipadam',
      });
      fetchData();
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
            <h1 className="font-display text-xl md:text-2xl font-bold">Pengurusan Guru</h1>
            <p className="text-sm text-muted-foreground">
              {schoolName || 'Memuatkan...'}
            </p>
          </div>
          <Button onClick={() => navigate('/teachers/add')} className="hidden md:flex">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Guru
          </Button>
        </motion.div>
      </div>

      <div className="p-4 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : teachers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg">Tiada Guru</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Tambah guru penasihat untuk sekolah ini
            </p>
            <Button onClick={() => navigate('/teachers/add')} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Guru
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-border overflow-hidden"
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead className="hidden md:table-cell">Emel</TableHead>
                  <TableHead className="hidden sm:table-cell">Unit</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Tarikh Daftar</TableHead>
                  <TableHead className="w-20 text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((teacher, index) => (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-medium text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{teacher.full_name}</p>
                        <p className="text-xs text-muted-foreground md:hidden">{teacher.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        {teacher.email}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {teacher.unit_name || '-'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={teacher.is_active ? 'default' : 'secondary'}>
                        {teacher.is_active ? 'Aktif' : 'Tidak Aktif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {new Date(teacher.created_at).toLocaleDateString('ms-MY', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteId(teacher.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </motion.div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Padam Guru?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan membuang peranan guru daripada pengguna ini.
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

export default Teachers;
