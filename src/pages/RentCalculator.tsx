import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Calculator, IndianRupee, TrendingUp, Home, ArrowRight, PiggyBank, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

const RentCalculator = () => {
  const [monthlyIncome, setMonthlyIncome] = useState(50000);
  const [rentPercentage, setRentPercentage] = useState(30);
  const [matchingCount, setMatchingCount] = useState<number | null>(null);

  const recommendedRent = Math.round((monthlyIncome * rentPercentage) / 100);
  const maxRent = Math.round(recommendedRent * 1.2);
  const minRent = Math.round(recommendedRent * 0.7);

  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await db
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved')
        .gte('rent', minRent)
        .lte('rent', maxRent);
      setMatchingCount(count || 0);
    };
    fetchCount();
  }, [minRent, maxRent]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-8 px-4">
        <div className="container max-w-3xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Calculator className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl font-bold mb-2">Rent Affordability Calculator</h1>
            <p className="text-muted-foreground">Find out how much rent you can comfortably afford</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Input Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Your Income
                </CardTitle>
                <CardDescription>Enter your monthly income details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="income">Monthly Income (₹)</Label>
                  <Input
                    id="income"
                    type="number"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(Number(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Rent Budget: {rentPercentage}% of income</Label>
                  <p className="text-xs text-muted-foreground mb-3">Experts recommend spending 25-30% of income on rent</p>
                  <Slider
                    value={[rentPercentage]}
                    onValueChange={([v]) => setRentPercentage(v)}
                    min={10}
                    max={50}
                    step={5}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>10%</span>
                    <span>30% (Ideal)</span>
                    <span>50%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Result Section */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PiggyBank className="w-5 h-5 text-primary" />
                  Recommended Rent
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="text-center p-6 rounded-xl bg-primary/5">
                  <p className="text-sm text-muted-foreground mb-1">Your ideal rent range</p>
                  <p className="font-display text-3xl font-bold text-primary">
                    ₹{minRent.toLocaleString('en-IN')} – ₹{maxRent.toLocaleString('en-IN')}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">per month</p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Monthly Income</span>
                    <span className="font-medium">₹{monthlyIncome.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Recommended Rent ({rentPercentage}%)</span>
                    <span className="font-medium">₹{recommendedRent.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Remaining for Expenses</span>
                    <span className="font-medium">₹{(monthlyIncome - recommendedRent).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {matchingCount !== null && (
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-bold text-foreground">{matchingCount}</span> properties match your budget
                    </p>
                    <Button asChild size="sm" className="mt-2 gap-1">
                      <Link to={`/properties?minBudget=${minRent}&maxBudget=${maxRent}`}>
                        View Properties <ArrowRight className="w-3 h-3" />
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tips */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Smart Renting Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { title: '30% Rule', desc: 'Keep rent under 30% of your income to maintain financial health.' },
                  { title: 'Factor All Costs', desc: 'Include maintenance, electricity, water, and internet in your budget.' },
                  { title: 'Negotiate Smartly', desc: 'Longer lease commitments often lead to better rental rates.' },
                ].map((tip) => (
                  <div key={tip.title} className="p-4 rounded-lg bg-muted/50">
                    <p className="font-medium text-sm">{tip.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{tip.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RentCalculator;
