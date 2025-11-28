
// features/admin/AdminDashboard.tsx

import React, { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
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

import { AdminNotificationPanel } from '../../components/admin/AdminNotificationPanel';

// Simple Sidebar item component
const SidebarItem = ({ icon: Icon, label, active, onClick, isCollapsed }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center py-3 text-sm font-medium transition-all duration-200 rounded-lg mb-1 group relative
      ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'}
      ${active ? 'bg-saffron-600 text-white shadow-md' : 'text-stone-400 hover:bg-stone-800 hover:text-white'}`}
    title={isCollapsed ? label : ''}
  >
    <div className="flex items-center gap-3 z-10 relative">
      <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-white' : 'text-stone-400 group-hover:text-white'}`} />
      {!isCollapsed && <span className="flex-1 text-left">{label}</span>}
    </div>
    {active && !isCollapsed && (
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white/30 rounded-r-full"></div>
    )}
  </button>
);

export const AdminDashboard: React.FC = () => {
  const { signOut } = useAuth();
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
        className={`fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full bg-stone-900 flex flex-col transition-all duration-300 ease-in-out shadow-2xl
          lg:translate-x-0 lg:static lg:h-[calc(100vh-4rem)] lg:sticky lg:top-16
          ${isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72'}
          ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        <div className={`p-6 border-b border-stone-800 flex items-center gap-4 ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}>
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-saffron-500 to-orange-600 flex items-center justify-center text-white font-bold shadow-lg shrink-0">A</div>
          {!isSidebarCollapsed && (
            <div>
              <h1 className="text-white font-bold text-lg tracking-tight">Admin Panel</h1>
              <p className="text-xs text-stone-400">Super User</p>
            </div>
          )}
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-stone-700">
          <p className={`px-4 text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>Main</p>
          <SidebarItem icon={LayoutDashboard} label="Overview" active={activeTab === 'overview'} onClick={() => handleTabChange('overview')} isCollapsed={isSidebarCollapsed} />
          <SidebarItem icon={UserPlus} label="Concierge Booking" active={activeTab === 'concierge'} onClick={() => handleTabChange('concierge')} isCollapsed={isSidebarCollapsed} />
          <div className="my-4 border-t border-stone-800 mx-2"></div>
          <p className={`px-4 text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>Management</p>
          <SidebarItem icon={Users} label="User Details" active={activeTab === 'users'} onClick={() => handleTabChange('users')} isCollapsed={isSidebarCollapsed} />
          <SidebarItem icon={Shield} label="Verification" active={activeTab === 'verification'} onClick={() => handleTabChange('verification')} isCollapsed={isSidebarCollapsed} />
          <SidebarItem icon={CreditCard} label="Top-up Requests" active={activeTab === 'topups'} onClick={() => handleTabChange('topups')} isCollapsed={isSidebarCollapsed} />
          <SidebarItem icon={Layers} label="Services" active={activeTab === 'services'} onClick={() => handleTabChange('services')} isCollapsed={isSidebarCollapsed} />
          <SidebarItem icon={ScrollText} label="Gotras" active={activeTab === 'gotras'} onClick={() => handleTabChange('gotras')} isCollapsed={isSidebarCollapsed} />
          <SidebarItem icon={DollarSign} label="Financials" active={activeTab === 'financials'} onClick={() => handleTabChange('financials')} isCollapsed={isSidebarCollapsed} />

        </nav>
        <div className="p-4 border-t border-stone-800 bg-stone-900">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden lg:flex w-full items-center justify-center p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors mb-2"
          >
            {isSidebarCollapsed ? <ChevronsRight className="h-5 w-5" /> : <ChevronsLeft className="h-5 w-5" />}
          </button>
          <button
            onClick={() => signOut()}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-900/20 hover:text-red-300 rounded-lg transition-colors ${isSidebarCollapsed ? 'lg:px-0' : ''}`}
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

