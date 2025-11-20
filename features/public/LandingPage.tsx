import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { Service } from '../../types';
import { Calendar, Star, ShieldCheck, Database, CheckCircle, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

// Mock Data (Display only until DB is connected to UI)
const SERVICES: Service[] = [
  {
    id: '1',
    title: 'Satyanarayan Puja',
    description: 'A ritual performed to seek blessings from Lord Vishnu for health and prosperity.',
    duration_minutes: 90,
    base_price: 51,
    image_url: 'https://picsum.photos/400/300?random=1'
  },
  {
    id: '2',
    title: 'Griha Pravesh',
    description: 'House warming ceremony to purify the home and protect it from evil spirits.',
    duration_minutes: 180,
    base_price: 101,
    image_url: 'https://picsum.photos/400/300?random=2'
  },
  {
    id: '3',
    title: 'Vivah Sanskar',
    description: 'Complete Vedic wedding ceremony with all traditional rituals.',
    duration_minutes: 240,
    base_price: 501,
    image_url: 'https://picsum.photos/400/300?random=3'
  }
];

export const LandingPage: React.FC = () => {
  const [dbStatus, setDbStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<string>('');

  const checkConnection = async () => {
    setDbStatus('loading');
    setStatusMessage('Pinging Supabase...');
    setErrorDetails('');

    try {
      // 1. Check Basic Connection by fetching 1 row
      // Using 'head: true' is a lightweight way to check permissions and existence
      const { data, error, count } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;

      setDbStatus('success');
      setStatusMessage(`Connected ✅ (Found ${count ?? 0} services)`);
    } catch (err: any) {
      console.error('Connection check failed:', err);
      setDbStatus('error');
      
      // Diagnose the error
      if (err.message === 'Failed to fetch') {
        setStatusMessage('Network Error ❌');
        setErrorDetails('Could not reach Supabase. Check your internet connection or if the URL is blocked by an ad-blocker.');
      } else if (err.code === 'PGRST301' || err.message.includes('JWT')) {
        setStatusMessage('Auth Error ❌');
        setErrorDetails('The API Key or Token is invalid/expired.');
      } else if (err.code === '42P01') {
        setStatusMessage('Missing Table ❌');
        setErrorDetails("The 'services' table does not exist. Did you run the Seed SQL?");
      } else {
        setStatusMessage('Connection Failed ❌');
        setErrorDetails(`${err.message} (Code: ${err.code || 'N/A'})`);
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="relative bg-saffron-50 py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-stone-900 sm:text-5xl md:text-6xl">
            Connect with Trusted <span className="text-saffron-600">Gurubas</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-stone-600">
            Book experienced Purohits for your spiritual needs. From daily pujas to grand ceremonies, find the right guide for your rituals.
          </p>
          <div className="mt-10 flex justify-center gap-4 flex-wrap">
            <Link to="/register">
              <Button size="lg" className="px-8">Get Started</Button>
            </Link>
            <Link to="/book">
              <Button variant="outline" size="lg">Book a Service</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center text-center p-6 rounded-lg border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4 p-3 bg-saffron-100 rounded-full text-saffron-600">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Verified Gurubas</h3>
              <p className="text-stone-600">Every Guruba is vetted for authenticity, knowledge, and adherence to Vedic traditions.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-lg border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4 p-3 bg-saffron-100 rounded-full text-saffron-600">
                <Calendar className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Easy Scheduling</h3>
              <p className="text-stone-600">Book rituals at your convenience. Real-time availability and instant confirmation.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-lg border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4 p-3 bg-saffron-100 rounded-full text-saffron-600">
                <Star className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Community Rated</h3>
              <p className="text-stone-600">Read reviews from other families to ensure you find the perfect match for your ceremony.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Services */}
      <section className="py-16 bg-stone-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Popular Services</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {SERVICES.map((service) => (
              <div key={service.id} className="group overflow-hidden rounded-lg bg-white shadow-md transition-all hover:shadow-xl">
                <div className="aspect-video w-full overflow-hidden bg-gray-200">
                  <img 
                    src={service.image_url} 
                    alt={service.title} 
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-stone-900">{service.title}</h3>
                  <p className="mt-2 text-sm text-stone-500 line-clamp-2">{service.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-stone-500">{service.duration_minutes} mins</span>
                    <span className="text-lg font-bold text-saffron-600">${service.base_price}</span>
                  </div>
                  <Link to="/book">
                    <Button className="mt-4 w-full" variant="outline">Book Now</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Developer Tools / Connection Check */}
      <section className="py-12 bg-stone-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-xl font-bold mb-6 flex items-center justify-center gap-2">
            <Database className="h-5 w-5" />
            System Status
          </h3>
          
          <div className="flex flex-col items-center justify-center gap-4 max-w-md mx-auto">
            <Button 
              variant="secondary" 
              onClick={checkConnection}
              isLoading={dbStatus === 'loading'}
              className="w-full sm:w-auto min-w-[200px]"
            >
              {dbStatus === 'idle' && 'Test Database Connection'}
              {dbStatus === 'loading' && 'Connecting...'}
              {dbStatus === 'success' && 'Test Again'}
              {dbStatus === 'error' && 'Retry Connection'}
            </Button>

            {dbStatus !== 'idle' && (
              <div className={`w-full p-4 rounded-lg border text-left ${
                dbStatus === 'success' 
                  ? 'bg-green-900/30 border-green-700 text-green-400' 
                  : dbStatus === 'error' 
                    ? 'bg-red-900/30 border-red-700 text-red-400'
                    : 'bg-stone-800 border-stone-700 text-stone-400'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {dbStatus === 'success' && <CheckCircle className="h-5 w-5 shrink-0" />}
                  {dbStatus === 'error' && <XCircle className="h-5 w-5 shrink-0" />}
                  {dbStatus === 'loading' && <RefreshCw className="h-5 w-5 animate-spin shrink-0" />}
                  <span className="font-bold text-lg">{statusMessage}</span>
                </div>
                {errorDetails && (
                    <div className="mt-2 text-sm text-red-200 bg-red-950/50 p-2 rounded flex gap-2 items-start">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <p>{errorDetails}</p>
                    </div>
                )}
              </div>
            )}
            
            <p className="mt-4 text-xs text-stone-500">
              This checks if the application can read from the 'services' table in Supabase.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};