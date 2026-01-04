import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, Calendar, Clock, Users, Check, 
  CheckCircle2, XCircle, AlertCircle, Edit2 
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
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
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { format } from 'date-fns';
import { ms } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type AttendanceStatus = 'hadir' | 'tidak_hadir' | 'lewat';

interface Meeting {
  id: string;
  meeting_number: number;
  meeting_date: string;
  notes: string | null;
}

interface Student {
  id: string;
  full_name: string;
  class_name: string;
  form_level: number;
}

interface AttendanceRecord {
  student_id: string;
  status: AttendanceStatus;
}

const Meetings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [filterForm, setFilterForm] = useState<string>('all');

  const fetchMeetings = async () => {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .order('meeting_number', { ascending: true });

    if (!error && data) {
      setMeetings(data);
    }
    setLoading(false);
  };

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('is_active', true)
      .order('form_level')
      .order('full_name');

    if (!error && data) {
      setStudents(data);
    }
  };

  const fetchAttendance = async (meetingId: string) => {
    const { data, error } = await supabase
      .from('attendance')
      .select('student_id, status')
      .eq('meeting_id', meetingId);

    if (!error && data) {
      const attendanceMap: Record<string, AttendanceStatus> = {};
      data.forEach((record) => {
        attendanceMap[record.student_id] = record.status as AttendanceStatus;
      });
      setAttendance(attendanceMap);
    }
  };

  useEffect(() => {
    fetchMeetings();
    fetchStudents();
  }, []);

  const handleAddMeeting = async () => {
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

    const newMeetingNumber = meetings.length + 1;
    const { error } = await supabase.from('meetings').insert({
      session_id: session.id,
      teacher_id: user?.id,
      meeting_number: newMeetingNumber,
      meeting_date: new Date().toISOString().split('T')[0],
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Gagal menambah perjumpaan',
      });
    } else {
      toast({
        title: 'Berjaya',
        description: `Perjumpaan ${newMeetingNumber} berjaya ditambah`,
      });
      setIsAddDialogOpen(false);
      fetchMeetings();
    }
  };

  const openAttendance = async (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    await fetchAttendance(meeting.id);
    
    // Initialize attendance for students without records
    const initialAttendance: Record<string, AttendanceStatus> = {};
    students.forEach((student) => {
      initialAttendance[student.id] = attendance[student.id] || 'hadir';
    });
    setAttendance((prev) => ({ ...initialAttendance, ...prev }));
    setIsAttendanceOpen(true);
  };

  const handleMarkAllPresent = () => {
    const allPresent: Record<string, AttendanceStatus> = {};
    filteredStudents.forEach((student) => {
      allPresent[student.id] = 'hadir';
    });
    setAttendance((prev) => ({ ...prev, ...allPresent }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedMeeting) return;

    // Delete existing attendance for this meeting
    await supabase
      .from('attendance')
      .delete()
      .eq('meeting_id', selectedMeeting.id);

    // Insert new attendance records
    const records = Object.entries(attendance).map(([studentId, status]) => ({
      meeting_id: selectedMeeting.id,
      student_id: studentId,
      status,
    }));

    const { error } = await supabase.from('attendance').insert(records);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Gagal menyimpan kehadiran',
      });
    } else {
      toast({
        title: 'Berjaya',
        description: 'Kehadiran berjaya disimpan',
      });
      setIsAttendanceOpen(false);
      setSelectedMeeting(null);
    }
  };

  const toggleStatus = (studentId: string) => {
    const currentStatus = attendance[studentId] || 'hadir';
    const statusOrder: AttendanceStatus[] = ['hadir', 'lewat', 'tidak_hadir'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    setAttendance((prev) => ({ ...prev, [studentId]: nextStatus }));
  };

  const filteredStudents = students.filter(
    (student) => filterForm === 'all' || student.form_level.toString() === filterForm
  );

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'hadir':
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'tidak_hadir':
        return <XCircle className="w-5 h-5 text-destructive" />;
      case 'lewat':
        return <AlertCircle className="w-5 h-5 text-warning" />;
    }
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    const styles = {
      hadir: 'badge-hadir',
      tidak_hadir: 'badge-tidak-hadir',
      lewat: 'badge-lewat',
    };
    const labels = {
      hadir: 'Hadir',
      tidak_hadir: 'Tidak Hadir',
      lewat: 'Lewat',
    };
    return (
      <span className={cn('text-xs px-2 py-1 rounded-full font-medium', styles[status])}>
        {labels[status]}
      </span>
    );
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
            <h1 className="font-display text-xl md:text-2xl font-bold">Perjumpaan</h1>
            <p className="text-sm text-muted-foreground">
              {meetings.length}/12 perjumpaan selesai
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="shadow-primary">
            <Plus className="w-4 h-4 mr-2" />
            Perjumpaan Baru
          </Button>
        </motion.div>
      </div>

      {/* Meetings List */}
      <div className="p-4 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : meetings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg">Tiada Perjumpaan</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Tambah perjumpaan pertama anda
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {meetings.map((meeting, index) => (
              <motion.button
                key={meeting.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => openAttendance(meeting)}
                className="bg-card border border-border rounded-xl p-4 text-left hover:shadow-md hover:border-primary/30 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-display font-bold text-primary">
                    #{meeting.meeting_number}
                  </span>
                  <Edit2 className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(meeting.meeting_date), 'd MMM yyyy', { locale: ms })}
                </p>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Add Meeting Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Perjumpaan Baru</DialogTitle>
            <DialogDescription>
              Tambah perjumpaan #{meetings.length + 1} untuk hari ini
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-3 p-4 bg-accent/50 rounded-lg">
              <Calendar className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">Tarikh</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(), 'EEEE, d MMMM yyyy', { locale: ms })}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleAddMeeting}>Tambah</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attendance Dialog */}
      <Dialog open={isAttendanceOpen} onOpenChange={setIsAttendanceOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Kehadiran Perjumpaan #{selectedMeeting?.meeting_number}
            </DialogTitle>
            <DialogDescription>
              Tap pada pelajar untuk menukar status kehadiran
            </DialogDescription>
          </DialogHeader>

          {/* Filter & Actions */}
          <div className="flex items-center justify-between gap-2 py-2">
            <Select value={filterForm} onValueChange={setFilterForm}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Tingkatan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                {[1, 2, 3, 4, 5].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    Ting. {num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleMarkAllPresent}>
              <Check className="w-4 h-4 mr-1" />
              Semua Hadir
            </Button>
          </div>

          {/* Student List */}
          <div className="flex-1 overflow-y-auto space-y-2 py-2">
            {filteredStudents.map((student) => (
              <button
                key={student.id}
                onClick={() => toggleStatus(student.id)}
                className="w-full flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(attendance[student.id] || 'hadir')}
                  <div className="text-left">
                    <p className="font-medium text-sm">{student.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      T{student.form_level} {student.class_name}
                    </p>
                  </div>
                </div>
                {getStatusBadge(attendance[student.id] || 'hadir')}
              </button>
            ))}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setIsAttendanceOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveAttendance}>Simpan Kehadiran</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Meetings;
