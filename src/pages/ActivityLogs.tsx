import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Check, AlertCircle, Plus, Pencil, Trash2, Upload, Download, RefreshCw, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatMalaysianDateTime, formatLogForCopy } from "@/lib/activityLogger";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

interface ActivityLog {
  id: string;
  user_id: string;
  school_id: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  details: Json | null;
  error_message: string | null;
  created_at: string;
  user_name?: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  create: <Plus className="h-4 w-4" />,
  update: <Pencil className="h-4 w-4" />,
  delete: <Trash2 className="h-4 w-4" />,
  upload: <Upload className="h-4 w-4" />,
  download: <Download className="h-4 w-4" />,
  forward: <RefreshCw className="h-4 w-4" />,
  error: <AlertCircle className="h-4 w-4" />,
};

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  update: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  delete: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  upload: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  download: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
  forward: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const ENTITY_LABELS: Record<string, string> = {
  student: "Pelajar",
  session: "Sesi Akademik",
  announcement: "Pengumuman",
  meeting: "Perjumpaan",
  attendance: "Kehadiran",
  user: "Pengguna",
  settings: "Tetapan",
};

export default function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterEntity, setFilterEntity] = useState<string>("all");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Fetch logs with user names
      const { data: logsData, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      // Fetch user names for the logs
      if (logsData && logsData.length > 0) {
        const userIds = [...new Set(logsData.map(log => log.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        const userMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
        
        const logsWithNames: ActivityLog[] = logsData.map(log => ({
          ...log,
          user_name: userMap.get(log.user_id) || 'Unknown',
        }));

        setLogs(logsWithNames);
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Gagal memuatkan log aktiviti');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (log: ActivityLog) => {
    const text = formatLogForCopy(log);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(log.id);
      toast.success('Log disalin ke clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Gagal menyalin log');
    }
  };

  const handleCopyAll = async () => {
    const filteredLogs = getFilteredLogs();
    const text = filteredLogs
      .map(log => formatLogForCopy(log))
      .join('\n\n---\n\n');
    
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${filteredLogs.length} log disalin ke clipboard`);
    } catch {
      toast.error('Gagal menyalin log');
    }
  };

  const getFilteredLogs = () => {
    return logs.filter(log => {
      if (filterAction !== "all" && log.action_type !== filterAction) return false;
      if (filterEntity !== "all" && log.entity_type !== filterEntity) return false;
      return true;
    });
  };

  const filteredLogs = getFilteredLogs();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Log Aktiviti</h1>
            <p className="text-muted-foreground">
              Rekod aktiviti dan perubahan dalam sistem
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchLogs}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleCopyAll} disabled={filteredLogs.length === 0}>
              <Copy className="mr-2 h-4 w-4" />
              Salin Semua ({filteredLogs.length})
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tapis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Semua Aksi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Aksi</SelectItem>
                  <SelectItem value="create">Cipta</SelectItem>
                  <SelectItem value="update">Kemaskini</SelectItem>
                  <SelectItem value="delete">Padam</SelectItem>
                  <SelectItem value="upload">Muat Naik</SelectItem>
                  <SelectItem value="download">Muat Turun</SelectItem>
                  <SelectItem value="forward">Forward</SelectItem>
                  <SelectItem value="error">Ralat</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterEntity} onValueChange={setFilterEntity}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Semua Entiti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Entiti</SelectItem>
                  <SelectItem value="student">Pelajar</SelectItem>
                  <SelectItem value="session">Sesi Akademik</SelectItem>
                  <SelectItem value="announcement">Pengumuman</SelectItem>
                  <SelectItem value="meeting">Perjumpaan</SelectItem>
                  <SelectItem value="attendance">Kehadiran</SelectItem>
                  <SelectItem value="user">Pengguna</SelectItem>
                  <SelectItem value="settings">Tetapan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Senarai Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mb-2 opacity-50" />
                <p>Tiada log aktiviti</p>
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`flex items-start gap-3 rounded-lg border p-4 ${
                        log.action_type === 'error' ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950' : ''
                      }`}
                    >
                      <div className={`rounded-full p-2 ${ACTION_COLORS[log.action_type] || 'bg-gray-100'}`}>
                        {ACTION_ICONS[log.action_type] || <Activity className="h-4 w-4" />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {ENTITY_LABELS[log.entity_type] || log.entity_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatMalaysianDateTime(log.created_at)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            oleh {log.user_name}
                          </span>
                        </div>
                        
                        <p className="text-sm">{log.description}</p>
                        
                        {log.error_message && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                            Ralat: {log.error_message}
                          </p>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopy(log)}
                        className="shrink-0"
                      >
                        {copiedId === log.id ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
