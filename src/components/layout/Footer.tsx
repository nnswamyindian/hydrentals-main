import { Link } from 'react-router-dom';
import {
  Mail,
  Phone,
  MapPin,
  Facebook,
  Youtube,
  Instagram,
  MessageCircle
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import logo from '@/assets/hydrent-logo.png';

const Footer = () => {
  const { t } = useLanguage();

  const socialLinks = [
    {
      icon: Facebook,
      url: 'https://www.facebook.com/hydrentals_official/',
    },
    {
      icon: Youtube,
      url: 'https://www.Youtube.com/@HydRentalsOfficial',
    },
    {
      icon: Instagram,
      url: 'https://www.instagram.com/hydrentals_official/',
    },
    {
      icon: MessageCircle,
      url: 'https://chat.whatsapp.com/BTyHbbf6Edj33I0aVnWuOA',
    },
  ];

  return (
    <footer className="bg-foreground text-background">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">

          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 group">
              <img
                src={logo}
                alt="HydRent Logo"
                className="h-40 md:h-48 w-auto transition-transform hover:scale-105"
              />
            </Link>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('footer.tagline')}
            </p>

            <div className="flex gap-3">
              {socialLinks.map(({ icon: Icon, url }, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Social Link ${i + 1}`}
                  className="w-9 h-9 rounded-lg bg-muted/10 flex items-center justify-center hover:bg-primary transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-semibold mb-4">
              {t('footer.quickLinks')}
            </h4>

            <ul className="space-y-3 text-sm text-muted-foreground">
              {[
                'Properties',
                'PG Accommodations',
                'Co-living Spaces',
                'Shared Rooms',
                'List Property',
              ].map((item) => (
                <li key={item}>
                  <Link
                    to="/properties"
                    className="hover:text-primary transition-colors"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Popular Localities */}
          <div>
            <h4 className="font-display font-semibold mb-4">
              {t('footer.popularAreas')}
            </h4>

            <ul className="space-y-3 text-sm text-muted-foreground">
              {[
                'HITEC City',
                'Gachibowli',
                'Madhapur',
                'Kondapur',
                'Jubilee Hills',
              ].map((item) => (
                <li key={item}>
                  <Link
                    to={`/properties?locality=${item}`}
                    className="hover:text-primary transition-colors"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-semibold mb-4">
              {t('footer.contactUs')}
            </h4>

            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-0.5 text-primary" />
                <span>
                  T-Hub Phase 2, Madhapur, Hyderabad, Telangana 500032
                </span>
              </li>

              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-primary" />
                <span>+91 9000207739</span>
              </li>

              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-primary" />
                <span>support@hydrentals.com</span>
              </li>
            </ul>
          </div>

        </div>

        <div className="border-t border-muted/20 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>{t('footer.rights')}</p>

          <div className="flex gap-6">
            <Link
              to="/privacy"
              className="hover:text-primary transition-colors"
            >
              {t('footer.privacy')}
            </Link>

            <Link
              to="/terms"
              className="hover:text-primary transition-colors"
            >
              {t('footer.terms')}
            </Link>

            <Link
              to="/rules"
              className="hover:text-primary transition-colors"
            >
              {t('footer.rentalRules')}
            </Link>

            <Link
              to="/contact"
              className="hover:text-primary transition-colors"
            >
              {t('footer.contactReport')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
