import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from './theme';

export function Button({label,onPress,secondary=false}:{label:string;onPress:()=>void;secondary?:boolean}) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={[s.button, secondary && s.buttonSecondary]}><Text style={[s.buttonText, secondary && s.buttonTextSecondary]}>{label}</Text></Pressable>;
}
export function SectionTitle({title,action,onAction}:{title:string;action?:string;onAction?:()=>void}) {
  return <View style={s.row}><Text style={s.section}>{title}</Text>{action&&onAction?<Pressable onPress={onAction}><Text style={s.action}>{action}</Text></Pressable>:null}</View>;
}
export function StatusText({children}:{children:string}) { return <Text style={s.muted}>{children}</Text>; }
const s=StyleSheet.create({button:{backgroundColor:theme.colors.ink,borderRadius:theme.radius.md,paddingVertical:14,paddingHorizontal:18,alignItems:'center'},buttonSecondary:{backgroundColor:theme.colors.accentSoft},buttonText:{color:'#fff',fontWeight:'700',fontSize:16},buttonTextSecondary:{color:theme.colors.ink},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},section:{fontSize:22,fontWeight:'700',color:theme.colors.ink},action:{fontWeight:'700',color:theme.colors.accent},muted:{color:theme.colors.muted}});
