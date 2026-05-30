import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Users,
  Building2,
  LayoutDashboard,
  Settings,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  TrendingUp,
  AlertTriangle,
  Eye,
  UserCheck,
  FileCheck,
  IndianRupee,
  MessageSquare,
  BarChart3,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, active: true },
  { name: 'Properties', href: '/admin/properties', icon: <Building2 className="w-5 h-5" /> },
  { name: 'Users', href: '/admin/users', icon: <Users className="w-5 h-5" /> },
  { name: 'Verifications', href: '/admin/verifications', icon: <Shield className="w-5 h-5" /> },
  { name: 'Complaints', href: '/admin/complaints', icon: <AlertTriangle className="w-5 h-5" /> },
  { name: 'Settings', href: '/admin/settings', icon: <Settings className="w-5 h-5" /> },
];

interface Property {
  id: string;
  title: string;
  locality: string;
  status: string;
  owner_id: string;
  created_at: string;
  rent: number;
}

interface Stats {
  totalUsers: number;
  totalProperties: number;
  pendingProperties: number;
  pendingVerifications: number;
  approvedProperties: number;
  totalOwners: number;
  totalTenants: number;
}

interface LocalityData {
  locality: string;
  count: number;
}

interface DailyData {
  date: string;
  count: number;
}

// Type-safe wrapper for supabase queries until types are regenerated
const db = supabase as any;

