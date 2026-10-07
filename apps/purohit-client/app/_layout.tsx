import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '../src/hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';

function SessionGate(){ const {loading}=useAuth(); if(loading)return <View style={{flex:1,justifyContent:'center',alignItems:'center'}}><ActivityIndicator/></View>; return <Stack screenOptions={{headerShown:false}}/>; }
export default function RootLayout(){ const [queryClient]=useState(()=>new QueryClient({defaultOptions:{queries:{retry:1}}})); return <QueryClientProvider client={queryClient}><SessionGate/></QueryClientProvider>; }