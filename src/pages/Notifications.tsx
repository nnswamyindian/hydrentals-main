import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Bell, ArrowLeft, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: string | null;
  is_read: boolean;
  created_at: string;
}

const db = supabase as any;

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const getNotificationRoute = (type: string | null) => {
    if (type && type.startsWith('/')) {
      return type;
    }
    switch (type) {
      case 'property_approved':
      case 'property_rejected':
        return '/my-properties';
      case 'new_message':
        return '/messages';
      case 'verification_update':
        return '/settings';
      case 'payment_received':
        return '/dashboard';
      default:
        return null;
    }
  };

  useEffect(() => {
    const fetch = async () => {
      const { data } = await db
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) {
        const mapped = (data || []).map((n: any) => ({
          ...n,
          message: n.body,
          type: n.link || 'info',
        }));
        setNotifications(mapped as Notification[]);
      }
      setIsLoading(false);
    };
    fetch();
  }, []);

  const markAsRead = async (id: string) => {
    await db.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await db.from('notifications').update({ is_read: true }).in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/dashboard"><ArrowLeft className="w-4 h-4 mr-2" />Back to Dashboard</Link>
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold">Notifications</h1>
              <p className="text-muted-foreground">{unreadCount} unread</p>
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="w-4 h-4 mr-2" />Mark All Read
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              All Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading...</p>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                      n.is_read ? 'bg-card border-border' : 'bg-primary/5 border-primary/20'
                    }`}
                    onClick={() => {
                      if (!n.is_read) markAsRead(n.id);
                      const route = getNotificationRoute(n.type);
                      if (route) navigate(route);
                    }}
                  >
                    <Bell className={`w-4 h-4 mt-1 shrink-0 ${n.is_read ? 'text-muted-foreground' : 'text-primary'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium ${n.is_read ? '' : 'text-primary'}`}>{n.title}</p>
                        {!n.is_read && <Badge variant="secondary" className="text-xs">New</Badge>}
                      </div>
                      {n.message && <p className="text-xs text-muted-foreground mt-1">{n.message}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Notifications;
