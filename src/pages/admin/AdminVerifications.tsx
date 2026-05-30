import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Shield,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  CreditCard,
  UserCheck,
  UserX,
  Users,
  Download,
} from 'lucide-react';
import { downloadAsCSV } from '@/lib/utils';

interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  aadhaar_masked: string | null;
  is_verified: boolean;
  verification_status: string;
  created_at: string;
}

const db = supabase as any;

const AdminVerifications = () => {
  const { toast } = useToast();
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await db
        .from('profiles_admin_verification')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllUsers(data as Profile[]);
    } catch (error) {
      console.error('Error fetching verifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      const { error } = await db
        .from('profiles')
        .update({ is_verified: true, verification_status: 'verified' })
        .eq('id', userId);

      if (error) throw error;

      setAllUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, is_verified: true, verification_status: 'verified' } : u
        )
      );
      toast({ title: 'User verified', description: 'The user has been verified successfully.' });
    } catch (error) {
      console.error('Error verifying user:', error);
      toast({ title: 'Error', description: 'Failed to verify user.', variant: 'destructive' });
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const { error } = await db
        .from('profiles')
        .update({ is_verified: false, verification_status: 'rejected' })
        .eq('id', userId);

      if (error) throw error;

      setAllUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, is_verified: false, verification_status: 'rejected' } : u
        )
      );
      toast({ title: 'Verification rejected', description: 'The user has been notified.' });
    } catch (error) {
      console.error('Error rejecting verification:', error);
      toast({ title: 'Error', description: 'Failed to reject verification.', variant: 'destructive' });
    }
  };

  const handleRevoke = async (userId: string) => {
    try {
      const { error } = await db
        .from('profiles')
        .update({ is_verified: false, verification_status: 'pending' })
        .eq('id', userId);

      if (error) throw error;

      setAllUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, is_verified: false, verification_status: 'pending' } : u
        )
      );
      toast({ title: 'Verification revoked', description: 'User moved back to pending.' });
    } catch (error) {
      console.error('Error revoking verification:', error);
      toast({ title: 'Error', description: 'Failed to revoke verification.', variant: 'destructive' });
    }
  };

  const pending = allUsers.filter((u) => u.verification_status === 'pending');
  const verified = allUsers.filter((u) => u.verification_status === 'verified');
  const rejected = allUsers.filter((u) => u.verification_status === 'rejected');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const renderUserCard = (user: Profile) => (
    <div
      key={user.id}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-border bg-card"
    >
      <div className="flex items-center gap-4">
        <Avatar className="w-12 h-12">
          <AvatarImage src={user.avatar_url || undefined} />
          <AvatarFallback>
            {user.full_name?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-medium">{user.full_name || 'Unknown'}</h3>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {user.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {user.phone}
              </span>
            )}
            {user.aadhaar_masked && (
              <span className="flex items-center gap-1">
                <CreditCard className="w-3 h-3" />
                Aadhaar: {user.aadhaar_masked}
              </span>
            )}
          </div>
          <div className="mt-1">{getStatusBadge(user.verification_status)}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {user.verification_status === 'pending' && (
          <>
            <Button size="sm" variant="outline" onClick={() => handleReject(user.id)}>
              <XCircle className="w-4 h-4 mr-1" />
              Reject
            </Button>
            <Button size="sm" onClick={() => handleApprove(user.id)}>
              <CheckCircle className="w-4 h-4 mr-1" />
              Verify
            </Button>
          </>
        )}
        {user.verification_status === 'verified' && (
          <Button size="sm" variant="outline" onClick={() => handleRevoke(user.id)}>
            <XCircle className="w-4 h-4 mr-1" />
            Revoke
          </Button>
        )}
        {user.verification_status === 'rejected' && (
          <Button size="sm" onClick={() => handleApprove(user.id)}>
            <CheckCircle className="w-4 h-4 mr-1" />
            Approve
          </Button>
        )}
      </div>
    </div>
  );

  const renderEmpty = (message: string) => (
    <div className="text-center py-12">
      <CheckCircle className="w-16 h-16 mx-auto text-green-500/50 mb-4" />
      <p className="text-muted-foreground text-lg">{message}</p>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
          <div>
            <Button variant="ghost" asChild className="mb-4">
              <Link to="/admin/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <h1 className="font-display text-3xl font-bold">User Verifications</h1>
            <p className="text-muted-foreground">Review and manage all user verification statuses</p>
          </div>
          <Button variant="outline" onClick={() => downloadAsCSV(allUsers, 'verifications_data.csv')} disabled={allUsers.length === 0} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Download Data
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="cursor-pointer hover:border-amber-500/50 transition-colors" onClick={() => setActiveTab('pending')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pending.length}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-green-500/50 transition-colors" onClick={() => setActiveTab('verified')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{verified.length}</p>
                <p className="text-sm text-muted-foreground">Verified</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-destructive/50 transition-colors" onClick={() => setActiveTab('rejected')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <UserX className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rejected.length}</p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              All Users ({allUsers.length})
            </CardTitle>
            <CardDescription>Manage user verification across all statuses</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading...</p>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="pending" className="gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Pending ({pending.length})
                  </TabsTrigger>
                  <TabsTrigger value="verified" className="gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Verified ({verified.length})
                  </TabsTrigger>
                  <TabsTrigger value="rejected" className="gap-1">
                    <XCircle className="w-3.5 h-3.5" />
                    Rejected ({rejected.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="pending">
                  {pending.length === 0
                    ? renderEmpty('No pending verifications!')
                    : <div className="space-y-4">{pending.map(renderUserCard)}</div>}
                </TabsContent>

                <TabsContent value="verified">
                  {verified.length === 0
                    ? renderEmpty('No verified users yet.')
                    : <div className="space-y-4">{verified.map(renderUserCard)}</div>}
                </TabsContent>

                <TabsContent value="rejected">
                  {rejected.length === 0
                    ? renderEmpty('No rejected verifications.')
                    : <div className="space-y-4">{rejected.map(renderUserCard)}</div>}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default AdminVerifications;