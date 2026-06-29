import React from 'react';
import { PublicHeader } from '../../components/shared/PublicHeader';
import { PublicFooter } from '../../components/shared/PublicFooter';

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-stone-50 flex flex-col">
            <PublicHeader />
            <main className="flex-1 container mx-auto px-4 py-20 max-w-3xl">
                <h1 className="text-4xl font-black text-stone-900 mb-8">Terms of Service</h1>
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200 space-y-6 text-stone-600 leading-relaxed">
                    <p>Last updated: {new Date().toLocaleDateString()}</p>
                    <section>
                        <h2 className="text-xl font-bold text-stone-900 mb-3">1. Acceptance of Terms</h2>
                        <p>By accessing and using Guruba Connect, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.</p>
                    </section>
                    <section>
                        <h2 className="text-xl font-bold text-stone-900 mb-3">2. User Responsibilities</h2>
                        <p>You agree to provide accurate information when booking rituals and to treat all Gurubas with respect. Any misuse of the platform may result in account termination.</p>
                    </section>
                    <section>
                        <h2 className="text-xl font-bold text-stone-900 mb-3">3. Payments and Credits</h2>
                        <p>Platform fees are paid via our credit system. Dakshina for the Guruba is negotiated and paid directly to them unless otherwise specified during the booking process.</p>
                    </section>
                </div>
            </main>
            <PublicFooter />
        </div>
    );
}
