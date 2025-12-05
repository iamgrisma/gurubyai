
// features/public/LandingPage.tsx

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useServices } from '../../hooks/queries';
import { Button } from '../../components/ui/Button';
import {
   Calendar, ShieldCheck, ArrowRight, Video, MessageSquare, CheckCircle,
   Clock, Heart, RefreshCw, Sparkles, Star, Users, TrendingUp, MapPin
} from 'lucide-react';

const TESTIMONIALS = [
   { id: 1, name: 'Ram Bahadur Thapa', text: 'Found a very knowledgeable Pandit ji for my son\'s Bratabandha in Kathmandu. The process was smooth and the ritual was conducted perfectly according to Vedic traditions.', role: 'Kathmandu', rating: 5, img: 'https://randomuser.me/api/portraits/men/32.jpg' },
   { id: 2, name: 'Sita Devi Sharma', text: 'I live in Australia but wanted a Rudri Puja performed at home in Pokhara for my parents. Guruba Connect made it possible effortlessly.', role: 'Pokhara / Sydney', rating: 5, img: 'https://randomuser.me/api/portraits/women/44.jpg' },
   { id: 3, name: 'Amit Verma', text: 'The video consultation for Kundali matching saved us a trip to the village. Highly authentic and reliable service.', role: 'Biratnagar', rating: 5, img: 'https://randomuser.me/api/portraits/men/86.jpg' },
];

const FEATURES = [
   {
      icon: ShieldCheck,
      title: 'Verified Gurubas',
      desc: 'Every Pandit and Lama goes through a strict verification process regarding their Vedic education and lineage.',
      gradient: 'from-orange-500 to-red-500',
      iconBg: 'from-orange-100 to-orange-50',
      iconColor: 'text-orange-600'
   },
   {
      icon: Calendar,
      title: 'Easy Scheduling',
      desc: 'Book rituals according to your auspicious Muhurat. Real-time availability ensures no conflicts.',
      gradient: 'from-blue-500 to-indigo-500',
      iconBg: 'from-blue-100 to-blue-50',
      iconColor: 'text-blue-600'
   },
   {
      icon: Video,
      title: 'Online Rituals',
      desc: 'Perform pujas remotely via WhatsApp or Google Meet if you are abroad or unable to gather physically.',
      gradient: 'from-purple-500 to-pink-500',
      iconBg: 'from-purple-100 to-purple-50',
      iconColor: 'text-purple-600'
   },
   {
      icon: MessageSquare,
      title: 'Direct Chat',
      desc: 'Chat with your Guruba to discuss the Samagri list and specific requirements for the puja.',
      gradient: 'from-green-500 to-emerald-500',
      iconBg: 'from-green-100 to-green-50',
      iconColor: 'text-green-600'
   },
];

