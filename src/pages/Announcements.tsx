import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Megaphone, Plus } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AnnouncementCard } from '@/components/dashboard/AnnouncementCard';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const Announcements = () => {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAnnouncements(data);
      }
      setLoading(false);
    };

    fetchAnnouncements();
  }, []);

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
            <h1 className="font-display text-xl md:text-2xl font-bold">Pengumuman</h1>
            <p className="text-sm text-muted-foreground">
              Semua pengumuman dalam sistem
            </p>
          </div>
        </motion.div>
      </div>

      <div className="p-4 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : announcements.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg">Tiada Pengumuman</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Belum ada pengumuman
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement, index) => (
              <AnnouncementCard
                key={announcement.id}
                title={announcement.title}
                content={announcement.content}
                createdAt={announcement.created_at}
                isGlobal={announcement.is_global}
                delay={index * 0.05}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Announcements;
