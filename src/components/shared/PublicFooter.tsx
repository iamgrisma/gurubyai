import React from 'react';
import Link from 'next/link';

export const PublicFooter: React.FC = () => {
    return (
        <footer className="bg-stone-950 pt-20 pb-10 border-t border-stone-800">
            <div className="container mx-auto px-4 md:px-6">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                  <div className="md:col-span-1">
                     <Link href="/" className="flex items-center gap-2 mb-6 group">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-saffron-500 to-orange-600 flex items-center justify-center text-white font-bold text-xl shadow-lg group-hover:scale-105 transition-transform">
                           G
                        </div>
                        <span className="text-2xl font-bold text-white tracking-tight">Guruba</span>
                     </Link>
                     <p className="text-stone-400 text-sm leading-relaxed mb-6">
                        Nepal's premier platform for authentic Vedic rituals and spiritual services. 
                        Preserving our Sanskriti with modern convenience.
                     </p>
                  </div>
                  
                  <div>
                     <h4 className="text-white font-bold mb-6">Platform</h4>
                     <ul className="space-y-4 text-sm text-stone-400">
                        <li><Link href="/" className="hover:text-saffron-500 transition-colors">Services</Link></li>
                        <li><Link href="/gurubas" className="hover:text-saffron-500 transition-colors">Find a Guruba</Link></li>
                        <li><Link href="/book" className="hover:text-saffron-500 transition-colors">Book a Ritual</Link></li>
                        <li><Link href="/register" className="hover:text-saffron-500 transition-colors">Create Account</Link></li>
                     </ul>
                  </div>

                  <div>
                     <h4 className="text-white font-bold mb-6">Company</h4>
                     <ul className="space-y-4 text-sm text-stone-400">
                        <li><Link href="/about" className="hover:text-saffron-500 transition-colors">About Us</Link></li>
                        <li><Link href="/trust" className="hover:text-saffron-500 transition-colors">Trust & Safety</Link></li>
                        <li><Link href="/faq" className="hover:text-saffron-500 transition-colors">FAQ</Link></li>
                        <li><Link href="/contact" className="hover:text-saffron-500 transition-colors">Contact</Link></li>
                     </ul>
                  </div>

                  <div>
                     <h4 className="text-white font-bold mb-6">Legal</h4>
                     <ul className="space-y-4 text-sm text-stone-400">
                        <li><Link href="/privacy" className="hover:text-saffron-500 transition-colors">Privacy Policy</Link></li>
                        <li><Link href="/terms" className="hover:text-saffron-500 transition-colors">Terms of Service</Link></li>
                     </ul>
                  </div>
               </div>

               <div className="pt-8 border-t border-stone-800/50 flex flex-col md:flex-row items-center justify-between text-xs text-stone-500">
                  <p>© {new Date().getFullYear()} Guruba Connect. All rights reserved.</p>
                  <p className="mt-2 md:mt-0">Designed for Devotion.</p>
               </div>
            </div>
         </footer>
    );
};
