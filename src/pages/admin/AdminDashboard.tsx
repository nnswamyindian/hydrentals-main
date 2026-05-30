import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Users, Building2, AlertTriangle, Settings, FileCheck, ArrowRight, Activity, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    newSignups: 0,
    totalProperties: 0,
    pendingVerifications: 0,
    openComplaints: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, newUsersRes, propsRes, verifRes, compRes] = await Promise.all([
          db.from('profiles').select('id', { count: 'exact' }),
          db.from('profiles').select('id', { count: 'exact' }).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
          db.from('properties').select('id', { count: 'exact' }),
          db.from('profiles').select('id', { count: 'exact' }).eq('is_verified', false),
          db.from('complaints').select('id', { count: 'exact' }).eq('status', 'open'),
        ]);

        setStats({
          totalUsers: usersRes.count || usersRes.data?.length || 0,
          newSignups: newUsersRes.count || newUsersRes.data?.length || 0,
          totalProperties: propsRes.count || propsRes.data?.length || 0,
          pendingVerifications: verifRes.count || verifRes.data?.length || 0,
          openComplaints: compRes.count || compRes.data?.length || 0,
        });
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const adminModules = [
    {
      title: 'User Management',
      description: 'Full CRUD control over user accounts and signups.',
      icon: Users,
      href: '/admin/users',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Property Listings',
      description: 'Manage all listed properties and approvals.',
      icon: Building2,
      href: '/admin/properties',
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10',
    },
    {
      title: 'Verification Queue',
      description: 'Review and approve pending user identities.',
      icon: FileCheck,
      href: '/admin/verifications',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Complaints & Reports',
      description: 'Handle user reports and property complaints.',
      icon: AlertTriangle,
      href: '/admin/complaints',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      title: 'Global Settings',
      description: 'Configure platform fees, rules, and APIs.',
      icon: Settings,
      href: '/admin/settings',
      color: 'text-zinc-500',
      bgColor: 'bg-zinc-500/10',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                <Shield className="w-3 h-3 mr-1" />
                Administrator Privileges Active
              </Badge>
            </div>
            <h1 className="font-display text-4xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">Platform overview and management modules</p>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-10">
          <Card className="bg-card/50 backdrop-blur border-border/50 transition-all hover:bg-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Users</p>
                  <p className="text-2xl font-bold">{isLoading ? '-' : stats.totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 backdrop-blur border-border/50 transition-all hover:bg-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">New (7d)</p>
                  <p className="text-2xl font-bold">{isLoading ? '-' : stats.newSignups}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-border/50 transition-all hover:bg-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Properties</p>
                  <p className="text-2xl font-bold">{isLoading ? '-' : stats.totalProperties}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 backdrop-blur border-border/50 transition-all hover:bg-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Pending Docs</p>
                  <p className="text-2xl font-bold">{isLoading ? '-' : stats.pendingVerifications}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-border/50 transition-all hover:bg-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Complaints</p>
                  <p className="text-2xl font-bold">{isLoading ? '-' : stats.openComplaints}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <h2 className="font-display text-2xl font-bold mb-6 flex items-center gap-2">
          Management Modules
        </h2>

        {/* Modules Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminModules.map((mod) => (
            <Card key={mod.title} className="group hover:border-primary/50 transition-all overflow-hidden flex flex-col">
              <CardHeader className="pb-4 border-b border-border/50 bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${mod.bgColor} ${mod.color}`}>
                    <mod.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{mod.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 flex-1 flex flex-col justify-between">
                <CardDescription className="text-base text-muted-foreground mb-6">
                  {mod.description}
                </CardDescription>
                <Button asChild variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all">
                  <Link to={mod.href}>
                    Manage System <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

// Add minimal Badge locally since it might not be imported from components
import { Badge } from '@/components/ui/badge';

export default AdminDashboard;
