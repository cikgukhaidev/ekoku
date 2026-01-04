import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Setup from "./pages/Setup";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Meetings from "./pages/Meetings";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import ChangePassword from "./pages/ChangePassword";
import Schools from "./pages/Schools";
import AddSchool from "./pages/AddSchool";
import EditSchool from "./pages/EditSchool";
import SchoolHeads from "./pages/SchoolHeads";
import AddSchoolHead from "./pages/AddSchoolHead";
import Teachers from "./pages/Teachers";
import Heads from "./pages/Heads";
import Announcements from "./pages/Announcements";
import AddAnnouncement from "./pages/AddAnnouncement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/students" element={<Students />} />
            <Route path="/meetings" element={<Meetings />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/schools" element={<Schools />} />
            <Route path="/schools/add" element={<AddSchool />} />
            <Route path="/schools/:schoolId/edit" element={<EditSchool />}/>
            <Route path="/schools/:schoolId/heads" element={<SchoolHeads />} />
            <Route path="/schools/:schoolId/heads/add" element={<AddSchoolHead />} />
            <Route path="/teachers" element={<Teachers />} />
            <Route path="/heads" element={<Heads />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/announcements/add" element={<AddAnnouncement />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
