import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, ArrowLeft, Loader2, CheckCircle, Lock, KeyRound } from 'lucide-react';

type Step = 'email' | 'otp' | 'success';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [devOtp, setDevOtp] = useState('');

  // --- Step 1: Send OTP ---
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      const { data, error } = await (supabase.auth as any).resetPasswordForEmail(email);

      if (error) throw new Error(error.message);

      if (data?.dev_otp) setDevOtp(data.dev_otp);

      toast({
        title: 'OTP Sent',
        description: data?.dev_otp
          ? `[Dev Mode] Your reset OTP is: ${data.dev_otp}`
          : 'A 6-digit reset code has been sent to your email.',
      });
      setStep('otp');
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to send reset OTP.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // --- Step 2: Verify OTP + set new password ---
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp || otp.length !== 6) {
      toast({ title: 'Invalid OTP', description: 'Please enter the 6-digit code.', variant: 'destructive' });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', description: 'Please make sure both passwords are the same.', variant: 'destructive' });
      return;
    }

    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      toast({
        title: 'Weak password',
        description: 'Password must be at least 8 characters with an uppercase letter, a lowercase letter, and a number.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await (supabase.auth as any).resetPasswordWithOtp(email, otp, password);

      if (error) throw new Error(error.message);

      toast({ title: 'Password Updated!', description: 'You have been logged in automatically.' });
      setStep('success');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err: any) {
      toast({
        title: 'Reset Failed',
        description: err.message || 'Could not reset password. Please check your OTP and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>
              {step === 'email' && "Enter your email and we'll send a 6-digit reset code"}
              {step === 'otp' && `Enter the OTP sent to ${email}`}
              {step === 'success' && 'Your password has been reset!'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Step 1 — Email */}
            {step === 'email' && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <Label htmlFor="reset-email">Email Address</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="Enter your registered email"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Send Reset Code
                </Button>

                <div className="text-center">
                  <Link to="/auth" className="text-sm text-primary hover:underline">
                    <ArrowLeft className="w-3 h-3 inline mr-1" />
                    Back to Login
                  </Link>
                </div>
              </form>
            )}

            {/* Step 2 — OTP + New Password */}
            {step === 'otp' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {/* Dev mode OTP hint */}
                {devOtp && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center text-xs">
                    <p className="text-amber-800 dark:text-amber-400 font-semibold mb-1">Development Reset OTP:</p>
                    <p className="font-mono text-primary font-bold text-lg select-all tracking-widest">{devOtp}</p>
                  </div>
                )}

                <div>
                  <Label htmlFor="reset-otp">6-Digit OTP Code</Label>
                  <div className="relative mt-1">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reset-otp"
                      type="text"
                      maxLength={6}
                      placeholder="Enter OTP (e.g. 123456)"
                      className="pl-10 font-mono text-center tracking-widest"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="reset-password">New Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reset-password"
                      type="password"
                      placeholder="Min 8 chars, uppercase, number"
                      className="pl-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="reset-confirm">Confirm New Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reset-confirm"
                      type="password"
                      placeholder="Re-enter new password"
                      className="pl-10"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Reset Password
                </Button>

                <div className="flex justify-between text-sm">
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setStep('email')}
                  >
                    <ArrowLeft className="w-3 h-3 inline mr-1" />
                    Change email
                  </button>
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={handleSendOtp}
                    disabled={isLoading}
                  >
                    Resend OTP
                  </button>
                </div>
              </form>
            )}

            {/* Step 3 — Success */}
            {step === 'success' && (
              <div className="text-center py-6">
                <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <h3 className="font-semibold text-lg mb-2">Password Reset!</h3>
                <p className="text-muted-foreground">Redirecting you to dashboard...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default ForgotPassword;
