import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Calendar, TrendingUp, School, UserCheck, Megaphone } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { AnnouncementCard } from '@/components/dashboard/AnnouncementCard';
import { QuickActionCard } from '@/components/dashboard/QuickActionCard';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const { role, profile } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalMeetings: 0,
    totalMeetingsTarget: 12, // Default, will be fetched from ketua penasihat settings
    attendanceRate: 0,
    totalTeachers: 0,
    totalSchools: 0,
  });
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<{ name?: string; logo_url?: string }>({});

  useEffect(() => {
    const fetchDashboardData = async () => {
      // Fetch school info if user has school_id
      if (profile?.school_id) {
        const { data: school } = await supabase
          .from('schools')
          .select('name, logo_url')
          .eq('id', profile.school_id)
          .maybeSingle();
        
        if (school) {
          setSchoolInfo(school);
        }
      }

      // Fetch announcements
      const { data: announcementData } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      if (announcementData) {
        setAnnouncements(announcementData);
      }

      // Role-specific stats
      if (role === 'guru') {
        const { count: studentCount } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true });

        const { count: meetingCount } = await supabase
          .from('meetings')
          .select('*', { count: 'exact', head: true });

        // Fetch total meetings target configured by ketua penasihat for this school
        let totalMeetingsTarget = 12;
        const { data: targetMeetings, error: targetError } = await supabase.rpc(
          'get_school_total_meetings' as any
        );

        if (!targetError && typeof targetMeetings === 'number') {
          totalMeetingsTarget = targetMeetings;
        }

        setStats(prev => ({
          ...prev,
          totalStudents: studentCount || 0,
          totalMeetings: meetingCount || 0,
          totalMeetingsTarget,
          attendanceRate: 85, // Placeholder
        }));
      }

      if (role === 'ketua_penasihat') {
        // Get profiles in same school
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('school_id', profile?.school_id);

        if (profilesData && profilesData.length > 0) {
          const userIds = profilesData.map(p => p.user_id);
          
          // Count only users with 'guru' role
          const { count: teacherCount } = await supabase
            .from('user_roles')
            .select('*', { count: 'exact', head: true })
            .in('user_id', userIds)
            .eq('role', 'guru');

          setStats(prev => ({
            ...prev,
            totalTeachers: teacherCount || 0,
          }));
        }
      }

      if (role === 'superadmin') {
        const { count: schoolCount } = await supabase
          .from('schools')
          .select('*', { count: 'exact', head: true });

        setStats(prev => ({
          ...prev,
          totalSchools: schoolCount || 0,
        }));
      }
    };

    if (role) {
      fetchDashboardData();
    }
  }, [role, profile]);

  const renderGuruDashboard = () => (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          title="Jumlah Pelajar"
          value={stats.totalStudents}
          icon={<Users className="w-6 h-6" />}
          variant="primary"
          delay={0.1}
        />
        <StatCard
          title="Perjumpaan"
          value={`${stats.totalMeetings}/${stats.totalMeetingsTarget}`}
          icon={<Calendar className="w-6 h-6" />}
          variant="info"
          delay={0.15}
        />
        <StatCard
          title="Kehadiran"
          value={`${stats.attendanceRate}%`}
          icon={<TrendingUp className="w-6 h-6" />}
          variant="success"
          delay={0.2}
        />
      </div>

      <div className="mt-6">
        <h3 className="font-display font-semibold text-lg mb-4">Tindakan Pantas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickActionCard
            icon={<Users className="w-6 h-6" />}
            label="Senarai Pelajar"
            description="Urus pelajar"
            path="/students"
            delay={0.1}
          />
          <QuickActionCard
            icon={<Calendar className="w-6 h-6" />}
            label="Kehadiran"
            description="Ambil kehadiran"
            path="/meetings"
            delay={0.15}
          />
          <QuickActionCard
            icon={<TrendingUp className="w-6 h-6" />}
            label="Laporan"
            description="Cetak laporan"
            path="/reports"
            delay={0.2}
          />
          <QuickActionCard
            icon={<Megaphone className="w-6 h-6" />}
            label="Pengumuman"
            description="Lihat semua"
            path="/announcements"
            delay={0.25}
          />
        </div>
      </div>
    </>
  );

  const renderKetuaDashboard = () => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title="Jumlah Guru"
          value={stats.totalTeachers}
          icon={<UserCheck className="w-6 h-6" />}
          variant="primary"
          delay={0.1}
        />
        <StatCard
          title="Pengumuman"
          value={announcements.length}
          icon={<Megaphone className="w-6 h-6" />}
          variant="info"
          delay={0.15}
        />
      </div>

      <div className="mt-6">
        <h3 className="font-display font-semibold text-lg mb-4">Tindakan Pantas</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <QuickActionCard
            icon={<UserCheck className="w-6 h-6" />}
            label="Urus Guru"
            description="Tambah/edit guru"
            path="/teachers"
            delay={0.1}
          />
          <QuickActionCard
            icon={<Megaphone className="w-6 h-6" />}
            label="Pengumuman"
            description="Buat pengumuman"
            path="/announcements"
            delay={0.15}
          />
          <QuickActionCard
            icon={<TrendingUp className="w-6 h-6" />}
            label="Laporan"
            description="Lihat statistik"
            path="/reports"
            delay={0.2}
          />
        </div>
      </div>
    </>
  );

  const renderSuperadminDashboard = () => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title="Jumlah Sekolah"
          value={stats.totalSchools}
          icon={<School className="w-6 h-6" />}
          variant="primary"
          delay={0.1}
        />
        <StatCard
          title="Pengumuman"
          value={announcements.length}
          icon={<Megaphone className="w-6 h-6" />}
          variant="info"
          delay={0.15}
        />
      </div>

      <div className="mt-6">
        <h3 className="font-display font-semibold text-lg mb-4">Tindakan Pantas</h3>
        <div className="grid grid-cols-2 gap-4">
          <QuickActionCard
            icon={<School className="w-6 h-6" />}
            label="Urus Sekolah"
            description="Tambah sekolah"
            path="/schools"
            delay={0.1}
          />
          <QuickActionCard
            icon={<Megaphone className="w-6 h-6" />}
            label="Pengumuman"
            description="Buat pengumuman"
            path="/announcements"
            delay={0.15}
          />
        </div>
      </div>
    </>
  );

  return (
    <DashboardLayout>
      {/* Mobile Header */}
      <div className="md:hidden">
        <DashboardHeader 
          schoolLogo={schoolInfo.logo_url} 
          schoolName={schoolInfo.name} 
        />
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block p-6 border-b border-border">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="font-display text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Selamat datang kembali, {profile?.full_name}
            </p>
          </div>
          {schoolInfo.logo_url && (
            <img 
              src={schoolInfo.logo_url} 
              alt="Logo" 
              className="w-12 h-12 rounded-full object-cover"
            />
          )}
        </motion.div>
      </div>

      <div className="p-4 md:p-6">
        {role === 'guru' && renderGuruDashboard()}
        {role === 'ketua_penasihat' && renderKetuaDashboard()}
        {role === 'superadmin' && renderSuperadminDashboard()}

        {/* Announcements Section */}
        {announcements.length > 0 && (
          <div className="mt-6">
            <h3 className="font-display font-semibold text-lg mb-4">Pengumuman Terkini</h3>
            <div className="space-y-3">
              {announcements.map((announcement, index) => (
                <AnnouncementCard
                  key={announcement.id}
                  title={announcement.title}
                  content={announcement.content}
                  createdAt={announcement.created_at}
                  isGlobal={announcement.is_global}
                  delay={0.1 + index * 0.05}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
