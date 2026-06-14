import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollText } from 'lucide-react';

const Rules = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <div className="container max-w-3xl py-8">
          <div className="mb-6">
            <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
              <ScrollText className="w-7 h-7" />
              Rental Rules
            </h1>
            <p className="text-muted-foreground mt-1">
              Guidelines for tenants and property owners
            </p>
          </div>

          <Card>
            <CardContent className="prose dark:prose-invert max-w-none pt-6">
              <h2>For Tenants</h2>
              
              <h3>Before Renting</h3>
              <ul>
                <li>Verify your identity through our platform</li>
                <li>Read property descriptions carefully</li>
                <li>Visit the property before making a commitment</li>
                <li>Check all amenities and facilities</li>
                <li>Understand the rental agreement terms</li>
              </ul>

              <h3>During Your Stay</h3>
              <ul>
                <li>Pay rent on time as agreed</li>
                <li>Maintain the property in good condition</li>
                <li>Follow the house rules set by the owner</li>
                <li>Report any maintenance issues promptly</li>
                <li>Respect neighbors and maintain peace</li>
              </ul>

              <h2>For Property Owners</h2>

              <h3>Listing Properties</h3>
              <ul>
                <li>Provide accurate and up-to-date information</li>
                <li>Upload clear, recent photos of the property</li>
                <li>Mention all amenities and facilities available</li>
                <li>Be transparent about terms and conditions</li>
                <li>Complete identity verification</li>
              </ul>

              <h3>Managing Tenants</h3>
              <ul>
                <li>Respond to inquiries within 24 hours</li>
                <li>Maintain the property as advertised</li>
                <li>Provide proper rental receipts</li>
                <li>Address maintenance issues promptly</li>
                <li>Follow local rental laws and regulations</li>
              </ul>

              <h2>Security Deposits</h2>
              <p>
                Security deposits should typically be 2-3 months of rent. Both parties should sign 
                a proper rental agreement. The deposit should be returned within 30 days of vacating, 
                after deducting any legitimate damages.
              </p>

              <h2>Dispute Resolution</h2>
              <p>
                In case of disputes, both parties are encouraged to communicate and resolve issues 
                amicably. For unresolved issues, contact our support team at support@hydrentals.com
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Rules;
