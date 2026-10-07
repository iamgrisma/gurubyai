import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Page } from '../src/ui/layout';
import { supabase } from '../src/data/supabase';
export default function Profile(){return <Page><View style={s.wrap}><Text style={s.title}>Profile</Text><Text style={s.muted}>Account, saved locations and notification preferences.</Text><Text onPress={()=>supabase.auth.signOut().then(()=>router.replace('/'))} style={s.link}>Sign out</Text></View></Page>}
const s=StyleSheet.create({wrap:{paddingTop:24,gap:14},title:{fontSize:32,fontWeight:'800'},muted:{color:'#6b6b6b'},link:{fontWeight:'700',textDecorationLine:'underline'}});