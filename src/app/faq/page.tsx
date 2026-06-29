"use client";

import React, { useState } from 'react';
import { PublicHeader } from '../../components/shared/PublicHeader';
import { HelpCircle, ChevronDown } from 'lucide-react';

const FAQS = [
    {
        question: "How do I book a Guruba?",
        answer: "Simply browse our list of services or search for a specific Guruba. Once you select a service, you can choose a date and time, decide whether you want the ritual offline or online, and proceed with the booking."
    },
    {
        question: "How does online video puja work?",
        answer: "If you are abroad or cannot meet in person, select 'Online Video Call' during booking. At the scheduled time, you will join an encrypted video call directly through our platform where the Guruba will guide you through the ritual."
    },
    {
        question: "How are the Gurubas verified?",
        answer: "We have a strict vetting process. Every Guruba must provide proof of their lineage, education (Vedic or Buddhist), and undergo an interview process before they are allowed to accept bookings."
    },
    {
        question: "What if there is a Gotra conflict?",
        answer: "If you add your Gotra to your profile, our system will automatically warn you if you attempt to book a Guruba whose Gotra conflicts with yours for specific rituals."
    },
    {
        question: "How does pricing work?",
        answer: "Each Guruba sets their own base price for services. When you book, you pay a small platform fee in credits, and the remaining amount is paid directly to the Guruba as Dakshina."
    }
];

export default function FAQPage() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <div className="min-h-screen bg-stone-50 flex flex-col">
            <PublicHeader />
            
            <main className="flex-1">
                <div className="bg-stone-900 py-16">
                    <div className="container mx-auto px-4 md:px-6 text-center">
                        <HelpCircle className="h-12 w-12 text-saffron-500 mx-auto mb-4" />
                        <h1 className="text-3xl md:text-5xl font-black text-white mb-4">Frequently Asked Questions</h1>
                        <p className="text-stone-400">Everything you need to know about Guruba Connect.</p>
                    </div>
                </div>

                <div className="container mx-auto px-4 md:px-6 py-16 max-w-3xl">
                    <div className="space-y-4">
                        {FAQS.map((faq, idx) => (
                            <div 
                                key={idx} 
                                className="bg-white border border-stone-200 rounded-2xl overflow-hidden transition-all shadow-sm"
                            >
                                <button 
                                    onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                                    className="w-full text-left px-6 py-5 flex items-center justify-between focus:outline-none"
                                >
                                    <span className="font-bold text-stone-900 pr-4">{faq.question}</span>
                                    <ChevronDown className={`h-5 w-5 text-stone-400 transition-transform ${openIndex === idx ? 'rotate-180 text-saffron-500' : ''}`} />
                                </button>
                                {openIndex === idx && (
                                    <div className="px-6 pb-5 text-stone-600 leading-relaxed border-t border-stone-100 pt-4">
                                        {faq.answer}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            <footer className="py-8 text-center text-stone-500 text-sm border-t border-stone-200 bg-white">
                © {new Date().getFullYear()} Guruba Connect. Designed for Devotion.
            </footer>
        </div>
    );
}
