import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, Users, Calendar, TrendingUp, 
  AlertTriangle, CheckCircle2, Clock, XCircle 
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { format } from 'date-fns';
import { ms } from 'date-fns/locale';

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

const COLORS = {
  hadir: '#22c55e',
  lewat: '#eab308', 
  tidak_hadir: '#ef4444',
};

const Reports = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalMeetings, setTotalMeetings] = useState(12);

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

  // Calculate stats for a meeting
  const getMeetingStats = (meetingId: string) => {
    const meetingAttendance = attendance.filter(a => a.meeting_id === meetingId);
    return {
      hadir: meetingAttendance.filter(a => a.status === 'hadir').length,
      lewat: meetingAttendance.filter(a => a.status === 'lewat').length,
      tidak_hadir: meetingAttendance.filter(a => a.status === 'tidak_hadir').length,
      total: meetingAttendance.length,
    };
  };

  // Calculate student attendance
  const getStudentAttendance = (studentId: string) => {
    const studentRecords = attendance.filter(a => a.student_id === studentId);
    const hadir = studentRecords.filter(a => a.status === 'hadir').length;
    const lewat = studentRecords.filter(a => a.status === 'lewat').length;
    const total = studentRecords.length;
    
    // Count hadir + lewat as "present"
    const presentCount = hadir + lewat;
    const percentage = total > 0 ? Math.round((presentCount / total) * 100) : 0;
    
    return { hadir, lewat, tidak_hadir: total - presentCount, total, percentage };
  };

  // Overall stats
  const completedMeetings = meetings.filter(m => m.is_completed).length;
  const totalAttendanceRecords = attendance.length;
  const totalHadir = attendance.filter(a => a.status === 'hadir').length;
  const totalLewat = attendance.filter(a => a.status === 'lewat').length;
  const overallPercentage = totalAttendanceRecords > 0 
    ? Math.round(((totalHadir + totalLewat) / totalAttendanceRecords) * 100) 
    : 0;

  // Students at risk (< 70% attendance)
  const studentsAtRisk = students
    .map(s => ({ ...s, attendance: getStudentAttendance(s.id) }))
    .filter(s => s.attendance.total > 0 && s.attendance.percentage < 70)
    .sort((a, b) => a.attendance.percentage - b.attendance.percentage);

  // Prepare pie chart data for a meeting
  const getPieData = (meetingId: string) => {
    const stats = getMeetingStats(meetingId);
    if (stats.total === 0) return [];
    
    return [
      { name: 'Hadir', value: stats.hadir, color: COLORS.hadir },
      { name: 'Lewat', value: stats.lewat, color: COLORS.lewat },
      { name: 'Tidak Hadir', value: stats.tidak_hadir, color: COLORS.tidak_hadir },
    ].filter(d => d.value > 0);
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
        >
          <h1 className="font-display text-xl md:text-2xl font-bold">Laporan</h1>
          <p className="text-sm text-muted-foreground">
            Statistik kehadiran dan analisis
          </p>
        </motion.div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{students.length}</p>
                    <p className="text-xs text-muted-foreground">Pelajar</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{completedMeetings}/{totalMeetings}</p>
                    <p className="text-xs text-muted-foreground">Perjumpaan</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{overallPercentage}%</p>
                    <p className="text-xs text-muted-foreground">Kehadiran</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{studentsAtRisk.length}</p>
                    <p className="text-xs text-muted-foreground">Berisiko</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Pie Charts per Meeting */}
        {meetings.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Statistik Setiap Perjumpaan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {meetings.map((meeting, index) => {
                  const pieData = getPieData(meeting.id);
                  const stats = getMeetingStats(meeting.id);
                  const attendanceRate = stats.total > 0 
                    ? Math.round(((stats.hadir + stats.lewat) / stats.total) * 100) 
                    : 0;

                  return (
                    <motion.div
                      key={meeting.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-muted/30 rounded-lg p-3"
                    >
                      <div className="text-center mb-2">
                        <p className="font-semibold text-sm">Perjumpaan {meeting.meeting_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(meeting.meeting_date), 'd MMM yyyy', { locale: ms })}
                        </p>
                      </div>
                      
                      {pieData.length > 0 ? (
                        <>
                          <div className="h-24">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={pieData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={20}
                                  outerRadius={35}
                                  paddingAngle={2}
                                  dataKey="value"
                                >
                                  {pieData.map((entry, i) => (
                                    <Cell key={`cell-${i}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  formatter={(value: number, name: string) => [
                                    `${value} (${stats.total > 0 ? Math.round((value / stats.total) * 100) : 0}%)`,
                                    name
                                  ]}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-primary">{attendanceRate}%</p>
                            <p className="text-[10px] text-muted-foreground">Kehadiran</p>
                          </div>
                          <div className="flex justify-center gap-2 mt-2 text-[10px]">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-green-500" />
                              {stats.hadir}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-yellow-500" />
                              {stats.lewat}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-red-500" />
                              {stats.tidak_hadir}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="h-24 flex items-center justify-center text-xs text-muted-foreground">
                          Tiada data
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Tiada perjumpaan direkodkan</p>
            </CardContent>
          </Card>
        )}

        {/* Students at Risk */}
        {studentsAtRisk.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-4 h-4" />
                Pelajar Berisiko (&lt;70% Kehadiran)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {studentsAtRisk.map((student, index) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{toTitleCase(student.full_name)}</p>
                      <p className="text-xs text-muted-foreground">
                        {student.form_level} {student.class_name.toUpperCase()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600 dark:text-red-400">
                        {student.attendance.percentage}%
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {student.attendance.hadir + student.attendance.lewat}/{student.attendance.total} hadir
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span>Hadir</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-yellow-500" />
            <span>Lewat</span>
          </div>
          <div className="flex items-center gap-1.5">
            <XCircle className="w-4 h-4 text-red-500" />
            <span>Tidak Hadir</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
