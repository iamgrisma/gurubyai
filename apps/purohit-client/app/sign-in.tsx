import { useState } from 'react';
import { Button, TextInput, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../src/data/supabase';
import { Page } from '../src/ui/layout';

export default function SignIn(){
 const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
 async function submit(){
  setBusy(true);setError('');
  const {error:e}=await supabase.auth.signInWithPassword({email,password});
  setBusy(false); if(e){setError('Unable to sign in. Check your email and password.');return;} router.replace('/');
 }
 return <Page><View style={s.wrap}><Text style={s.title}>Welcome back</Text><Text style={s.muted}>Sign in to manage bookings, wallet and messages.</Text><TextInput autoCapitalize="none" keyboardType="email-address" placeholder="Email" value={email} onChangeText={setEmail} style={s.input}/><TextInput secureTextEntry placeholder="Password" value={password} onChangeText={setPassword} style={s.input}/>{error?<Text style={s.error}>{error}</Text>:null}<Button title={busy?'Signing in…':'Sign in'} onPress={submit} disabled={busy}/></View></Page>
}
const s=StyleSheet.create({wrap:{maxWidth:520,width:'100%',alignSelf:'center',paddingTop:48,gap:14},title:{fontSize:32,fontWeight:'800'},muted:{color:'#6b6b6b',marginBottom:12},input:{backgroundColor:'#fff',borderWidth:1,borderColor:'#e5e0d8',padding:14,borderRadius:12},error:{color:'#b42318'}});