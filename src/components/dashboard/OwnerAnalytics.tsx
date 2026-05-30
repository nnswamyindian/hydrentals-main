import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Heart, MessageSquare, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const db = supabase as any;

interface PropertyStat {
  id: string;
  title: string;
  views: number;
  favorites: number;
  messages: number;
}

const OwnerAnalytics = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<PropertyStat[]>([]);
  const [totals, setTotals] = useState({ views: 0, favorites: 0, messages: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchAnalytics = async () => {
      try {
        // Get owner's properties
        const { data: properties } = await db
          .from('properties')
          .select('id, title')
          .eq('owner_id', user.id);

        if (!properties?.length) {
          setIsLoading(false);
          return;
        }

        const propertyIds = properties.map((p: any) => p.id);

        // Fetch counts in parallel
        const [viewsRes, favsRes, msgsRes] = await Promise.all([
          db.from('property_views').select('property_id').in('property_id', propertyIds),
          db.from('favorites').select('property_id').in('property_id', propertyIds),
          db.from('messages').select('property_id').eq('receiver_id', user.id),
        ]);

        const viewCounts: Record<string, number> = {};
        const favCounts: Record<string, number> = {};
        const msgCounts: Record<string, number> = {};

        (viewsRes.data || []).forEach((v: any) => { viewCounts[v.property_id] = (viewCounts[v.property_id] || 0) + 1; });
        (favsRes.data || []).forEach((f: any) => { favCounts[f.property_id] = (favCounts[f.property_id] || 0) + 1; });
        (msgsRes.data || []).forEach((m: any) => { if (m.property_id) msgCounts[m.property_id] = (msgCounts[m.property_id] || 0) + 1; });

        const propStats = properties.map((p: any) => ({
          id: p.id,
          title: p.title.length > 20 ? p.title.slice(0, 20) + '…' : p.title,
          views: viewCounts[p.id] || 0,
          favorites: favCounts[p.id] || 0,
          messages: msgCounts[p.id] || 0,
        }));

        setStats(propStats);
        setTotals({
          views: Object.values(viewCounts).reduce((a: number, b: number) => a + b, 0),
          favorites: Object.values(favCounts).reduce((a: number, b: number) => a + b, 0),
          messages: Object.values(msgCounts).reduce((a: number, b: number) => a + b, 0),
        });
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, [user]);

  if (isLoading) return null;

  const summaryStats = [
    { label: 'Total Views', value: totals.views, icon: Eye, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { label: 'Total Favorites', value: totals.favorites, icon: Heart, color: 'text-rose-500', bgColor: 'bg-rose-500/10' },
    { label: 'Total Inquiries', value: totals.messages, icon: MessageSquare, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  ];

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {summaryStats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <div className={`w-8 h-8 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      {stats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Property Performance
            </CardTitle>
            <CardDescription>Views per property</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats}>
                  <XAxis dataKey="title" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="views" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OwnerAnalytics;
