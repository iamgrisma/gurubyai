// src/hooks/useVerificationNotification.ts
import { createNotification } from '@/lib/supabaseRpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useCreateVerificationNotification = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: { userId: string; requestId: string }) => {
            await createNotification({
                user_id: params.userId,
                title: 'Verification request submitted',
                message: `Your verification request (${params.requestId}) is pending review.`,
                notification_type: 'verification',
                action_url: `/admin/verification/${params.requestId}`,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
};
