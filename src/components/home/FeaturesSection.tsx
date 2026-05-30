import { 
  ShieldCheck, 
  MapPin, 
  MessageCircle, 
  Bell, 
  Star, 
  Search,
  Users,
  FileCheck
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

const FeaturesSection = () => {
  const { t } = useLanguage();

  const features = [
    { icon: ShieldCheck, title: t('features.verifiedListings'), description: t('features.verifiedListingsDesc'), color: 'bg-primary/10 text-primary' },
    { icon: MapPin, title: t('features.interactiveMaps'), description: t('features.interactiveMapsDesc'), color: 'bg-secondary/10 text-secondary' },
    { icon: MessageCircle, title: t('features.directChat'), description: t('features.directChatDesc'), color: 'bg-accent/20 text-accent-foreground' },
    { icon: Bell, title: t('features.smartAlerts'), description: t('features.smartAlertsDesc'), color: 'bg-primary/10 text-primary' },
    { icon: Star, title: t('features.reviews'), description: t('features.reviewsDesc'), color: 'bg-secondary/10 text-secondary' },
    { icon: Search, title: t('features.aiRecommendations'), description: t('features.aiRecommendationsDesc'), color: 'bg-accent/20 text-accent-foreground' },
    { icon: Users, title: t('features.flatmateFinder'), description: t('features.flatmateFinderDesc'), color: 'bg-primary/10 text-primary' },
    { icon: FileCheck, title: t('features.legalCompliance'), description: t('features.legalComplianceDesc'), color: 'bg-secondary/10 text-secondary' },
  ];

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold">
            {t('features.title')}
          </h2>
          <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
            {t('features.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-card rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-shadow animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
