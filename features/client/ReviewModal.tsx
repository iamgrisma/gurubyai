// features/client/ReviewModal.tsx

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { Star, X } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';

interface ReviewModalProps {
  bookingId: string;
  gurubaId: string;
  gurubaName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({ bookingId, gurubaId, gurubaName, onClose, onSuccess }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from('reviews').insert({
        booking_id: bookingId,
        guruba_id: gurubaId,
        user_id: user.id,
        rating,
        comment
      });

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate reviews so the dashboard updates (hides the review button)
      queryClient.invalidateQueries({ queryKey: ['myReviews'] });
      onSuccess();
    },
    onError: (error: any) => {
      console.error("Review submission failed", error);
      alert(error.message || "Failed to submit review.");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    reviewMutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-stone-100 bg-stone-50">
            <h3 className="font-bold text-stone-900">Rate Service</h3>
            <button onClick={onClose} className="p-1 hover:bg-stone-200 rounded-full transition-colors">
                <X className="h-5 w-5 text-stone-400" />
            </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-sm text-stone-600">
                How was your experience with <span className="font-semibold text-stone-900">{gurubaName}</span>?
            </p>

            <div className="flex justify-center gap-2 py-4">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="focus:outline-none transition-transform hover:scale-110 active:scale-90"
                    >
                        <Star 
                            className={`h-8 w-8 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-stone-300'}`} 
                        />
                    </button>
                ))}
            </div>

            <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Comments (Optional)</label>
                <textarea 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-stone-300 p-2 text-sm focus:ring-saffron-500 focus:border-saffron-500 resize-none"
                    placeholder="Share details about the ritual..."
                />
            </div>

            <Button type="submit" className="w-full" isLoading={reviewMutation.isPending}>
                Submit Review
            </Button>
        </form>
      </div>
    </div>
  );
};