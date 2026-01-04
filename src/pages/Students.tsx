import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, Search, Filter, Edit2, Trash2, 
  UserPlus, ChevronDown, Users 
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface Student {
  id: string;
  full_name: string;
  class_name: string;
  form_level: number;
  is_active: boolean;
}

interface ClassItem {
  form_level: number;
  class_name: string;
}

const Students = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterForm, setFilterForm] = useState<string>('all');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [classStructure, setClassStructure] = useState<ClassItem[]>([]);
  const [formData, setFormData] = useState({
    full_name: '',
    class_name: '',
    form_level: '1',
  });

  const fetchStudents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('is_active', true)
      .order('form_level', { ascending: true })
      .order('class_name', { ascending: true })
      .order('full_name', { ascending: true });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Gagal memuatkan senarai pelajar',
      });
    } else {
      setStudents(data || []);
    }
    setLoading(false);
  };

  const fetchClassStructure = async () => {
    if (!user?.id) return;
    
    // Fetch class structure from ketua_penasihat for the same school
    // First get current user's school_id
    const { data: profileData } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (!profileData?.school_id) return;
    
    // Get ketua_penasihat user_id for this school
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('school_id', profileData.school_id);
    
    if (!profilesData || profilesData.length === 0) return;
    
    const userIds = profilesData.map(p => p.user_id);
    
    // Find ketua_penasihat role among these users
    const { data: ketuaRole } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('user_id', userIds)
      .eq('role', 'ketua_penasihat')
      .limit(1)
      .maybeSingle();
    
    if (!ketuaRole) return;
    
    // Fetch class structure from ketua_penasihat's settings
    const { data } = await supabase
      .from('teacher_settings')
      .select('class_structure')
      .eq('user_id', ketuaRole.user_id)
      .maybeSingle();
    
    if (data?.class_structure && Array.isArray(data.class_structure)) {
      setClassStructure(data.class_structure as unknown as ClassItem[]);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchClassStructure();
  }, [user]);

  // Get classes for selected form level from structure
  const getClassesForForm = (formLevel: string) => {
    if (!formLevel || formLevel === 'all') return [];
    return classStructure
      .filter(c => c.form_level === parseInt(formLevel))
      .map(c => c.class_name);
  };

  // Sort students by class structure order
  const sortStudentsByClassOrder = (studentList: Student[]) => {
    return [...studentList].sort((a, b) => {
      // First sort by form level
      if (a.form_level !== b.form_level) {
        return a.form_level - b.form_level;
      }
      
      // Then sort by class order from structure
      const aIndex = classStructure.findIndex(
        c => c.form_level === a.form_level && c.class_name.toLowerCase() === a.class_name.toLowerCase()
      );
      const bIndex = classStructure.findIndex(
        c => c.form_level === b.form_level && c.class_name.toLowerCase() === b.class_name.toLowerCase()
      );
      
      // If both found in structure, sort by structure order
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      // If only one found, put it first
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      // Otherwise sort alphabetically
      return a.class_name.localeCompare(b.class_name);
    });
  };

  const filteredStudents = sortStudentsByClassOrder(
    students.filter((student) => {
      const matchesSearch = student.full_name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesForm = filterForm === 'all' || student.form_level.toString() === filterForm;
      const matchesClass = filterClass === 'all' || student.class_name.toLowerCase() === filterClass.toLowerCase();
      return matchesSearch && matchesForm && matchesClass;
    })
  );

  const handleAddStudent = async () => {
    if (!formData.full_name || !formData.class_name) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Sila isi semua maklumat',
      });
      return;
    }

    // Get active session
    const { data: session } = await supabase
      .from('academic_sessions')
      .select('id')
      .eq('is_active', true)
      .maybeSingle();

    if (!session) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Tiada sesi akademik aktif',
      });
      return;
    }

    const { error } = await supabase.from('students').insert({
      full_name: formData.full_name,
      class_name: formData.class_name,
      form_level: parseInt(formData.form_level),
      session_id: session.id,
      teacher_id: user?.id,
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Gagal menambah pelajar',
      });
    } else {
      toast({
        title: 'Berjaya',
        description: 'Pelajar berjaya ditambah',
      });
      setIsAddDialogOpen(false);
      setFormData({ full_name: '', class_name: '', form_level: '1' });
      fetchStudents();
    }
  };

  const handleEditStudent = async () => {
    if (!selectedStudent) return;

    const { error } = await supabase
      .from('students')
      .update({
        full_name: formData.full_name,
        class_name: formData.class_name,
        form_level: parseInt(formData.form_level),
      })
      .eq('id', selectedStudent.id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Gagal mengemaskini pelajar',
      });
    } else {
      toast({
        title: 'Berjaya',
        description: 'Maklumat pelajar dikemaskini',
      });
      setIsEditDialogOpen(false);
      setSelectedStudent(null);
      fetchStudents();
    }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;

    const { error } = await supabase
      .from('students')
      .update({ is_active: false })
      .eq('id', selectedStudent.id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Gagal memadam pelajar',
      });
    } else {
      toast({
        title: 'Berjaya',
        description: 'Pelajar berjaya dipadam',
      });
      setIsDeleteDialogOpen(false);
      setSelectedStudent(null);
      fetchStudents();
    }
  };

  const openEditDialog = (student: Student) => {
    setSelectedStudent(student);
    setFormData({
      full_name: student.full_name,
      class_name: student.class_name,
      form_level: student.form_level.toString(),
    });
    setIsEditDialogOpen(true);
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-border">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="font-display text-xl md:text-2xl font-bold">Senarai Pelajar</h1>
            <p className="text-sm text-muted-foreground">
              {students.length} pelajar berdaftar
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="shadow-primary">
            <UserPlus className="w-4 h-4 mr-2" />
            Tambah Pelajar
          </Button>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="p-4 md:p-6 border-b border-border">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama pelajar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterForm} onValueChange={(val) => {
            setFilterForm(val);
            setFilterClass('all'); // Reset class filter when form changes
          }}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Tingkatan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="1">Tingkatan 1</SelectItem>
              <SelectItem value="2">Tingkatan 2</SelectItem>
              <SelectItem value="3">Tingkatan 3</SelectItem>
              <SelectItem value="4">Tingkatan 4</SelectItem>
              <SelectItem value="5">Tingkatan 5</SelectItem>
            </SelectContent>
          </Select>
          {filterForm !== 'all' && getClassesForForm(filterForm).length > 0 && (
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Kelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kelas</SelectItem>
                {getClassesForForm(filterForm).map((className, idx) => (
                  <SelectItem key={className} value={className}>
                    {className} (#{idx + 1})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Student List */}
      <div className="p-4 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg">Tiada Pelajar</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {searchQuery ? 'Tiada pelajar dijumpai' : 'Tambah pelajar pertama anda'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {filteredStudents.map((student, index) => (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="bg-card border border-border rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {student.full_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium">{student.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Tingkatan {student.form_level} • {student.class_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(student)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      setSelectedStudent(student);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Pelajar Baru</DialogTitle>
            <DialogDescription>
              Masukkan maklumat pelajar untuk didaftarkan
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Penuh</Label>
              <Input
                id="name"
                placeholder="Nama pelajar"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tingkatan</Label>
                <Select
                  value={formData.form_level}
                  onValueChange={(val) => setFormData({ ...formData, form_level: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        Tingkatan {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="class">Kelas</Label>
                {getClassesForForm(formData.form_level).length > 0 ? (
                  <Select
                    value={formData.class_name}
                    onValueChange={(val) => setFormData({ ...formData, class_name: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kelas" />
                    </SelectTrigger>
                    <SelectContent>
                      {getClassesForForm(formData.form_level).map((className) => (
                        <SelectItem key={className} value={className}>
                          {className}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="class"
                    placeholder="cth: Bestari"
                    value={formData.class_name}
                    onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                  />
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleAddStudent}>Tambah</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pelajar</DialogTitle>
            <DialogDescription>
              Kemaskini maklumat pelajar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nama Penuh</Label>
              <Input
                id="edit-name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tingkatan</Label>
                <Select
                  value={formData.form_level}
                  onValueChange={(val) => setFormData({ ...formData, form_level: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        Tingkatan {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-class">Kelas</Label>
                {getClassesForForm(formData.form_level).length > 0 ? (
                  <Select
                    value={formData.class_name}
                    onValueChange={(val) => setFormData({ ...formData, class_name: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kelas" />
                    </SelectTrigger>
                    <SelectContent>
                      {getClassesForForm(formData.form_level).map((className) => (
                        <SelectItem key={className} value={className}>
                          {className}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="edit-class"
                    value={formData.class_name}
                    onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                  />
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleEditStudent}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Padam Pelajar</DialogTitle>
            <DialogDescription>
              Adakah anda pasti untuk memadam {selectedStudent?.full_name}?
              Tindakan ini tidak boleh dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeleteStudent}>
              Padam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Students;
