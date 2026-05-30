import { Card, CardContent } from '@/components/ui/card';
import {
  ShieldCheck,
  Users,
  MapPin,
  Camera,
  Heart,
  Scale,
  Ban,
  BadgeCheck,
} from 'lucide-react';

const reasons = [
  {
    icon: Ban,
    title: 'Zero Brokerage, Always',
    description:
      'We eliminate middlemen completely. Connect directly with verified property owners and save thousands in brokerage fees.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified Listings Only',
    description:
      'Every property undergoes admin verification. GPS-tagged photos ensure listings are authentic and up-to-date.',
  },
  {
    icon: Camera,
    title: 'Anti-Fraud Technology',
    description:
      'Our GPS verification and live camera capture prevent fake listings. No stock photos, no fabricated locations.',
  },
  {
    icon: Users,
    title: 'Community First',
    description:
      'We\'re building a transparent rental ecosystem for Hyderabad — empowering tenants and honest property owners alike.',
  },
  {
    icon: Scale,
    title: 'Legal Compliance',
    description:
      'All listings comply with Telangana rental laws. We enforce fair practices and take legal action against broker infiltration.',
  },
  {
    icon: Heart,
    title: 'Supporting Society',
    description:
      'By removing brokers, we make housing affordable for students, working professionals, and families moving to Hyderabad.',
  },
  {
    icon: MapPin,
    title: 'Hyderabad Focused',
    description:
      'Deep knowledge of every locality — HITEC City, Gachibowli, Madhapur, Kondapur and beyond. We know your neighborhoods.',
  },
  {
    icon: BadgeCheck,
    title: 'Strict Anti-Broker Policy',
    description:
      'Brokers posing as owners will be identified, banned, and reported. We use verification checks and user reports to keep the platform clean.',
  },
];

const WhyHydRentalsSection = () => {
  return (
    <section className="py-16 md:py-24">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">
            Why HydRentals?
          </h2>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            We're not just another rental platform. HydRent is a movement to make renting in 
            Hyderabad fair, transparent, and broker-free. Here's how we're different and why 
            thousands trust us.
          </p>
        </div>

        {/* Reasons Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {reasons.map((reason, i) => (
            <Card
              key={i}
              className="group hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1"
            >
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <reason.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{reason.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {reason.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Impact Statement */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6 pb-6">
            <div className="text-center max-w-2xl mx-auto">
              <h3 className="font-display text-xl font-bold mb-3">
                Our Promise to Hyderabad
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Brokers exploit tenants and owners with unfair commissions — often charging 1-2 months' 
                rent. HydRent exists to end this. We verify every listing, prevent fraud with GPS technology, 
                and connect genuine tenants with genuine owners. If any broker is found operating on our 
                platform, <strong>we take strict legal action</strong> as outlined in our Terms & Conditions.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default WhyHydRentalsSection;