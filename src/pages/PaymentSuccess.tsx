import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Building2, ArrowRight, Sparkles, Dashboard } from 'lucide-react';

const PaymentSuccess = () => {
  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      
      <main className="flex-1 py-16 px-4 flex items-center justify-center">
        <div className="container max-w-md animate-fade-in">
          <Card className="shadow-xl border-green-500/10 overflow-hidden bg-card text-center relative">
            {/* Top decorative gradient bar */}
            <div className="h-2 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500"></div>

            <CardContent className="p-8 sm:p-10 space-y-6">
              {/* Success Badge */}
              <div className="relative mx-auto w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center animate-bounce">
                <CheckCircle className="w-10 h-10 text-green-500" />
                <Sparkles className="w-4 h-4 text-green-400 absolute -top-1 -right-1 animate-pulse" />
              </div>

              {/* Title */}
              <div className="space-y-2">
                <h1 className="font-display text-2xl font-bold text-foreground">Payment Received!</h1>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Your listing fee payment of ₹500 was completed and verified successfully.
                </p>
              </div>

              {/* Activation Notice */}
              <div className="p-4 rounded-xl border border-green-500/10 bg-green-500/5 text-xs text-muted-foreground leading-relaxed">
                🚀 <strong className="text-green-800">Your Property is Live!</strong> Potentials tenants can now discover, view details, and contact you directly regarding your Hyderabad listing.
              </div>

              {/* Details breakdown */}
              <div className="border-y border-border py-4.5 text-left text-xs space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="font-semibold text-foreground">₹500.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction Type</span>
                  <span className="font-semibold text-foreground">Property Activation Fee</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-semibold text-green-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    Captured / Active
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col gap-3">
                <Button asChild variant="hero" size="lg" className="w-full font-semibold">
                  <Link to="/dashboard">
                    Go to Owner Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full">
                  <Link to="/properties">
                    <Building2 className="w-4 h-4 mr-2" />
                    Browse Active Listings
                  </Link>
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

export default PaymentSuccess;
