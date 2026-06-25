"use client";


// features/client/dashboard/Profile.tsx

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { Button } from '../../../components/ui/Button';
import { Gotra, UserProfile, SavedLocation } from '../../../types';
import { User as UserIcon, PlusCircle, Trash2, MapPin, Save } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { LocationPicker } from '../../../components/ui/DynamicLocationPicker';

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
        if (value) {
             setSearchTerm(value);
        } else {
             setSearchTerm('');
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
            alert(`Requested to add '${searchTerm}'.`);
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
                {showDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-stone-200 max-h-60 overflow-auto">
                        {filtered.length > 0 ? (
                            filtered.map(g => (
                                <button
                                    key={g.id}
                                    type="button"
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
                                type="button"
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

interface ProfileProps {
    user: User | null;
    profile: UserProfile | null;
}

export const DashboardProfile: React.FC<ProfileProps> = ({ user, profile }) => {
    const queryClient = useQueryClient();
    const [profileForm, setProfileForm] = useState({
        full_name: '',
        phone: '',
        gotra_id: '',
        city: '',
        latitude: 0,
        longitude: 0,
        address: ''
    });
    const [updateLoading, setUpdateLoading] = useState(false);
    const [newLocName, setNewLocName] = useState('');

    // --- Query Saved Locations ---
    const { data: savedLocations = [] } = useQuery({
        queryKey: ['savedLocations', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const { data } = await supabase.from('saved_locations').select('*').eq('user_id', user.id).order('created_at');
            return (data || []) as SavedLocation[];
        },
        enabled: !!user?.id
    });

    // Sync local state with profile data
    useEffect(() => {
        if (profile) {
            setProfileForm({
                full_name: profile.full_name || '',
                phone: profile.phone || '',
                gotra_id: profile.gotra_id || '',
                city: profile.city || '',
                latitude: profile.latitude || 0,
                longitude: profile.longitude || 0,
                address: profile.address || ''
            });
        }
    }, [profile]);

    const handleSaveProfile = async () => {
        if (!user) return;
        setUpdateLoading(true);
        try {
            const { error } = await supabase.from('profiles').update(profileForm).eq('id', user.id);
            if (error) throw error;
            await queryClient.invalidateQueries({ queryKey: ['profile'] });
            alert("Profile updated successfully");
        } catch (err: any) {
            console.error(err);
            alert("Failed to update profile: " + err.message);
        } finally {
            setUpdateLoading(false);
        }
    };

    // Save the currently selected map location as a "Saved Location"
    const handleSaveCurrentLocation = async () => {
        if (!user || !profileForm.latitude || !newLocName.trim()) return;
        
        if (savedLocations.length >= 5) {
            alert("You can save a maximum of 5 locations.");
            return;
        }

        try {
            const { error } = await supabase.from('saved_locations').insert({
                user_id: user.id,
                name: newLocName.trim(),
                latitude: profileForm.latitude,
                longitude: profileForm.longitude,
                address: profileForm.address
            });
            if (error) throw error;
            setNewLocName('');
            queryClient.invalidateQueries({ queryKey: ['savedLocations'] });
            alert("Location saved!");
        } catch (e: any) {
            alert("Failed to save location.");
        }
    };

    const handleDeleteLocation = async (id: string) => {
        if (!confirm("Delete this location?")) return;
        await supabase.from('saved_locations').delete().eq('id', id);
        queryClient.invalidateQueries({ queryKey: ['savedLocations'] });
    };

    return (
        <div className="max-w-2xl space-y-6 animate-in slide-in-from-right-4 duration-300 pb-12">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-stone-900">My Profile</h2>
                <Button onClick={handleSaveProfile} isLoading={updateLoading} className="gap-2">
                    <Save className="h-4 w-4" /> Save All Changes
                </Button>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8">
                <div className="flex items-center gap-6 mb-8">
                    <div className="h-24 w-24 rounded-full bg-stone-100 border-4 border-white shadow-lg overflow-hidden relative group cursor-pointer">
                        {profile?.avatar_url ? <img src={profile.avatar_url} className="h-full w-full object-cover" /> : <UserIcon className="h-10 w-10 text-stone-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-stone-900">{profileForm.full_name || 'Your Name'}</h3>
                        <p className="text-stone-500">{user?.email}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Full Name</label>
                        <input 
                            className="w-full rounded-lg border-stone-200 focus:ring-saffron-500 focus:border-saffron-500 p-2 border" 
                            value={profileForm.full_name}
                            onChange={e => setProfileForm({...profileForm, full_name: e.target.value})}
                            placeholder="Enter your full name"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Phone Number</label>
                        <input 
                            className="w-full rounded-lg border-stone-200 focus:ring-saffron-500 focus:border-saffron-500 p-2 border" 
                            value={profileForm.phone}
                            onChange={e => setProfileForm({...profileForm, phone: e.target.value})}
                            placeholder="e.g. 9800000000"
                        />
                    </div>
                    
                    <GotraSelect 
                        value={profileForm.gotra_id}
                        onChange={(val) => setProfileForm({...profileForm, gotra_id: val})}
                    />

                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">City</label>
                        <input 
                            className="w-full rounded-lg border-stone-200 focus:ring-saffron-500 focus:border-saffron-500 p-2 border" 
                            value={profileForm.city}
                            onChange={e => setProfileForm({...profileForm, city: e.target.value})}
                        />
                    </div>
                </div>

                <div className="mb-8 border-t border-stone-100 pt-6">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <label className="block text-sm font-bold text-stone-900">Primary Address / Location</label>
                            <p className="text-xs text-stone-500">Use the map to pin your exact home location.</p>
                        </div>
                    </div>
                    
                    <LocationPicker 
                        initialLocation={profileForm.latitude ? { lat: profileForm.latitude, lng: profileForm.longitude, address: profileForm.address } : undefined}
                        onLocationSelect={(loc) => setProfileForm({...profileForm, latitude: loc.lat, longitude: loc.lng, address: loc.address})}
                    />

                    {/* Save Selected Location Logic */}
                    <div className="mt-4 flex items-end gap-2 bg-stone-50 p-3 rounded-lg border border-stone-100">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Save this location to list</label>
                            <input 
                                className="w-full text-sm border rounded p-1.5" 
                                placeholder="e.g. Home, Parents House, Mandir" 
                                value={newLocName}
                                onChange={e => setNewLocName(e.target.value)}
                            />
                        </div>
                        <Button 
                            size="sm" 
                            variant="secondary" 
                            onClick={handleSaveCurrentLocation}
                            disabled={!profileForm.latitude || !newLocName.trim()}
                        >
                            Add to Saved
                        </Button>
                    </div>
                </div>

                {/* Saved Locations List */}
                <div className="space-y-3">
                    <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Saved Locations ({savedLocations.length}/5)
                    </h4>
                    {savedLocations.length === 0 ? (
                        <p className="text-sm text-stone-400 italic">No saved locations yet.</p>
                    ) : (
                        <div className="grid gap-2">
                            {savedLocations.map(loc => (
                                <div key={loc.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-100 group hover:bg-stone-100 transition-colors">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="h-8 w-8 rounded-full bg-white border border-stone-200 flex items-center justify-center text-saffron-600 shrink-0 font-bold">
                                            {loc.name[0].toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-stone-800 text-sm truncate">{loc.name}</p>
                                            <p className="text-xs text-stone-500 truncate">{loc.address}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => setProfileForm({ ...profileForm, latitude: loc.latitude, longitude: loc.longitude, address: loc.address || '' })}
                                            className="text-xs bg-white border border-stone-200 px-2 py-1 rounded hover:text-saffron-600"
                                        >
                                            Set as Primary
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteLocation(loc.id)}
                                            className="p-1 text-stone-400 hover:text-red-600 transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}