import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/home/HeroSection';
import FeaturedProperties from '@/components/home/FeaturedProperties';
import LocalitiesSection from '@/components/home/LocalitiesSection';
import FeaturesSection from '@/components/home/FeaturesSection';
import TestimonialsSection from '@/components/home/TestimonialsSection';
import WhyHydRentalsSection from '@/components/home/WhyHydRentalsSection';
import CTASection from '@/components/home/CTASection';
import SEOHead from '@/components/seo/SEOHead';

const Index = () => {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: 'HydRent',
    url: 'https://hydrentals.lovable.app',
    description: 'Find verified rental properties in Hyderabad. Browse PGs, apartments, co-living spaces near HITEC City, Gachibowli, Madhapur.',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Hyderabad',
      addressRegion: 'Telangana',
      postalCode: '500081',
      addressCountry: 'IN',
    },
    areaServed: {
      '@type': 'City',
      name: 'Hyderabad',
    },
    sameAs: [],
  };

  return (
    <div className="min-h-screen flex flex-col pb-16 md:pb-0">
      <SEOHead
        title="Verified PGs, Flats & Apartments for Rent in Hyderabad - Broker-Free | HydRent"
        description="Find direct owner flats, verified hostels, PG rooms, and co-living spaces for rent in Hyderabad (Gachibowli, Madhapur, Kondapur, HITEC City). No broker fees, instant setup!"
        jsonLd={jsonLd}
      />
      <Header />
      <main className="flex-1">
        <HeroSection />
        <FeaturedProperties />
        <LocalitiesSection />
        <FeaturesSection />
        <TestimonialsSection />
        <WhyHydRentalsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
