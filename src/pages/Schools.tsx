import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { School, Plus, Users, Trash2, Edit, Image } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/ui/search-bar';
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
  const [filteredSchools, setFilteredSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchSchools = async () => {
    try {
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

      if (!schoolsData || schoolsData.length === 0) {
        setSchools([]);
        setFilteredSchools([]);
        setLoading(false);
        return;
      }

      // Fetch all profiles for these schools
      const schoolIds = schoolsData.map(s => s.id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, school_id')
        .in('school_id', schoolIds);

      if (!profilesData || profilesData.length === 0) {
        // No profiles, set all counts to 0
        const schoolsWithCounts = schoolsData.map(school => ({
          ...school,
          head_count: 0,
          teacher_count: 0,
        }));
        setSchools(schoolsWithCounts);
        setFilteredSchools(schoolsWithCounts);
        setLoading(false);
        return;
      }

      // Get all user_ids from profiles
      const userIds = profilesData.map(p => p.user_id);

      // Fetch roles for these users
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      // Create a map of user_id to role
      const userRoleMap = new Map<string, string>();
      (rolesData || []).forEach(r => {
        userRoleMap.set(r.user_id, r.role);
      });

      // Count heads and teachers per school
      const schoolCounts = new Map<string, { heads: number; teachers: number }>();
      schoolIds.forEach(id => schoolCounts.set(id, { heads: 0, teachers: 0 }));

      profilesData.forEach(profile => {
        const role = userRoleMap.get(profile.user_id);
        const counts = schoolCounts.get(profile.school_id);
        if (counts) {
          if (role === 'ketua_penasihat') {
            counts.heads++;
          } else if (role === 'guru') {
            counts.teachers++;
          }
        }
      });

      const schoolsWithCounts = schoolsData.map(school => ({
        ...school,
        head_count: schoolCounts.get(school.id)?.heads || 0,
        teacher_count: schoolCounts.get(school.id)?.teachers || 0,
      }));

      setSchools(schoolsWithCounts);
      setFilteredSchools(schoolsWithCounts);
    } catch (error) {
      console.error('Error in fetchSchools:', error);
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Gagal memuatkan senarai sekolah',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const handleFilteredData = useCallback((filtered: SchoolData[]) => {
    setFilteredSchools(filtered);
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

      <div className="p-4 md:p-6 space-y-4">
        {/* Search Bar */}
        {!loading && schools.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <SearchBar<SchoolData>
              data={schools}
              searchKey="name"
              onFilteredData={handleFilteredData}
              placeholder="Cari sekolah..."
            />
          </motion.div>
        )}

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
        ) : filteredSchools.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <School className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg">Tiada hasil carian</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Cuba cari dengan kata kunci lain
            </p>
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
                  <TableHead className="w-16">Logo</TableHead>
                  <TableHead>Nama Sekolah</TableHead>
                  <TableHead className="hidden sm:table-cell text-center">Ketua</TableHead>
                  <TableHead className="hidden sm:table-cell text-center">Guru</TableHead>
                  <TableHead className="hidden lg:table-cell">Tarikh Daftar</TableHead>
                  <TableHead className="text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSchools.map((school, index) => (
                  <TableRow key={school.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center overflow-hidden border border-border">
                        {school.logo_url ? (
                          <img
                            src={school.logo_url}
                            alt={school.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Image className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{school.name}</p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-center">
                      <Badge variant="secondary" className="gap-1">
                        <Users className="w-3 h-3" />
                        {school.head_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-center">
                      <Badge variant="outline" className="gap-1">
                        <Users className="w-3 h-3" />
                        {school.teacher_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {new Date(school.created_at).toLocaleDateString('ms-MY', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/schools/${school.id}/heads`)}
                          className="text-xs"
                        >
                          <Users className="w-4 h-4 mr-1" />
                          <span className="hidden md:inline">Ketua</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/schools/${school.id}/edit`)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteId(school.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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
