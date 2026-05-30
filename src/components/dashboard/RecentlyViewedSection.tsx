import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, ArrowRight, MapPin } from 'lucide-react';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';

const RecentlyViewedSection = () => {
  const { items } = useRecentlyViewed();

  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Recently Viewed
          </CardTitle>
          <CardDescription>Properties you've looked at recently</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.slice(0, 6).map((item) => (
            <Link
              key={item.id}
              to={`/property/${item.id}`}
              className="flex gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
            >
              {item.image && (
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-16 h-16 rounded-lg object-cover shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{item.title}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" />
                  {item.locality}
                </p>
                <p className="text-sm font-semibold mt-1">₹{item.rent.toLocaleString()}/mo</p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentlyViewedSection;
