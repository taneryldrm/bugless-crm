import { Routes, Route, Navigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import { Loader2 } from 'lucide-react';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import Clients from './pages/Clients';
import Projects from './pages/Projects';
import Staff from './pages/Staff';
import Proposals from './pages/Proposals';
import WorkOrders from './pages/WorkOrders';
import CalendarPage from './pages/Calendar';
import Finance from './pages/Finance';
import IncomeExpense from './pages/IncomeExpense';
import Collections from './pages/Collections';
import ExternalTasks from './pages/ExternalTasks';
import GlobalSearch from './pages/GlobalSearch';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import MeetingNotes from './pages/MeetingNotes';

import PublicProposalView from './pages/public/PublicProposalView';

import Login from './pages/Login';

const ProtectedRoute = ({ children }) => {
  const { session, loading } = useSupabaseAuth(); // Use the hook

  if (loading) {
      return (
        <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-slate-950">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
  }
  
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/proposal/:token" element={<PublicProposalView />} />
      <Route path="/" element={
          <ProtectedRoute>
             <MainLayout />
          </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="clients" element={<Clients />} />
        <Route path="projects" element={<Projects />} />
        <Route path="proposals" element={<Proposals />} />
        <Route path="staff" element={<Staff />} />
        <Route path="work-orders" element={<WorkOrders />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="finance" element={<Finance />} />
        <Route path="income-expense" element={<IncomeExpense />} />
        <Route path="collections" element={<Collections />} />
        <Route path="external-tasks" element={<ExternalTasks />} />
        <Route path="reports" element={<Reports />} />
        <Route path="meeting-notes" element={<MeetingNotes />} />

        <Route path="search" element={<GlobalSearch />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
