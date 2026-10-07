import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { theme } from '../../src/ui/theme';

export default function BookScreen() {
  const {serviceId}=useLocalSearchParams<{serviceId:string}>();
  return <ScrollView contentContainerStyle={s.container}><Text style={s.kicker}>BOOKING</Text><Text style={s.title}>Choose your time</Text><View style={s.card}><Text style={s.cardTitle}>Service</Text><Text style={s.muted}>{serviceId}</Text><Text style={s.muted}>Availability, location, pricing and authoritative booking submission will be wired to the backend contracts in the next B10 slice.</Text></View></ScrollView>;
}
const s=StyleSheet.create({container:{padding:24,gap:16,backgroundColor:theme.colors.canvas,minHeight:'100%'},kicker:{fontSize:13,fontWeight:'800',letterSpacing:2,color:theme.colors.accent},title:{fontSize:32,fontWeight:'800',color:theme.colors.ink},card:{padding:20,backgroundColor:theme.colors.surface,borderRadius:16,borderWidth:1,borderColor:theme.colors.line},cardTitle:{fontSize:20,fontWeight:'700',color:theme.colors.ink},muted:{color:theme.colors.muted,marginTop:6}});
