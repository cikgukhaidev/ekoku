import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const Heads = () => {
  return (
    <DashboardLayout>
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-border">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-xl md:text-2xl font-bold">Ketua Penasihat</h1>
          <p className="text-sm text-muted-foreground">
            Urus ketua penasihat sekolah
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
          <h3 className="font-semibold text-lg">Tiada Ketua Penasihat</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Tambah ketua penasihat melalui butang FAB
          </p>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Heads;
