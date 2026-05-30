import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Star, Play, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

interface Testimonial {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  rating: number;
  text: string;
  videoUrl?: string;
  locality: string;
}

const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Priya Sharma',
    role: 'Tenant',
    rating: 5,
    text: 'HydRent made my house hunting in Hyderabad so easy! I found a perfect 2BHK near HITEC City within a week. No brokers, no hidden charges. The GPS-verified photos gave me confidence that the listings were genuine.',
    locality: 'HITEC City',
  },
  {
    id: '2',
    name: 'Rajesh Kumar',
    role: 'Property Owner',
    rating: 5,
    text: 'As a property owner, I was tired of dealing with brokers taking huge commissions. HydRent connects me directly with verified tenants. My apartment in Gachibowli was rented out in just 3 days!',
    locality: 'Gachibowli',
  },
  {
    id: '3',
    name: 'Sneha Reddy',
    role: 'Tenant',
    rating: 4,
    text: 'Being new to Hyderabad for my IT job, I was worried about finding a safe PG. HydRent\'s verified listings and direct owner communication made the process transparent and trustworthy.',
    locality: 'Madhapur',
  },
  {
    id: '4',
    name: 'Mohammed Akhil',
    role: 'Property Owner',
    rating: 5,
    text: 'The admin verification process ensures only genuine tenants reach out. I\'ve listed 3 properties on HydRent and each one was rented quickly. Best part — zero brokerage!',
    locality: 'Kondapur',
  },
  {
    id: '5',
    name: 'Ananya Gupta',
    role: 'Tenant',
    rating: 5,
    text: 'I love how HydRent shows properties on a map. I could find rentals near my office and metro station easily. The in-app chat made it super convenient to talk to owners directly.',
    locality: 'Jubilee Hills',
  },
  {
    id: '6',
    name: 'Vikram Patel',
    role: 'Tenant',
    rating: 5,
    text: 'What I appreciate most about HydRent is their strict no-broker policy. Every listing is verified and the GPS feature ensures photos are taken at the actual property. Highly recommend!',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    locality: 'Kukatpally',
  },
];

const TestimonialsSection = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const [videoOpen, setVideoOpen] = useState<string | null>(null);
  const itemsPerPage = 3;
  const totalPages = Math.ceil(testimonials.length / itemsPerPage);

  const visibleTestimonials = testimonials.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">
            Happy Clients, Real Stories
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Hear from tenants and property owners who found their perfect match through HydRent — 
            Hyderabad's trusted broker-free rental platform.
          </p>
        </div>

        {/* Testimonial Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {visibleTestimonials.map((t) => {
            const initials = t.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase();

            return (
              <Card key={t.id} className="relative overflow-hidden hover:shadow-card-hover transition-shadow">
                <CardContent className="pt-6 pb-6 flex flex-col h-full">
                  {/* Quote icon */}
                  <Quote className="w-8 h-8 text-primary/20 mb-3" />

                  {/* Rating */}
                  <div className="flex items-center gap-0.5 mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < t.rating ? 'fill-accent text-accent' : 'text-muted-foreground/30'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Text */}
                  <p className="text-muted-foreground text-sm leading-relaxed flex-1 mb-4">
                    "{t.text}"
                  </p>

                  {/* Video button */}
                  {t.videoUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mb-4 gap-2 w-fit"
                      onClick={() => setVideoOpen(t.videoUrl!)}
                    >
                      <Play className="w-3.5 h-3.5 fill-primary text-primary" />
                      Watch Video Feedback
                    </Button>
                  )}

                  {/* Author */}
                  <div className="flex items-center gap-3 pt-4 border-t">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={t.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.role} • {t.locality}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex gap-2">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    i === currentPage ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Video Dialog */}
        <Dialog open={!!videoOpen} onOpenChange={() => setVideoOpen(null)}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden">
            <div className="aspect-video">
              {videoOpen && (
                <iframe
                  src={videoOpen}
                  title="Client Video Feedback"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
};

export default TestimonialsSection;