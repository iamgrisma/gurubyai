import { StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Page } from '../src/ui/layout';
export default function Bookings(){return <Page><View style={s.wrap}><Text style={s.title}>My bookings</Text><Text style={s.muted}>Your booking timeline will appear here once you sign in.</Text><Link href="/sign-in" style={s.link}>Sign in</Link></View></Page>}
const s=StyleSheet.create({wrap:{paddingTop:24,gap:14},title:{fontSize:32,fontWeight:'800'},muted:{color:'#6b6b6b'},link:{fontWeight:'700'}});