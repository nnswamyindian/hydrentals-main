import { Link, useLocation } from 'react-router-dom';
import { Home, Search, MapPin, Heart, MessageSquare, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const MobileBottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/properties', label: 'Search', icon: Search },
    { href: '/map', label: 'Map', icon: MapPin },
    { href: '/favorites', label: 'Favorites', icon: Heart, requiresAuth: true },
    { href: '/messages', label: 'Chat', icon: MessageSquare, requiresAuth: true },
  ];

  const visibleItems = navItems.filter(item => !item.requiresAuth || user);

  // Add auth link if not logged in
  if (!user) {
    visibleItems.push({ href: '/auth', label: 'Sign In', icon: User, requiresAuth: false });
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs transition-colors",
              isActive(item.href)
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <item.icon className={cn("w-5 h-5", isActive(item.href) && "text-primary")} />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
