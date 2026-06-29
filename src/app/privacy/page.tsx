import React from 'react';
import { PublicHeader } from '../../components/shared/PublicHeader';
import { PublicFooter } from '../../components/shared/PublicFooter';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-stone-50 flex flex-col">
            <PublicHeader />
            <main className="flex-1 container mx-auto px-4 py-20 max-w-3xl">
                <h1 className="text-4xl font-black text-stone-900 mb-8">Privacy Policy</h1>
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200 space-y-6 text-stone-600 leading-relaxed">
                    <p>Last updated: {new Date().toLocaleDateString()}</p>
                    <section>
                        <h2 className="text-xl font-bold text-stone-900 mb-3">1. Information We Collect</h2>
                        <p>We collect information you provide directly to us, such as when you create an account, update your profile, or book a ritual. This may include your name, email, phone number, Gotra, and location.</p>
                    </section>
                    <section>
                        <h2 className="text-xl font-bold text-stone-900 mb-3">2. How We Use Your Information</h2>
                        <p>We use the information we collect to provide, maintain, and improve our services, process transactions, and send you technical notices and support messages.</p>
                    </section>
                    <section>
                        <h2 className="text-xl font-bold text-stone-900 mb-3">3. Data Security</h2>
                        <p>Your spiritual consultation is private. We implement appropriate technical and organizational measures to protect your personal data against unauthorized or unlawful processing.</p>
                    </section>
                </div>
            </main>
            <PublicFooter />
        </div>
    );
}
