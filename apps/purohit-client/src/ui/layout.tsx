import { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from './theme';

export function Page({children}:{children:React.ReactNode}){
 return <View style={s.page}><View style={s.content}>{children}</View></View>
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:theme.colors.canvas},content:{width:'100%',maxWidth:960,alignSelf:'center',flex:1,padding:24}});
