
// features/public/LandingPage.tsx

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useServices } from '../../hooks/queries';
import { Button } from '../../components/ui/Button';
import { 
  Calendar, ShieldCheck, ArrowRight, Video, MessageSquare, CheckCircle, 
  Clock, Heart, RefreshCw
} from 'lucide-react';

const TESTIMONIALS = [
  { id: 1, name: 'Ram Bahadur Thapa', text: 'Found a very knowledgeable Pandit ji for my son\'s Bratabandha in Kathmandu. The process was smooth and the ritual was conducted perfectly according to Vedic traditions.', role: 'Kathmandu', img: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { id: 2, name: 'Sita Devi Sharma', text: 'I live in Australia but wanted a Rudri Puja performed at home in Pokhara for my parents. Guruba Connect made it possible effortlessly.', role: 'Pokhara / Sydney', img: 'https://randomuser.me/api/portraits/women/44.jpg' },
  { id: 3, name: 'Amit Verma', text: 'The video consultation for Kundali matching saved us a trip to the village. Highly authentic and reliable service.', role: 'Biratnagar', img: 'https://randomuser.me/api/portraits/men/86.jpg' },
];

const FEATURES = [
  { 
    icon: ShieldCheck, 
    title: 'Verified Gurubas', 
    desc: 'Every Pandit and Lama goes through a strict verification process regarding their Vedic education and lineage.',
    bg: 'bg-orange-100 text-orange-600',
    colSpan: 'md:col-span-2'
  },
  { 
    icon: Calendar, 
    title: 'Easy Scheduling', 
    desc: 'Book rituals according to your auspicious Muhurat. Real-time availability ensures no conflicts.',
    bg: 'bg-blue-100 text-blue-600',
    colSpan: 'md:col-span-1'
  },
  { 
    icon: Video, 
    title: 'Online Rituals', 
    desc: 'Perform pujas remotely via WhatsApp or Google Meet if you are abroad or unable to gather physically.',
    bg: 'bg-purple-100 text-purple-600',
    colSpan: 'md:col-span-1'
  },
  { 
    icon: MessageSquare, 
    title: 'Direct Chat', 
    desc: 'Chat with your Guruba to discuss the Samagri list and specific requirements for the puja.',
    bg: 'bg-green-100 text-green-600',
    colSpan: 'md:col-span-2'
  },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Fetch dynamic services
  const { data: services = [], isLoading } = useServices();
  
  // Filter featured services (or take first 3 if none featured)
  const featuredServices = services.filter(s => s.is_featured).slice(0, 3);
  const displayServices = featuredServices.length > 0 ? featuredServices : services.slice(0, 3);

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans overflow-x-hidden">
      {/* Modern Gradient Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Vivid Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-saffron-200/40 to-orange-300/30 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-gradient-to-bl from-purple-200/40 to-blue-200/30 blur-[100px]" />
        </div>

        <div className="container relative z-10 mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 border border-stone-200 px-4 py-1.5 text-sm font-semibold text-stone-600 backdrop-blur-md mb-8 shadow-sm hover:shadow-md transition-all cursor-default">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-saffron-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-saffron-500"></span>
            </span>
            <span>Over 5,000 Rituals Performed Across Nepal</span>
          </div>
          
          <h1 className="mx-auto max-w-5xl text-5xl font-extrabold tracking-tight text-stone-900 sm:text-7xl mb-8 leading-[1.1]">
            Nepal's Premier Platform for <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-saffron-600 via-orange-500 to-red-600">Vedic & Spiritual Services</span>
          </h1>
          
          <p className="mx-auto max-w-2xl text-lg md:text-xl text-stone-600 mb-10 leading-relaxed font-medium">
            Connect with experienced Gurubas for Pujas, Havans, Bratabandha, and more. 
            Preserving our Sanskriti with modern convenience.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 items-center">
            <Link to="/book">
              <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-gradient-to-r from-saffron-600 to-orange-600 hover:from-saffron-700 hover:to-orange-700 shadow-lg shadow-saffron-500/30 transform hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto">
                Book a Ritual Now
              </Button>
            </Link>
            <Link to="/gurubas">
              <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-full border-stone-300 hover:bg-stone-50 w-full sm:w-auto bg-white/60 backdrop-blur-sm text-stone-700">
                Find a Guruba
              </Button>
            </Link>
          </div>

          {/* Floating App Mockup */}
          <div className="mt-20 relative mx-auto max-w-5xl [perspective:1000px] group">
             <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/50 bg-white/40 backdrop-blur-xl p-3 [transform:rotateX(12deg)] transition-transform duration-700 group-hover:[transform:rotateX(0deg)] origin-top">
                 <div className="relative rounded-xl overflow-hidden bg-stone-100 aspect-video">
                    <img 
                      src="https://images.unsplash.com/photo-1609797636017-29c0d309294a?q=80&w=2000&auto=format&fit=crop" 
                      alt="Vedic Ritual Dashboard" 
                      className="w-full h-full object-cover shadow-inner"
                    />
                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-900/20 to-transparent pointer-events-none"></div>
                 </div>
                 
                 {/* Floating Cards */}
                 <div className="absolute top-12 left-12 bg-white/95 backdrop-blur p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/50 animate-bounce" style={{ animationDuration: '4s' }}>
                    <div className="flex items-center gap-4">
                       <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center shadow-inner">
                          <CheckCircle className="h-7 w-7 text-green-600" />
                       </div>
                       <div>
                          <p className="font-bold text-stone-900 text-sm">Booking Confirmed</p>
                          <p className="text-xs text-stone-500 font-medium">Satyanarayan Puja • Baneshwor</p>
                       </div>
                    </div>
                 </div>

                 <div className="absolute bottom-12 right-12 bg-white/95 backdrop-blur p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/50 animate-bounce hidden md:block" style={{ animationDelay: '1s', animationDuration: '5s' }}>
                    <div className="flex items-center gap-4">
                       <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-white shadow-md">
                          <img src="https://randomuser.me/api/portraits/men/32.jpg" className="h-full w-full object-cover" alt="Guruba" />
                       </div>
                       <div>
                          <p className="font-bold text-stone-900 text-sm">Pandit Ji is arriving</p>
                          <p className="text-xs text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full inline-block mt-1">On the way</p>
                       </div>
                    </div>
                 </div>
             </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section className="py-24 bg-stone-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 max-w-3xl mx-auto">
             <h2 className="text-3xl font-bold text-stone-900 sm:text-4xl mb-4">Everything needed for a divine experience</h2>
             <p className="text-stone-600 text-lg">We handle the logistics so you can focus on the devotion. From booking to dakshina, everything is streamlined for Nepali households.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {FEATURES.map((feature, idx) => (
              <div key={idx} className={`group relative overflow-hidden rounded-3xl bg-white p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-stone-100 ${feature.colSpan}`}>
                 <div className={`inline-flex items-center justify-center rounded-2xl p-4 ${feature.bg} mb-6 group-hover:scale-110 transition-transform duration-500`}>
                    <feature.icon className="h-7 w-7" />
                 </div>
                 <h3 className="text-2xl font-bold text-stone-900 mb-3">{feature.title}</h3>
                 <p className="text-stone-500 leading-relaxed text-base">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Services Carousel */}
      <section className="py-24 bg-white relative overflow-hidden">
         <div className="absolute right-0 top-1/4 w-96 h-96 bg-saffron-50 rounded-full blur-3xl opacity-60 -z-10"></div>
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div>
              <span className="text-saffron-600 font-bold uppercase tracking-wider text-sm mb-2 block">Our Services</span>
              <h2 className="text-4xl font-bold text-stone-900">Most Booked Rituals</h2>
            </div>
            <Link to="/book" className="flex items-center text-stone-900 font-bold hover:text-saffron-600 group transition-colors bg-stone-100 hover:bg-saffron-50 px-6 py-3 rounded-full">
              View All Services <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {isLoading ? (
              <div className="flex justify-center py-20">
                  <RefreshCw className="h-8 w-8 animate-spin text-saffron-500" />
              </div>
          ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                 {displayServices.map((service) => (
                   <div key={service.id} className="group relative rounded-3xl overflow-hidden shadow-lg cursor-pointer h-[400px]" onClick={() => navigate(`/services/${service.id}`)}>
                      <img src={service.image_url} alt={service.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-8 flex flex-col justify-end text-white">
                         <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur px-3 py-1 rounded-full">{service.category || 'General'}</span>
                                <span className="text-xs font-medium flex items-center gap-1 opacity-80"><Clock className="h-3 w-3" /> {service.duration_minutes} mins</span>
                            </div>
                            <h3 className="text-2xl font-bold mb-2">{service.title}</h3>
                            <div className="flex items-center justify-between mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                                <p className="text-saffron-400 font-bold text-xl">Rs. {(service.base_price || 0).toLocaleString()}</p>
                                <span className="bg-white text-stone-900 p-2 rounded-full"><ArrowRight className="h-4 w-4" /></span>
                            </div>
                         </div>
                      </div>
                   </div>
                 ))}
              </div>
          )}
        </div>
      </section>

      {/* Stats / Trust */}
      <section className="py-20 bg-stone-900 text-white">
         <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-stone-800">
               <div>
                  <div className="text-4xl md:text-5xl font-bold text-saffron-500 mb-2">5k+</div>
                  <div className="text-stone-400 text-sm uppercase tracking-wide">Happy Families</div>
               </div>
               <div>
                  <div className="text-4xl md:text-5xl font-bold text-saffron-500 mb-2">200+</div>
                  <div className="text-stone-400 text-sm uppercase tracking-wide">Verified Gurubas</div>
               </div>
               <div>
                  <div className="text-4xl md:text-5xl font-bold text-saffron-500 mb-2">15+</div>
                  <div className="text-stone-400 text-sm uppercase tracking-wide">Cities Covered</div>
               </div>
               <div>
                  <div className="text-4xl md:text-5xl font-bold text-saffron-500 mb-2">4.9</div>
                  <div className="text-stone-400 text-sm uppercase tracking-wide">Average Rating</div>
               </div>
            </div>
         </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-stone-50">
         <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-16 text-stone-900">Devotees Love Us</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {TESTIMONIALS.map((t) => (
                 <div key={t.id} className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-2 relative">
                    <div className="absolute top-8 right-8 text-stone-100">
                       <Heart className="h-8 w-8 fill-stone-100" />
                    </div>
                    <p className="text-stone-600 mb-8 relative z-10 italic leading-relaxed text-lg">"{t.text}"</p>
                    <div className="flex items-center gap-4">
                       <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-stone-100 shadow-md">
                          <img src={t.img} alt={t.name} className="h-full w-full object-cover" />
                       </div>
                       <div>
                          <p className="font-bold text-stone-900">{t.name}</p>
                          <p className="text-xs text-stone-500 font-medium uppercase tracking-wide">{t.role}</p>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
         </div>
      </section>

      {/* Big CTA */}
      <section className="relative py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-stone-900 to-stone-800 z-0"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 z-0"></div>
        
        <div className="container relative z-10 mx-auto px-4 text-center">
           <span className="inline-block py-1 px-3 rounded-full bg-saffron-500/20 text-saffron-400 text-xs font-bold uppercase tracking-wider mb-6 border border-saffron-500/30">Join the community</span>
           <h2 className="text-4xl font-bold text-white sm:text-5xl mb-6">Ready to bring divinity home?</h2>
           <p className="text-stone-300 max-w-2xl mx-auto mb-10 text-xl">Book your first ritual today and experience the peace of mind that comes with authentic service.</p>
           <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/register">
                 <Button size="lg" className="bg-saffron-600 text-white hover:bg-saffron-500 w-full sm:w-auto px-10 h-14 text-lg rounded-full shadow-lg shadow-saffron-900/50">Get Started Free</Button>
              </Link>
              <Link to="/gurubas">
                 <Button variant="outline" size="lg" className="border-stone-600 text-stone-300 hover:bg-stone-800 hover:text-white w-full sm:w-auto h-14 text-lg rounded-full">Browse Gurubas</Button>
              </Link>
           </div>
        </div>
      </section>
    </div>
  );
};
