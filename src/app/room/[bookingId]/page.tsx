export const runtime = 'edge';

import React from 'react';
import { VideoRoom } from '@/features/video/VideoRoom';

export default async function RoomPage({ params }: { params: Promise<{ bookingId: string }> }) {
    const resolvedParams = await params;
    
    return (
        <VideoRoom roomId={resolvedParams.bookingId} />
    );
}
