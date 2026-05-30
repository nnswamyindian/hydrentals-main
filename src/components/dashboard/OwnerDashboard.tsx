import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import VisitRequestsList from './VisitRequestsList';
import OwnerAnalytics from './OwnerAnalytics';
import {
  Plus,
  Building2,
  LayoutDashboard,
  Settings,
  ArrowRight,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  IndianRupee,
  MessageSquare,
  TrendingUp,
  Users,
  Home,
  Search,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, active: true },
  { name: 'My Properties', href: '/my-properties', icon: <Building2 className="w-5 h-5" /> },
  { name: 'Add Property', href: '/add-property', icon: <Plus className="w-5 h-5" /> },
  { name: 'Messages', href: '/messages', icon: <MessageSquare className="w-5 h-5" /> },
  { name: 'Settings', href: '/settings', icon: <Settings className="w-5 h-5" /> },
];

interface Property {
  id: string;
  title: string;
  locality: string;
  rent: number;
  status: string;
  created_at: string;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  property_id: string;
}

// Type-safe wrapper for supabase queries until types are regenerated
const db = supabase as any;

const OwnerDashboard = () => {
  const { profile, user, roles } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const [propertiesRes, paymentsRes] = await Promise.all([
          db.from('properties').select('id, title, locality, rent, status, created_at').eq('owner_id', user.id).order('created_at', { ascending: false }).limit(10),
          db.from('payments').select('id, amount, status, property_id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        ]);

        if (propertiesRes.data) setProperties(propertiesRes.data as Property[]);
        if (paymentsRes.data) setPayments(paymentsRes.data as Payment[]);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const approvedCount = properties.filter((p) => p.status === 'approved').length;
  const pendingCount = properties.filter((p) => p.status === 'pending').length;
  const rejectedCount = properties.filter((p) => p.status === 'rejected').length;

  const stats = [
    { label: 'Total Properties', value: properties.length, icon: Building2, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { label: 'Active Listings', value: approvedCount, icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-500/10' },
    { label: 'Pending Approval', value: pendingCount, icon: Clock, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
    { label: 'Rejected', value: rejectedCount, icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-500/10' },
  ];

  const isAlsoTenant = roles.includes('tenant');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Live</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout title="Owner Dashboard" subtitle={`Welcome back, ${profile?.full_name || 'Owner'}!`} navigation={navigation}>
      <div className="space-y-6">
        {/* Welcome Banner */}
        <Card className="bg-gradient-to-r from-green-500/10 via-green-500/5 to-transparent border-green-500/20">
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
                <Building2 className="w-7 h-7 text-green-500" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  Property Owner
                  {profile?.is_verified && (
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </h2>
                <p className="text-muted-foreground">
                  List and manage your properties. Reach thousands of tenants in Hyderabad.
                </p>
              </div>
              {isAlsoTenant && (
                <Button asChild variant="outline" size="sm" className="hidden sm:flex">
                  <Link to="/properties">
                    <Search className="w-4 h-4 mr-2" />
                    Search as Tenant
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <div className={`w-8 h-8 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? '...' : stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add Property CTA */}
        <Card className="gradient-hero text-primary-foreground overflow-hidden">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
                <Home className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg">List a New Property</h3>
                <p className="text-primary-foreground/80 text-sm">Reach thousands of verified tenants looking for homes</p>
              </div>
            </div>
            <Button asChild variant="secondary" size="lg" className="shrink-0">
              <Link to="/add-property">
                <Plus className="w-4 h-4 mr-2" />
                Add Property (₹500)
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your property listings</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button asChild variant="outline" className="h-auto py-6 flex-col gap-3 hover:bg-primary/5 hover:border-primary/30">
              <Link to="/add-property">
                <Plus className="w-6 h-6 text-primary" />
                <div className="text-center">
                  <span className="font-semibold block">Add Property</span>
                  <span className="text-xs text-muted-foreground">List a new property</span>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-6 flex-col gap-3 hover:bg-blue-500/5 hover:border-blue-500/30">
              <Link to="/my-properties">
                <Building2 className="w-6 h-6 text-blue-500" />
                <div className="text-center">
                  <span className="font-semibold block">My Properties</span>
                  <span className="text-xs text-muted-foreground">{properties.length} listings</span>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-6 flex-col gap-3 hover:bg-purple-500/5 hover:border-purple-500/30">
              <Link to="/messages">
                <MessageSquare className="w-6 h-6 text-purple-500" />
                <div className="text-center">
                  <span className="font-semibold block">Messages</span>
                  <span className="text-xs text-muted-foreground">Tenant inquiries</span>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-6 flex-col gap-3 hover:bg-emerald-500/5 hover:border-emerald-500/30">
              <Link to="/settings">
                <Settings className="w-6 h-6 text-emerald-500" />
                <div className="text-center">
                  <span className="font-semibold block">Settings</span>
                  <span className="text-xs text-muted-foreground">Account & profile</span>
                </div>
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* My Properties */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                My Properties
              </CardTitle>
              <CardDescription>Manage your property listings</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/my-properties">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : properties.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground font-medium">No properties listed yet</p>
                <p className="text-sm text-muted-foreground mb-4">Start by adding your first property</p>
                <Button asChild>
                  <Link to="/add-property">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Property
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {properties.slice(0, 5).map((property) => (
                  <div key={property.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium">{property.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-muted-foreground">{property.locality}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">₹{property.rent.toLocaleString()}/mo</span>
                      {getStatusBadge(property.status)}
                      <Button size="sm" variant="ghost" asChild>
                        <Link to={`/property/${property.id}`}>
                          <Eye className="w-4 h-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-green-500" />
              Payment History
            </CardTitle>
            <CardDescription>Track your listing fee payments</CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-6">
                <IndianRupee className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-muted-foreground text-sm">No payments yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">Property Listing Fee</p>
                      <p className="text-xs text-muted-foreground">ID: {payment.property_id.slice(0, 8)}...</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">₹{payment.amount}</span>
                      <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                        {payment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Property Analytics */}
        <OwnerAnalytics />

        {/* Visit Requests */}
        <VisitRequestsList role="owner" />

        {/* Tips for Owners */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Tips to Get More Inquiries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Eye className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Add Quality Photos</p>
                  <p className="text-xs text-muted-foreground">Properties with 5+ photos get 3x more views</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Get Verified</p>
                  <p className="text-xs text-muted-foreground">Verified owners get priority in search results</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 text-purple-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Respond Quickly</p>
                  <p className="text-xs text-muted-foreground">Fast responses improve your ranking</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <IndianRupee className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Competitive Pricing</p>
                  <p className="text-xs text-muted-foreground">Research similar properties in your area</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default OwnerDashboard;
