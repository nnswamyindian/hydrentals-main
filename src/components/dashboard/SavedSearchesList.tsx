import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bookmark, ArrowRight, Trash2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const db = supabase as any;

interface SavedSearch {
  id: string;
  name: string;
  filters: Record<string, any>;
  created_at: string;
}

const SavedSearchesList = () => {
  const { user } = useAuth();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await db
        .from('saved_searches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (data) setSearches(data);
      setIsLoading(false);
    };
    fetch();
  }, [user]);

  const handleDelete = async (id: string) => {
    const { error } = await db.from('saved_searches').delete().eq('id', id);
    if (!error) {
      setSearches((prev) => prev.filter((s) => s.id !== id));
      toast.success('Search deleted');
    }
  };

  const buildSearchUrl = (filters: Record<string, any>) => {
    const params = new URLSearchParams();
    if (filters.locality) params.set('locality', filters.locality);
    if (filters.selectedTypes?.length) params.set('types', filters.selectedTypes.join(','));
    return `/properties?${params.toString()}`;
  };

  if (isLoading) return null;
  if (searches.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-primary" />
            Saved Searches
          </CardTitle>
          <CardDescription>Quickly re-run your saved searches</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {searches.map((search) => (
            <div key={search.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <div className="flex items-center gap-3 flex-1">
                <Search className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{search.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(search.created_at).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link to={buildSearchUrl(search.filters)}>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(search.id)}>
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SavedSearchesList;
