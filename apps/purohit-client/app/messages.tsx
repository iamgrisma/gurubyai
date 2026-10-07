import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../src/ui/theme';
export default function Messages(){return <View style={s.center}><Text style={s.title}>Messages</Text><Text style={s.muted}>Conversations and booking updates will appear here.</Text></View>}
const s=StyleSheet.create({center:{flex:1,padding:24,justifyContent:'center',alignItems:'center',gap:10,backgroundColor:theme.colors.canvas},title:{fontSize:32,fontWeight:'800',color:theme.colors.ink},muted:{color:theme.colors.muted}});