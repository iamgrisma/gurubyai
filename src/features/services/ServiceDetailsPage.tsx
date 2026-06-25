"use client";


// features/services/ServiceDetailsPage.tsx

import React from 'react';
import Link from "next/link";
import { useRouter, useParams, redirect } from "next/navigation";
import { useService } from '../../hooks/queries';
import { Button } from '../../components/ui/Button';
import { Clock, ArrowLeft, ShieldCheck, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';

export const ServiceDetailsPage: React.FC = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const router = useRouter();
  
  // Fetch service data using the custom hook
  const { data: service, isLoading, error } = useService(serviceId);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-saffron-600">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !service) {
    return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 text-stone-500">
            <AlertTriangle className="h-12 w-12 text-red-400" />
            <p className="text-lg font-medium">Service not found or could not be loaded.</p>
            <Button onClick={() => router.push('/')} variant="outline">Return Home</Button>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Hero Image */}
      <div className="h-64 w-full bg-stone-900 overflow-hidden relative">
        <img 
          src={service.image_url} 
          alt={service.title}
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 flex items-center justify-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white shadow-lg text-center px-4">{service.title}</h1>
        </div>
        <Link href="/book" className="absolute top-6 left-6">
             <Button variant="secondary" size="sm" className="bg-white/90 hover:bg-white backdrop-blur-sm">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
             </Button>
        </Link>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white rounded-xl shadow-lg p-8 -mt-20 relative z-10 border border-stone-100">
            <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                <div className="flex-1">
                    <h2 className="text-2xl font-bold text-stone-900 mb-4">About this Ritual</h2>
                    <p className="text-lg text-stone-600 leading-relaxed mb-6">
                        {service.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-6 mb-8">
                        <div className="flex items-center text-stone-700 font-medium">
                            <Clock className="h-5 w-5 text-saffron-600 mr-2" />
                            {service.duration_minutes} Minutes
                        </div>
                        <div className="flex items-center text-stone-700 font-medium">
                            <ShieldCheck className="h-5 w-5 text-saffron-600 mr-2" />
                            Vedic Authenticity Guaranteed
                        </div>
                    </div>

                    <div className="bg-stone-50 p-6 rounded-lg border border-stone-200">
                        <h3 className="font-semibold text-stone-900 mb-3">What's Included:</h3>
                        <ul className="space-y-2">
                            <li className="flex items-start gap-2 text-sm text-stone-600">
                                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                                Verified Pandit/Guruba assigned to your location
                            </li>
                            <li className="flex items-start gap-2 text-sm text-stone-600">
                                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                                Complete Samagri list provided upon booking
                            </li>
                            <li className="flex items-start gap-2 text-sm text-stone-600">
                                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                                Authentic Vedic chanting and procedure
                            </li>
                            {service.is_online_enabled && (
                                <li className="flex items-start gap-2 text-sm text-stone-600">
                                    <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                                    Available for Online Video Ritual
                                </li>
                            )}
                        </ul>
                    </div>
                </div>

                {/* Sidebar / Sticky Booking Card */}
                <div className="w-full md:w-80 shrink-0">
                    <div className="bg-saffron-50 p-6 rounded-xl border border-saffron-100 sticky top-24">
                        <div className="text-center mb-6">
                            <span className="block text-stone-500 text-sm uppercase tracking-wide font-semibold">Total Price</span>
                            <span className="block text-4xl font-bold text-stone-900 mt-1">Rs. {(service.base_price || 0).toLocaleString()}</span>
                            <span className="text-xs text-stone-400">Dakshina Included</span>
                        </div>
                        
                        <div className="space-y-3">
                            <Button 
                                className="w-full text-lg py-6 shadow-lg shadow-saffron-900/10" 
                                onClick={() => router.push(`/book/${service.id}`)}
                            >
                                Book Now
                            </Button>
                            <p className="text-xs text-center text-stone-500">
                                Choose your preferred Guruba in the next step.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
