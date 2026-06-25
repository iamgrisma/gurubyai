"use client";

// features/booking/BookingSuccess.tsx

import React from 'react';

import { useRouter, redirect } from "next/navigation";
import { Button } from '../../components/ui/Button';
import { CheckCircle, Calendar, Home, Wallet, ArrowRight } from 'lucide-react';

export const BookingSuccessPage: React.FC = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4 animate-in fade-in duration-500">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 text-center border border-stone-200">
        <div className="mx-auto h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-sm ring-8 ring-green-50">
            <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-stone-900 mb-2">Booking Confirmed!</h1>
        <p className="text-stone-600 mb-8 leading-relaxed">
            Your ritual request has been sent. <br/>
            <span className="font-semibold text-saffron-600">100 Credits</span> have been deducted as the platform fee.
        </p>

        <div className="bg-stone-50 rounded-xl p-6 mb-8 border border-stone-100 text-left shadow-inner">
            <p className="text-sm font-bold text-stone-900 mb-4 flex items-center gap-2 border-b border-stone-200 pb-2">
                <Wallet className="h-4 w-4 text-stone-500" /> What happens next?
            </p>
            <ul className="space-y-3 text-sm text-stone-600">
                <li className="flex gap-3">
                    <div className="h-5 w-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 text-xs font-bold">1</div>
                    <span><strong className="text-stone-900">Confirmation:</strong> The Guruba will accept the request or propose a new time.</span>
                </li>
                <li className="flex gap-3">
                    <div className="h-5 w-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 text-xs font-bold">2</div>
                    <span><strong className="text-stone-900">Preparation:</strong> You'll receive the Samagri list via chat.</span>
                </li>
                <li className="flex gap-3">
                    <div className="h-5 w-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 text-xs font-bold">3</div>
                    <span><strong className="text-stone-900">Dakshina:</strong> Paid directly to the Guruba after the ritual (Cash/eSewa).</span>
                </li>
            </ul>
        </div>

        <div className="flex flex-col gap-3">
            <Button onClick={() => router.push('/client')} className="w-full shadow-md group">
                Go to My Dashboard
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="ghost" onClick={() => router.push('/')} className="w-full text-stone-500 hover:text-stone-900">
                <Home className="h-4 w-4 mr-2" />
                Back to Home
            </Button>
        </div>
      </div>
    </div>
  );
};