// features/guruba/dashboard/Profile.tsx

import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { Button } from '../../../components/ui/Button';
import { Guruba, Gotra } from '../../../types';
import { Save, PlusCircle, Info } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { LocationPicker } from '../../../components/ui/LocationPicker';

// Internal Gotra Select Component
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
            alert(`Requested to add '${searchTerm}'. Selected pending approval.`);
        } catch (e) {
            alert("Failed to request Gotra.");
        }
    };

    return (
        <div className="relative">
            <label className="block text-sm font-bold text-stone-900 mb-2">Lineage (Gotra)</label>
            <div className="relative">
                <input 
                    className="w-full rounded-xl border-stone-200 shadow-sm focus:border-saffron-500 focus:ring-saffron-500 p-3 border"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Select or request your Gotra..."
                />
                {showDropdown && searchTerm && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-lg border border-stone-200 max-h-60 overflow-auto">
                        {filtered.length > 0 ? (
                            filtered.map(g => (
                                <button
                                    key={g.id}
                                    type="button"
                                    className="w-full text-left px-4 py-3 hover:bg-stone-100 text-sm border-b border-stone-50 last:border-0"
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
                                type="button"
                                className="w-full text-left px-4 py-3 hover:bg-saffron-50 text-sm text-saffron-700 font-medium flex items-center gap-2"
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

interface ProfileProps {
  guruba: Guruba | null;
  showSetupAlert?: boolean;
}

export const GurubaProfile: React.FC<ProfileProps> = ({ guruba, showSetupAlert }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [bio, setBio] = useState('');
  const [gotraId, setGotraId] = useState('');
  const [gurubaType, setGurubaType] = useState<'brahmin' | 'non_brahmin' | 'astrologer'>('brahmin');
  
  // Local state for location to ensure updates are captured
  const [location, setLocation] = useState({ lat: 0, lng: 0, address: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // Sync Profile state
  useEffect(() => {
      if (guruba) {
          setBio(guruba.bio || '');
          setGotraId(guruba.profiles?.gotra_id || '');
          setGurubaType(guruba.guruba_type || 'brahmin');
          if (guruba.profiles?.latitude && guruba.profiles?.longitude) {
              setLocation({
                  lat: guruba.profiles.latitude,
                  lng: guruba.profiles.longitude,
                  address: guruba.profiles.address || ''
              });
          }
      }
  }, [guruba]);

  const saveProfile = async () => {
      if (!guruba) return;
      setSavingProfile(true);
      try {
          // Update Guruba specific details
          const { error: gError } = await supabase.from('gurubas').update({ 
              bio, 
              guruba_type: gurubaType, 
              location: location.address 
          }).eq('id', guruba.id);
          
          if (gError) throw gError;

          // Update Shared Profile details (coords, gotra)
          const { error: pError } = await supabase.from('profiles').update({ 
              gotra_id: gotraId,
              latitude: location.lat,
              longitude: location.lng,
              address: location.address
          }).eq('id', user?.id);

          if (pError) throw pError;
          
          queryClient.invalidateQueries({ queryKey: ['gurubaProfile'] });
          alert("Profile updated successfully!");
      } catch (e: any) { 
          console.error(e);
          alert("Failed to update profile: " + e.message); 
      } finally { 
          setSavingProfile(false); 
      }
  };

  return (
     <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
        {/* Welcome / Setup Alert */}
        {(showSetupAlert || !guruba?.bio) && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in">
                <Info className="h-6 w-6 text-blue-600 shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-bold text-blue-800">Complete Your Profile</h4>
                    <p className="text-sm text-blue-700 mt-1">
                        Welcome to Guruba Connect! To start accepting bookings and get verified, please fill out your Bio, Location, and Lineage details below.
                    </p>
                </div>
            </div>
        )}

        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-stone-900">My Guruba Profile</h2>
            <Button onClick={saveProfile} isLoading={savingProfile}>
                <Save className="h-4 w-4 mr-2" /> Save Changes
            </Button>
        </div>
         <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                   <label className="block text-sm font-bold text-stone-900 mb-2">Bio / Introduction</label>
                   <textarea
                       className="w-full rounded-xl border-stone-200 shadow-sm focus:border-saffron-500 focus:ring-saffron-500 p-3 border"
                       rows={4}
                       value={bio}
                       onChange={(e) => setBio(e.target.value)}
                       placeholder="Tell clients about your experience, lineage, and approach..."
                   />
                </div>
                <GotraSelect value={gotraId} onChange={setGotraId} />
                <div>
                   <label className="block text-sm font-bold text-stone-900 mb-2">Guruba Type</label>
                   <select
                       className="w-full rounded-xl border-stone-200 shadow-sm focus:border-saffron-500 focus:ring-saffron-500 p-3 border"
                       value={gurubaType}
                       onChange={(e) => setGurubaType(e.target.value as any)}
                   >
                       <option value="brahmin">Brahmin</option>
                       <option value="non_brahmin">Non-Brahmin</option>
                       <option value="astrologer">Astrologer</option>
                   </select>
                </div>
                
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-stone-900 mb-2">Service Location (Base)</label>
                    <p className="text-xs text-stone-500 mb-2">Select your primary location. This helps clients find you based on distance.</p>
                    <LocationPicker 
                        initialLocation={location.lat ? location : undefined}
                        onLocationSelect={(loc) => setLocation(loc)}
                    />
                </div>
             </div>
         </div>
     </div>
  );
};
