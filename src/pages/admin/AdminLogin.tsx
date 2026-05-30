import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Lock, Shield, ArrowRight, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

const AdminLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const checkRole = async () => {
      if (user) {
        const { data: rolesData } = await db
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        const roles = (rolesData as any[])?.map((r: any) => r.role) || [];
        if (roles.includes('admin')) {
          navigate('/admin/dashboard');
        }
      }
    };
    checkRole();
  }, [user, navigate]);

  const handleAdminLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get('admin-email') as string,
      password: formData.get('admin-password') as string,
    };

    const result = loginSchema.safeParse(data);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      setIsLoading(false);
      return;
    }

    const { error } = await signIn(data.email, data.password);

    if (error) {
      toast({
        title: 'Admin login failed',
        description: error.message === 'Invalid login credentials'
          ? 'Invalid admin credentials. Please try again.'
          : error.message,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Verify admin role
    const { data: { user } } = await db.auth.getUser();
    if (user) {
      const { data: rolesData } = await db
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const roles = (rolesData as any[])?.map((r: any) => r.role) || [];
      if (!roles.includes('admin')) {
        await db.auth.signOut();
        toast({
          title: 'Unauthorized Access',
          description: 'You do not have administrative privileges.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
    }

    toast({
      title: 'Welcome Admin!',
      description: 'You have successfully logged in to admin panel.',
    });
    navigate('/admin/dashboard');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md">
        {/* Back Link */}
        <Link to="/" className="inline-flex items-center text-zinc-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to main site
        </Link>
        
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-4 border border-primary/30 shadow-[0_0_30px_rgba(var(--primary),0.2)]">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-display font-bold text-3xl text-white">Admin Secure Login</h1>
          <p className="text-zinc-400 mt-2">Central Management Dashboard</p>
        </div>

        <Card className="border-zinc-800 bg-zinc-900 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">Sign In</CardTitle>
            <CardDescription className="text-zinc-400">
              Enter your credentials to access the admin portal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email" className="text-zinc-300">Admin Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    id="admin-email"
                    name="admin-email"
                    type="email"
                    placeholder="admin@hydrent.com"
                    className="pl-10 bg-zinc-950 border-zinc-800 text-white focus-visible:ring-primary"
                    required
                  />
                </div>
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-password" className="text-zinc-300">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    id="admin-password"
                    name="admin-password"
                    type="password"
                    placeholder="Enter admin password"
                    className="pl-10 bg-zinc-950 border-zinc-800 text-white focus-visible:ring-primary"
                    required
                  />
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>

              <Button type="submit" size="lg" className="w-full mt-6 bg-primary text-primary-foreground hover:bg-primary/90" disabled={isLoading}>
                {isLoading ? 'Authenticating...' : 'Access Dashboard'}
                {!isLoading && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>

              <div className="text-xs text-center text-zinc-400 bg-zinc-950/50 border border-zinc-800/50 p-4 rounded-lg mt-6">
                <p className="font-medium text-white mb-1 flex items-center justify-center gap-1">
                  <Shield className="w-3 h-3" /> Authorized Personnel Only
                </p>
                <p>All access attempts are logged and monitored. Unauthorized entry is strictly prohibited.</p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
