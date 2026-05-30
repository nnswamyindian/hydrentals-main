import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

const Privacy = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <div className="container max-w-3xl py-8">
          <div className="mb-6">
            <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Shield className="w-7 h-7" />
              Privacy Policy
            </h1>
            <p className="text-muted-foreground mt-1">
              Last updated: February 2024
            </p>
          </div>

          <Card>
            <CardContent className="prose dark:prose-invert max-w-none pt-6">
              <h2>1. Information We Collect</h2>
              <p>
                We collect information you provide directly to us, such as when you create an account, 
                list a property, or contact us for support. This may include your name, email address, 
                phone number, and property details.
              </p>

              <h2>2. How We Use Your Information</h2>
              <p>
                We use the information we collect to:
              </p>
              <ul>
                <li>Provide, maintain, and improve our services</li>
                <li>Connect tenants with property owners</li>
                <li>Send you notifications and updates</li>
                <li>Respond to your comments, questions, and requests</li>
              </ul>

              <h2>3. Information Sharing</h2>
              <p>
                We do not sell your personal information. We may share your information only in the 
                following circumstances:
              </p>
              <ul>
                <li>With your consent</li>
                <li>To comply with legal obligations</li>
                <li>To protect our rights and safety</li>
              </ul>

              <h2>4. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal 
                information against unauthorized access, alteration, disclosure, or destruction.
              </p>

              <h2>5. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us at 
                privacy@hydrent.in
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Privacy;
