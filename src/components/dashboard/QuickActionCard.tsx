import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface QuickActionCardProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  path: string;
  delay?: number;
}

export const QuickActionCard = ({ 
  icon, 
  label, 
  description, 
  path, 
  delay = 0 
}: QuickActionCardProps) => {
  const navigate = useNavigate();

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(path)}
      className="quick-action text-left w-full"
    >
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2">
        {icon}
      </div>
      <h4 className="font-semibold text-sm text-foreground">{label}</h4>
      {description && (
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      )}
    </motion.button>
  );
};
