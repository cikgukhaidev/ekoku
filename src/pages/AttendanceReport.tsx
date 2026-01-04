import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Check, X, ChevronLeft, ChevronRight,
  FileText, Printer
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface Meeting {
  id: string;
  meeting_number: number;
  meeting_date: string;
  is_completed: boolean;
}

interface Student {
  id: string;
  full_name: string;
  class_name: string;
  form_level: number;
}

interface AttendanceRecord {
  meeting_id: string;
  student_id: string;
  status: string;
}

const ITEMS_PER_PAGE = 30;

const AttendanceReport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalMeetings, setTotalMeetings] = useState(12);
  const [selectedForm, setSelectedForm] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch total meetings setting
    const { data: totalData } = await supabase.rpc('get_school_total_meetings' as any);
    if (totalData) setTotalMeetings(totalData as number);

    // Fetch meetings
    const { data: meetingsData } = await supabase
      .from('meetings')
      .select('*')
      .order('meeting_number');

    if (meetingsData) setMeetings(meetingsData);

    // Fetch students
    const { data: studentsData } = await supabase
      .from('students')
      .select('*')
      .eq('is_active', true)
      .order('form_level')
      .order('class_name')
      .order('full_name');

    if (studentsData) setStudents(studentsData);

    // Fetch all attendance
    if (meetingsData && meetingsData.length > 0) {
      const meetingIds = meetingsData.map(m => m.id);
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*')
        .in('meeting_id', meetingIds);

      if (attendanceData) setAttendance(attendanceData);
    }

    setLoading(false);
  };

  // Helper to convert name to Title Case
  const toTitleCase = (str: string) => {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get unique form levels
  const formLevels = [...new Set(students.map(s => s.form_level))].sort();

  // Filter students by form level
  const filteredStudents = selectedForm === 'all' 
    ? students 
    : students.filter(s => s.form_level === parseInt(selectedForm));

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Get attendance status for a student in a meeting
  const getAttendanceStatus = (studentId: string, meetingId: string) => {
    const record = attendance.find(
      a => a.student_id === studentId && a.meeting_id === meetingId
    );
    return record?.status || null;
  };

  // Get meeting by number
  const getMeetingByNumber = (num: number) => {
    return meetings.find(m => m.meeting_number === num);
  };

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedForm]);

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
          className="flex items-center gap-3"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/reports')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display text-xl md:text-2xl font-bold">Jadual Kehadiran</h1>
            <p className="text-sm text-muted-foreground">
              Rekod kehadiran penuh mengikut tingkatan
            </p>
          </div>
        </motion.div>
      </div>

      <div className="p-4 md:p-6 space-y-4">
        {/* Filter and Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Select value={selectedForm} onValueChange={setSelectedForm}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Tingkatan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tingkatan</SelectItem>
              {formLevels.map(level => (
                <SelectItem key={level} value={level.toString()}>
                  Tingkatan {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="w-4 h-4" />
            <span>{filteredStudents.length} pelajar</span>
          </div>
        </div>

        {/* Attendance Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {selectedForm === 'all' 
                ? 'Semua Tingkatan' 
                : `Tingkatan ${selectedForm}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8 text-center sticky left-0 bg-background z-10 px-1 py-2">Bil</TableHead>
                    <TableHead className="min-w-[120px] max-w-[150px] sticky left-8 bg-background z-10 px-2 py-2">Nama</TableHead>
                    <TableHead className="w-12 text-center px-1 py-2">Kelas</TableHead>
                    {Array.from({ length: totalMeetings }, (_, i) => (
                      <TableHead key={i + 1} className="w-6 text-center px-0.5 py-2 text-[10px]">
                        {i + 1}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedStudents.length > 0 ? (
                    paginatedStudents.map((student, index) => {
                      const rowNumber = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                      
                      return (
                        <TableRow key={student.id} className="h-7">
                          <TableCell className="text-center font-medium sticky left-0 bg-background px-1 py-1 text-[10px]">
                            {rowNumber}
                          </TableCell>
                          <TableCell className="font-medium sticky left-8 bg-background px-2 py-1 text-[10px] truncate max-w-[150px]">
                            {toTitleCase(student.full_name)}
                          </TableCell>
                          <TableCell className="text-center px-1 py-1 text-[10px]">
                            {student.form_level}{student.class_name.toUpperCase()}
                          </TableCell>
                          {Array.from({ length: totalMeetings }, (_, i) => {
                            const meetingNum = i + 1;
                            const meeting = getMeetingByNumber(meetingNum);
                            const status = meeting 
                              ? getAttendanceStatus(student.id, meeting.id) 
                              : null;

                            return (
                              <TableCell key={meetingNum} className="text-center px-0.5 py-1">
                                {status === 'hadir' || status === 'lewat' ? (
                                  <Check className="w-3 h-3 mx-auto text-green-600" />
                                ) : status === 'tidak_hadir' ? (
                                  <X className="w-3 h-3 mx-auto text-red-600" />
                                ) : (
                                  <span className="text-muted-foreground text-[10px]">-</span>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell 
                        colSpan={3 + totalMeetings} 
                        className="text-center py-8 text-muted-foreground"
                      >
                        Tiada pelajar ditemui
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Halaman {currentPage} daripada {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Sebelum
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Seterusnya
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground pt-4 border-t">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600" />
            <span>Hadir / Lewat</span>
          </div>
          <div className="flex items-center gap-2">
            <X className="w-4 h-4 text-red-600" />
            <span>Tidak Hadir</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">-</span>
            <span>Tiada Rekod</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AttendanceReport;
