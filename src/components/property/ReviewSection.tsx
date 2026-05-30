import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Star, Loader2, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const db = supabase as any;

interface Review {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_name?: string;
}

interface ReviewSectionProps {
  propertyId: string;
  ownerId: string;
}

const StarRating = ({ rating, onRate, interactive = false }: { rating: number; onRate?: (r: number) => void; interactive?: boolean }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        disabled={!interactive}
        onClick={() => onRate?.(star)}
        className={cn("transition-colors", interactive && "cursor-pointer hover:scale-110")}
      >
        <Star
          className={cn(
            "w-5 h-5",
            star <= rating ? "fill-accent text-accent" : "text-muted-foreground/30"
          )}
        />
      </button>
    ))}
  </div>
);

const ReviewSection = ({ propertyId, ownerId }: ReviewSectionProps) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userReview, setUserReview] = useState<Review | null>(null);

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  const fetchReviews = async () => {
    try {
      const { data, error } = await db
        .from('reviews')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user names for reviews
      const reviewsWithNames: Review[] = [];
      for (const review of data || []) {
        const { data: profile } = await db
          .from('profiles_public')
          .select('full_name')
          .eq('id', review.user_id)
          .single();
        reviewsWithNames.push({
          ...review,
          user_name: profile?.full_name || 'Anonymous',
        });
      }

      setReviews(reviewsWithNames);

      if (user) {
        const existing = reviewsWithNames.find((r) => r.user_id === user.id);
        if (existing) {
          setUserReview(existing);
          setNewRating(existing.rating);
          setNewComment(existing.comment || '');
        }
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      toast.error('Please sign in to leave a review');
      return;
    }
    if (newRating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    try {
      if (userReview) {
        const { error } = await db
          .from('reviews')
          .update({ rating: newRating, comment: newComment.trim() || null })
          .eq('id', userReview.id);
        if (error) throw error;
        toast.success('Review updated!');
      } else {
        const { error } = await db.from('reviews').insert({
          property_id: propertyId,
          user_id: user.id,
          rating: newRating,
          comment: newComment.trim() || null,
        });
        if (error) throw error;
        toast.success('Review submitted!');
      }
      fetchReviews();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const canReview = user && user.id !== ownerId;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Reviews ({reviews.length})
          </span>
          {avgRating && (
            <Badge variant="secondary" className="gap-1 text-base">
              <Star className="w-4 h-4 fill-accent text-accent" />
              {avgRating}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Review Form */}
        {canReview && (
          <div className="p-4 rounded-xl bg-muted/50 space-y-3">
            <p className="font-medium text-sm">{userReview ? 'Update Your Review' : 'Leave a Review'}</p>
            <StarRating rating={newRating} onRate={setNewRating} interactive />
            <Textarea
              placeholder="Share your experience (optional)..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <Button onClick={handleSubmitReview} disabled={isSubmitting || newRating === 0} size="sm">
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {userReview ? 'Update Review' : 'Submit Review'}
            </Button>
          </div>
        )}

        {/* Reviews List */}
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">No reviews yet. Be the first to review!</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="flex gap-3 p-3 rounded-lg border border-border">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold shrink-0">
                  {(review.user_name || 'A').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{review.user_name}</p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <StarRating rating={review.rating} />
                  {review.comment && (
                    <p className="text-sm text-muted-foreground mt-1">{review.comment}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReviewSection;
