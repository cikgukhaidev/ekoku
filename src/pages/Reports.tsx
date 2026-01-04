import { motion } from 'framer-motion';
import { FileText, Download } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';

const Reports = () => {
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
            Jana dan cetak laporan kehadiran
          </p>
        </motion.div>
      </div>

      <div className="p-4 md:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-semibold text-lg">Laporan Kehadiran</h3>
          <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
            Jana laporan akhir tahun dengan maklumat lengkap pelajar, 
            kehadiran setiap perjumpaan, dan statistik
          </p>
          <Button className="mt-6" disabled>
            <Download className="w-4 h-4 mr-2" />
            Muat Turun PDF
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Fungsi ini akan diaktifkan apabila terdapat data perjumpaan
          </p>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
