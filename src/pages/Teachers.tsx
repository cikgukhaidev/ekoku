import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Trash2, Mail, Edit, Trophy, Shield, Users2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { logActivity } from '@/lib/activityLogger';

interface TeacherData {
  id: string;
  full_name: string;
  email: string;
  unit_name: string | null;
  kokurikulum_category: string | null;
  is_active: boolean;
  created_at: string;
  user_id: string;
}

const CATEGORIES = [
  { value: 'sukan_permainan', label: 'Sukan Dan Permainan', icon: Trophy },
  { value: 'unit_uniform', label: 'Unit Uniform', icon: Shield },
  { value: 'persatuan_kelab', label: 'Persatuan Dan Kelab', icon: Users2 },
] as const;

const getCategoryLabel = (value: string | null) => {
  const cat = CATEGORIES.find(c => c.value === value);
  return cat?.label || '-';
};

// Convert to title case (capitalize first letter of each word)
const toTitleCase = (str: string | null) => {
  if (!str) return '-';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const Teachers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<TeacherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string>('');
  const [activeTab, setActiveTab] = useState('all');

  // Edit state
  const [editTeacher, setEditTeacher] = useState<TeacherData | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editUnitName, setEditUnitName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [saving, setSaving] = useState(false);

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
        .select('id, full_name, email, unit_name, kokurikulum_category, is_active, created_at, user_id')
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
      await logActivity({
        actionType: 'error',
        entityType: 'user',
        entityId: teacher.id,
        description: `Gagal memadam guru: ${teacher.full_name}`,
        errorMessage: roleError.message,
      });

      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Gagal memadam guru',
      });
    } else {
      await logActivity({
        actionType: 'delete',
        entityType: 'user',
        entityId: teacher.id,
        description: `Memadam guru: ${teacher.full_name} (${teacher.email})`,
      });

      toast({
        title: 'Berjaya',
        description: 'Guru berjaya dipadam',
      });
      fetchData();
    }
    setDeleteId(null);
  };

  const openEditDialog = (teacher: TeacherData) => {
    setEditTeacher(teacher);
    setEditName(teacher.full_name);
    setEditEmail(teacher.email);
    setEditUnitName(teacher.unit_name || '');
    setEditCategory(teacher.kokurikulum_category || '');
  };

  const closeEditDialog = () => {
    setEditTeacher(null);
    setEditName('');
    setEditEmail('');
    setEditUnitName('');
    setEditCategory('');
  };

  const handleEdit = async () => {
    if (!editTeacher) return;

    if (!editName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Nama tidak boleh kosong',
      });
      return;
    }

    if (!editEmail.trim()) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Emel tidak boleh kosong',
      });
      return;
    }

    setSaving(true);

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: editName.trim(),
          email: editEmail.trim(),
          unit_name: editUnitName.trim() || null,
          kokurikulum_category: (editCategory as "sukan_permainan" | "unit_uniform" | "persatuan_kelab") || null,
        })
        .eq('id', editTeacher.id);

      if (profileError) {
        throw profileError;
      }

      await logActivity({
        actionType: 'update',
        entityType: 'user',
        entityId: editTeacher.id,
        description: `Mengemaskini guru: ${editName.trim()} (${editEmail.trim()})`,
        details: { full_name: editName.trim(), email: editEmail.trim(), unit_name: editUnitName.trim(), category: editCategory },
      });

      toast({
        title: 'Berjaya',
        description: 'Maklumat berjaya dikemaskini',
      });

      closeEditDialog();
      fetchData();
    } catch (error: any) {
      console.error('Error updating teacher:', error);

      await logActivity({
        actionType: 'error',
        entityType: 'user',
        entityId: editTeacher.id,
        description: `Gagal mengemaskini guru: ${editName.trim()}`,
        errorMessage: error.message,
      });

      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: error.message || 'Gagal mengemaskini maklumat',
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredTeachers = activeTab === 'all' 
    ? teachers 
    : teachers.filter(t => t.kokurikulum_category === activeTab);

  const getCountByCategory = (category: string) => {
    return teachers.filter(t => t.kokurikulum_category === category).length;
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
              {schoolName || 'Memuatkan...'} • {teachers.length} guru
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
          >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid grid-cols-4 w-full max-w-2xl">
                <TabsTrigger value="all" className="text-xs md:text-sm">
                  Semua ({teachers.length})
                </TabsTrigger>
                {CATEGORIES.map((cat) => (
                  <TabsTrigger key={cat.value} value={cat.value} className="text-xs md:text-sm">
                    <cat.icon className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                    <span className="hidden md:inline">{cat.label.split(' ')[0]}</span>
                    <span className="md:hidden">{cat.label.split(' ')[0].slice(0, 3)}</span>
                    <span className="ml-1">({getCountByCategory(cat.value)})</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead className="hidden md:table-cell">Emel</TableHead>
                      <TableHead className="hidden sm:table-cell">Kategori</TableHead>
                      <TableHead className="hidden sm:table-cell">Unit</TableHead>
                      <TableHead className="hidden lg:table-cell">Status</TableHead>
                      <TableHead className="w-24 text-right">Tindakan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTeachers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Tiada guru dalam kategori ini
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTeachers.map((teacher, index) => (
                        <TableRow key={teacher.id}>
                          <TableCell className="font-medium text-muted-foreground">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{toTitleCase(teacher.full_name)}</p>
                              <p className="text-xs text-muted-foreground md:hidden">{teacher.email}</p>
                              <p className="text-xs text-muted-foreground sm:hidden">{toTitleCase(teacher.unit_name)}</p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-muted-foreground" />
                              {teacher.email}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="outline">
                              {getCategoryLabel(teacher.kokurikulum_category)}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {toTitleCase(teacher.unit_name)}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <Badge variant={teacher.is_active ? 'default' : 'secondary'}>
                              {teacher.is_active ? 'Aktif' : 'Tidak Aktif'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(teacher)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteId(teacher.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Tabs>
          </motion.div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editTeacher} onOpenChange={() => closeEditDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Guru</DialogTitle>
            <DialogDescription>
              Kemaskini maklumat guru penasihat
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Nama Penuh</Label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Masukkan nama penuh"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEmail">Emel</Label>
              <Input
                id="editEmail"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="Masukkan emel"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editCategory">Kategori Kokurikulum</Label>
              <Select value={editCategory} onValueChange={setEditCategory} disabled={saving}>
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
              <Label htmlFor="editUnitName">Nama Unit</Label>
              <Input
                id="editUnitName"
                value={editUnitName}
                onChange={(e) => setEditUnitName(e.target.value)}
                placeholder="Masukkan nama unit"
                disabled={saving}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog} disabled={saving}>
              Batal
            </Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
