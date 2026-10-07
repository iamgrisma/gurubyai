import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useGurubas } from '../src/hooks/useGurubas';
import { theme } from '../src/ui/theme';

export default function DiscoverScreen() {
  const q=useGurubas();
  if(q.isLoading) return <View style={s.center}><ActivityIndicator/><Text style={s.muted}>Loading Gurubas…</Text></View>;
  if(q.isError) return <View style={s.center}><Text style={s.error}>Could not load Gurubas.</Text></View>;
  return <FlatList contentContainerStyle={s.list} data={q.data} keyExtractor={x=>x.id} renderItem={({item})=><Link href={{pathname:'/guruba/[id]',params:{id:item.id}}} style={s.card}><Text style={s.name}>{item.name ?? 'Guruba'}</Text><Text style={s.muted}>{item.location ?? 'Location available on request'}</Text></Link>} ListHeaderComponent={<Text style={s.title}>Find a Guruba</Text>} />;
}
const s=StyleSheet.create({list:{padding:24,gap:12,backgroundColor:theme.colors.canvas,minHeight:'100%'},title:{fontSize:30,fontWeight:'800',marginBottom:8,color:theme.colors.ink},card:{backgroundColor:theme.colors.surface,padding:20,borderRadius:16,borderWidth:1,borderColor:theme.colors.line},name:{fontSize:19,fontWeight:'700',color:theme.colors.ink},muted:{color:theme.colors.muted,marginTop:6},center:{flex:1,justifyContent:'center',alignItems:'center',gap:10},error:{color:theme.colors.danger}});