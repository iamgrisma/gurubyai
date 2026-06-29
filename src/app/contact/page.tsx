import React from 'react';
import { PublicHeader } from '../../components/shared/PublicHeader';
import { PublicFooter } from '../../components/shared/PublicFooter';

export default function ContactPage() {
    return (
        <div className="min-h-screen bg-stone-50 flex flex-col">
            <PublicHeader />
            <main className="flex-1 container mx-auto px-4 py-20 max-w-2xl">
                <h1 className="text-4xl font-black text-stone-900 mb-6">Contact Us</h1>
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200">
                    <p className="text-stone-600 mb-6">If you have any questions, feel free to reach out to our support team.</p>
                    <div className="space-y-4 text-stone-700">
                        <p><strong>Email:</strong> support@gurubaconnect.com</p>
                        <p><strong>Phone:</strong> +977 1-4000000</p>
                        <p><strong>Address:</strong> Kathmandu, Nepal</p>
                    </div>
                </div>
            </main>
            <PublicFooter />
        </div>
    );
}
