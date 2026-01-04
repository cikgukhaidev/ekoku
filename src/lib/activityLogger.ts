import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type ActionType = 'create' | 'update' | 'delete' | 'upload' | 'download' | 'error' | 'forward';
export type EntityType = 'student' | 'session' | 'announcement' | 'meeting' | 'attendance' | 'user' | 'settings' | 'school';

interface LogActivityParams {
  actionType: ActionType;
  entityType: EntityType;
  entityId?: string;
  description: string;
  details?: Json;
  errorMessage?: string;
}

export async function logActivity({
  actionType,
  entityType,
  entityId,
  description,
  details,
  errorMessage,
}: LogActivityParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get user's school_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('user_id', user.id)
      .single();

    await supabase.from('activity_logs').insert([{
      user_id: user.id,
      school_id: profile?.school_id || null,
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId || null,
      description,
      details: details || null,
      error_message: errorMessage || null,
    }]);
  } catch (error) {
    // Silently fail to avoid disrupting the main flow
    console.error('Failed to log activity:', error);
  }
}

// Helper function to format date in Malaysian timezone
export function formatMalaysianDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('ms-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

// Format log entry for copying
export function formatLogForCopy(log: {
  created_at: string;
  action_type: string;
  entity_type: string;
  description: string;
  error_message?: string | null;
  user_name?: string;
}): string {
  const timestamp = formatMalaysianDateTime(log.created_at);
  const action = log.action_type.toUpperCase();
  const entity = log.entity_type;
  const error = log.error_message ? `\nRalat: ${log.error_message}` : '';
  const user = log.user_name ? ` (${log.user_name})` : '';
  
  return `[${timestamp}] ${action} - ${entity}${user}\n${log.description}${error}`;
}
