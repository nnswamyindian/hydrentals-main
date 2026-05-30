import SearchBar from '@/components/search/SearchBar';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, Building2, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

const HeroSection = () => {
  const { t } = useLanguage();

  const stats = [
    { icon: Building2, value: '10,000+', label: t('hero.stat.properties') },
    { icon: Users, value: '50,000+', label: t('hero.stat.tenants') },
    { icon: ShieldCheck, value: '100%', label: t('hero.stat.verified') },
  ];

  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/50" />
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Decorative Elements */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse-slow" />

      <div className="container relative z-10 py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <Badge 
            variant="outline" 
            className="px-4 py-2 text-sm font-medium bg-card border-primary/20 animate-fade-in"
          >
            <MapPin className="w-4 h-4 mr-2 text-primary" />
            {t('hero.badge')}
          </Badge>

          {/* Headline */}
          <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              {t('hero.title1')}
              <span className="block text-gradient">{t('hero.title2')}</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('hero.subtitle')}
            </p>
          </div>

          {/* Search Bar */}
          <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <SearchBar variant="hero" className="max-w-3xl mx-auto" />
          </div>

          {/* Popular Searches */}
          <div className="flex flex-wrap items-center justify-center gap-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <span className="text-sm text-muted-foreground">{t('hero.popular')}</span>
            {['HITEC City PG', 'Gachibowli 2BHK', 'Madhapur Co-living', 'Kondapur Furnished'].map((term) => (
              <Badge 
                key={term} 
                variant="secondary" 
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {term}
              </Badge>
            ))}
          </div>

          {/* Stats */}
          <div 
            className="grid grid-cols-3 gap-4 md:gap-8 pt-8 max-w-lg mx-auto animate-fade-in" 
            style={{ animationDelay: '0.4s' }}
          >
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                <p className="font-display text-2xl md:text-3xl font-bold">{stat.value}</p>
                <p className="text-xs md:text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
