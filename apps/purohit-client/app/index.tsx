import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { SectionTitle } from '../src/ui/components';
import { theme } from '../src/ui/theme';

export default function HomeScreen() {
  return <ScrollView contentContainerStyle={s.container}>
    <View style={s.hero}><Text style={s.kicker}>PUROHIT</Text><Text style={s.title}>Trusted spiritual services, made simple.</Text><Text style={s.body}>Discover Gurubas, choose a service, book a time, and keep everything in one place.</Text></View>
    <SectionTitle title="Explore" />
    <View style={s.grid}><Link href="/discover" style={s.card}><Text style={s.cardTitle}>Find a Guruba</Text><Text style={s.bodySmall}>Browse available Gurubas</Text></Link><Link href="/bookings" style={s.card}><Text style={s.cardTitle}>My bookings</Text><Text style={s.bodySmall}>Track upcoming and past bookings</Text></Link><Link href="/wallet" style={s.card}><Text style={s.cardTitle}>Wallet</Text><Text style={s.bodySmall}>Credits and transaction history</Text></Link><Link href="/messages" style={s.card}><Text style={s.cardTitle}>Messages</Text><Text style={s.bodySmall}>Stay in touch with your Guruba</Text></Link></View>
  </ScrollView>;
}
const s=StyleSheet.create({container:{backgroundColor:theme.colors.canvas,minHeight:'100%',padding:24,gap:28},hero:{maxWidth:820,alignSelf:'center',width:'100%',paddingVertical:56},kicker:{fontSize:13,fontWeight:'800',letterSpacing:2,color:theme.colors.accent},title:{fontSize:42,lineHeight:50,fontWeight:'800',marginTop:10,color:theme.colors.ink},body:{fontSize:17,lineHeight:26,color:theme.colors.muted,marginTop:14},grid:{maxWidth:820,width:'100%',alignSelf:'center',gap:14},card:{backgroundColor:theme.colors.surface,padding:22,borderRadius:theme.radius.lg,borderWidth:1,borderColor:theme.colors.line},cardTitle:{fontSize:20,fontWeight:'700',color:theme.colors.ink},bodySmall:{fontSize:14,color:theme.colors.muted,marginTop:5}});
