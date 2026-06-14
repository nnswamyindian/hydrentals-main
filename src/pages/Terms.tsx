import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, AlertTriangle } from 'lucide-react';

const Terms = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <div className="container max-w-3xl py-8">
          <div className="mb-6">
            <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
              <FileText className="w-7 h-7" />
              Terms of Service
            </h1>
            <p className="text-muted-foreground mt-1">
              Last updated: February 2026
            </p>
          </div>

          <Card>
            <CardContent className="prose dark:prose-invert max-w-none pt-6">
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing and using HydRent ("the Platform"), you accept and agree to be bound by 
                the terms and provisions of this agreement. By creating an account, you confirm that 
                you have read, understood, and agree to these Terms of Service in their entirety.
              </p>

              <h2>2. Service Description</h2>
              <p>
                HydRent provides an online platform connecting property owners directly with potential 
                tenants in Hyderabad, India. We are a <strong>strictly broker-free platform</strong> that 
                facilitates transparent communication between genuine property owners and tenants. We are 
                not party to any rental agreements formed through the Platform.
              </p>

              <h2>3. User Responsibilities</h2>
              <p>As a user of HydRent, you agree to:</p>
              <ul>
                <li>Provide accurate and complete information during registration and listing</li>
                <li>Maintain the security of your account credentials</li>
                <li>Not engage in fraudulent activities, including but not limited to fake listings</li>
                <li>Respect other users and their privacy</li>
                <li>Not use GPS spoofing or any location-faking tools while listing properties</li>
                <li>Not impersonate another person or misrepresent your identity or role</li>
              </ul>

              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 my-6 not-prose">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-destructive text-base mb-2">
                      4. Strict Anti-Broker Policy
                    </h3>
                    <p className="text-sm text-foreground leading-relaxed mb-3">
                      HydRent is a <strong>100% broker-free platform</strong>. Real estate brokers, agents, 
                      or intermediaries are <strong>strictly prohibited</strong> from using this platform 
                      to list properties or contact tenants/owners.
                    </p>
                    <p className="text-sm text-foreground leading-relaxed mb-2">
                      <strong>The following activities constitute violations:</strong>
                    </p>
                    <ul className="text-sm text-foreground list-disc pl-5 space-y-1 mb-3">
                      <li>Listing properties you do not own or have legal authority to rent</li>
                      <li>Acting as an intermediary between property owners and tenants</li>
                      <li>Charging brokerage fees, finder's fees, or any commission to users</li>
                      <li>Creating multiple fake accounts to list properties on behalf of others</li>
                      <li>Soliciting users off-platform to charge commissions</li>
                      <li>Posing as a property owner when you are operating as a broker/agent</li>
                    </ul>
                    <p className="text-sm text-foreground leading-relaxed mb-2">
                      <strong>Consequences of violations:</strong>
                    </p>
                    <ul className="text-sm text-foreground list-disc pl-5 space-y-1">
                      <li>Immediate and permanent account suspension</li>
                      <li>Removal of all associated listings without refund</li>
                      <li>Reporting to local authorities and relevant regulatory bodies</li>
                      <li><strong>Legal action under applicable Indian laws</strong>, including but not limited 
                        to the Information Technology Act, 2000, Indian Penal Code (fraud/cheating provisions), 
                        and Consumer Protection Act, 2019</li>
                      <li>Recovery of damages caused to the Platform and its users</li>
                    </ul>
                  </div>
                </div>
              </div>

              <h2>5. Listing Guidelines</h2>
              <p>Property owners must:</p>
              <ul>
                <li>Only list properties they legally own or have authorized permission to rent</li>
                <li>Provide accurate property descriptions, pricing, and GPS-verified images</li>
                <li>Capture property photos using HydRent's in-app camera (gallery uploads are not permitted)</li>
                <li>Be physically present at the property location when capturing GPS coordinates</li>
                <li>Maintain fair and transparent pricing practices</li>
                <li>Respond to tenant inquiries in a timely and honest manner</li>
                <li>Not use any GPS spoofing or location-faking applications</li>
              </ul>

              <h2>6. GPS & Location Verification</h2>
              <p>
                HydRent employs GPS verification technology to ensure authentic property listings. 
                By using the Platform, you agree to:
              </p>
              <ul>
                <li>Allow GPS access when capturing property photos and setting property locations</li>
                <li>Not use any tools, applications, or methods to fake, spoof, or alter your GPS location</li>
                <li>Acknowledge that GPS spoofing is a violation that may result in account termination and legal action</li>
                <li>Accept that HydRent may implement additional anti-fraud measures at any time</li>
              </ul>

              <h2>7. Fees</h2>
              <p>
                A listing fee of ₹500 applies for each property listed on the platform. This fee is 
                non-refundable once the property is approved. No brokerage or commission fees are charged 
                by HydRent to tenants or owners at any point.
              </p>

              <h2>8. User Verification</h2>
              <p>
                HydRent may require identity verification (including Aadhaar/ID proof) for property owners. 
                This is to ensure the authenticity of listings and protect all users. Verification documents 
                are handled in compliance with applicable data protection regulations.
              </p>

              <h2>9. Reporting Violations</h2>
              <p>
                Users are encouraged to report any suspected broker activity, fake listings, or policy 
                violations through the Platform's reporting system or by contacting support@hydrentals.com. 
                All reports will be investigated, and appropriate action will be taken within 48 hours.
              </p>

              <h2>10. Limitation of Liability</h2>
              <p>
                HydRent is not responsible for any disputes between tenants and property owners. 
                We recommend conducting thorough due diligence before entering into any rental agreements. 
                HydRent does not guarantee the accuracy of user-provided information despite our verification processes.
              </p>

              <h2>11. Termination</h2>
              <p>
                HydRent reserves the right to suspend or terminate any user account that violates these 
                Terms of Service, with or without prior notice. In cases of broker infiltration or 
                fraudulent activity, termination is immediate and all associated data may be preserved 
                for legal proceedings.
              </p>

              <h2>12. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of India, 
                with the courts of Hyderabad, Telangana having exclusive jurisdiction over any disputes.
              </p>

              <h2>13. Contact</h2>
              <p>
                For questions about these terms, contact us at legal@hydrent.in
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Terms;