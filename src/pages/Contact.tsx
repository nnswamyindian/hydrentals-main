import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Shield, Award, AlertTriangle, Send, CheckCircle, Phone, Mail, MapPin, Loader2 } from 'lucide-react';

import { getApiUrl } from '@/integrations/supabase/client';

const API_BASE = getApiUrl('/api');

const complaintSchema = z.object({
  complainant_name: z.string().trim().min(2, 'Name is required').max(100),
  complainant_email: z.string().trim().email('Invalid email').max(255),
  complainant_phone: z.string().trim().optional(),
  broker_name: z.string().trim().min(2, 'Broker name is required').max(100),
  broker_phone: z.string().trim().optional(),
  property_reference: z.string().trim().max(200).optional(),
  description: z.string().trim().min(20, 'Please describe the issue in at least 20 characters').max(2000),
});

type ComplaintForm = z.infer<typeof complaintSchema>;

const Contact = () => {
  const { user, profile } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [complaintRef, setComplaintRef] = useState<string | null>(null);

  const form = useForm<ComplaintForm>({
    resolver: zodResolver(complaintSchema),
    defaultValues: {
      complainant_name: profile?.full_name || '',
      complainant_email: user?.email || '',
      complainant_phone: profile?.phone || '',
      broker_name: '',
      broker_phone: '',
      property_reference: '',
      description: '',
    },
  });

  // Fetch community badges from backend
  const { data: badges } = useQuery({
    queryKey: ['community-badges', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const token = localStorage.getItem('hydrent_token');
      const res = await fetch(`${API_BASE}/rest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          table: 'community_badges',
          action: 'select',
          columns: '*',
          modifiers: [{ type: 'eq', column: 'user_id', value: user.id }],
        }),
      });
      const json = await res.json();
      return json.data || [];
    },
    enabled: !!user,
  });

  const onSubmit = async (values: ComplaintForm) => {
    try {
      const token = localStorage.getItem('hydrent_token');

      const response = await fetch(`${API_BASE}/contact/report-broker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          complainant_name: values.complainant_name,
          complainant_email: values.complainant_email,
          complainant_phone: values.complainant_phone || null,
          broker_name: values.broker_name,
          broker_phone: values.broker_phone || null,
          property_reference: values.property_reference || null,
          description: values.description,
          user_id: user?.id || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to submit complaint. Please try again.');
        return;
      }

      setComplaintRef(data.complaint_id || null);
      setSubmitted(true);
      toast.success('✅ Complaint submitted! Check your email for confirmation.');
    } catch (err) {
      console.error('Submission error:', err);
      toast.error('Network error. Please check your connection and try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Page Header */}
          <div className="text-center space-y-2">
            <h1 className="font-display text-3xl md:text-4xl font-bold">Contact &amp; Report</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Help us keep Hyderabad's rental market broker-free. Report suspicious brokers and earn a nationally recognized digital badge.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Contact Info */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Phone className="w-5 h-5 text-primary" />
                    Get in Touch
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    support@hydrentals.com
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    +91 9000207739
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    Hyderabad, Telangana
                  </div>
                </CardContent>
              </Card>

              {/* Reward Info Card */}
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    Earn a Reward
                  </CardTitle>
                  <CardDescription>
                    Report a verified broker and earn a Community Guardian Badge — a nationally recognized digital credential.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-bold mt-0.5">1.</span>
                    <span>Submit your broker report below</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-bold mt-0.5">2.</span>
                    <span>Our team verifies &amp; takes legal action</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-500 font-bold mt-0.5">3.</span>
                    <span>You receive your digital badge &amp; reward!</span>
                  </div>
                </CardContent>
              </Card>

              {/* Badge Section */}
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    My Badges
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {badges && badges.length > 0 ? (
                    <div className="space-y-3">
                      {badges.map((badge: any) => (
                        <div key={badge.id} className="p-3 rounded-lg border border-primary/20 bg-background space-y-2">
                          <div className="flex items-center gap-2">
                            <Shield className="w-6 h-6 text-primary" />
                            <span className="font-semibold">{badge.badge_name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{badge.description}</p>
                          <Badge variant="secondary" className="text-xs">
                            Code: {badge.badge_code}
                          </Badge>
                          <p className="text-[10px] text-muted-foreground">
                            Issued: {new Date(badge.issued_at).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 space-y-2">
                      <Shield className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                      <p className="text-sm text-muted-foreground">
                        {user
                          ? 'Submit a broker report to earn your badge!'
                          : 'Sign in and report a broker to earn your Community Guardian badge.'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Complaint Form */}
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    Report a Broker
                  </CardTitle>
                  <CardDescription>
                    Found a broker posing as an owner? Report them here. Your identity stays protected.
                    A confirmation email will be sent to you after submission.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {submitted ? (
                    <div className="text-center py-12 space-y-4">
                      <CheckCircle className="w-16 h-16 text-primary mx-auto" />
                      <h3 className="text-xl font-semibold">Thank You for Reporting!</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        Your complaint has been submitted and saved. Our team will review it within <strong>48 hours</strong>.
                        Once the broker is verified, we will take legal action and <strong>you will be rewarded</strong>!
                      </p>
                      {complaintRef && (
                        <div className="inline-block bg-muted rounded-lg px-4 py-2 text-sm">
                          <span className="text-muted-foreground">Reference ID: </span>
                          <span className="font-mono font-bold text-primary">
                            #{complaintRef.substring(0, 8).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground">
                        📧 A confirmation email has been sent to <strong>{form.getValues('complainant_email')}</strong>
                      </p>
                      <Button variant="outline" onClick={() => { setSubmitted(false); setComplaintRef(null); form.reset(); }}>
                        Submit Another Report
                      </Button>
                    </div>
                  ) : (
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <FormField control={form.control} name="complainant_name" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Your Name *</FormLabel>
                              <FormControl><Input id="complainant_name" placeholder="Your full name" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="complainant_email" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Your Email *</FormLabel>
                              <FormControl><Input id="complainant_email" type="email" placeholder="you@example.com" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>

                        <FormField control={form.control} name="complainant_phone" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Your Phone (optional)</FormLabel>
                            <FormControl><Input id="complainant_phone" placeholder="+91 XXXXX XXXXX" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <div className="border-t border-border pt-4">
                          <h4 className="font-medium text-sm text-muted-foreground mb-3">Broker Details</h4>
                          <div className="grid sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="broker_name" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Broker Name *</FormLabel>
                                <FormControl><Input id="broker_name" placeholder="Broker's name" {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="broker_phone" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Broker Phone (optional)</FormLabel>
                                <FormControl><Input id="broker_phone" placeholder="Broker's phone number" {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                        </div>

                        <FormField control={form.control} name="property_reference" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Property Reference (optional)</FormLabel>
                            <FormControl><Input id="property_reference" placeholder="Property link or listing ID" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="description" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Describe the Issue *</FormLabel>
                            <FormControl>
                              <Textarea
                                id="description"
                                placeholder="Explain how you identified them as a broker, any evidence, etc."
                                className="min-h-[120px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <Button
                          id="submit-broker-report"
                          type="submit"
                          className="w-full gap-2"
                          disabled={form.formState.isSubmitting}
                        >
                          {form.formState.isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              Submit Report
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">
                          🔒 Your identity is protected. A confirmation email will be sent to you.
                        </p>
                      </form>
                    </Form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
