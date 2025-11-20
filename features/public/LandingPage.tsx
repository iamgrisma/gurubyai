
import React from 'react';
import { Button } from '../../components/ui/Button';
import { Link, useNavigate } from 'react-router-dom';
import { Service } from '../../types';
import { Calendar, Star, ShieldCheck, ArrowRight, Users, Video, MessageSquare, CheckCircle, Sparkles } from 'lucide-react';

const TESTIMONIALS = [
  { id: 1, name: 'Rahul Sharma', text: 'Found the perfect Pandit ji for my Greh Pravesh within minutes. The process was so seamless.', role: 'Bangalore' },
  { id: 2, name: 'Priya Patel', text: 'I was worried about finding an authentic Guruba in the US. This platform connected me to my roots.', role: 'New Jersey' },
  { id: 3, name: 'Amit Verma', text: 'The video consultation feature saved me so much travel time for horoscope matching.', role: 'Mumbai' },
];

const FEATURES = [
  { 
    icon: ShieldCheck, 
    title: '100% Verified Gurubas', 
    desc: 'Every Guruba goes through a rigorous 5-step verification process including background checks and vedic knowledge assessment.',
    bg: 'bg-orange-50 text-orange-600'
  },
  { 
    icon: Calendar, 
    title: 'Instant Scheduling', 
    desc: 'Book rituals at your convenience. Real-time availability calendar ensures no double bookings or confusion.',
    bg: 'bg-blue-50 text-blue-600'
  },
  { 
    icon: Video, 
    title: 'E-Rituals Available', 
    desc: 'Cannot be there physically? Perform rituals via high-definition video conferencing with your chosen Guruba.',
    bg: 'bg-purple-50 text-purple-600'
  },
  { 
    icon: MessageSquare, 
    title: 'Direct Chat', 
    desc: 'CommPnunicate directly with your Guruba to discuss Samagri lists and specific requirements before the ritual.',
    bg: 'bg-green-50 text-green-600'
  },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative pt-24 pb-20 lg:pt-32 lg:pb-28 overflow-hidden">
        {/* Background Blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full z-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-orange-200/40 rounded-full blur-[100px] mix-blend-multiply animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-rose-200/40 rounded-full blur-[100px] mix-blend-multiply"></div>
        </div>

        <div className="container relative z-10 mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/50 border border-stone-200 px-3 py-1 text-sm font-medium text-stone-600 backdrop-blur-sm mb-6 shadow-sm hover:shadow-md transition-all">
            <Sparkles className="h-4 w-4 text-saffron-500" />
            <span>Trusted by 10,000+ Families Worldwide</span>
          </div>
          
          <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight text-stone-900 sm:text-7xl mb-8 leading-[1.1]">
            Connect with Divine <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-saffron-600 to-red-600">Spiritual Guides</span>
          </h1>
          
          <p className="mx-auto max-w-2xl text-lg md:text-xl text-stone-600 mb-10 leading-relaxed">
            Book experienced Purohits, Astrologers, and Gurubas for your rituals. 
            From daily pujas to grand ceremonies, find the perfect guide who resonates with your traditions.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/find-guruba">
              <Button size="lg" className="px-8 py-6 text-lg rounded-full shadow-lg shadow-saffron-500/20 hover:shadow-saffron-500/40 transition-all w-full sm:w-auto">
                Find a Guruba
              </Button>
            </Link>
            <Link to="/book">
              <Button variant="outline" size="lg" className="px-8 py-6 text-lg rounded-full border-stone-300 hover:bg-stone-50 w-full sm:w-auto bg-white/80 backdrop-blur">
                Explore Services
              </Button>
            </Link>
          </div>

          {/* Hero Image Grid Mockup */}
          <div className="mt-16 relative mx-auto max-w-5xl">
             <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-stone-200/50 bg-white/50 backdrop-blur">
                 <img 
                   src="https://images.unsplash.com/photo-1604931668626-ab49cb2c3554?q=80&w=2400&auto=format&fit=crop" 
                   alt="Vedic Ritual" 
                   className="w-full h-[400px] md:h-[500px] object-cover opacity-90 hover:scale-105 transition-transform duration-700"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-8">
                    <div className="text-white text-left">
                        <p className="font-bold text-lg">Traditional Vedic Ceremonies</p>
                        <p className="text-sm opacity-80">Performed with absolute devotion and authenticity</p>
                    </div>
                 </div>
             </div>
             
             {/* Floating Badge */}
             <div className="absolute -bottom-6 -right-6 bg-white p-4 rounded-xl shadow-xl border border-stone-100 hidden md:block animate-bounce" style={{ animationDuration: '3s' }}>
                <div className="flex items-center gap-3">
                   <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                   </div>
                   <div>
                      <p className="font-bold text-stone-900">Verified Expert</p>
                      <p className="text-xs text-stone-500">Acharya Deepak Ji</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Value Props (Bento Grid Style) */}
      <section className="py-20 bg-stone-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
             <h2 className="text-3xl font-bold text-stone-900 sm:text-4xl">Everything you need for your spiritual journey</h2>
             <p className="mt-4 text-stone-600">Seamless booking, authentic services, and complete peace of mind.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature, idx) => (
              <div key={idx} className={`group relative overflow-hidden rounded-3xl bg-white p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-stone-100 ${idx === 0 || idx === 3 ? 'lg:col-span-2' : ''}`}>
                 <div className={`inline-flex items-center justify-center rounded-2xl p-3 ${feature.bg} mb-6 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="h-6 w-6" />
                 </div>
                 <h3 className="text-xl font-bold text-stone-900 mb-3">{feature.title}</h3>
                 <p className="text-stone-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Services - Carousel Style */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold text-stone-900">Most Booked Rituals</h2>
              <p className="mt-2 text-stone-600">Choose from over 50+ vedic services.</p>
            </div>
            <Link to="/book" className="hidden md:flex items-center text-saffron-600 font-bold hover:text-saffron-700 group">
              View All <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
             {[
               { title: 'Satyanarayan Puja', price: 51, img: 'https://images.unsplash.com/photo-1609797636017-29c0d309294a?q=80&w=800&auto=format&fit=crop', cat: 'Puja' },
               { title: 'Griha Pravesh', price: 101, img: 'https://images.unsplash.com/photo-1582880990674-2355959b2129?q=80&w=800&auto=format&fit=crop', cat: 'Ceremony' },
               { title: 'Vivah Sanskar', price: 501, img: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop', cat: 'Wedding' },
             ].map((service, i) => (
               <div key={i} className="group relative rounded-2xl overflow-hidden shadow-lg transition-all hover:-translate-y-1 cursor-pointer" onClick={() => navigate('/book')}>
                  <div className="aspect-[4/3] w-full overflow-hidden">
                     <img src={service.img} alt={service.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 flex flex-col justify-end text-white">
                     <span className="text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur px-2 py-1 rounded w-fit mb-2">{service.cat}</span>
                     <h3 className="text-2xl font-bold mb-1">{service.title}</h3>
                     <p className="text-saffron-400 font-bold">Starting from ${service.price}</p>
                  </div>
               </div>
             ))}
          </div>
          
          <div className="mt-8 text-center md:hidden">
             <Link to="/book">
               <Button variant="outline" className="w-full">View All Services</Button>
             </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-stone-900 text-white overflow-hidden relative">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
         <div className="container relative z-10 mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-16">Voices of our Community</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {TESTIMONIALS.map((t) => (
                 <div key={t.id} className="bg-stone-800/50 p-8 rounded-2xl border border-stone-700 relative hover:bg-stone-800 transition-colors">
                    <div className="absolute -top-4 left-8 text-6xl text-stone-600 font-serif">"</div>
                    <p className="text-stone-300 mb-6 relative z-10 italic leading-relaxed">{t.text}</p>
                    <div className="flex items-center gap-3">
                       <div className="h-10 w-10 rounded-full bg-gradient-to-br from-saffron-500 to-rose-500 flex items-center justify-center font-bold text-sm">
                          {t.name[0]}
                       </div>
                       <div>
                          <p className="font-bold text-sm">{t.name}</p>
                          <p className="text-xs text-stone-500">{t.role}</p>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
         </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 bg-saffron-600 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-saffron-600 to-orange-600"></div>
        <div className="container relative z-10 mx-auto px-4 text-center">
           <h2 className="text-3xl font-bold text-white sm:text-4xl mb-6">Ready to start your spiritual journey?</h2>
           <p className="text-orange-100 max-w-2xl mx-auto mb-10 text-lg">Join thousands of families connecting with their traditions through Guruba.</p>
           <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/register">
                 <Button size="lg" className="bg-white text-saffron-600 hover:bg-stone-50 w-full sm:w-auto px-8">Get Started Now</Button>
              </Link>
              <Link to="/gurubas">
                 <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/10 w-full sm:w-auto">Browse Gurubas</Button>
              </Link>
           </div>
        </div>
      </section>
    </div>
  );
};
