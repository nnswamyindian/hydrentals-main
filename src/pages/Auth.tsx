import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, Lock, User, ArrowRight, Building2, Phone, KeyRound, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getApiUrl, supabase } from '@/integrations/supabase/client';
import logo from '@/assets/logo.svg';
import SEOHead from '@/components/seo/SEOHead';

type Role = 'tenant' | 'owner';

/** Password strength rules */
const passwordRules = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'An uppercase letter (A-Z)', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'A lowercase letter (a-z)', test: (p: string) => /[a-z]/.test(p) },
  { label: 'A number (0-9)', test: (p: string) => /[0-9]/.test(p) },
];

const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  if (!password) return null;
  const passed = passwordRules.filter(r => r.test(password)).length;
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
  return (
    <div className="space-y-1.5 mt-2">
      <div className="flex gap-1">
        {passwordRules.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all ${
              i < passed ? colors[passed - 1] : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <ul className="space-y-0.5">
        {passwordRules.map(rule => {
          const ok = rule.test(password);
          return (
            <li key={rule.label} className={`flex items-center gap-1 text-xs ${
              ok ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
            }`}>
              {ok
                ? <CheckCircle2 className="w-3 h-3 shrink-0" />
                : <XCircle className="w-3 h-3 shrink-0" />}
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signUp, signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>('tenant');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('login');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  // OTP Verification Card (after signup)
  const [showOtp, setShowOtp] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [devOtpCode, setDevOtpCode] = useState('');

  // Login variables
  const [loginMethod, setLoginMethod] = useState<'email' | 'mobile'>('email');
  const [authMode, setAuthMode] = useState<'password' | 'otp'>('password');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginOtpSent, setLoginOtpSent] = useState(false);
  const [loginOtpCode, setLoginOtpCode] = useState('');

  // Signup variables
  const [signupMethod, setSignupMethod] = useState<'email' | 'mobile'>('email');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/auth/verify-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail, otp: otpCode })
      });
      const data = await res.json();

      if (!res.ok) {
        toast({ title: 'Verification failed', description: data.error, variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      localStorage.setItem('supabase-auth-token', data.token);
      localStorage.setItem('supabase-auth-user', JSON.stringify(data.user));
      // Sync React auth context without a full page reload
      (supabase.auth as any).syncFromStorage();

      toast({ title: 'Account Verified!', description: 'Welcome to HydRent!' });
      navigate('/dashboard');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      setIsLoading(false);
    }
  };

  const handleSendLoginOtp = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!loginIdentifier) {
      toast({
        title: 'Input Required',
        description: `Please enter your ${loginMethod === 'email' ? 'email address' : 'mobile number'} first.`,
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/auth/send-login-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: loginIdentifier })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }
      setLoginOtpSent(true);
      toast({
        title: 'OTP Sent!',
        description: data.dev_otp
          ? `[Dev Mode] Your verification OTP is: ${data.dev_otp}`
          : `A 6-digit OTP code has been generated. ${loginMethod === 'email' ? 'Check your inbox.' : 'Check console logs.'}`,
      });
    } catch (err: any) {
      toast({
        title: 'Failed to send OTP',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyLoginOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!loginOtpCode) {
      toast({
        title: 'Input Required',
        description: 'Please enter the 6-digit OTP code.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/auth/login-with-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: loginIdentifier, otp: loginOtpCode })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify OTP');
      }

      localStorage.setItem('supabase-auth-token', data.token);
      localStorage.setItem('supabase-auth-user', JSON.stringify(data.user));
      // Sync React auth context without a full page reload
      (supabase.auth as any).syncFromStorage();

      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });
      
      navigate('/dashboard');
    } catch (err: any) {
      toast({
        title: 'Verification failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginWithPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    if (!loginIdentifier || !loginPassword) {
      toast({
        title: 'Input Required',
        description: 'Please fill in all fields.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // signIn accepts email or phone; the server resolves both
    const { error } = await signIn(loginIdentifier, loginPassword);

    if (error) {
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: 'Welcome back!',
      description: 'You have successfully logged in.',
    });
    navigate('/dashboard');
    setIsLoading(false);
  };

  const handleCustomSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    if (!acceptedTerms) {
      toast({
        title: 'Terms & Conditions Required',
        description: 'You must accept the Terms of Service and Privacy Policy to create an account.',
        variant: 'destructive',
      });
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setErrors({ confirmPassword: "Passwords don't match" });
      toast({
        title: 'Validation Error',
        description: "Passwords do not match.",
        variant: 'destructive',
      });
      return;
    }

    // Enforce password strength client-side before hitting the server
    const strengthPassed = passwordRules.every(r => r.test(signupPassword));
    if (!strengthPassed) {
      toast({
        title: 'Weak Password',
        description: 'Password must be at least 8 characters with an uppercase letter, a lowercase letter, and a number.',
        variant: 'destructive',
      });
      return;
    }

    if (signupMethod === 'email' && !signupEmail) {
      toast({ title: 'Validation Error', description: "Email is required.", variant: 'destructive' });
      return;
    }
    if (signupMethod === 'mobile' && !signupPhone) {
      toast({ title: 'Validation Error', description: "Phone number is required.", variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    const signupData = {
      name: signupName,
      email: signupMethod === 'email' ? signupEmail : undefined,
      phone: signupMethod === 'mobile' ? signupPhone : (signupPhone || undefined),
      password: signupPassword,
      role: selectedRole,
    };

    try {
      const { error, data } = await signUp(
        signupData.email || '',
        signupData.password,
        signupData.name,
        signupData.phone || '',
        signupData.role
      );

      if (error) {
        throw error;
      }

      toast({
        title: 'Account Created!',
        description: data?.dev_otp
          ? `[Dev Mode] Your verification OTP is: ${data.dev_otp}`
          : (signupMethod === 'email' 
            ? 'Check your inbox for a 6-digit OTP code.' 
            : 'Check backend console logs for the 6-digit OTP code.'),
      });

      const targetEmail = signupData.email || `${signupData.phone?.replace(/\+/g, '')}@hydrentals.local`;
      setDevOtpCode(data?.dev_otp || '');
      setOtpEmail(targetEmail);
      setShowOtp(true);
    } catch (err: any) {
      toast({
        title: 'Signup failed',
        description: err.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (showOtp) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SEOHead title="Verify Account" description="Enter your OTP to complete registration." />
        <Header />
        <main className="flex-1 flex items-center justify-center py-12 px-4">
          <Card className="w-full max-w-md shadow-lg border border-border">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold font-display">Verify Your Account</CardTitle>
              <CardDescription>
                Enter the 6-digit OTP sent to <br />
                <span className="font-semibold text-foreground">{otpEmail}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {devOtpCode && (
                <div className="bg-amber-500/10 text-center p-3 rounded-lg border border-amber-500/20 text-xs mb-4">
                  <p className="text-amber-800 dark:text-amber-400 font-semibold mb-1">Development Verification OTP:</p>
                  <p className="font-mono text-primary font-bold text-lg select-all tracking-widest">{devOtpCode}</p>
                </div>
              )}
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    required
                    maxLength={6}
                    className="text-center tracking-widest text-xl font-mono border-2 border-primary h-12"
                  />
                </div>
                <Button type="submit" variant="hero" className="w-full h-11" disabled={isLoading}>
                  {isLoading ? 'Verifying...' : 'Verify & Continue'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead title="Login or Sign Up" description="Create an account or log in to HydRent to find your next home or list your property." />
      <Header />

      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md space-y-6">
          {/* Logo */}
          <div className="text-center mb-4 flex justify-center">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <img src={logo} alt="HydRent Logo" className="h-28 md:h-36 w-auto transition-transform hover:scale-105" />
            </Link>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" className="flex items-center gap-1">
                <User className="w-4 h-4" />
                Login
              </TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <Card className="shadow-lg border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display text-xl font-bold">
                    <User className="w-5 h-5 text-primary" />
                    Welcome Back
                  </CardTitle>
                  <CardDescription>
                    Sign in to manage your account or browse properties
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Selector: Email vs Mobile */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg text-sm">
                    <button
                      type="button"
                      className={`py-1.5 rounded-md font-medium transition-colors ${loginMethod === 'email' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                      onClick={() => { setLoginMethod('email'); setLoginOtpSent(false); }}
                    >
                      Email Login
                    </button>
                    <button
                      type="button"
                      className={`py-1.5 rounded-md font-medium transition-colors ${loginMethod === 'mobile' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                      onClick={() => { setLoginMethod('mobile'); setLoginOtpSent(false); }}
                    >
                      Mobile Login
                    </button>
                  </div>

                  {/* Selector: Password vs OTP */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg text-sm">
                    <button
                      type="button"
                      className={`py-1.5 rounded-md font-medium transition-colors ${authMode === 'password' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                      onClick={() => setAuthMode('password')}
                    >
                      Password
                    </button>
                    <button
                      type="button"
                      className={`py-1.5 rounded-md font-medium transition-colors ${authMode === 'otp' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                      onClick={() => setAuthMode('otp')}
                    >
                      OTP Code
                    </button>
                  </div>

                  {/* Password Login Flow */}
                  {authMode === 'password' ? (
                    <form onSubmit={handleLoginWithPassword} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-identifier">
                          {loginMethod === 'email' ? 'Email Address' : 'Mobile Number'}
                        </Label>
                        <div className="relative">
                          {loginMethod === 'email' ? (
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          )}
                          <Input
                            id="login-identifier"
                            type={loginMethod === 'email' ? 'email' : 'tel'}
                            placeholder={loginMethod === 'email' ? 'yourname@example.com' : 'e.g. 9000207739'}
                            value={loginIdentifier}
                            onChange={(e) => setLoginIdentifier(e.target.value)}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="login-password">Password</Label>
                          <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                            Forgot password?
                          </Link>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="login-password"
                            type="password"
                            placeholder="Enter password"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>

                      <Button type="submit" variant="hero" size="lg" className="w-full h-11" disabled={isLoading}>
                        {isLoading ? 'Logging in...' : 'Login'}
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </form>
                  ) : (
                    /* OTP Login Flow */
                    <form onSubmit={handleVerifyLoginOtp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-identifier-otp">
                          {loginMethod === 'email' ? 'Email Address' : 'Mobile Number'}
                        </Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            {loginMethod === 'email' ? (
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            ) : (
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            )}
                            <Input
                              id="login-identifier-otp"
                              type={loginMethod === 'email' ? 'email' : 'tel'}
                              placeholder={loginMethod === 'email' ? 'yourname@example.com' : 'e.g. 9000207739'}
                              value={loginIdentifier}
                              onChange={(e) => setLoginIdentifier(e.target.value)}
                              className="pl-10"
                              required
                              disabled={loginOtpSent}
                            />
                          </div>
                          {!loginOtpSent && (
                            <Button type="button" onClick={handleSendLoginOtp} disabled={isLoading}>
                              Get OTP
                            </Button>
                          )}
                        </div>
                      </div>

                      {loginOtpSent && (
                        <div className="space-y-3 animation-fade-in">
                          <Label htmlFor="login-otp-code">Enter 6-Digit OTP</Label>
                          <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="login-otp-code"
                              type="text"
                              maxLength={6}
                              placeholder="e.g. 123456"
                              value={loginOtpCode}
                              onChange={(e) => setLoginOtpCode(e.target.value)}
                              className="pl-10 font-mono text-center tracking-widest"
                              required
                            />
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">OTP code sent.</span>
                            <button
                              type="button"
                              className="text-primary hover:underline"
                              onClick={() => setLoginOtpSent(false)}
                            >
                              Change Email/Phone
                            </button>
                          </div>
                          <Button type="submit" variant="hero" size="lg" className="w-full h-11" disabled={isLoading}>
                            {isLoading ? 'Verifying...' : 'Verify & Login'}
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </form>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Signup Tab */}
            <TabsContent value="signup">
              <Card className="shadow-lg border-border">
                <CardHeader>
                  <CardTitle className="font-display text-xl font-bold">Create Account</CardTitle>
                  <CardDescription>
                    Create an account to browse properties or post listings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCustomSignup} className="space-y-4">
                    {/* Selector: Signup with Email vs Mobile */}
                    <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg text-sm mb-2">
                      <button
                        type="button"
                        className={`py-1.5 rounded-md font-medium transition-colors ${signupMethod === 'email' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                        onClick={() => setSignupMethod('email')}
                      >
                        Email Signup
                      </button>
                      <button
                        type="button"
                        className={`py-1.5 rounded-md font-medium transition-colors ${signupMethod === 'mobile' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                        onClick={() => setSignupMethod('mobile')}
                      >
                        Mobile Signup
                      </button>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="e.g. John Doe"
                          value={signupName}
                          onChange={(e) => setSignupName(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    {signupMethod === 'email' ? (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="signup-email">Email Address</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="signup-email"
                              type="email"
                              placeholder="you@example.com"
                              value={signupEmail}
                              onChange={(e) => setSignupEmail(e.target.value)}
                              className="pl-10"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="signup-phone-opt">Phone Number (Optional)</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="signup-phone-opt"
                              type="tel"
                              placeholder="e.g. 9000207739"
                              value={signupPhone}
                              onChange={(e) => setSignupPhone(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="signup-phone-req">Phone Number</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="signup-phone-req"
                              type="tel"
                              placeholder="e.g. 9000207739"
                              value={signupPhone}
                              onChange={(e) => setSignupPhone(e.target.value)}
                              className="pl-10"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="signup-email-opt">Email Address (Optional)</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="signup-email-opt"
                              type="email"
                              placeholder="you@example.com"
                              value={signupEmail}
                              onChange={(e) => setSignupEmail(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="Min 8 chars, uppercase, number"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                      <PasswordStrengthIndicator password={signupPassword} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="signup-confirm-password"
                          type="password"
                          placeholder="Re-enter password"
                          value={signupConfirmPassword}
                          onChange={(e) => setSignupConfirmPassword(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Account Purpose</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          type="button"
                          variant={selectedRole === 'tenant' ? 'default' : 'outline'}
                          className="h-auto py-3 flex-col gap-1 text-xs"
                          onClick={() => setSelectedRole('tenant')}
                        >
                          <User className="w-5 h-5" />
                          <span className="font-semibold text-sm">Find a Home</span>
                          <span className="opacity-80">Register as Tenant</span>
                        </Button>
                        <Button
                          type="button"
                          variant={selectedRole === 'owner' ? 'default' : 'outline'}
                          className="h-auto py-3 flex-col gap-1 text-xs"
                          onClick={() => setSelectedRole('owner')}
                        >
                          <Building2 className="w-5 h-5" />
                          <span className="font-semibold text-sm">List Property</span>
                          <span className="opacity-80">Register as Owner</span>
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 my-2">
                      <Checkbox
                        id="accept-terms"
                        checked={acceptedTerms}
                        onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                        className="mt-0.5"
                      />
                      <Label htmlFor="accept-terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer font-normal">
                        I agree to the{' '}
                        <Link to="/terms" className="text-primary hover:underline font-medium" target="_blank">
                          Terms of Service
                        </Link>
                        {' '}and{' '}
                        <Link to="/privacy" className="text-primary hover:underline font-medium" target="_blank">
                          Privacy Policy
                        </Link>
                      </Label>
                    </div>

                    <Button type="submit" variant="hero" size="lg" className="w-full h-11" disabled={isLoading}>
                      {isLoading ? 'Creating account...' : 'Create Account'}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Highlighted Support/Contact section */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-center text-sm space-y-1 shadow-sm mt-4">
            <p className="font-semibold text-amber-800 dark:text-amber-400">Facing issues signing in or receiving OTP?</p>
            <p className="text-muted-foreground text-xs">
              Please contact support at{' '}
              <a href="mailto:support@hydrentals.com" className="font-semibold text-primary hover:underline">
                support@hydrentals.com
              </a>{' '}
              or call/WhatsApp{' '}
              <a href="tel:+919000207739" className="font-semibold text-primary hover:underline">
                +91 9000207739
              </a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Auth;