export const LandingPage: React.FC = () => {
   const navigate = useNavigate();
   const [scrolled, setScrolled] = useState(false);

   // Fetch dynamic services
   const { data: services = [], isLoading } = useServices();

   // Filter featured services (or take first 3 if none featured)
   const featuredServices = services.filter(s => s.is_featured).slice(0, 3);
   const displayServices = featuredServices.length > 0 ? featuredServices : services.slice(0, 3);

   useEffect(() => {
      const handleScroll = () => {
         setScrolled(window.scrollY > 50);
      };
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
   }, []);

   return (
      <div className="flex min-h-screen flex-col bg-white font-sans overflow-x-hidden">
         {/* ===== HERO SECTION - App-Like Mobile First ===== */}
         <section className="relative pt-20 md:pt-32 pb-12 md:pb-20 overflow-hidden min-h-[90vh] md:min-h-screen flex items-center">
            {/* Animated Background - More Mobile Optimized */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
               {/* Primary gradient blob */}
               <div
                  className="absolute -top-[30%] -left-[20%] w-[80%] md:w-[60%] h-[60%] md:h-[70%] rounded-full bg-gradient-to-br from-saffron-300/50 via-orange-200/40 to-yellow-200/30 blur-[80px] md:blur-[120px] animate-pulse"
                  style={{ animationDuration: '8s' }}
               />
               {/* Secondary gradient blob */}
               <div
                  className="absolute top-[10%] -right-[20%] w-[70%] md:w-[50%] h-[50%] md:h-[60%] rounded-full bg-gradient-to-bl from-purple-300/40 via-blue-200/30 to-indigo-200/20 blur-[70px] md:blur-[100px]"
               />
               {/* Mobile friendly accent */}
               <div
                  className="absolute bottom-[20%] left-[10%] w-[50%] h-[40%] rounded-full bg-gradient-to-tr from-pink-200/20 to-red-200/15 blur-[60px] animate-pulse"
                  style={{ animationDuration: '10s', animationDelay: '2s' }}
               />
            </div>

            <div className="container relative z-10 mx-auto px-4 md:px-6">
               {/* Status Badge - Refined for Mobile */}
               <div className="flex justify-center mb-6 md:mb-8 animate-in slide-in-from-top-5 duration-700">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/90 border border-saffron-200/50 px-4 md:px-5 py-2 text-xs md:text-sm font-semibold text-stone-700 backdrop-blur-xl shadow-lg shadow-saffron-500/10 hover:shadow-xl hover:shadow-saffron-500/20 transition-all cursor-default">
                     <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-saffron-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-saffron-600"></span>
                     </span>
                     <Sparkles className="h-3.5 w-3.5 text-saffron-600" />
                     <span className="hidden sm:inline">Over 5,000 Rituals Performed</span>
                     <span className="sm:hidden">5K+ Rituals Performed</span>
                  </div>
               </div>

               {/* Hero Heading - Better Mobile Typography */}
               <h1 className="mx-auto max-w-5xl text-center text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-stone-900 mb-6 md:mb-8 leading-[1.1] animate-in fade-in slide-in-from-bottom-5 duration-1000">
                  Nepal's Premier Platform for{' '}
                  <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-saffron-600 via-orange-600 to-red-600 animate-gradient-x">
                     Vedic & Spiritual Services
                  </span>
               </h1>

               {/* Subtitle - Mobile Optimized */}
               <p className="mx-auto max-w-2xl text-center text-base md:text-lg lg:text-xl text-stone-600 mb-8 md:mb-10 leading-relaxed font-medium px-4 md:px-0 animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-200">
                  Connect with experienced Gurubas for Pujas, Havans, Bratabandha, and more.
                  Preserving our Sanskriti with modern convenience.
               </p>

               {/* CTA Buttons - Stack on Mobile */}
               <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4 items-stretch sm:items-center px-4 sm:px-0 mb-12 md:mb-20 animate-in fade-in zoom-in-95 duration-1000 delay-500">
                  <Link to="/book" className="w-full sm:w-auto">
                     <Button
                        size="lg"
                        className="w-full sm:w-auto h-12 md:h-14 px-6 md:px-10 text-base md:text-lg font-bold rounded-2xl md:rounded-full bg-gradient-to-r from-saffron-600 to-orange-600 hover:from-saffron-700 hover:to-orange-700 shadow-2xl shadow-saffron-600/30 hover:shadow-2xl hover:shadow-saffron-600/40 transform hover:-translate-y-1 active:scale-95 transition-all duration-300"
                     >
                        <Calendar className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                        Book a Ritual Now
                     </Button>
                  </Link>
                  <Link to="/gurubas" className="w-full sm:w-auto">
                     <Button
                        variant="outline"
                        size="lg"
                        className="w-full sm:w-auto h-12 md:h-14 px-6 md:px-8 text-base md:text-lg font-bold rounded-2xl md:rounded-full border-2 border-stone-300 hover:border-saffron-500 bg-white/80 hover:bg-white backdrop-blur-sm text-stone-700 hover:text-saffron-600 shadow-xl hover:shadow-2xl transition-all duration-300 active:scale-95"
                     >
                        <Users className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                        Find a Guruba
                     </Button>
                  </Link>
               </div>

               {/* App Preview - Redesigned for Mobile */}
               <div className="relative mx-auto max-w-6xl animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-700">
                  {/* Mobile: Single Card Preview */}
                  <div className="md:hidden relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-white via-saffron-50/30 to-orange-50/20 p-1 backdrop-blur-xl border border-white/50">
                     <div className="relative rounded-[22px] overflow-hidden bg-stone-50 aspect-[9/16]">
                        <img
                           src="https://images.unsplash.com/photo-1609797636017-29c0d309294a?q=80&w=800&auto=format&fit=crop"
                           alt="Mobile App Preview"
                           className="w-full h-full object-cover"
                        />
                        {/* Overlay with Floating Status */}
                        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-transparent to-transparent p-6 flex flex-col justify-end">
                           <div className="bg-white/95 backdrop-blur-xl p-4 rounded-2xl shadow-2xl border border-white/50 mb-4">
                              <div className="flex items-center gap-3">
                                 <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                                    <CheckCircle className="h-6 w-6 text-green-600" />
                                 </div>
                                 <div className="flex-1">
                                    <p className="font-bold text-stone-900 text-sm">Booking Confirmed</p>
                                    <p className="text-xs text-stone-500">Satyanarayan Puja • Today</p>
                                 </div>
                                 <div className="h-8 w-8 rounded-full bg-saffron-100 flex items-center justify-center">
                                    <Star className="h-4 w-4 text-saffron-600 fill-saffron-600" />
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Desktop: 3D Tilted Showcase */}
                  <div className="hidden md:block [perspective:1500px] group">
                     <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white/50 bg-gradient-to-br from-white/40 via-saffron-50/30 to-white/40 backdrop-blur-2xl p-4 [transform:rotateX(10deg)_rotateY(-2deg)] transition-all duration-700 group-hover:[transform:rotateX(2deg)_rotateY(0deg)]">
                        <div className="relative rounded-2xl overflow-hidden bg-stone-50 aspect-video shadow-inner">
                           <img
                              src="https://images.unsplash.com/photo-1609797636017-29c0d309294a?q=80&w=2000&auto=format&fit=crop"
                              alt="Vedic Ritual Dashboard"
                              className="w-full h-full object-cover"
                           />
                           <div className="absolute inset-0 bg-gradient-to-t from-stone-900/30 via-transparent to-transparent pointer-events-none"></div>
                        </div>

                        {/* Floating Success Card */}
                        <div className="absolute top-16 left-16 bg-white/95 backdrop-blur-xl p-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/70 animate-bounce" style={{ animationDuration: '4s' }}>
                           <div className="flex items-center gap-4">
                              <div className="h-14 w-14 bg-gradient-to-br from-green-100 to-emerald-50 rounded-2xl flex items-center justify-center shadow-lg">
                                 <CheckCircle className="h-8 w-8 text-green-600" />
                              </div>
                              <div>
                                 <p className="font-bold text-stone-900 text-base">Booking Confirmed</p>
                                 <p className="text-sm text-stone-500 font-medium">Satyanarayan Puja • Baneshwor</p>
                              </div>
                           </div>
                        </div>

                        {/* Floating Guruba Card */}
                        <div className="absolute bottom-16 right-16 bg-white/95 backdrop-blur-xl p-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/70 animate-bounce" style={{ animationDelay: '1s', animationDuration: '5s' }}>
                           <div className="flex items-center gap-4">
                              <div className="relative h-14 w-14 rounded-2xl overflow-hidden border-3 border-white shadow-xl">
                                 <img src="https://randomuser.me/api/portraits/men/32.jpg" className="h-full w-full object-cover" alt="Guruba" />
                                 <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-green-500 rounded-full border-2 border-white"></div>
                              </div>
                              <div>
                                 <p className="font-bold text-stone-900 text-base">Pandit Ji</p>
                                 <span className="inline-flex items-center gap-1 text-xs text-green-700 font-bold bg-green-100 px-2.5 py-1 rounded-full mt-1">
                                    <MapPin className="h-3 w-3" /> On the way
                                 </span>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </section>

         {/* ===== FEATURES SECTION - Bento-Style Cards ===== */}
         <section className="py-16 md:py-24 bg-gradient-to-b from-stone-50 to-white">
            <div className="container mx-auto px-4 md:px-6">
               {/* Section Header */}
               <div className="text-center mb-12 md:mb-16 max-w-3xl mx-auto">
                  <span className="inline-block py-1.5 px-4 rounded-full bg-saffron-100 text-saffron-700 text-xs md:text-sm font-bold uppercase tracking-wider mb-4">
                     Why Choose Us
                  </span>
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-stone-900 mb-4 leading-tight">
                     Everything needed for a <br className="hidden md:block" />
                     <span className="text-transparent bg-clip-text bg-gradient-to-r from-saffron-600 to-orange-600">divine experience</span>
                  </h2>
                  <p className="text-stone-600 text-base md:text-lg leading-relaxed">
                     We handle the logistics so you can focus on the devotion
                  </p>
               </div>

               {/* Features Grid - Mobile Optimized */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-7xl mx-auto">
                  {FEATURES.map((feature, idx) => (
                     <div
                        key={idx}
                        className="group relative overflow-hidden rounded-3xl bg-white p-6 md:p-8 shadow-sm hover:shadow-2xl transition-all duration-500 border border-stone-100 hover:border-saffron-200 hover:-translate-y-2 active:scale-95"
                        style={{
                           animationDelay: `${idx * 100}ms`,
                        }}
                     >
                        {/* Gradient Accent */}
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 blur-3xl transition-opacity duration-500 rounded-full`}></div>

                        {/* Icon */}
                        <div className={`relative inline-flex items-center justify-center rounded-2xl md:rounded-3xl p-3 md:p-4 bg-gradient-to-br ${feature.iconBg} mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-500 shadow-lg`}>
                           <feature.icon className={`h-6 w-6 md:h-7 md:w-7 ${feature.iconColor}`} />
                        </div>

                        {/* Content */}
                        <h3 className="text-xl md:text-2xl font-bold text-stone-900 mb-2 md:mb-3 group-hover:text-saffron-600 transition-colors">
                           {feature.title}
                        </h3>
                        <p className="text-stone-600 leading-relaxed text-sm md:text-base">
                           {feature.desc}
                        </p>
                     </div>
                  ))}
               </div>
            </div>
         </section>

         {/* ===== POPULAR SERVICES - Enhanced Cards ===== */}
         <section className="py-16 md:py-24 bg-white relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute right-0 top-1/4 w-72 md:w-96 h-72 md:h-96 bg-gradient-to-bl from-saffron-100/60 to-orange-100/40 rounded-full blur-3xl -z-10"></div>

            <div className="container mx-auto px-4 md:px-6">
               {/* Section Header */}
               <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 md:mb-12 gap-4">
                  <div>
                     <span className="inline-block py-1.5 px-4 rounded-full bg-saffron-100 text-saffron-700 text-xs md:text-sm font-bold uppercase tracking-wider mb-3">
                        Our Services
                     </span>
                     <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-stone-900">Most Booked Rituals</h2>
                  </div>
                  <Link to="/book" className="group flex items-center text-stone-900 font-bold hover:text-saffron-600 transition-colors bg-stone-100 hover:bg-saffron-50 px-5 md:px-6 py-3 rounded-full shadow-sm hover:shadow-md active:scale-95">
                     View All Services <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
               </div>

               {isLoading ? (
                  <div className="flex justify-center py-20">
                     <RefreshCw className="h-8 w-8 animate-spin text-saffron-600" />
                  </div>
               ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                     {displayServices.map((service, idx) => (
                        <div
                           key={service.id}
                           className="group relative rounded-3xl md:rounded-[32px] overflow-hidden shadow-xl cursor-pointer h-[420px] md:h-[450px] hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 active:scale-95"
                           onClick={() => navigate(`/services/${service.id}`)}
                           style={{
                              animationDelay: `${idx * 150}ms`,
                           }}
                        >
                           {/* Image */}
                           <img
                              src={service.image_url}
                              alt={service.title}
                              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                           />

                           {/* Gradient Overlay */}
                           <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent p-6 md:p-8 flex flex-col justify-end text-white">
                              <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                                 {/* Tags */}
                                 <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/30">
                                       {service.category || 'General'}
                                    </span>
                                    <span className="text-xs font-medium flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                                       <Clock className="h-3.5 w-3.5" /> {service.duration_minutes} mins
                                    </span>
                                 </div>

                                 {/* Title */}
                                 <h3 className="text-2xl md:text-3xl font-black mb-1 drop-shadow-lg">{service.title}</h3>

                                 {/* CTA Row */}
                                 <div className="flex items-center justify-between mt-4 md:mt-5 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-100">
                                    <div>
                                       <p className="text-saffron-400 font-black text-2xl md:text-3xl drop-shadow-lg">
                                          Rs. {(service.base_price || 0).toLocaleString()}
                                       </p>
                                       <p className="text-xs text-white/70 font-medium">Platform fee incl.</p>
                                    </div>
                                    <div className="bg-white text-stone-900 p-3 md:p-4 rounded-full shadow-xl group-hover:bg-saffron-500 group-hover:text-white transition-colors">
                                       <ArrowRight className="h-5 w-5 md:h-6 md:w-6" />
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               )}
            </div>
         </section>

         {/* ===== STATS SECTION - Glassmorphic Cards ===== */}
         <section className="py-16 md:py-20 bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 text-white relative overflow-hidden">
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-5">
               <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
            </div>

            <div className="container relative mx-auto px-4 md:px-6">
               <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                  <div className="text-center p-6 md:p-8 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 hover:shadow-2xl hover:shadow-saffron-500/20 hover:-translate-y-1">
                     <TrendingUp className="h-8 w-8 md:h-10 md:w-10 text-saffron-500 mx-auto mb-4" />
                     <div className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-saffron-400 to-orange-400 mb-2">5k+</div>
                     <div className="text-stone-400 text-xs md:text-sm uppercase tracking-wide font-bold">Happy Families</div>
                  </div>
                  <div className="text-center p-6 md:p-8 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 hover:shadow-2xl hover:shadow-saffron-500/20 hover:-translate-y-1">
                     <ShieldCheck className="h-8 w-8 md:h-10 md:w-10 text-saffron-500 mx-auto mb-4" />
                     <div className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-saffron-400 to-orange-400 mb-2">200+</div>
                     <div className="text-stone-400 text-xs md:text-sm uppercase tracking-wide font-bold">Verified Gurubas</div>
                  </div>
                  <div className="text-center p-6 md:p-8 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 hover:shadow-2xl hover:shadow-saffron-500/20 hover:-translate-y-1">
                     <MapPin className="h-8 w-8 md:h-10 md:w-10 text-saffron-500 mx-auto mb-4" />
                     <div className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-saffron-400 to-orange-400 mb-2">15+</div>
                     <div className="text-stone-400 text-xs md:text-sm uppercase tracking-wide font-bold">Cities Covered</div>
                  </div>
                  <div className="text-center p-6 md:p-8 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 hover:shadow-2xl hover:shadow-saffron-500/20 hover:-translate-y-1">
                     <Star className="h-8 w-8 md:h-10 md:w-10 text-saffron-500 mx-auto mb-4 fill-saffron-500" />
                     <div className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-saffron-400 to-orange-400 mb-2">4.9</div>
                     <div className="text-stone-400 text-xs md:text-sm uppercase tracking-wide font-bold">Average Rating</div>
                  </div>
               </div>
            </div>
         </section>

         {/* ===== TESTIMONIALS - Premium Cards ===== */}
         <section className="py-16 md:py-24 bg-gradient-to-b from-white to-stone-50">
            <div className="container mx-auto px-4 md:px-6">
               <div className="text-center mb-12 md:mb-16">
                  <span className="inline-block py-1.5 px-4 rounded-full bg-saffron-100 text-saffron-700 text-xs md:text-sm font-bold uppercase tracking-wider mb-4">
                     Testimonials
                  </span>
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-stone-900">
                     Devotees <span className="text-transparent bg-clip-text bg-gradient-to-r from-saffron-600 to-orange-600">Love Us</span>
                  </h2>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-7xl mx-auto">
                  {TESTIMONIALS.map((t, idx) => (
                     <div
                        key={t.id}
                        className="relative bg-white p-6 md:p-8 rounded-3xl border border-stone-100 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 group active:scale-95"
                        style={{
                           animationDelay: `${idx * 150}ms`,
                        }}
                     >
                        {/* Decorative Element */}
                        <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-saffron-100 to-orange-100 rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500"></div>

                        {/* Quote Icon*/}
                        <div className="absolute top-6 right-6 opacity-10 group-hover:opacity-20 transition-opacity">
                           <Heart className="h-12 w-12 md:h-16 md:w-16 text-saffron-500 fill-saffron-500" />
                        </div>

                        {/* Stars */}
                        <div className="flex gap-1 mb-4 relative z-10">
                           {[...Array(t.rating)].map((_, i) => (
                              <Star key={i} className="h-4 w-4 text-saffron-500 fill-saffron-500" />
                           ))}
                        </div>

                        {/* Testimonial Text */}
                        <p className="text-stone-700 mb-6 md:mb-8 relative z-10 italic leading-relaxed text-sm md:text-base font-medium">
                           "{t.text}"
                        </p>

                        {/* Author */}
                        <div className="flex items-center gap-4">
                           <div className="relative h-12 w-12 md:h-14 md:w-14 rounded-2xl overflow-hidden border-2 border-saffron-200 shadow-lg group-hover:scale-110 transition-transform">
                              <img src={t.img} alt={t.name} className="h-full w-full object-cover" />
                           </div>
                           <div>
                              <p className="font-bold text-stone-900 text-sm md:text-base">{t.name}</p>
                              <p className="text-xs text-stone-500 font-semibold uppercase tracking-wide">{t.role}</p>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         </section>

         {/* ===== FINAL CTA - App-Like Design ===== */}
         <section className="relative py-20 md:py-28 overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-stone-900 via-stone-800 to-black"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>

            {/* Animated Gradient Orbs */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-saffron-600/30 to-orange-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }}></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-purple-600/20 to-pink-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s', animationDelay: '2s' }}></div>

            <div className="container relative z-10 mx-auto px-4 md:px-6 text-center">
               {/* Badge */}
               <span className="inline-flex items-center gap-2 py-2 px-4 md:px-5 rounded-full bg-saffron-500/20 text-saffron-400 text-xs md:text-sm font-bold uppercase tracking-wider mb-6 md:mb-8 border border-saffron-500/30 backdrop-blur-sm shadow-xl">
                  <Sparkles className="h-4 w-4" />
                  Join the community
               </span>

               {/* Heading */}
               <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 md:mb-6 leading-tight">
                  Ready to bring <br className="hidden md:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-saffron-400 via-orange-400 to-yellow-400">divinity home?</span>
               </h2>

               {/* Subtitle */}
               <p className="text-stone-300 max-w-2xl mx-auto mb-8 md:mb-10 text-base md:text-xl leading-relaxed font-medium px-4 md:px-0">
                  Book your first ritual today and experience the peace of mind that comes with authentic service.
               </p>

               {/* CTA Buttons */}
               <div className="flex flex-col sm:flex-row justify-center gap-4 px-4 sm:px-0">
                  <Link to="/register" className="w-full sm:w-auto">
                     <Button
                        size="lg"
                        className="w-full sm:w-auto bg-gradient-to-r from-saffron-600 to-orange-600 text-white hover:from-saffron-500 hover:to-orange-500 px-8 md:px-12 h-12 md:h-16 text-base md:text-lg font-bold rounded-2xl md:rounded-full shadow-2xl shadow-saffron-900/50 hover:shadow-2xl hover:shadow-saffron-700/60 transform hover:-translate-y-1 active:scale-95 transition-all"
                     >
                        <Sparkles className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                        Get Started Free
                     </Button>
                  </Link>
                  <Link to="/gurubas" className="w-full sm:w-auto">
                     <Button
                        variant="outline"
                        size="lg"
                        className="w-full sm:w-auto border-2 border-stone-600 hover:border-saffron-500 text-stone-300 hover:text-white bg-white/5 hover:bg-white/10 backdrop-blur-sm px-8 md:px-10 h-12 md:h-16 text-base md:text-lg font-bold rounded-2xl md:rounded-full shadow-xl hover:shadow-2xl transition-all active:scale-95"
                     >
                        <Users className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                        Browse Gurubas
                     </Button>
                  </Link>
               </div>
            </div>
         </section>
      </div>
   );
};
