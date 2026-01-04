import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, Search, Filter, Edit2, Trash2, 
  UserPlus, ChevronDown, Users, Download, Upload, FileUp
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
import { logActivity } from '@/lib/activityLogger';

interface Student {
  id: string;
  full_name: string;
  class_name: string;
  form_level: number;
  is_active: boolean;
}

// Class names list (shared across all form levels)

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
  const [classNames, setClassNames] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    full_name: '',
    class_name: '',
    form_level: '1',
  });
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportFormLevel, setExportFormLevel] = useState<string>('2');
  const [incrementFormLevel, setIncrementFormLevel] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    // Use RPC function to get class structure from ketua_penasihat
    const { data, error } = await supabase.rpc('get_school_class_structure' as any);
    
    if (error) {
      console.error('Error fetching class structure:', error);
      return;
    }
    
    if (data && Array.isArray(data)) {
      // Handle both old format (with form_level) and new format (just strings)
      if (data.length > 0 && typeof data[0] === 'string') {
        setClassNames(data as string[]);
      } else if (data.length > 0 && typeof data[0] === 'object') {
        // Convert old format to new - extract unique class names in order
        const uniqueNames: string[] = [];
        data.forEach((c: any) => {
          if (c.class_name && !uniqueNames.includes(c.class_name)) {
            uniqueNames.push(c.class_name);
          }
        });
        setClassNames(uniqueNames);
      }
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchClassStructure();
  }, [user]);

  // Get class names (same for all form levels)
  const getClassesForForm = () => {
    return classNames;
  };

  // Sort students by Form Level > Class Order (from settings) > Name (A-Z)
  const sortStudentsByClassOrder = (studentList: Student[]) => {
    return [...studentList].sort((a, b) => {
      // First sort by form level
      if (a.form_level !== b.form_level) {
        return a.form_level - b.form_level;
      }
      
      // Then sort by class order (based on classNames order from settings)
      const classIndexA = classNames.findIndex(c => c.toUpperCase() === a.class_name.toUpperCase());
      const classIndexB = classNames.findIndex(c => c.toUpperCase() === b.class_name.toUpperCase());
      
      // If class not found in settings, put at end
      const orderA = classIndexA === -1 ? 999 : classIndexA;
      const orderB = classIndexB === -1 ? 999 : classIndexB;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // Finally sort by name (A-Z)
      return a.full_name.localeCompare(b.full_name, 'ms');
    });
  };

  // Helper to convert name to UPPERCASE
  const toUpperCase = (str: string) => {
    return str.toUpperCase();
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
      await logActivity({
        actionType: 'error',
        entityType: 'student',
        description: `Gagal menambah pelajar: ${formData.full_name}`,
        errorMessage: error.message,
      });
    } else {
      toast({
        title: 'Berjaya',
        description: 'Pelajar berjaya ditambah',
      });
      await logActivity({
        actionType: 'create',
        entityType: 'student',
        description: `Pelajar ditambah: ${formData.full_name} (Tingkatan ${formData.form_level} ${formData.class_name})`,
      });
      setIsAddDialogOpen(false);
      setFormData({ full_name: '', class_name: '', form_level: '1' });
      fetchStudents();
    }
  };

  // Export students to CSV
  const handleExportStudents = () => {
    const formLevel = parseInt(exportFormLevel);
    const studentsToExport = students.filter(s => s.form_level === formLevel);
    
    if (studentsToExport.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: `Tiada pelajar Tingkatan ${formLevel} untuk diexport`,
      });
      return;
    }

    // Create CSV content with incremented form level if checked
    const exportFormLevelValue = incrementFormLevel ? formLevel + 1 : formLevel;
    const csvHeader = 'Nama Penuh,Tingkatan,Kelas';
    const csvRows = studentsToExport.map(s => 
      `"${s.full_name}",${exportFormLevelValue},"${s.class_name}"`
    );
    const csvContent = [csvHeader, ...csvRows].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pelajar_tingkatan_${formLevel}_ke_${exportFormLevelValue}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    logActivity({
      actionType: 'download',
      entityType: 'student',
      description: `Export ${studentsToExport.length} pelajar Tingkatan ${formLevel} (sebagai Tingkatan ${exportFormLevelValue})`,
    });

    toast({
      title: 'Berjaya',
      description: `${studentsToExport.length} pelajar berjaya diexport`,
    });
    setIsExportDialogOpen(false);
  };

  // Import students from CSV
  const handleImportStudents = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        // Skip header row
        const dataLines = lines.slice(1);
        
        if (dataLines.length === 0) {
          toast({
            variant: 'destructive',
            title: 'Ralat',
            description: 'Fail CSV kosong atau tiada data',
          });
          return;
        }

        const studentsToImport = dataLines.map(line => {
          // Parse CSV line (handle quoted values)
          const matches = line.match(/(".*?"|[^,]+)/g) || [];
          const [name, formLevel, className] = matches.map(m => m.replace(/^"|"$/g, '').trim());
          
          return {
            full_name: name?.toUpperCase() || '',
            form_level: parseInt(formLevel) || 1,
            class_name: className?.toUpperCase() || '',
            session_id: session.id,
            teacher_id: user?.id,
            is_active: true,
          };
        }).filter(s => s.full_name && s.class_name);

        if (studentsToImport.length === 0) {
          toast({
            variant: 'destructive',
            title: 'Ralat',
            description: 'Tiada data pelajar yang sah dalam fail',
          });
          return;
        }

        const { error } = await supabase.from('students').insert(studentsToImport);

        if (error) {
          toast({
            variant: 'destructive',
            title: 'Ralat',
            description: 'Gagal mengimport pelajar',
          });
          await logActivity({
            actionType: 'error',
            entityType: 'student',
            description: 'Gagal mengimport pelajar dari CSV',
            errorMessage: error.message,
          });
        } else {
          toast({
            title: 'Berjaya',
            description: `${studentsToImport.length} pelajar berjaya diimport`,
          });
          await logActivity({
            actionType: 'upload',
            entityType: 'student',
            description: `${studentsToImport.length} pelajar diimport dari CSV`,
          });
          fetchStudents();
          setIsImportDialogOpen(false);
        }
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Ralat',
          description: 'Format fail tidak sah',
        });
        await logActivity({
          actionType: 'error',
          entityType: 'student',
          description: 'Gagal mengimport pelajar - format fail tidak sah',
          errorMessage: err.message,
        });
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
      await logActivity({
        actionType: 'error',
        entityType: 'student',
        entityId: selectedStudent.id,
        description: `Gagal mengemaskini pelajar: ${selectedStudent.full_name}`,
        errorMessage: error.message,
      });
    } else {
      toast({
        title: 'Berjaya',
        description: 'Maklumat pelajar dikemaskini',
      });
      await logActivity({
        actionType: 'update',
        entityType: 'student',
        entityId: selectedStudent.id,
        description: `Pelajar dikemaskini: ${formData.full_name} (Tingkatan ${formData.form_level} ${formData.class_name})`,
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
      await logActivity({
        actionType: 'error',
        entityType: 'student',
        entityId: selectedStudent.id,
        description: `Gagal memadam pelajar: ${selectedStudent.full_name}`,
        errorMessage: error.message,
      });
    } else {
      toast({
        title: 'Berjaya',
        description: 'Pelajar berjaya dipadam',
      });
      await logActivity({
        actionType: 'delete',
        entityType: 'student',
        entityId: selectedStudent.id,
        description: `Pelajar dipadam: ${selectedStudent.full_name}`,
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
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setIsExportDialogOpen(true)}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)} className="shadow-primary">
              <UserPlus className="w-4 h-4 mr-2" />
              Tambah Pelajar
            </Button>
          </div>
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
          {filterForm !== 'all' && getClassesForForm().length > 0 && (
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Kelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kelas</SelectItem>
                {getClassesForForm().map((className, idx) => (
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
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 w-12">
                      Bil
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                      Nama
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 w-28">
                      Kelas
                    </th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 w-24">
                      Tindakan
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStudents.map((student, index) => (
                    <motion.tr
                      key={student.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-sm">{toUpperCase(student.full_name)}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {student.form_level} {student.class_name.toUpperCase()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(student)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelectedStudent(student);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-2">
              {filteredStudents.map((student, index) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="bg-card border border-border rounded-lg p-3 flex items-start gap-3"
                >
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-tight">{toUpperCase(student.full_name)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {student.form_level} {student.class_name.toUpperCase()}
                    </p>
                  </div>
                  <div className="flex items-center shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEditDialog(student)}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => {
                        setSelectedStudent(student);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
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
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value.toUpperCase() })}
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
                {getClassesForForm().length > 0 ? (
                  <Select
                    value={formData.class_name}
                    onValueChange={(val) => setFormData({ ...formData, class_name: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kelas" />
                    </SelectTrigger>
                    <SelectContent>
                      {getClassesForForm().map((className) => (
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
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value.toUpperCase() })}
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
                {getClassesForForm().length > 0 ? (
                  <Select
                    value={formData.class_name}
                    onValueChange={(val) => setFormData({ ...formData, class_name: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kelas" />
                    </SelectTrigger>
                    <SelectContent>
                      {getClassesForForm().map((className) => (
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

      {/* Export Dialog */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Pelajar</DialogTitle>
            <DialogDescription>
              Pilih tingkatan pelajar untuk diexport ke fail CSV
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tingkatan</Label>
              <Select value={exportFormLevel} onValueChange={setExportFormLevel}>
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
            
            <div className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
              <Checkbox
                id="increment-form"
                checked={incrementFormLevel}
                onCheckedChange={(checked) => setIncrementFormLevel(checked === true)}
              />
              <div className="space-y-1">
                <Label htmlFor="increment-form" className="text-sm font-medium cursor-pointer">
                  Naikkan tingkatan dalam fail
                </Label>
                <p className="text-xs text-muted-foreground">
                  Tingkatan {exportFormLevel} akan disimpan sebagai Tingkatan {incrementFormLevel ? parseInt(exportFormLevel) + 1 : exportFormLevel} dalam fail export
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleExportStudents}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Pelajar</DialogTitle>
            <DialogDescription>
              Muat turun contoh, isi dalam Excel, kemudian import balik
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Step 1: Download Template */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Langkah 1: Muat turun contoh</p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  const csvHeader = 'Nama Penuh,Tingkatan,Kelas';
                  const csvExample = [
                    '"ALI BIN ABU",1,"ZUHAL"',
                    '"SITI BINTI AHMAD",1,"ZUHAL"',
                    '"MUHAMMAD BIN HASSAN",2,"MARIKH"',
                  ].join('\n');
                  const csvContent = `${csvHeader}\n${csvExample}`;
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = 'contoh_senarai_pelajar.csv';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                  toast({
                    title: 'Berjaya',
                    description: 'Contoh fail CSV dimuat turun. Buka dengan Excel untuk edit.',
                  });
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Muat Turun Contoh (CSV)
              </Button>
              <p className="text-xs text-muted-foreground">
                Fail CSV boleh dibuka dan diedit dalam Microsoft Excel
              </p>
            </div>

            {/* Step 2: Upload */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Langkah 2: Import fail yang telah diisi</p>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                <FileUp className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleImportStudents}
                  className="hidden"
                  id="csv-upload"
                />
                <Button asChild variant="outline" size="sm">
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    Pilih Fail CSV
                  </label>
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Students;
