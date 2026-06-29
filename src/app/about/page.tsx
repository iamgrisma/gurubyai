import React from 'react';
import { PublicHeader } from '../../components/shared/PublicHeader';
import { Heart, Globe, Shield } from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-stone-50 flex flex-col">
            <PublicHeader />
            
            <main className="flex-1">
                {/* Hero */}
                <div className="bg-gradient-to-br from-stone-900 to-stone-800 py-24 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-saffron-500/20 rounded-full blur-3xl"></div>
                    <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
                        <span className="inline-block py-1.5 px-4 rounded-full bg-white/10 text-saffron-400 text-sm font-bold uppercase tracking-wider mb-6 backdrop-blur-sm border border-white/20">
                            Our Story
                        </span>
                        <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
                            Preserving <span className="text-transparent bg-clip-text bg-gradient-to-r from-saffron-400 to-orange-400">Sanskriti</span><br className="hidden md:block" /> with Modern Convenience
                        </h1>
                        <p className="text-stone-300 max-w-2xl mx-auto text-lg md:text-xl font-medium leading-relaxed">
                            Guruba Connect was founded to bridge the gap between ancient Vedic traditions and the modern Nepali lifestyle, connecting devotees with authentic Pandits and Lamas anywhere in the world.
                        </p>
                    </div>
                </div>

                {/* Values */}
                <div className="container mx-auto px-4 md:px-6 py-20">
                    <div className="max-w-3xl mx-auto text-center mb-16">
                        <h2 className="text-3xl font-black text-stone-900 mb-4">Our Core Philosophy</h2>
                        <p className="text-stone-600 text-lg">We believe that geographical distance should never be a barrier to devotion and spiritual peace.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200 text-center hover:shadow-xl transition-shadow">
                            <div className="h-16 w-16 mx-auto bg-saffron-100 rounded-2xl flex items-center justify-center mb-6 text-saffron-600">
                                <Shield className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-bold text-stone-900 mb-3">Authenticity</h3>
                            <p className="text-stone-600">Every Guruba on our platform is strictly verified for their lineage, education, and experience in Vedic rituals.</p>
                        </div>
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200 text-center hover:shadow-xl transition-shadow">
                            <div className="h-16 w-16 mx-auto bg-blue-100 rounded-2xl flex items-center justify-center mb-6 text-blue-600">
                                <Globe className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-bold text-stone-900 mb-3">Accessibility</h3>
                            <p className="text-stone-600">Whether you are in Kathmandu, Sydney, or Texas, you can connect for high-quality online or offline rituals.</p>
                        </div>
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200 text-center hover:shadow-xl transition-shadow">
                            <div className="h-16 w-16 mx-auto bg-green-100 rounded-2xl flex items-center justify-center mb-6 text-green-600">
                                <Heart className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-bold text-stone-900 mb-3">Devotion</h3>
                            <p className="text-stone-600">We handle the scheduling and logistics so you can focus entirely on your devotion and peace of mind.</p>
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <div className="bg-saffron-50 py-20 border-t border-saffron-100 text-center">
                    <h2 className="text-3xl font-black text-stone-900 mb-6">Join Our Community</h2>
                    <p className="text-stone-600 max-w-lg mx-auto mb-8 text-lg">Whether you are looking to perform a ritual or you are a qualified Guruba wanting to offer your services, you belong here.</p>
                    <div className="flex justify-center gap-4">
                        <Link href="/register" className="bg-saffron-600 text-white px-8 py-4 rounded-full font-bold shadow-lg hover:bg-saffron-700 transition-colors">
                            Sign Up Now
                        </Link>
                    </div>
                </div>
            </main>

            <footer className="py-8 text-center text-stone-500 text-sm border-t border-stone-200 bg-white">
                © {new Date().getFullYear()} Guruba Connect. Designed for Devotion.
            </footer>
        </div>
    );
}
