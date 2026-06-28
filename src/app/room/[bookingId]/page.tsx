"use client";

import React, { use } from 'react';
import { VideoRoom } from '@/features/video/VideoRoom';

export default function RoomPage({ params }: { params: Promise<{ bookingId: string }> }) {
    // In Next.js 15, params is a Promise. We must `use()` it.
    const resolvedParams = use(params);

    return (
        <VideoRoom bookingId={resolvedParams.bookingId} />
    );
}
