import React, { useState } from 'react';
import { DollarSign, Star, AlertCircle, Clock, User, Video, CheckCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Booking, Guruba } from '../../../types';
import { supabase } from '../../../lib/supabaseClient';

interface OverviewProps {
    guruba: Guruba | null;
    bookings: Booking[];
    setActiveTab: (tab: any) => void;
    handleBookingAction: (id: string, action: any) => void;
    setLinkBookingId: (id: string | null) => void;
    setMeetingLink: (link: string) => void;
    onVerificationRequested: () => void;
}

export const GurubaOverview: React.FC<OverviewProps> = ({
    guruba, bookings, setActiveTab, handleBookingAction, setLinkBookingId, setMeetingLink, onVerificationRequested
}) => {
    const [showReviewModal, setShowReviewModal] = useState(false);

    const pendingCount = bookings.filter(b => b.status === 'pending').length;
    const earnings = bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.services?.base_price || 0), 0);

    const handleVerificationRequest = async () => {
        console.log("handleVerificationRequest called. Guruba:", guruba);
        if (!guruba) {
            console.error("Guruba object is missing!");
            return;
        }
        try {
            // Use secure RPC for verification request
            const { error } = await supabase.rpc('request_verification');

            if (error) throw error;
            console.log("Verification request successful!");
            alert("Verification request sent to Admin! They will review your profile.");
            onVerificationRequested();
        } catch (e) {
            console.error("Verification request failed:", e);
            alert("Failed to send request.");
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {!guruba ? (
                <div className="border p-6 rounded-2xl flex flex-col sm:flex-row items-center gap-4 shadow-sm bg-yellow-50 border-yellow-200 text-yellow-800">
                    <div className="h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 bg-yellow-100">
                        <AlertCircle className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                        <p className="font-bold text-lg">Create Your Guruba Profile</p>
                        <p className="text-sm mt-1 opacity-90">
                            You don't have a Guruba profile setup yet. Create one now to set up your services, availability, and request verification.
                        </p>
                    </div>
                    <Button 
                        onClick={async () => {
                            try {
                                const { data: { user } } = await supabase.auth.getUser();
                                if (!user) return;
                                const { error } = await supabase.from('gurubas').insert([{
                                    user_id: user.id,
                                    bio: 'Vedic priest and spiritual guide.',
                                    guruba_type: 'brahmin',
                                    location: 'Kathmandu, Nepal'
                                }]);
                                if (error) throw error;
                                alert("Guruba profile created successfully! You can now edit your details and request verification.");
                                onVerificationRequested(); // Trigger refetch
                            } catch (e) {
                                console.error(e);
                                alert("Failed to create profile.");
                            }
                        }} 
                        className="bg-yellow-500 text-stone-900 hover:bg-yellow-600 whitespace-nowrap"
                    >
                        Create Profile
                    </Button>
                </div>
            ) : !guruba.is_verified && (
                <div className={`border p-6 rounded-2xl flex flex-col sm:flex-row items-center gap-4 shadow-sm ${guruba.verification_requested_at
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                    }`}>
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 ${guruba.verification_requested_at ? 'bg-blue-100' : 'bg-yellow-100'
                        }`}>
                        {guruba.verification_requested_at ? (
                            <Clock className="h-6 w-6 text-blue-600" />
                        ) : (
                            <AlertCircle className="h-6 w-6 text-yellow-600" />
                        )}
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                        <p className="font-bold text-lg">
                            {guruba.verification_requested_at ? 'Verification Pending' : 'Complete Your Verification'}
                        </p>
                        <p className="text-sm mt-1 opacity-90">
                            {guruba.verification_requested_at
                                ? 'Your profile is under review by the admin team. You will be notified once verified.'
                                : 'Click the button to notify admins to review your profile for the "Verified" badge.'}
                        </p>
                    </div>
                    {!guruba.verification_requested_at && (
                        <Button onClick={() => setShowReviewModal(true)} variant="outline" className="bg-white border-yellow-300 text-yellow-900 hover:bg-yellow-100 whitespace-nowrap">
                            Start Verification
                        </Button>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                    <h3 className="text-stone-500 text-sm font-medium mb-2">Total Earnings</h3>
                    <div className="text-3xl font-bold text-stone-900 flex items-center gap-1">
                        <DollarSign className="h-6 w-6 text-stone-400" /> {(earnings || 0).toLocaleString()}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                    <h3 className="text-stone-500 text-sm font-medium mb-2">Client Rating</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-3xl font-bold text-stone-900">{guruba?.rating || 5.0}</span>
                        <div className="flex text-yellow-400">
                            {[1, 2, 3, 4, 5].map(i => <Star key={i} className="h-4 w-4 fill-current" />)}
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                    <h3 className="text-stone-500 text-sm font-medium mb-2">Completed Rituals</h3>
                    <div className="text-3xl font-bold text-stone-900">{bookings.filter(b => b.status === 'completed').length}</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                    <h3 className="text-stone-500 text-sm font-medium mb-2">Pending Requests</h3>
                    <div className="text-3xl font-bold text-saffron-600">{pendingCount}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg text-stone-900">Upcoming Confirmed Rituals</h3>
                        <Button variant="ghost" size="sm" onClick={() => setActiveTab('requests')}>View All</Button>
                    </div>
                    <div className="space-y-4">
                        {bookings.filter(b => b.status === 'confirmed').length === 0 ? (
                            <div className="text-center py-12 text-stone-400 bg-stone-50 rounded-xl border border-dashed border-stone-200">No upcoming confirmed rituals.</div>
                        ) : (
                            bookings.filter(b => b.status === 'confirmed').slice(0, 5).map(b => {
                                const bookingDate = new Date(b.scheduled_at || '');
                                return (
                                    <div key={b.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-stone-100 rounded-xl hover:bg-stone-50 transition-colors gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="h-14 w-14 bg-saffron-50 rounded-xl flex flex-col items-center justify-center text-saffron-700 border border-saffron-100 shadow-sm">
                                                <span className="text-xs font-bold uppercase">{bookingDate.toLocaleString('default', { month: 'short' })}</span>
                                                <span className="text-xl font-bold">{bookingDate.getDate()}</span>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-stone-900 text-lg">{b.services?.title}</h4>
                                                <p className="text-sm text-stone-500 flex items-center gap-2 mt-1">
                                                    <Clock className="h-3 w-3" /> {bookingDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    <span className="mx-1">•</span>
                                                    <User className="h-3 w-3" /> {b.profiles?.full_name}
                                                    <span className="mx-1">•</span>
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${b.is_online ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                                                        {b.is_online ? 'Online' : 'Physical'}
                                                    </span>
                                                </p>
                                            {b.meeting_link && (
                                                <a href={b.meeting_link} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                                                    <Video className="h-3 w-3" /> Video Link Active
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Button size="sm" className="w-full sm:w-auto" onClick={() => handleBookingAction(b.id, 'completed')}>
                                            Mark Completed
                                        </Button>
                                        <Button size="sm" variant="outline" className="w-full sm:w-auto text-xs" onClick={() => { setLinkBookingId(b.id); setMeetingLink(b.meeting_link || ''); }}>
                                            {b.meeting_link ? 'Edit Link' : 'Add Link'}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })
                        )}
                    </div>
                </div>

                <div className="bg-stone-900 rounded-2xl p-6 text-white shadow-xl flex flex-col justify-between">
                    <div>
                        <h3 className="font-bold text-lg mb-2">Weekly Performance</h3>
                        <p className="text-stone-400 text-sm">Your activity this week.</p>
                    </div>
                    <div className="h-40 flex items-end justify-between gap-2 mt-6 px-2">
                        {[40, 70, 30, 85, 50, 65, 90].map((h, i) => (
                            <div key={i} className="w-full bg-stone-700 rounded-t-md relative group">
                                <div className="absolute bottom-0 left-0 w-full bg-saffron-500 rounded-t-md transition-all duration-1000" style={{ height: `${h}%` }}></div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-xs text-stone-500 mt-2 px-2">
                        <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
                    </div>
                </div>
            </div>

            {/* Profile Review Modal */}
            {showReviewModal && guruba && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-6 animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center border-b pb-4">
                            <h3 className="text-lg font-bold text-stone-900 font-outfit">Review Profile Details</h3>
                            <button onClick={() => setShowReviewModal(false)} className="text-stone-400 hover:text-stone-600 font-bold text-xl">&times;</button>
                        </div>

                        <div className="space-y-4">
                            <p className="text-sm text-stone-500">
                                Please review your Guruba details. This information will be sent to the admin team to evaluate and approve your verification badge.
                            </p>

                            <div className="bg-stone-50 rounded-2xl p-4 space-y-3 text-sm border border-stone-200">
                                <div>
                                    <span className="font-bold text-stone-700 block">Bio Introduction:</span>
                                    <p className="text-stone-600 mt-0.5 max-h-24 overflow-y-auto italic">
                                        {guruba.bio ? `"${guruba.bio}"` : <span className="text-red-500 font-semibold">Not provided</span>}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-stone-100">
                                    <div>
                                        <span className="font-bold text-stone-700 block">Guruba Type:</span>
                                        <span className="capitalize text-stone-600">{(guruba.guruba_type || 'brahmin').replace('_', ' ')}</span>
                                    </div>
                                    <div>
                                        <span className="font-bold text-stone-700 block">Location Base:</span>
                                        <span className="text-stone-600">{guruba.location || <span className="text-red-500 font-semibold">Not provided</span>}</span>
                                    </div>
                                </div>
                            </div>

                            {(!guruba.bio || !guruba.location) && (
                                <div className="bg-red-50 text-red-700 p-4 rounded-xl text-xs font-medium border border-red-200">
                                    Warning: Your profile details are incomplete. Incomplete bios or locations may cause admins to reject your request.
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button 
                                variant="outline" 
                                onClick={() => {
                                    setShowReviewModal(false);
                                    setActiveTab('profile');
                                }}
                            >
                                Edit Profile
                            </Button>
                            <Button 
                                onClick={() => {
                                    setShowReviewModal(false);
                                    handleVerificationRequest();
                                }}
                                className="bg-saffron-500 text-stone-900 hover:bg-saffron-400"
                            >
                                Submit Request
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
