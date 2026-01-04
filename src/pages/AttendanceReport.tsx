import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Check, X, ChevronLeft, ChevronRight,
  FileText, Printer, Download
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
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

interface School {
  id: string;
  name: string;
  logo_url: string | null;
}

interface Profile {
  unit_name: string | null;
  kokurikulum_category: string | null;
}

const ITEMS_PER_PAGE = 30;

const AttendanceReport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [school, setSchool] = useState<School | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalMeetings, setTotalMeetings] = useState(12);
  const [selectedForm, setSelectedForm] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Laporan_Kehadiran_${selectedForm === 'all' ? 'Semua' : `Tingkatan_${selectedForm}`}`,
    onBeforePrint: () => {
      setIsPrinting(true);
      return Promise.resolve();
    },
    onAfterPrint: () => {
      setIsPrinting(false);
    },
  });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch total meetings setting
    const { data: totalData } = await supabase.rpc('get_school_total_meetings' as any);
    if (totalData) setTotalMeetings(totalData as number);

    // Fetch user profile for unit name
    const { data: profileData } = await supabase
      .from('profiles')
      .select('unit_name, kokurikulum_category, school_id')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (profileData) {
      setProfile(profileData);
      
      // Fetch school info
      if (profileData.school_id) {
        const { data: schoolData } = await supabase
          .from('schools')
          .select('*')
          .eq('id', profileData.school_id)
          .maybeSingle();
        
        if (schoolData) setSchool(schoolData);
      }
    }

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

  // Helper to convert name to UPPERCASE
  const toUpperCase = (str: string) => {
    return str.toUpperCase();
  };

  // Get unique form levels
  const formLevels = [...new Set(students.map(s => s.form_level))].sort();

  // Filter students by form level
  const filteredStudents = selectedForm === 'all' 
    ? students 
    : students.filter(s => s.form_level === parseInt(selectedForm));

  // For printing, we show all students; for screen, we paginate
  const displayStudents = isPrinting ? filteredStudents : filteredStudents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);

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

  // Get category label
  const getCategoryLabel = (category: string | null) => {
    switch (category) {
      case 'sukan_permainan': return 'Sukan & Permainan';
      case 'unit_uniform': return 'Unit Beruniform';
      case 'persatuan_kelab': return 'Persatuan & Kelab';
      default: return 'Kokurikulum';
    }
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

  // Get tingkatan label for PDF
  const getTingkatanLabel = () => {
    if (selectedForm === 'all') {
      // Show actual form levels e.g., "Tingkatan 1, 2 dan 3"
      if (formLevels.length === 0) return '-';
      if (formLevels.length === 1) return `Tingkatan ${formLevels[0]}`;
      const lastLevel = formLevels[formLevels.length - 1];
      const otherLevels = formLevels.slice(0, -1);
      return `Tingkatan ${otherLevels.join(', ')} dan ${lastLevel}`;
    }
    return `Tingkatan ${selectedForm}`;
  };

  // Format class name with space e.g., "1 ZUHAL" instead of "1ZUHAL"
  const formatClassName = (formLevel: number, className: string) => {
    return `${formLevel} ${className.toUpperCase()}`;
  };

  // Printable content component
  const PrintableContent = () => (
    <div ref={printRef} className="print-content bg-white text-black p-6">
      {/* Print Header */}
      <div className="text-center mb-6 print-header">
        <div className="flex items-center justify-center gap-4 mb-2">
          {school?.logo_url && (
            <img 
              src={school.logo_url} 
              alt="Logo Sekolah" 
              className="w-16 h-16 object-contain"
            />
          )}
          <div>
            <h1 className="text-lg font-bold uppercase">{school?.name || 'Nama Sekolah'}</h1>
            <p className="text-sm">Laporan Kehadiran Kokurikulum</p>
            <p className="text-sm font-semibold">{getCategoryLabel(profile?.kokurikulum_category)}</p>
          </div>
        </div>
        <div className="border-t-2 border-black mt-2 pt-2">
          <p className="text-sm">
            <span className="font-bold">Unit:</span> <span className="font-bold uppercase">{profile?.unit_name || '-'}</span> | 
            <span className="font-semibold ml-2">Tingkatan:</span> {getTingkatanLabel()} |
            <span className="font-semibold ml-2">Sesi:</span> {new Date().getFullYear()}
          </p>
        </div>
      </div>

      {/* Print Table */}
      <table className="w-full border-collapse text-[8px] print-table">
        <thead>
          <tr>
            <th className="border border-black px-1 py-0.5 text-center" style={{ width: '20px' }}>Bil</th>
            <th className="border border-black px-1 py-0.5 text-left" style={{ minWidth: '140px', maxWidth: '180px' }}>Nama Pelajar</th>
            <th className="border border-black px-1 py-0.5 text-center whitespace-nowrap" style={{ width: '50px' }}>Kelas</th>
            {Array.from({ length: totalMeetings }, (_, i) => (
              <th key={i + 1} className="border border-black px-0.5 py-0.5 text-center" style={{ width: '18px' }}>
                {i + 1}
              </th>
            ))}
            <th className="border border-black px-1 py-0.5 text-center" style={{ width: '35px' }}>Jum</th>
          </tr>
        </thead>
        <tbody>
          {filteredStudents.map((student, index) => {
            // Calculate attendance for this student
            let hadirCount = 0;
            let totalRecorded = 0;
            
            Array.from({ length: totalMeetings }, (_, i) => {
              const meeting = getMeetingByNumber(i + 1);
              if (meeting) {
                const status = getAttendanceStatus(student.id, meeting.id);
                if (status) {
                  totalRecorded++;
                  if (status === 'hadir') {
                    hadirCount++;
                  }
                }
              }
            });
            
            return (
              <tr key={student.id}>
                <td className="border border-black px-1 py-0.5 text-center">{index + 1}</td>
                <td className="border border-black px-1 py-0.5 text-[9px]" style={{ maxWidth: '180px' }}>{toUpperCase(student.full_name)}</td>
                <td className="border border-black px-1 py-0.5 text-center whitespace-nowrap">
                  {formatClassName(student.form_level, student.class_name)}
                </td>
                {Array.from({ length: totalMeetings }, (_, i) => {
                  const meetingNum = i + 1;
                  const meeting = getMeetingByNumber(meetingNum);
                  const status = meeting ? getAttendanceStatus(student.id, meeting.id) : null;

                  return (
                    <td key={meetingNum} className="border border-black px-0.5 py-0.5 text-center">
                      {status === 'hadir' ? (
                        <span style={{ color: '#16a34a', fontSize: '9px' }}>✓</span>
                      ) : status === 'tidak_hadir' ? (
                        <span style={{ color: '#dc2626', fontSize: '9px' }}>✗</span>
                      ) : '-'}
                    </td>
                  );
                })}
                <td className="border border-black px-1 py-0.5 text-center font-semibold">{hadirCount}/{totalRecorded}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Print Footer */}
      <div className="mt-6 text-[9px] print-footer">
        <div className="flex justify-between items-start">
          <div>
            <p className="mb-1"><strong>Petunjuk:</strong></p>
            <p><span style={{ color: '#16a34a' }}>✓</span> = Hadir | <span style={{ color: '#dc2626' }}>✗</span> = Tidak Hadir | - = Tiada Rekod</p>
          </div>
          <div className="text-right">
            <p>Tarikh Cetak: {new Date().toLocaleDateString('ms-MY')}</p>
            <div className="mt-8 pt-1 border-t border-black w-40">
              <p className="text-center">Tandatangan Guru</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          .print-content {
            width: 100%;
            font-family: Arial, sans-serif;
          }
          .print-table {
            page-break-inside: auto;
          }
          .print-table tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          .print-header, .print-footer {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );

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
          </div>
          <Button onClick={() => handlePrint()} className="gap-2">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Cetak / PDF</span>
          </Button>
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
                  {displayStudents.length > 0 ? (
                    displayStudents.map((student, index) => {
                      const rowNumber = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                      
                      return (
                        <TableRow key={student.id} className="h-7">
                          <TableCell className="text-center font-medium sticky left-0 bg-background px-1 py-1 text-[10px]">
                            {rowNumber}
                          </TableCell>
                          <TableCell className="font-medium sticky left-8 bg-background px-2 py-1 text-[10px] truncate max-w-[150px]">
                            {toUpperCase(student.full_name)}
                          </TableCell>
                          <TableCell className="text-center px-1 py-1 text-[10px] whitespace-nowrap">
                            {student.form_level} {student.class_name.toUpperCase()}
                          </TableCell>
                          {Array.from({ length: totalMeetings }, (_, i) => {
                            const meetingNum = i + 1;
                            const meeting = getMeetingByNumber(meetingNum);
                            const status = meeting 
                              ? getAttendanceStatus(student.id, meeting.id) 
                              : null;

                            return (
                              <TableCell key={meetingNum} className="text-center px-0.5 py-1">
                                {status === 'hadir' ? (
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
            <span>Hadir</span>
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

      {/* Hidden Printable Content */}
      <div className="hidden">
        <PrintableContent />
      </div>
    </DashboardLayout>
  );
};

export default AttendanceReport;
