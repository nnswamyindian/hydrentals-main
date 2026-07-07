import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, User, Bell, Shield, LogOut, Loader2, Camera } from 'lucide-react';
import { getApiUrl } from '@/integrations/supabase/client';


const Settings = () => {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    fullName: profile?.full_name || '',
    phone: profile?.phone || '',
  });
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    messages: true,
    propertyUpdates: true,
  });
  useEffect(() => {
    if (profile) {
      setAvatarUrl(profile.avatar_url);
      setFormData({
        fullName: profile.full_name || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingPhoto(true);
    try {
      // 1. Upload file to server
      const formData = new FormData();
      formData.append('images', file);
      const uploadRes = await fetch(getApiUrl('/api/upload'), {
        method: 'POST',
        body: formData,
      });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const uploadData = await uploadRes.json();
      const uploadedPath = uploadData.images?.[0];
      if (!uploadedPath) throw new Error('No image path returned');

      // 2. Build full URL
      const fullUrl = uploadedPath.startsWith('http')
        ? uploadedPath
        : getApiUrl(uploadedPath);

      // 3. Persist avatar_url to the user's DB record
      const token = localStorage.getItem('supabase-auth-token');
      const saveRes = await fetch(getApiUrl('/api/auth/me/avatar'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ avatar_url: fullUrl }),
      });
      if (!saveRes.ok) throw new Error('Failed to save avatar');
      const saveData = await saveRes.json();

      // 4. Update local state + localStorage so header avatar refreshes
      setAvatarUrl(fullUrl);
      const storedUser = localStorage.getItem('supabase-auth-user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        parsed.avatar_url = fullUrl;
        localStorage.setItem('supabase-auth-user', JSON.stringify(parsed));
      }

      toast({ title: 'Photo updated', description: 'Your profile photo has been updated.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to upload photo.', variant: 'destructive' });
    } finally {
      setIsUploadingPhoto(false);
      // Reset file input so the same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem('supabase-auth-token');
      const res = await fetch(getApiUrl('/api/auth/me/profile'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ full_name: formData.fullName, phone: formData.phone }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update profile');
      }
      // Sync localStorage
      const data = await res.json();
      const storedUser = localStorage.getItem('supabase-auth-user');
      if (storedUser && data.user) {
        const parsed = JSON.parse(storedUser);
        parsed.full_name = data.user.full_name;
        parsed.phone = data.user.phone;
        localStorage.setItem('supabase-auth-user', JSON.stringify(parsed));
      }
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || user?.email?.[0].toUpperCase() || 'U';

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <SettingsIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Sign in to access settings</h2>
              <p className="text-muted-foreground mb-4">
                Manage your account and preferences.
              </p>
              <Button asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <div className="container max-w-3xl py-8">
          <div className="mb-6">
            <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
              <SettingsIcon className="w-7 h-7" />
              Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your account and preferences
            </p>
          </div>

          <div className="space-y-6">
            {/* Profile Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile
                </CardTitle>
                <CardDescription>
                  Update your personal information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="flex items-center gap-4 mb-6">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={avatarUrl || undefined} />
                      <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                    <Button
                      variant="outline"
                      type="button"
                      className="gap-2"
                      disabled={isUploadingPhoto}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {isUploadingPhoto ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                      {isUploadingPhoto ? 'Uploading…' : 'Change Photo'}
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" value={user.email || ''} disabled />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notifications
                  <span className="ml-auto text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-normal">
                    Coming Soon
                  </span>
                </CardTitle>
                <CardDescription>
                  Notification preferences will be configurable in an upcoming update.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 opacity-50 pointer-events-none select-none">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive updates via email</p>
                  </div>
                  <Switch checked={notifications.email} disabled />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">New Messages</p>
                    <p className="text-sm text-muted-foreground">Get notified of new messages</p>
                  </div>
                  <Switch checked={notifications.messages} disabled />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Property Updates</p>
                    <p className="text-sm text-muted-foreground">Updates on saved properties</p>
                  </div>
                  <Switch checked={notifications.propertyUpdates} disabled />
                </div>
              </CardContent>
            </Card>

            {/* Security */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security
                </CardTitle>
                <CardDescription>
                  Manage your account security
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" asChild>
                  <Link to="/forgot-password">Change Password</Link>
                </Button>
                <Button variant="destructive" className="gap-2" onClick={signOut}>
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Settings;
