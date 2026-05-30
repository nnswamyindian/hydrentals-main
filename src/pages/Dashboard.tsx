import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import TenantDashboard from '@/components/dashboard/TenantDashboard';
import OwnerDashboard from '@/components/dashboard/OwnerDashboard';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import { Loader2 } from 'lucide-react';

const Dashboard = () => {
  const { user, roles, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Render dashboard based on primary role (admin > owner > tenant)
  if (roles.includes('admin')) {
    return <AdminDashboard />;
  }

  if (roles.includes('owner')) {
    return <OwnerDashboard />;
  }

  return <TenantDashboard />;
};

export default Dashboard;
