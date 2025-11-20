
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { User, ArrowLeft, PlusCircle } from 'lucide-react';
import { Gotra } from '../../types';

// Internal Gotra Select Component (Reused)
const GotraSelect = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
    const [gotras, setGotras] = useState<Gotra[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        const fetchGotras = async () => {
            const { data } = await supabase.from('gotras').select('*').eq('status', 'approved').order('name');
            setGotras(data || []);
        };
        fetchGotras();
    }, []);

    useEffect(() => {
        if (value && !searchTerm) {
             setSearchTerm(value);
        }
    }, [value]);

    const filtered = gotras.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleRequestNew = async () => {
        if (!searchTerm.trim()) return;
        try {
            const { error } = await supabase.from('gotras').insert({ name: searchTerm.trim(), status: 'pending' });
            if (error && error.code !== '23505') throw error;
            
            onChange(searchTerm.trim());
            setShowDropdown(false);
            alert(`Requested to add '${searchTerm}'. It has been selected for your profile pending approval.`);
        } catch (e) {
            alert("Failed to request Gotra.");
        }
    };

    return (
        <div className="relative">
            <label className="block text-sm font-medium text-stone-700 mb-1">Gotra</label>
            <div className="relative">
                <input 
                    className="w-full rounded-lg border-stone-200 focus:ring-saffron-500 focus:border-saffron-500 p-2 border"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Search or add Gotra..."
                />
                {showDropdown && searchTerm && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-stone-200 max-h-60 overflow-auto">
                        {filtered.length > 0 ? (
                            filtered.map(g => (
                                <button
                                    key={g.id}
                                    className="w-full text-left px-4 py-2 hover:bg-stone-100 text-sm"
                                    onClick={() => {
                                        onChange(g.name);
                                        setSearchTerm(g.name);
                                        setShowDropdown(false);
                                    }}
                                >
                                    {g.name}
                                </button>
                            ))
                        ) : (
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-stone-50 text-sm text-saffron-600 font-medium flex items-center gap-2"
                                onClick={handleRequestNew}
                            >
                                <PlusCircle className="h-4 w-4" /> Request to add "{searchTerm}"
                            </button>
                        )}
                    </div>
                )}
            </div>
            {showDropdown && <div className="fixed inset-0 z-0" onClick={() => setShowDropdown(false)}></div>}
        </div>
    );
};

export const ClientProfilePage: React.FC = () => {
  const { profile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
    gotra_id: '',
    avatar_url: '',
    city: ''
  });
  const [updateLoading, setUpdateLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        gotra_id: profile.gotra_id || '',
        avatar_url: profile.avatar_url || '',
        city: profile.city || ''
      });
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    setUpdateLoading(true);
    try {
      const { error } = await supabase.from('profiles').update(profileForm).eq('id', user?.id);
      if (error) throw error;
      await refreshProfile();
      alert("Profile updated successfully");
    } catch (err) {
      alert("Failed to update profile.");
    } finally {
      setUpdateLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8">
       <div className="mx-auto max-w-2xl">
          <Button variant="ghost" className="mb-6 pl-0 hover:bg-transparent hover:text-saffron-600" onClick={() => navigate('/client')}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold text-stone-900 mb-2">My Profile</h1>
          <p className="text-stone-600 mb-8">Manage your personal information and preferences.</p>

          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8">
                <div className="flex items-center gap-6 mb-8">
                    <div className="h-24 w-24 rounded-full bg-stone-100 border-4 border-white shadow-lg overflow-hidden relative group cursor-pointer">
                        {profileForm.avatar_url ? <img src={profileForm.avatar_url} className="h-full w-full object-cover" /> : <User className="h-10 w-10 text-stone-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-stone-900">{profileForm.full_name || 'Your Name'}</h3>
                        <p className="text-stone-500">{user?.email}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Full Name</label>
                        <input 
                            className="w-full rounded-lg border-stone-200 focus:ring-saffron-500 focus:border-saffron-500 p-3 border" 
                            value={profileForm.full_name}
                            onChange={e => setProfileForm({...profileForm, full_name: e.target.value})}
                            placeholder="Enter your full name"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">Phone Number</label>
                            <input 
                                className="w-full rounded-lg border-stone-200 focus:ring-saffron-500 focus:border-saffron-500 p-3 border" 
                                value={profileForm.phone}
                                onChange={e => setProfileForm({...profileForm, phone: e.target.value})}
                                placeholder="e.g. 9800000000"
                            />
                        </div>
                        <GotraSelect 
                            value={profileForm.gotra_id}
                            onChange={(val) => setProfileForm({...profileForm, gotra_id: val})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">City</label>
                        <input 
                            className="w-full rounded-lg border-stone-200 focus:ring-saffron-500 focus:border-saffron-500 p-3 border" 
                            value={profileForm.city}
                            onChange={e => setProfileForm({...profileForm, city: e.target.value})}
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Avatar URL</label>
                        <input 
                            className="w-full rounded-lg border-stone-200 focus:ring-saffron-500 focus:border-saffron-500 p-3 border" 
                            value={profileForm.avatar_url}
                            onChange={e => setProfileForm({...profileForm, avatar_url: e.target.value})}
                            placeholder="https://..."
                        />
                    </div>
                </div>
                <div className="flex justify-end mt-8">
                    <Button onClick={handleSaveProfile} isLoading={updateLoading}>Save Changes</Button>
                </div>
            </div>
       </div>
    </div>
  );
};
