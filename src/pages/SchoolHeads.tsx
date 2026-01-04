import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, ArrowLeft, Trash2, Mail } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
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

interface HeadData {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  user_id: string;
}

interface SchoolData {
  id: string;
  name: string;
}

const SchoolHeads = () => {
  const navigate = useNavigate();
  const { schoolId } = useParams<{ schoolId: string }>();
  const { toast } = useToast();
  const [school, setSchool] = useState<SchoolData | null>(null);
  const [heads, setHeads] = useState<HeadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!schoolId) return;

    try {
      // Fetch school details
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('id, name')
        .eq('id', schoolId)
        .maybeSingle();

      if (schoolError) {
        console.error('Error fetching school:', schoolError);
        toast({
          variant: 'destructive',
          title: 'Ralat',
          description: 'Sekolah tidak dijumpai',
        });
        navigate('/schools');
        return;
      }

      if (!schoolData) {
        toast({
          variant: 'destructive',
          title: 'Ralat',
          description: 'Sekolah tidak dijumpai',
        });
        navigate('/schools');
        return;
      }

      setSchool(schoolData);

      // Fetch profiles for this school first
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, is_active, created_at, user_id')
        .eq('school_id', schoolId);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        setLoading(false);
        return;
      }

      if (!profilesData || profilesData.length === 0) {
        setHeads([]);
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
        .eq('role', 'ketua_penasihat');

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        setLoading(false);
        return;
      }

      // Filter profiles to only include ketua_penasihat
      const ketuaUserIds = new Set(rolesData?.map(r => r.user_id) || []);
      const filteredHeads = profilesData.filter(p => ketuaUserIds.has(p.user_id));

      setHeads(filteredHeads);
    } catch (error) {
      console.error('Error in fetchData:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [schoolId]);

  const handleDelete = async () => {
    if (!deleteId) return;

    // Delete user role first
    const head = heads.find(h => h.id === deleteId);
    if (!head) return;

    const { error: roleError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', head.user_id)
      .eq('role', 'ketua_penasihat');

    if (roleError) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Gagal memadam ketua penasihat',
      });
    } else {
      toast({
        title: 'Berjaya',
        description: 'Ketua penasihat berjaya dipadam',
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
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/schools')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display text-xl md:text-2xl font-bold">Ketua Penasihat</h1>
              <p className="text-sm text-muted-foreground">
                {school?.name || 'Memuatkan...'}
              </p>
            </div>
          </div>
          <Button onClick={() => navigate(`/schools/${schoolId}/heads/add`)} className="hidden md:flex">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Ketua
          </Button>
        </motion.div>
      </div>

      <div className="p-4 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : heads.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg">Tiada Ketua Penasihat</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Tambah ketua penasihat untuk sekolah ini
            </p>
            <Button onClick={() => navigate(`/schools/${schoolId}/heads/add`)} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Ketua
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
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Tarikh Daftar</TableHead>
                  <TableHead className="w-20 text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {heads.map((head, index) => (
                  <TableRow key={head.id}>
                    <TableCell className="font-medium text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{head.full_name}</p>
                        <p className="text-xs text-muted-foreground md:hidden">{head.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        {head.email}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={head.is_active ? 'default' : 'secondary'}>
                        {head.is_active ? 'Aktif' : 'Tidak Aktif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {new Date(head.created_at).toLocaleDateString('ms-MY', {
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
                        onClick={() => setDeleteId(head.id)}
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
            <AlertDialogTitle>Padam Ketua Penasihat?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan membuang peranan ketua penasihat daripada pengguna ini.
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

export default SchoolHeads;
