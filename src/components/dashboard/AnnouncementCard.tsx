import { motion } from 'framer-motion';
import { Megaphone, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ms } from 'date-fns/locale';

interface AnnouncementCardProps {
  title: string;
  content: string;
  createdAt: string;
  isGlobal?: boolean;
  delay?: number;
}

export const AnnouncementCard = ({ 
  title, 
  content, 
  createdAt, 
  isGlobal,
  delay = 0 
}: AnnouncementCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay }}
      className="announcement-card"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <Megaphone className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-foreground">{title}</h4>
            {isGlobal && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                Global
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{content}</p>
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>
              {formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: ms })}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
