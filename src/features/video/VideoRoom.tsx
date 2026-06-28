"use client";

import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../auth/AuthProvider';
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface VideoRoomProps {
    roomId: string;
}

export const VideoRoom: React.FC<VideoRoomProps> = ({ roomId }) => {
    const { user } = useAuth();
    const router = useRouter();
    
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    const [isMicOn, setIsMicOn] = useState(true);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [status, setStatus] = useState<string>('Initializing camera...');
    const [remoteConnected, setRemoteConnected] = useState(false);

    useEffect(() => {
        if (!user) return;

        let isMounted = true;

        const initCall = async () => {
            try {
                // 1. Get Local Media
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                if (!isMounted) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }
                
                localStreamRef.current = stream;
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }

                // 2. Setup RTCPeerConnection
                const pc = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                });
                peerConnectionRef.current = pc;

                // Add local tracks to PC
                stream.getTracks().forEach(track => {
                    pc.addTrack(track, stream);
                });

                // Handle remote tracks
                pc.ontrack = (event) => {
                    if (remoteVideoRef.current && event.streams[0]) {
                        remoteVideoRef.current.srcObject = event.streams[0];
                        setRemoteConnected(true);
                        setStatus('Connected');
                    }
                };

                // Handle ICE candidates
                pc.onicecandidate = (event) => {
                    if (event.candidate && channelRef.current) {
                        channelRef.current.send({
                            type: 'broadcast',
                            event: 'ice-candidate',
                            payload: { candidate: event.candidate, senderId: user.id }
                        });
                    }
                };

                // 3. Setup Supabase Signaling Channel
                const channel = supabase.channel(`webrtc-${roomId}`, {
                    config: { broadcast: { self: false, ack: true } }
                });
                channelRef.current = channel;

                channel
                    .on('broadcast', { event: 'user-joined' }, async ({ payload }) => {
                        // Someone joined. To avoid glare (race conditions), we deterministically
                        // assign the offerer role to the user with the lexicographically larger ID.
                        if (user.id > payload.senderId) {
                            setStatus('Peer joined. Negotiating connection...');
                            try {
                                const offer = await pc.createOffer();
                                await pc.setLocalDescription(offer);
                                channel.send({
                                    type: 'broadcast',
                                    event: 'sdp-offer',
                                    payload: { offer, senderId: user.id }
                                });
                            } catch (err) {
                                console.error("Error creating offer:", err);
                            }
                        } else {
                            setStatus('Peer joined. Waiting for connection...');
                        }
                    })
                    .on('broadcast', { event: 'sdp-offer' }, async ({ payload }) => {
                        // Received an offer, send an answer
                        try {
                            await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
                            const answer = await pc.createAnswer();
                            await pc.setLocalDescription(answer);
                            channel.send({
                                type: 'broadcast',
                                event: 'sdp-answer',
                                payload: { answer, senderId: user.id }
                            });
                        } catch (err) {
                            console.error("Error handling offer:", err);
                        }
                    })
                    .on('broadcast', { event: 'sdp-answer' }, async ({ payload }) => {
                        // Received an answer, set it
                        try {
                            await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
                        } catch (err) {
                            console.error("Error handling answer:", err);
                        }
                    })
                    .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
                        // Received an ICE candidate
                        try {
                            if (payload.candidate) {
                                await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                            }
                        } catch (err) {
                            console.error("Error adding ice candidate:", err);
                        }
                    })
                    .on('broadcast', { event: 'user-left' }, () => {
                        setRemoteConnected(false);
                        setStatus('Peer disconnected. Waiting for them to rejoin...');
                        if (remoteVideoRef.current) {
                            remoteVideoRef.current.srcObject = null;
                        }
                    })
                    .subscribe(async (statusStr) => {
                        if (statusStr === 'SUBSCRIBED') {
                            setStatus('Waiting for other person to join...');
                            // Announce that we've joined
                            setTimeout(() => {
                                channel.send({
                                    type: 'broadcast',
                                    event: 'user-joined',
                                    payload: { senderId: user.id }
                                });
                            }, 500); // slight delay to ensure peer is subscribed
                        }
                    });

            } catch (err) {
                console.error("Failed to initialize call:", err);
                setStatus('Failed to access camera/microphone. Please check permissions.');
            }
        };

        initCall();

        return () => {
            isMounted = false;
            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'user-left',
                    payload: { senderId: user.id }
                });
                supabase.removeChannel(channelRef.current);
            }
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
            }
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [roomId, user]);

    const toggleMic = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMicOn(audioTrack.enabled);
            }
        }
    };

    const toggleVideo = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOn(videoTrack.enabled);
            }
        }
    };

    const endCall = () => {
        router.back();
    };

    return (
        <div className="relative w-full h-screen bg-stone-900 flex items-center justify-center overflow-hidden font-inter">
            {/* Remote Video (Main) */}
            <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                className={`w-full h-full object-cover ${!remoteConnected ? 'opacity-0' : 'opacity-100'} transition-opacity duration-500`} 
            />
            
            {/* Status Overlay when disconnected */}
            {!remoteConnected && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-stone-900/80 z-10">
                    <div className="bg-stone-800/50 p-6 rounded-2xl backdrop-blur-md flex flex-col items-center gap-4 border border-stone-700 shadow-2xl">
                        <Loader2 className="h-8 w-8 text-saffron-500 animate-spin" />
                        <p className="text-sm font-medium">{status}</p>
                    </div>
                </div>
            )}

            {/* Local Video (PIP) */}
            <div className="absolute top-6 right-6 w-32 md:w-48 aspect-video bg-stone-800 rounded-xl overflow-hidden shadow-2xl border-2 border-stone-700 z-20">
                <video 
                    ref={localVideoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover transform -scale-x-100" 
                />
                {!isVideoOn && (
                    <div className="absolute inset-0 flex items-center justify-center bg-stone-800 text-stone-400">
                        <VideoOff className="h-6 w-6" />
                    </div>
                )}
            </div>

            {/* Controls Bar */}
            <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-stone-800/80 backdrop-blur-lg px-8 py-4 rounded-full border border-stone-700 shadow-2xl z-20">
                <button 
                    onClick={toggleMic}
                    className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${isMicOn ? 'bg-stone-700 hover:bg-stone-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]'}`}
                >
                    {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </button>

                <button 
                    onClick={endCall}
                    className="h-14 w-14 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-700 text-white shadow-[0_0_20px_rgba(220,38,38,0.6)] transition-all hover:scale-105"
                >
                    <PhoneOff className="h-6 w-6" />
                </button>

                <button 
                    onClick={toggleVideo}
                    className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${isVideoOn ? 'bg-stone-700 hover:bg-stone-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]'}`}
                >
                    {isVideoOn ? <VideoIcon className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </button>
            </div>
        </div>
    );
};
