
import React from 'react';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { Service } from '../../types';
import { Calendar, Star, ShieldCheck } from 'lucide-react';

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
            <Link to="/services">
              <Button variant="outline" size="lg">View Services</Button>
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
                  <Button className="mt-4 w-full" variant="outline">Book Now</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
