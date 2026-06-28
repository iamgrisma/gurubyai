"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../auth/AuthProvider';
import { useRouter } from 'next/navigation';
import { Phone, PhoneOff, Video, Loader2 } from 'lucide-react';
import { useMessage } from '../../components/ui/MessageContext';

const uuidv4 = () => crypto.randomUUID();

interface CallContextType {
    initiateCall: (receiverId: string, receiverName: string, receiverAvatar?: string) => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const useCall = () => {
    const context = useContext(CallContext);
    if (!context) throw new Error('useCall must be used within a CallProvider');
    return context;
};

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const router = useRouter();
    const { showMessage } = useMessage();

    const [incomingCall, setIncomingCall] = useState<{ callerId: string, callerName: string, callerAvatar?: string, roomId: string } | null>(null);
    const [outgoingCall, setOutgoingCall] = useState<{ receiverId: string, receiverName: string, receiverAvatar?: string, roomId: string } | null>(null);

    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!user) return;

        // Listen for calls directed to ME
        const channel = supabase.channel(`global-calls:${user.id}`);
        channelRef.current = channel;

        channel
            .on('broadcast', { event: 'incoming-call' }, ({ payload }) => {
                // I am receiving a call
                if (outgoingCall || incomingCall) {
                    // Already in a call flow, send busy signal automatically
                    supabase.channel(`global-calls:${payload.callerId}`).send({
                        type: 'broadcast',
                        event: 'call-declined',
                        payload: { reason: 'busy' }
                    });
                    return;
                }

                setIncomingCall({
                    callerId: payload.callerId,
                    callerName: payload.callerName,
                    callerAvatar: payload.callerAvatar,
                    roomId: payload.roomId
                });

                // Auto decline after 30s
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                timeoutRef.current = setTimeout(() => {
                    declineCall(payload.callerId);
                }, 30000);
            })
            .on('broadcast', { event: 'call-cancelled' }, () => {
                // Caller hung up before I answered
                setIncomingCall(null);
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
            })
            .on('broadcast', { event: 'call-declined' }, ({ payload }) => {
                // I am calling, and the receiver declined
                setOutgoingCall(null);
                showMessage({ 
                    type: 'error', 
                    title: 'Call Declined', 
                    content: payload?.reason === 'busy' ? 'User is busy in another call.' : 'The user declined your video call.' 
                });
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
            })
            .on('broadcast', { event: 'call-accepted' }, ({ payload }) => {
                // I am calling, and receiver accepted!
                const roomId = payload.roomId;
                setOutgoingCall(null);
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                router.push(`/room/${roomId}`);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [user, incomingCall, outgoingCall, router, showMessage]);

    const initiateCall = (receiverId: string, receiverName: string, receiverAvatar?: string) => {
        if (!user) return;
        const roomId = uuidv4();
        
        setOutgoingCall({ receiverId, receiverName, receiverAvatar, roomId });

        // Send signal to receiver
        const receiverChannel = supabase.channel(`global-calls:${receiverId}`);
        receiverChannel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await receiverChannel.send({
                    type: 'broadcast',
                    event: 'incoming-call',
                    payload: { callerId: user.id, callerName: user.email || 'Someone', callerAvatar: user.user_metadata?.avatar_url, roomId } // In a real app we'd fetch profile name
                });
                supabase.removeChannel(receiverChannel);
            }
        });

        // Timeout if no answer in 30s
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            cancelOutgoingCall(receiverId);
            showMessage({ type: 'error', title: 'No Answer', content: 'The user did not answer the call.' });
        }, 30000);
    };

    const cancelOutgoingCall = (receiverId: string) => {
        setOutgoingCall(null);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        
        const receiverChannel = supabase.channel(`global-calls:${receiverId}`);
        receiverChannel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await receiverChannel.send({
                    type: 'broadcast',
                    event: 'call-cancelled'
                });
                supabase.removeChannel(receiverChannel);
            }
        });
    };

    const acceptCall = () => {
        if (!incomingCall || !user) return;
        const { callerId, roomId } = incomingCall;
        
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIncomingCall(null);
        
        const callerChannel = supabase.channel(`global-calls:${callerId}`);
        callerChannel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await callerChannel.send({
                    type: 'broadcast',
                    event: 'call-accepted',
                    payload: { roomId }
                });
                supabase.removeChannel(callerChannel);
                router.push(`/room/${roomId}`);
            }
        });
    };

    const declineCall = (callerIdOverride?: string) => {
        const callerId = callerIdOverride || incomingCall?.callerId;
        if (!callerId) return;

        setIncomingCall(null);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        const callerChannel = supabase.channel(`global-calls:${callerId}`);
        callerChannel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await callerChannel.send({
                    type: 'broadcast',
                    event: 'call-declined'
                });
                supabase.removeChannel(callerChannel);
            }
        });
    };

    return (
        <CallContext.Provider value={{ initiateCall }}>
            {children}

            {/* INCOMING CALL MODAL */}
            {incomingCall && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-stone-900/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-stone-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-stone-700 flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20"></div>
                            <div className="h-24 w-24 rounded-full bg-stone-700 border-4 border-stone-800 flex items-center justify-center overflow-hidden shadow-xl z-10 relative">
                                {incomingCall.callerAvatar ? (
                                    <img src={incomingCall.callerAvatar} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <UserAvatarPlaceholder name={incomingCall.callerName} />
                                )}
                            </div>
                        </div>
                        <h3 className="text-2xl font-outfit font-bold text-white">{incomingCall.callerName}</h3>
                        <p className="text-stone-400 mt-2 font-medium">Incoming Video Call...</p>

                        <div className="flex gap-6 mt-10 w-full justify-center">
                            <button 
                                onClick={() => declineCall()}
                                className="flex flex-col items-center gap-2 group"
                            >
                                <div className="h-14 w-14 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center border border-red-500/30 group-hover:bg-red-500 group-hover:text-white transition-all hover:scale-110">
                                    <PhoneOff className="h-6 w-6" />
                                </div>
                                <span className="text-xs font-bold text-stone-400">Decline</span>
                            </button>
                            <button 
                                onClick={acceptCall}
                                className="flex flex-col items-center gap-2 group"
                            >
                                <div className="h-14 w-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)] group-hover:bg-blue-500 transition-all hover:scale-110 animate-bounce">
                                    <Video className="h-6 w-6" />
                                </div>
                                <span className="text-xs font-bold text-stone-200">Accept</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* OUTGOING CALL MODAL */}
            {outgoingCall && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-stone-900/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-stone-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-stone-700 flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
                        <div className="h-24 w-24 rounded-full bg-stone-700 border-4 border-stone-800 flex items-center justify-center overflow-hidden shadow-xl mb-6">
                            {outgoingCall.receiverAvatar ? (
                                <img src={outgoingCall.receiverAvatar} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <UserAvatarPlaceholder name={outgoingCall.receiverName} />
                            )}
                        </div>
                        <h3 className="text-2xl font-outfit font-bold text-white">{outgoingCall.receiverName}</h3>
                        <div className="flex items-center gap-2 text-stone-400 mt-2 font-medium">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                            <p>Ringing...</p>
                        </div>

                        <div className="mt-10">
                            <button 
                                onClick={() => cancelOutgoingCall(outgoingCall.receiverId)}
                                className="h-14 w-14 rounded-full bg-red-600 text-white flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:bg-red-500 transition-all hover:scale-110"
                            >
                                <PhoneOff className="h-6 w-6" />
                            </button>
                            <p className="text-xs font-bold text-stone-400 mt-3">Cancel</p>
                        </div>
                    </div>
                </div>
            )}
        </CallContext.Provider>
    );
};

const UserAvatarPlaceholder = ({ name }: { name: string }) => {
    return (
        <span className="text-3xl font-bold text-stone-400 uppercase">
            {name ? name[0] : '?'}
        </span>
    );
};
