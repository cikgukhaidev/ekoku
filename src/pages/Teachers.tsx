import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const Teachers = () => {
  return (
    <DashboardLayout>
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-border">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-xl md:text-2xl font-bold">Pengurusan Guru</h1>
          <p className="text-sm text-muted-foreground">
            Urus guru penasihat di bawah kelolaan
          </p>
        </motion.div>
      </div>

      <div className="p-4 md:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg">Tiada Guru</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Tambah guru pertama melalui butang FAB
          </p>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Teachers;