const AdminDashboard = () => {
  const { profile } = useAuth();
  const [pendingProperties, setPendingProperties] = useState<Property[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalProperties: 0,
    pendingProperties: 0,
    pendingVerifications: 0,
    approvedProperties: 0,
    totalOwners: 0,
    totalTenants: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [localityData, setLocalityData] = useState<LocalityData[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, propertiesRes, pendingPropsRes, pendingVerifRes, approvedPropsRes, ownersRes, tenantsRes] = await Promise.all([
          db.from('profiles').select('id', { count: 'exact', head: true }),
          db.from('properties').select('id', { count: 'exact', head: true }),
          db.from('properties').select('*').eq('status', 'pending').order('created_at', { ascending: false }).limit(10),
          db.from('profiles').select('id', { count: 'exact', head: true }).eq('verification_status', 'pending'),
          db.from('properties').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
          db.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'owner'),
          db.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'tenant'),
        ]);

        setStats({
          totalUsers: usersRes.count || 0,
          totalProperties: propertiesRes.count || 0,
          pendingProperties: pendingPropsRes.data?.length || 0,
          pendingVerifications: pendingVerifRes.count || 0,
          approvedProperties: approvedPropsRes.count || 0,
          totalOwners: ownersRes.count || 0,
          totalTenants: tenantsRes.count || 0,
        });

        if (pendingPropsRes.data) setPendingProperties(pendingPropsRes.data as Property[]);

        // Fetch locality distribution
        const { data: allProps } = await db.from('properties').select('locality, created_at');
        if (allProps) {
          const localityCounts: Record<string, number> = {};
          const dailyCounts: Record<string, number> = {};
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          (allProps as any[]).forEach((p: any) => {
            localityCounts[p.locality] = (localityCounts[p.locality] || 0) + 1;
            if (p.created_at && new Date(p.created_at) >= thirtyDaysAgo) {
              const day = new Date(p.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
              dailyCounts[day] = (dailyCounts[day] || 0) + 1;
            }
          });

          setLocalityData(
            Object.entries(localityCounts)
              .map(([locality, count]) => ({ locality, count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 10)
          );
          setDailyData(Object.entries(dailyCounts).map(([date, count]) => ({ date, count })));
        }
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleApproveProperty = async (propertyId: string) => {
    try {
      const { error } = await db
        .from('properties')
        .update({ status: 'approved' })
        .eq('id', propertyId);

      if (!error) {
        setPendingProperties((prev) => prev.filter((p) => p.id !== propertyId));
        setStats((prev) => ({ 
          ...prev, 
          pendingProperties: prev.pendingProperties - 1,
          approvedProperties: prev.approvedProperties + 1 
        }));
      }
    } catch (error) {
      console.error('Error approving property:', error);
    }
  };

  const handleRejectProperty = async (propertyId: string) => {
    try {
      const { error } = await db
        .from('properties')
        .update({ status: 'rejected' })
        .eq('id', propertyId);

      if (!error) {
        setPendingProperties((prev) => prev.filter((p) => p.id !== propertyId));
        setStats((prev) => ({ ...prev, pendingProperties: prev.pendingProperties - 1 }));
      }
    } catch (error) {
      console.error('Error rejecting property:', error);
    }
  };

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { label: 'Total Properties', value: stats.totalProperties, icon: Building2, color: 'text-green-500', bgColor: 'bg-green-500/10' },
    { label: 'Pending Approvals', value: stats.pendingProperties, icon: Clock, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
    { label: 'Pending Verifications', value: stats.pendingVerifications, icon: Shield, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  ];

  const secondaryStats = [
    { label: 'Active Listings', value: stats.approvedProperties, icon: CheckCircle, color: 'text-emerald-500' },
    { label: 'Property Owners', value: stats.totalOwners, icon: Building2, color: 'text-indigo-500' },
    { label: 'Tenants', value: stats.totalTenants, icon: Users, color: 'text-cyan-500' },
  ];

  return (
    <DashboardLayout 
      title="Admin Dashboard" 
      subtitle={`Welcome, ${profile?.full_name || 'Admin'}! Manage the HydRent platform.`} 
      navigation={navigation}
    >
      <div className="space-y-6">
        {/* Admin Welcome Banner */}
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Admin Control Panel</h2>
                <p className="text-muted-foreground">
                  You have full access to manage properties, users, and platform settings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Primary Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.label} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <div className={`w-8 h-8 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{isLoading ? '...' : stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Secondary Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          {secondaryStats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 py-4">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <div>
                  <p className="text-2xl font-bold">{isLoading ? '...' : stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pending Properties Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Pending Property Approvals
              </CardTitle>
              <CardDescription>Review and approve new property listings</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/properties?status=pending">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : pendingProperties.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500/50 mb-3" />
                <p className="text-muted-foreground font-medium">All caught up!</p>
                <p className="text-sm text-muted-foreground">No pending property approvals</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingProperties.slice(0, 5).map((property) => (
                  <div key={property.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium">{property.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-muted-foreground">{property.locality}</span>
                        <Badge variant="secondary">₹{property.rent?.toLocaleString()}/mo</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/property/${property.id}`}>
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleRejectProperty(property.id)}>
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                      <Button size="sm" onClick={() => handleApproveProperty(property.id)}>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button asChild variant="outline" className="h-auto py-6 flex-col gap-3 hover:bg-primary/5 hover:border-primary/30">
              <Link to="/admin/properties">
                <Building2 className="w-6 h-6 text-primary" />
                <div className="text-center">
                  <span className="font-semibold block">Manage Properties</span>
                  <span className="text-xs text-muted-foreground">View & moderate listings</span>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-6 flex-col gap-3 hover:bg-blue-500/5 hover:border-blue-500/30">
              <Link to="/admin/users">
                <Users className="w-6 h-6 text-blue-500" />
                <div className="text-center">
                  <span className="font-semibold block">Manage Users</span>
                  <span className="text-xs text-muted-foreground">View roles & profiles</span>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-6 flex-col gap-3 hover:bg-purple-500/5 hover:border-purple-500/30">
              <Link to="/admin/verifications">
                <UserCheck className="w-6 h-6 text-purple-500" />
                <div className="text-center">
                  <span className="font-semibold block">Verify Users</span>
                  <span className="text-xs text-muted-foreground">Review ID documents</span>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-6 flex-col gap-3 hover:bg-emerald-500/5 hover:border-emerald-500/30">
              <Link to="/admin/settings">
                <Settings className="w-6 h-6 text-emerald-500" />
                <div className="text-center">
                  <span className="font-semibold block">Platform Settings</span>
                  <span className="text-xs text-muted-foreground">Configure platform</span>
                </div>
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Analytics Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Listings by Locality
              </CardTitle>
            </CardHeader>
            <CardContent>
              {localityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={localityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="locality" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={80} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-12">No data yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                New Listings (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-12">No data yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* System Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Platform Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <FileCheck className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">Approval Rate</span>
                </div>
                <p className="text-2xl font-bold">
                  {stats.totalProperties > 0 
                    ? Math.round((stats.approvedProperties / stats.totalProperties) * 100) 
                    : 0}%
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">User Distribution</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {stats.totalTenants} Tenants • {stats.totalOwners} Owners
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium">Pending Actions</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {stats.pendingProperties} Properties • {stats.pendingVerifications} Verifications
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium">Platform Status</span>
                </div>
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                  <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                  Operational
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
