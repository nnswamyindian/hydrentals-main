import { useState } from 'react';
import logo from '@/assets/logo.svg';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
'@/components/ui/dropdown-menu';
import {
  Home,
  Search,
  Heart,
  User,
  Menu,
  X,
  Plus,
  MapPin,
  LayoutDashboard,
  LogOut,
  Settings,
  MessageSquare,
  Shield,
  FileText,
  BookOpen,
  Calculator,
  GitCompareArrows } from
'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/i18n/LanguageContext';
import NotificationBell from '@/components/notifications/NotificationBell';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { user, profile, signOut, isLoading } = useAuth();
  const { t } = useLanguage();

  const navLinks = [
  { href: '/', label: t('nav.home'), icon: Home },
  { href: '/properties', label: t('nav.properties'), icon: Search },
  { href: '/map', label: t('nav.mapView'), icon: MapPin },
  { href: '/rent-calculator', label: t('nav.rentCalculator'), icon: Calculator },
  { href: '/compare', label: t('nav.compare'), icon: GitCompareArrows },
  { href: '/favorites', label: t('nav.favorites'), icon: Heart },
  { href: '/contact', label: t('nav.contact'), icon: Shield },
  { href: '/rules', label: t('nav.rules'), icon: BookOpen }];


  const isActive = (path: string) => location.pathname === path;

  const initials = profile?.full_name?.
  split(' ').
  map((n) => n[0]).
  join('').
  toUpperCase() || user?.email?.[0].toUpperCase() || 'U';

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="sticky top-0 z-50 w-full glass-effect border-b border-border/50">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <img src={logo} alt="HydRent Logo" className="h-24 md:h-32 w-auto transition-transform hover:scale-105" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) =>
          <Link key={link.href} to={link.href}>
              <Button
              variant={isActive(link.href) ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "gap-2",
                isActive(link.href) && "bg-secondary/80"
              )}>
              
                <link.icon className="w-4 h-4" />
                {link.label}
              </Button>
            </Link>
          )}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          {!isLoading && user ?
          <>
              <Link to="/add-property">
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  {t('nav.listProperty')}
                </Button>
              </Link>
              <LanguageSwitcher />
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="flex items-center gap-2">
                      <LayoutDashboard className="w-4 h-4" />
                      {t('nav.dashboard')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/messages" className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      {t('nav.messages')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/favorites" className="flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      {t('nav.favorites')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      {t('nav.settings')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    {t('nav.signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </> :

          <>
              <Link to="/add-property">
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  {t('nav.listProperty')}
                </Button>
              </Link>
              <LanguageSwitcher />
              <Link to="/auth">
                <Button variant="hero" size="sm" className="gap-2">
                  <User className="w-4 h-4" />
                  {t('nav.signIn')}
                </Button>
              </Link>
            </>
          }
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}>
          
          {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen &&
      <div className="md:hidden absolute top-16 left-0 right-0 bg-background border-b border-border animate-fade-in">
          <nav className="container py-4 flex flex-col gap-2">
            {navLinks.map((link) =>
          <Link
            key={link.href}
            to={link.href}
            onClick={() => setIsMenuOpen(false)}>
            
                <Button
              variant={isActive(link.href) ? "secondary" : "ghost"}
              className="w-full justify-start gap-3">
              
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Button>
              </Link>
          )}
            <div className="border-t border-border my-2" />
            <div className="flex items-center gap-2 px-4 py-2">
              <LanguageSwitcher />
              <span className="text-sm text-muted-foreground">Language</span>
            </div>
            {user ?
          <>
                <Link to="/dashboard" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start gap-3">
                    <LayoutDashboard className="w-4 h-4" />
                    {t('nav.dashboard')}
                  </Button>
                </Link>
                <Link to="/messages" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start gap-3">
                    <MessageSquare className="w-4 h-4" />
                    {t('nav.messages')}
                  </Button>
                </Link>
                <Link to="/add-property" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="outline" className="w-full justify-start gap-3">
                    <Plus className="w-4 h-4" />
                    {t('nav.listProperty')}
                  </Button>
                </Link>
                <Link to="/settings" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start gap-3">
                    <Settings className="w-4 h-4" />
                    {t('nav.settings')}
                  </Button>
                </Link>
                <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive"
              onClick={() => {handleSignOut();setIsMenuOpen(false);}}>
              
                  <LogOut className="w-4 h-4" />
                  {t('nav.signOut')}
                </Button>
              </> :

          <>
                <Link to="/add-property" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="outline" className="w-full justify-start gap-3">
                    <Plus className="w-4 h-4" />
                    {t('nav.listProperty')}
                  </Button>
                </Link>
                <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="hero" className="w-full justify-start gap-3">
                    <User className="w-4 h-4" />
                    {t('nav.signIn')}
                  </Button>
                </Link>
              </>
          }
          </nav>
        </div>
      }
    </header>);

};

export default Header;