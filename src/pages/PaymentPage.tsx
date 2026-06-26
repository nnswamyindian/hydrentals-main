import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/integrations/supabase/client';
import { 
  Building2, 
  IndianRupee, 
  User, 
  Mail, 
  MapPin, 
  CreditCard, 
  Loader2, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

interface PaymentDetails {
  property: {
    id: string;
    title: string;
    rent: number;
    locality: string;
  };
  payment: {
    id: string;
    amount: number;
    status: string;
    payment_link: string;
    razorpay_order_id: string;
  };
  owner: {
    name: string;
    email: string;
    phone: string;
  };
  razorpayKeyId: string;
}

const PaymentPage = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [details, setDetails] = useState<PaymentDetails | null>(null);

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      try {
        const token = localStorage.getItem('supabase-auth-token');
        const res = await fetch(getApiUrl(`/api/properties/${propertyId}/payment-details`), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to fetch payment details');
        }
        
        const data = await res.json();
        setDetails(data);
      } catch (err: any) {
        console.error(err);
        toast({
          title: 'Error Loading Details',
          description: err.message || 'Unable to retrieve property payment invoice.',
          variant: 'destructive'
        });
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentDetails();
  }, [propertyId, navigate, toast]);

  const handlePayment = async () => {
    if (!details) return;
    
    setProcessing(true);
    
    try {
      const token = localStorage.getItem('supabase-auth-token');
      
      // 1. Call Create Order API on backend
      toast({
        title: 'Initializing Checkout',
        description: 'Generating secure Razorpay order...'
      });
      
      const orderRes = await fetch(getApiUrl('/api/payments/create-order'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ propertyId: details.property.id })
      });
      
      const orderData = await orderRes.json();
      
      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Order creation failed');
      }

      const { order_id, amount, currency, key_id } = orderData;

      if (!key_id) {
        throw new Error('Razorpay client Key ID is missing on the server. Cannot initialize payment.');
      }

      // 2. Load Checkout script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway library. Please check your network.');
      }

      // 3. Open Razorpay Checkout Modal
      const options = {
        key: key_id,
        amount: amount,
        currency: currency,
        name: 'HYD Rentals',
        description: 'Property Listing Activation Fee',
        order_id: order_id,
        handler: async function (response: any) {
          try {
            toast({
              title: 'Processing Verification',
              description: 'Validating payment signature...'
            });

            // 4. Call verify API on backend
            const verifyRes = await fetch(getApiUrl('/api/payments/verify'), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                propertyId: details.property.id
              })
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || 'Signature verification failed');
            }

            toast({
              title: 'Payment Successful',
              description: 'Listing fee received. Property is now live!'
            });

            navigate('/payment/success');
          } catch (verifyErr: any) {
            console.error(verifyErr);
            toast({
              title: 'Verification Failed',
              description: verifyErr.message || 'Signature verification database update failed.',
              variant: 'destructive'
            });
            setProcessing(false);
          }
        },
        prefill: {
          name: details.owner.name,
          email: details.owner.email,
          contact: details.owner.phone
        },
        theme: {
          color: '#4F46E5'
        },
        modal: {
          ondismiss: function() {
            setProcessing(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Checkout Error',
        description: err.message || 'Failed to open Razorpay payment popup.',
        variant: 'destructive'
      });
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/20">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground text-sm font-medium">Loading property invoice details...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!details) return null;

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      
      <main className="flex-1 py-12 px-4">
        <div className="container max-w-2xl">
          <Card className="shadow-lg border-primary/10 overflow-hidden bg-card">
            {/* Header */}
            <div className="gradient-hero text-primary-foreground p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold">Property Listing Checkout</h1>
                  <p className="text-white/80 text-sm mt-0.5">HydRentals Secure Billing System</p>
                </div>
              </div>
            </div>

            <CardContent className="p-6 sm:p-8 space-y-6">
              {/* Payment Info */}
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Property Listing Fee</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">One-time publication activation fee</p>
                </div>
                <div className="flex items-center text-2xl font-bold text-primary">
                  <IndianRupee className="w-5 h-5 shrink-0" />
                  <span>{details.payment.amount}</span>
                </div>
              </div>

              {/* Property Details */}
              <div className="space-y-3">
                <h3 className="font-display font-semibold text-sm text-muted-foreground tracking-wider uppercase">Listing Details</h3>
                <div className="grid gap-3 p-4 rounded-xl bg-muted/50 border border-border">
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">{details.property.title}</p>
                      <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" />
                        {details.property.locality}, Hyderabad
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs pt-2.5 border-t border-border">
                    <span className="text-muted-foreground">Monthly Rent:</span>
                    <span className="font-semibold text-foreground">₹{details.property.rent.toLocaleString()}/mo</span>
                  </div>
                </div>
              </div>

              {/* Owner Details */}
              <div className="space-y-3">
                <h3 className="font-display font-semibold text-sm text-muted-foreground tracking-wider uppercase">Owner Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="flex items-center gap-2.5 p-3 rounded-lg border border-border bg-muted/30">
                    <User className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Name</p>
                      <p className="text-xs font-medium truncate text-foreground">{details.owner.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 p-3 rounded-lg border border-border bg-muted/30">
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Email</p>
                      <p className="text-xs font-medium truncate text-foreground">{details.owner.email}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Shield Banner */}
              <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-green-500/5 border border-green-500/10 text-[11px] text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-green-800">Secure Payment Channel:</strong> HydRentals uses AES-256 standard gateway encryption. Your financial credentials are never stored on our local servers.
                </div>
              </div>

              {/* Submit / Pay Trigger */}
              <div className="pt-4 border-t border-border space-y-3">
                <Button 
                  onClick={handlePayment} 
                  disabled={processing} 
                  variant="hero" 
                  size="lg" 
                  className="w-full text-base font-semibold"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Initializing Payment...
                    </>
                  ) : (
                    <>
                      Pay Listing Fee
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default PaymentPage;
