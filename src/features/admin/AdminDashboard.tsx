"use client";

// features/admin/AdminDashboard.tsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Users,
  LayoutDashboard,
  DollarSign,
  ScrollText,
  UserPlus,
  Menu,
  ChevronsLeft,
  ChevronsRight,
  Layers,
  LogOut,
  Shield,
  CreditCard,
  User,
} from 'lucide-react';

// Child Components
import { AdminOverview } from './dashboard/Overview';
import { AdminConcierge } from './dashboard/Concierge';
import { AdminUsers } from './dashboard/Users';
import { AdminVerification } from './dashboard/Verification';
import { AdminServices } from './dashboard/Services';
import { AdminGotras } from './dashboard/Gotras';
import { AdminFinancials } from './dashboard/Financials';
import { AdminTopups } from './dashboard/Topups';

// Simple Sidebar item component
const SidebarItem = ({ icon: Icon, label, active, onClick, isCollapsed }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center py-3 text-sm font-medium transition-all duration-300 rounded-xl mb-1 group relative overflow-hidden
      ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'}
      ${active ? 'bg-gradient-to-r from-saffron-500 to-saffron-600 text-white shadow-lg shadow-saffron-500/20 font-bold' : 'text-stone-400 hover:bg-royal-900 hover:text-white'}`}
    title={isCollapsed ? label : ''}
  >
    <div className="flex items-center gap-3 z-10 relative">
      <Icon className={`h-5 w-5 shrink-0 transition-transform duration-300 ${active ? 'text-white scale-110' : 'text-stone-500 group-hover:text-stone-300 group-hover:scale-110'}`} />
      {!isCollapsed && <span className="flex-1 text-left">{label}</span>}
    </div>
    {active && !isCollapsed && (
      <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50 rounded-l-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
    )}
  </button>
);

export const AdminDashboard: React.FC = () => {
  const { signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'concierge'
    | 'users'
    | 'services'
    | 'gotras'
    | 'financials'
    | 'verification'
    | 'topups'
  >('overview');

  useEffect(() => {
    if (tabParam) {
      const allowedTabs = ['overview', 'concierge', 'users', 'services', 'gotras', 'financials', 'verification', 'topups'];
      if (allowedTabs.includes(tabParam)) {
        setActiveTab(tabParam as any);
      }
    }
  }, [tabParam]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <AdminOverview setActiveTab={setActiveTab} />;
      case 'concierge':
        return <AdminConcierge />;
      case 'users':
        return <AdminUsers />;
      case 'verification':
        return <AdminVerification />;
      case 'services':
        return <AdminServices />;
      case 'gotras':
        return <AdminGotras />;
      case 'financials':
        return <AdminFinancials />;
      case 'topups':
        return <AdminTopups />;
      default:
        return <AdminOverview setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex font-sans">
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-40 bg-royal-950/40 backdrop-blur-sm lg:hidden transition-all duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full bg-royal-950 flex flex-col transition-transform duration-400 ease-out shadow-2xl border-r border-royal-900
          lg:translate-x-0 lg:static lg:h-[calc(100vh-4rem)] lg:sticky lg:top-16
          ${isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72'}
          ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        <div className={`p-6 flex items-center gap-4 ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}>
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-saffron-400 to-saffron-600 flex items-center justify-center text-white font-bold shadow-lg shrink-0 border border-saffron-400/20">A</div>
          {!isSidebarCollapsed && (
            <div>
              <h1 className="text-white font-bold text-lg tracking-tight leading-none">Admin</h1>
              <p className="text-xs text-saffron-400 font-medium mt-1">Super User</p>
            </div>
          )}
        </div>
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-royal-800 pb-20">
          <p className={`px-4 text-[10px] font-black text-royal-400 uppercase tracking-widest mt-4 mb-2 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>Main</p>
          <SidebarItem icon={LayoutDashboard} label="Overview" active={activeTab === 'overview'} onClick={() => handleTabChange('overview')} isCollapsed={isSidebarCollapsed} />
          <SidebarItem icon={UserPlus} label="Concierge Booking" active={activeTab === 'concierge'} onClick={() => handleTabChange('concierge')} isCollapsed={isSidebarCollapsed} />
          
          <div className="my-6 mx-4 h-px bg-gradient-to-r from-transparent via-royal-800 to-transparent"></div>
          
          <p className={`px-4 text-[10px] font-black text-royal-400 uppercase tracking-widest mb-2 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>Management</p>
          <SidebarItem icon={Users} label="User Details" active={activeTab === 'users'} onClick={() => handleTabChange('users')} isCollapsed={isSidebarCollapsed} />
          <SidebarItem icon={Shield} label="Verification" active={activeTab === 'verification'} onClick={() => handleTabChange('verification')} isCollapsed={isSidebarCollapsed} />
          <SidebarItem icon={CreditCard} label="Top-up Requests" active={activeTab === 'topups'} onClick={() => handleTabChange('topups')} isCollapsed={isSidebarCollapsed} />
          <SidebarItem icon={Layers} label="Services" active={activeTab === 'services'} onClick={() => handleTabChange('services')} isCollapsed={isSidebarCollapsed} />
          <SidebarItem icon={ScrollText} label="Gotras" active={activeTab === 'gotras'} onClick={() => handleTabChange('gotras')} isCollapsed={isSidebarCollapsed} />
          <SidebarItem icon={DollarSign} label="Financials" active={activeTab === 'financials'} onClick={() => handleTabChange('financials')} isCollapsed={isSidebarCollapsed} />

          <div className="my-6 mx-4 h-px bg-gradient-to-r from-transparent via-royal-800 to-transparent"></div>

          <p className={`px-4 text-[10px] font-black text-royal-400 uppercase tracking-widest mb-2 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>Switch View</p>
          <SidebarItem icon={User} label="Client Dashboard" active={false} onClick={() => router.push('/client')} isCollapsed={isSidebarCollapsed} />
          <SidebarItem icon={Users} label="Guruba Dashboard" active={false} onClick={() => router.push('/guruba')} isCollapsed={isSidebarCollapsed} />
        </nav>
        
        <div className="p-4 bg-royal-950 border-t border-royal-900/50 mt-auto">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden lg:flex w-full items-center justify-center p-2 text-stone-500 hover:text-white hover:bg-royal-900 rounded-lg transition-colors mb-2"
          >
            {isSidebarCollapsed ? <ChevronsRight className="h-5 w-5" /> : <ChevronsLeft className="h-5 w-5" />}
          </button>
          <button
            onClick={() => signOut()}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-all ${isSidebarCollapsed ? 'lg:px-0' : ''}`}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!isSidebarCollapsed && 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto h-[calc(100vh-4rem)] bg-stone-50">
        <div className="lg:hidden mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-white rounded-lg shadow-sm border border-stone-200 text-stone-600">
              <Menu className="h-6 w-6" />
            </button>
            <span className="font-bold text-stone-900 text-xl capitalize">{activeTab.replace('_', ' ')}</span>
          </div>
        </div>
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};
