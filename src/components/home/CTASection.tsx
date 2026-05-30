import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, ArrowRight, Building2, Users } from 'lucide-react';

const CTASection = () => {
  return (
    <section className="py-16 md:py-24">
      <div className="container">
        <div className="grid md:grid-cols-2 gap-6">
          {/* For Tenants */}
          <div className="relative overflow-hidden rounded-3xl gradient-hero p-8 md:p-10 text-primary-foreground">
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="font-display text-2xl md:text-3xl font-bold mb-3">
                Looking for a Place?
              </h3>
              <p className="text-primary-foreground/80 mb-6 max-w-sm">
                Browse thousands of verified properties. Find your perfect home 
                near IT hubs, colleges, and metro stations.
              </p>
              <Link to="/properties">
                <Button variant="glass" size="lg" className="gap-2">
                  Explore Properties
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            
            {/* Decorative */}
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute right-10 top-10 w-24 h-24 bg-white/10 rounded-full blur-xl" />
          </div>

          {/* For Owners */}
          <div className="relative overflow-hidden rounded-3xl gradient-teal p-8 md:p-10 text-secondary-foreground">
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6">
                <Building2 className="w-7 h-7" />
              </div>
              <h3 className="font-display text-2xl md:text-3xl font-bold mb-3">
                Own a Property?
              </h3>
              <p className="text-secondary-foreground/80 mb-6 max-w-sm">
                List your property for free and reach thousands of verified tenants. 
                Get quality leads directly in your inbox.
              </p>
              <Link to="/list-property">
                <Button variant="glass" size="lg" className="gap-2">
                  <Plus className="w-4 h-4" />
                  List Your Property
                </Button>
              </Link>
            </div>
            
            {/* Decorative */}
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute right-10 top-10 w-24 h-24 bg-white/10 rounded-full blur-xl" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
