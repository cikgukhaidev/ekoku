import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Calendar, Check, CheckCircle2, XCircle, 
  AlertCircle, Save, CalendarDays
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { format } from 'date-fns';
import { ms } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { logActivity } from '@/lib/activityLogger';

type AttendanceStatus = 'hadir' | 'tidak_hadir' | 'lewat';

interface Meeting {
  id: string;
  meeting_number: number;
  meeting_date: string;
  notes: string | null;
  is_completed: boolean;
}

interface Student {
  id: string;
  full_name: string;
  class_name: string;
  form_level: number;
}

const MeetingDetail = () => {
  const { meetingNumber } = useParams<{ meetingNumber: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [filterForm, setFilterForm] = useState<string>('all');
  const [sessionId, setSessionId] = useState<string | null>(null);

  const meetingNum = parseInt(meetingNumber || '1');

  // Helper to convert name to Title Case
  const toTitleCase = (str: string) => {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  useEffect(() => {
    fetchData();
  }, [meetingNumber, user]);

  const fetchData = async () => {
    setLoading(true);
    
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
      setLoading(false);
      return;
    }

    setSessionId(session.id);

    // Fetch existing meeting for this number
    const { data: meetingData } = await supabase
      .from('meetings')
      .select('*')
      .eq('meeting_number', meetingNum)
      .eq('teacher_id', user?.id)
      .maybeSingle();

    if (meetingData) {
      setMeeting(meetingData);
      setSelectedDate(new Date(meetingData.meeting_date));
      
      // Fetch attendance
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('meeting_id', meetingData.id);

      if (attendanceData) {
        const attendanceMap: Record<string, AttendanceStatus> = {};
        attendanceData.forEach((record) => {
          attendanceMap[record.student_id] = record.status as AttendanceStatus;
        });
        setAttendance(attendanceMap);
      }
    }

    // Fetch students
    const { data: studentsData } = await supabase
      .from('students')
      .select('*')
      .eq('is_active', true)
      .order('full_name');

    if (studentsData) {
      setStudents(studentsData);
      
      // Initialize attendance for students without records
      if (!meetingData) {
        const initialAttendance: Record<string, AttendanceStatus> = {};
        studentsData.forEach((student) => {
          initialAttendance[student.id] = 'hadir';
        });
        setAttendance(initialAttendance);
      }
    }

    setLoading(false);
  };

  const handleSave = async (markComplete: boolean = false) => {
    if (!selectedDate) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Sila pilih tarikh perjumpaan',
      });
      return;
    }

    if (!sessionId) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: 'Tiada sesi akademik aktif',
      });
      return;
    }

    setSaving(true);

    try {
      let meetingId = meeting?.id;

      if (meeting) {
        // Update existing meeting
        const { error } = await supabase
          .from('meetings')
          .update({
            meeting_date: format(selectedDate, 'yyyy-MM-dd'),
            is_completed: markComplete ? true : meeting.is_completed,
          })
          .eq('id', meeting.id);

        if (error) throw error;
      } else {
        // Create new meeting
        const { data: newMeeting, error } = await supabase
          .from('meetings')
          .insert({
            session_id: sessionId,
            teacher_id: user?.id,
            meeting_number: meetingNum,
            meeting_date: format(selectedDate, 'yyyy-MM-dd'),
            is_completed: markComplete,
          })
          .select()
          .single();

        if (error) throw error;
        meetingId = newMeeting.id;
      }

      // Save attendance
      if (meetingId) {
        // Delete existing attendance
        await supabase
          .from('attendance')
          .delete()
          .eq('meeting_id', meetingId);

        // Insert new attendance records
        const records = Object.entries(attendance).map(([studentId, status]) => ({
          meeting_id: meetingId,
          student_id: studentId,
          status,
        }));

        const { error: attendanceError } = await supabase
          .from('attendance')
          .insert(records);

        if (attendanceError) throw attendanceError;
      }

      await logActivity({
        actionType: meeting ? 'update' : 'create',
        entityType: 'meeting',
        entityId: meetingId,
        description: `Perjumpaan ${meetingNum} ${markComplete ? 'selesai' : 'dikemaskini'} - ${format(selectedDate, 'd MMM yyyy', { locale: ms })}`,
      });

      toast({
        title: 'Berjaya',
        description: markComplete 
          ? `Perjumpaan ${meetingNum} ditanda selesai` 
          : 'Data perjumpaan disimpan',
      });

      if (markComplete) {
        navigate('/meetings');
      } else {
        fetchData(); // Refresh data
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ralat',
        description: error.message || 'Gagal menyimpan data',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = (studentId: string) => {
    const currentStatus = attendance[studentId] || 'hadir';
    const statusOrder: AttendanceStatus[] = ['hadir', 'lewat', 'tidak_hadir'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    setAttendance((prev) => ({ ...prev, [studentId]: nextStatus }));
  };

  const handleMarkAllPresent = () => {
    const allPresent: Record<string, AttendanceStatus> = {};
    filteredStudents.forEach((student) => {
      allPresent[student.id] = 'hadir';
    });
    setAttendance((prev) => ({ ...prev, ...allPresent }));
  };

  const filteredStudents = students.filter(
    (student) => filterForm === 'all' || student.form_level.toString() === filterForm
  );

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'hadir':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'tidak_hadir':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'lewat':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    const styles = {
      hadir: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      tidak_hadir: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      lewat: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
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

  const attendanceStats = {
    hadir: Object.values(attendance).filter(s => s === 'hadir').length,
    lewat: Object.values(attendance).filter(s => s === 'lewat').length,
    tidak_hadir: Object.values(attendance).filter(s => s === 'tidak_hadir').length,
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-border">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <Button variant="ghost" size="icon" onClick={() => navigate('/meetings')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-display text-xl md:text-2xl font-bold">
              Perjumpaan #{meetingNum}
            </h1>
            <p className="text-sm text-muted-foreground">
              {meeting?.is_completed ? '✅ Selesai' : 'Belum selesai'}
            </p>
          </div>
        </motion.div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* Date Picker */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Tarikh Perjumpaan
          </h3>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {selectedDate 
                  ? format(selectedDate, 'EEEE, d MMMM yyyy', { locale: ms }) 
                  : 'Pilih tarikh perjumpaan'
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarPicker
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Attendance Section */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="font-medium flex items-center gap-2">
              <Check className="w-4 h-4" />
              Kehadiran Pelajar
            </h3>
            <div className="flex items-center gap-2">
              <Select value={filterForm} onValueChange={setFilterForm}>
                <SelectTrigger className="w-28 h-9 text-sm">
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
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-green-50 dark:bg-green-950 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-green-700 dark:text-green-300">{attendanceStats.hadir}</p>
              <p className="text-xs text-green-600 dark:text-green-400">Hadir</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-yellow-700 dark:text-yellow-300">{attendanceStats.lewat}</p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400">Lewat</p>
            </div>
            <div className="bg-red-50 dark:bg-red-950 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-red-700 dark:text-red-300">{attendanceStats.tidak_hadir}</p>
              <p className="text-xs text-red-600 dark:text-red-400">Tidak Hadir</p>
            </div>
          </div>

          {/* Student List */}
          {filteredStudents.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Tiada pelajar. Sila daftar pelajar terlebih dahulu.
            </p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredStudents.map((student, index) => (
                <motion.button
                  key={student.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => toggleStatus(student.id)}
                  className="w-full flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(attendance[student.id] || 'hadir')}
                    <div className="text-left">
                      <p className="font-medium text-sm">{toTitleCase(student.full_name)}</p>
                      <p className="text-xs text-muted-foreground">
                        {student.form_level} {student.class_name.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(attendance[student.id] || 'hadir')}
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-2" />
            Simpan Draf
          </Button>
          <Button 
            className="flex-1"
            onClick={() => handleSave(true)}
            disabled={saving || !selectedDate}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Selesai & Simpan
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MeetingDetail;
