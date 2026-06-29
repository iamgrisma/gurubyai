import React from 'react';
import { PublicHeader } from '../../components/shared/PublicHeader';
import { ShieldCheck, UserCheck, Scale, FileText } from 'lucide-react';

export default function TrustPage() {
    return (
        <div className="min-h-screen bg-stone-50 flex flex-col">
            <PublicHeader />
            
            <main className="flex-1">
                <div className="bg-gradient-to-br from-stone-900 to-stone-800 py-24 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
                    <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
                        <span className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-white/10 text-saffron-400 text-sm font-bold uppercase tracking-wider mb-6 backdrop-blur-sm border border-white/20">
                            <ShieldCheck className="h-4 w-4" /> Trust & Safety
                        </span>
                        <h1 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">
                            Your Devotion, <br className="hidden md:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">Our Responsibility</span>
                        </h1>
                        <p className="text-stone-300 max-w-2xl mx-auto text-lg md:text-xl font-medium leading-relaxed">
                            We take the sanctity of your rituals seriously. Learn how we verify our Gurubas and protect your privacy.
                        </p>
                    </div>
                </div>

                <div className="container mx-auto px-4 md:px-6 py-20 max-w-4xl">
                    <div className="space-y-12">
                        {/* Section 1 */}
                        <div className="flex flex-col md:flex-row gap-8 items-start bg-white p-8 rounded-3xl shadow-sm border border-stone-200">
                            <div className="h-16 w-16 shrink-0 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
                                <UserCheck className="h-8 w-8" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-stone-900 mb-3">Guruba Verification</h2>
                                <p className="text-stone-600 leading-relaxed">
                                    Every Pandit and Lama on Guruba Connect undergoes a rigorous vetting process. We verify their identity, their Vedic or Buddhist education, and their experience in performing rituals. You can trust that the person guiding your Puja is a qualified professional.
                                </p>
                            </div>
                        </div>

                        {/* Section 2 */}
                        <div className="flex flex-col md:flex-row gap-8 items-start bg-white p-8 rounded-3xl shadow-sm border border-stone-200">
                            <div className="h-16 w-16 shrink-0 bg-saffron-100 rounded-2xl flex items-center justify-center text-saffron-600">
                                <Scale className="h-8 w-8" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-stone-900 mb-3">Gotra Matching</h2>
                                <p className="text-stone-600 leading-relaxed">
                                    According to Hindu tradition, certain rituals require specific Gotra matching or conflict avoidance between the Yajaman (client) and the Pandit. Our system securely stores your Gotra and automatically filters or flags potential conflicts when booking.
                                </p>
                            </div>
                        </div>

                        {/* Section 3 */}
                        <div className="flex flex-col md:flex-row gap-8 items-start bg-white p-8 rounded-3xl shadow-sm border border-stone-200">
                            <div className="h-16 w-16 shrink-0 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                                <FileText className="h-8 w-8" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-stone-900 mb-3">Data Privacy</h2>
                                <p className="text-stone-600 leading-relaxed">
                                    Spiritual consultation is private. Whether you are seeking astrology readings or performing a quiet puja, your data, chat history, and booking details are encrypted and strictly confidential. Video calls are end-to-end encrypted via WebRTC.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="py-8 text-center text-stone-500 text-sm border-t border-stone-200 bg-white">
                © {new Date().getFullYear()} Guruba Connect. Designed for Devotion.
            </footer>
        </div>
    );
}
