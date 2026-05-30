import { Link } from 'react-router-dom';
import { MapPin, ArrowRight, Train, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';

const localities = [
  {
    name: 'HITEC City',
    properties: 1200,
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop',
    highlight: 'IT Hub',
    metro: true,
  },
  {
    name: 'Gachibowli',
    properties: 890,
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop',
    highlight: 'Financial District',
    metro: true,
  },
  {
    name: 'Madhapur',
    properties: 750,
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
    highlight: 'Startup Hub',
    metro: true,
  },
  {
    name: 'Kondapur',
    properties: 680,
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop',
    highlight: 'Affordable Living',
    metro: true,
  },
  {
    name: 'Jubilee Hills',
    properties: 450,
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=300&fit=crop',
    highlight: 'Premium Area',
    metro: false,
  },
  {
    name: 'Banjara Hills',
    properties: 380,
    image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&h=300&fit=crop',
    highlight: 'Upscale Living',
    metro: false,
  },
];

const LocalitiesSection = () => {
  return (
    <section className="py-16 md:py-24">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold">
            Explore by Locality
          </h2>
          <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
            Browse properties in Hyderabad's most sought-after neighborhoods
          </p>
        </div>

        {/* Localities Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {localities.map((locality, index) => (
            <Link
              key={locality.name}
              to={`/properties?locality=${locality.name}`}
              className="group animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden">
                <img
                  src={locality.image}
                  alt={locality.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                
                {/* Content */}
                <div className="absolute inset-x-0 bottom-0 p-4 text-background">
                  <div className="flex items-center gap-1 text-xs mb-1">
                    {locality.metro && <Train className="w-3 h-3" />}
                    <span>{locality.highlight}</span>
                  </div>
                  <h3 className="font-display font-semibold text-lg leading-tight">
                    {locality.name}
                  </h3>
                  <p className="text-xs text-background/70 mt-0.5">
                    {locality.properties}+ properties
                  </p>
                </div>

                {/* Hover Arrow */}
                <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-4 h-4 text-background" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Map CTA */}
        <div className="mt-10 text-center">
          <Link to="/map">
            <Button variant="teal" size="lg" className="gap-2">
              <MapPin className="w-5 h-5" />
              Explore on Map
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default LocalitiesSection;
