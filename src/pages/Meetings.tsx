import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle2, Clock } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { format } from 'date-fns';
import { ms } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Meeting {
  id: string;
  meeting_number: number;
  meeting_date: string;
  notes: string | null;
  is_completed: boolean;
}

interface AttendanceStats {
  hadir: number;
  lewat: number;
  tidak_hadir: number;
}

const Meetings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<Record<string, AttendanceStats>>({});
  const [loading, setLoading] = useState(true);
  const [totalMeetings, setTotalMeetings] = useState(12);

  const fetchTotalMeetings = async () => {
    // Use RPC function to get total meetings from ketua_penasihat settings
    const { data, error } = await supabase.rpc('get_school_total_meetings' as any);
    
    if (!error && data) {
      setTotalMeetings(data as number);
    }
  };

  const fetchMeetings = async () => {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .order('meeting_number', { ascending: true });

    if (!error && data) {
      setMeetings(data);
      
      // Fetch attendance stats for each meeting
      const statsMap: Record<string, AttendanceStats> = {};
      for (const meeting of data) {
        const { data: attendanceData } = await supabase
          .from('attendance')
          .select('status')
          .eq('meeting_id', meeting.id);
        
        if (attendanceData) {
          statsMap[meeting.id] = {
            hadir: attendanceData.filter(a => a.status === 'hadir').length,
            lewat: attendanceData.filter(a => a.status === 'lewat').length,
            tidak_hadir: attendanceData.filter(a => a.status === 'tidak_hadir').length,
          };
        }
      }
      setAttendanceStats(statsMap);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTotalMeetings();
    fetchMeetings();
  }, [user]);

  const getMeetingForNumber = (num: number) => {
    return meetings.find(m => m.meeting_number === num);
  };

  const completedCount = meetings.filter(m => m.is_completed).length;

  // Generate slots based on total meetings
  const meetingSlots = Array.from({ length: totalMeetings }, (_, i) => i + 1);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-border">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-xl md:text-2xl font-bold">Perjumpaan</h1>
          <p className="text-sm text-muted-foreground">
            {completedCount}/{totalMeetings} perjumpaan selesai
          </p>
        </motion.div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 md:px-6 pt-4">
        <div className="bg-muted rounded-full h-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(completedCount / totalMeetings) * 100}%` }}
            transition={{ duration: 0.5 }}
            className="bg-primary h-full rounded-full"
          />
        </div>
      </div>

      {/* Meetings Grid */}
      <div className="p-4 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {meetingSlots.map((num, index) => {
              const meeting = getMeetingForNumber(num);
              const stats = meeting ? attendanceStats[meeting.id] : null;
              const isCompleted = meeting?.is_completed;
              const hasData = !!meeting;
              
              return (
                <motion.button
                  key={num}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => navigate(`/meetings/${num}`)}
                  className={cn(
                    "relative aspect-square rounded-xl p-3 flex flex-col items-center justify-center transition-all",
                    "border hover:shadow-md hover:border-primary/50",
                    isCompleted 
                      ? "bg-primary/10 border-primary/30" 
                      : hasData 
                        ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800" 
                        : "bg-card border-border hover:bg-muted/50"
                  )}
                >
                  {/* Status Icon */}
                  {isCompleted && (
                    <div className="absolute top-1.5 right-1.5">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  {hasData && !isCompleted && (
                    <div className="absolute top-1.5 right-1.5">
                      <Clock className="w-4 h-4 text-yellow-600" />
                    </div>
                  )}

                  {/* Meeting Number */}
                  <span className={cn(
                    "text-xl md:text-2xl font-display font-bold",
                    isCompleted ? "text-primary" : hasData ? "text-yellow-700 dark:text-yellow-400" : "text-muted-foreground"
                  )}>
                    {num}
                  </span>

                  {/* Date or Status */}
                  {meeting ? (
                    <span className="text-[10px] text-muted-foreground mt-1 text-center leading-tight">
                      {format(new Date(meeting.meeting_date), 'd MMM', { locale: ms })}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground mt-1">
                      Kosong
                    </span>
                  )}

                  {/* Attendance mini stats */}
                  {stats && (stats.hadir > 0 || stats.lewat > 0 || stats.tidak_hadir > 0) && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[9px] text-green-600">{stats.hadir}</span>
                      <span className="text-[9px] text-muted-foreground">/</span>
                      <span className="text-[9px] text-red-600">{stats.tidak_hadir}</span>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-primary/10 border border-primary/30" />
            <span>Selesai</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-yellow-50 border border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800" />
            <span>Draf</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-card border border-border" />
            <span>Belum isi</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Meetings;
