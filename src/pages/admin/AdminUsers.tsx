import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase, getApiUrl } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Search, ArrowLeft, CheckCircle, Shield, Phone, Mail, Edit, Trash2, Plus, AlertTriangle, Download } from 'lucide-react';
import { downloadAsCSV } from '@/lib/utils';

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  verification_status: string;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: string;
}

interface UserWithRoles extends Profile {
  roles: string[];
}

const db = supabase as any;

const AdminUsers = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  // Selected User state
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'tenant',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const [profilesRes, rolesRes] = await Promise.all([
        db.from('profiles').select('*').order('created_at', { ascending: false }),
        db.from('user_roles').select('user_id, role'),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const roles = rolesRes.data as any[];
      const usersWithRoles = (profilesRes.data as any[]).map((profile) => {
        let userRoles = roles.filter((r) => (r.user_id || r.id) === profile.id).map((r) => r.role);
        if (userRoles.length === 0 && profile.role) {
          userRoles = [profile.role];
        }
        return {
          ...profile,
          roles: userRoles.length > 0 ? userRoles : ['tenant'],
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({ title: 'Error', description: 'Failed to fetch user list.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (userId: string) => {
    try {
      const { error } = await db
        .from('profiles')
        .update({ is_verified: true, verification_status: 'verified' })
        .eq('id', userId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => u.id === userId ? { ...u, is_verified: true, verification_status: 'verified' } : u)
      );
      toast({ title: 'User verified', description: 'The user has been manually verified.' });
    } catch (error) {
      console.error('Error verifying user:', error);
      toast({ title: 'Error', description: 'Failed to verify user.', variant: 'destructive' });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(getApiUrl('/api/auth/admin-create-user'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase-auth-token')}`
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          phone: formData.phone,
          role: formData.role
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');

      toast({ title: 'User Created', description: `Successfully created ${formData.role} account.` });
      setIsCreateOpen(false);
      setFormData({ name: '', email: '', phone: '', password: '', role: 'tenant' });
      fetchUsers(); // Refresh list to get new user with ID
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({ title: 'Creation Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      // Note: role lives in users table but alias profiles update will handle it seamlessly due to rest.js map
      const { error } = await db.from('profiles').update({
        full_name: formData.name,
        phone: formData.phone,
        role: formData.role
      }).eq('id', selectedUser.id);

      if (error) throw error;

      toast({ title: 'User Updated', description: 'Profile details modified successfully.' });
      setIsEditOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      const { error } = await db.from('profiles').delete().eq('id', selectedUser.id);
      if (error) throw error;

      toast({ title: 'User Deleted', description: 'User and all related data removed successfully.' });
      setIsDeleteOpen(false);
      setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({ title: 'Deletion Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (user: UserWithRoles) => {
    setSelectedUser(user);
    setFormData({
      name: user.full_name || '',
      email: user.email || '',
      phone: user.phone || '',
      password: '',
      role: user.roles[0] || 'tenant'
    });
    setIsEditOpen(true);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">Admin</Badge>;
      case 'subadmin':
        return <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20">Sub Admin</Badge>;
      case 'owner':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Owner</Badge>;
      case 'tenant':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Tenant</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone?.includes(searchQuery)
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
            <h1 className="font-display text-3xl font-bold">Manage Users</h1>
            <p className="text-muted-foreground mt-1">Full CRUD access to platform accounts</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => downloadAsCSV(filteredUsers, 'users_data.csv')} disabled={filteredUsers.length === 0} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download Data
            </Button>
            <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create User
            </Button>
          </div>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Users Database ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading users database...</p>
            ) : filteredUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No matching records found.</p>
            ) : (
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-lg border border-border bg-card hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-start lg:items-center gap-4">
                      <Avatar className="w-12 h-12 mt-1 lg:mt-0">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>
                          {user.full_name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{user.full_name || 'Unknown'}</h3>
                          {user.is_verified && <CheckCircle className="w-4 h-4 text-green-500" />}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 text-sm text-muted-foreground">
                          {user.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {user.email}
                            </span>
                          )}
                          {user.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {user.phone}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1 mt-1">
                          {user.roles?.map((role) => (
                            <React.Fragment key={role}>{getRoleBadge(role)}</React.Fragment>
                          ))}
                          {!user.roles?.length && getRoleBadge('tenant')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 border-t pt-4 lg:pt-0 lg:border-0 border-border">
                      {!user.is_verified && (
                        <Button variant="outline" size="sm" onClick={() => handleVerify(user.id)}>
                          <Shield className="w-4 h-4 mr-1" /> Verify
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => openEditModal(user)}>
                        <Edit className="w-4 h-4 mr-1" /> Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => { setSelectedUser(user); setIsDeleteOpen(true); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />

      {/* --- CREATE MODAL --- */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Provision New User</DialogTitle>
            <DialogDescription>
              Directly create a user account. This bypasses email OTP verification and sets the account as verified immediately.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email</Label>
              <Input id="email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">Phone</Label>
              <Input id="phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">Password</Label>
              <Input id="password" type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="col-span-3" required minLength={6} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">Role</Label>
              <div className="col-span-3">
                <Select value={formData.role} onValueChange={v => setFormData({ ...formData, role: v })}>
                  <SelectTrigger id="role"><SelectValue placeholder="Select platform role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tenant">Tenant</SelectItem>
                    <SelectItem value="owner">Property Owner</SelectItem>
                    <SelectItem value="subadmin">Sub Admin</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Provisioning...' : 'Create Record'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- EDIT MODAL --- */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Profile Information</DialogTitle>
            <DialogDescription>
              Modify the selected account's details and permissions.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-email" className="text-right text-muted-foreground">Email</Label>
              <Input id="edit-email" type="email" value={formData.email} disabled className="col-span-3 bg-muted" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">Name</Label>
              <Input id="edit-name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-phone" className="text-right">Phone</Label>
              <Input id="edit-phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-role" className="text-right">Role</Label>
              <div className="col-span-3">
                <Select value={formData.role} onValueChange={v => setFormData({ ...formData, role: v })}>
                  <SelectTrigger id="edit-role"><SelectValue placeholder="Select platform role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tenant">Tenant</SelectItem>
                    <SelectItem value="owner">Property Owner</SelectItem>
                    <SelectItem value="subadmin">Sub Admin</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Updating...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- DELETE CONFIRMATION MODAL --- */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="border-destructive/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Destructive Action
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 mt-2">
              <p>Are you absolutely sure you want to permanently delete the user <strong>{selectedUser?.full_name}</strong>?</p>
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20 mt-4">
                <strong>Warning (CASCADE DELETE):</strong> This action will permanently remove all properties listed by this user, their messages, favorites, reviews, and payments from our database.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDeleteUser(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Permanently Delete User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsers;
