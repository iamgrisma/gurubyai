import{Platform,Pressable,StyleSheet,Text,View}from'react-native';import{usePathname,useRouter}from'expo-router';import{theme}from'./theme';

const tabs=[
 {href:'/',label:'Home',icon:'⌂'},
 {href:'/discover',label:'Discover',icon:'◉'},
 {href:'/bookings',label:'Bookings',icon:'▤'},
 {href:'/messages',label:'Messages',icon:'✉'},
 {href:'/profile',label:'Profile',icon:'◎'}
];

function activeFor(path:string,href:string){if(href==='/')return path==='/';if(href==='/discover')return path.startsWith('/discover')||path.startsWith('/guruba/')||path.startsWith('/service/');if(href==='/bookings')return path.startsWith('/bookings')||path.startsWith('/booking/')||path.startsWith('/book/');if(href==='/messages')return path.startsWith('/messages')||path.startsWith('/message/');return path.startsWith('/profile');}

export function MobileTabBar({visible}:{visible:boolean}){const pathname=usePathname();const router=useRouter();if(Platform.OS==='web'||!visible)return null;return <View style={s.bar} accessibilityRole="tablist">{tabs.map(tab=>{const active=activeFor(pathname,tab.href);return <Pressable key={tab.href} accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{selected:active}} onPress={()=>router.replace(tab.href as never)} style={({pressed})=>[s.tab,active&&s.active,pressed&&s.pressed]}><Text style={[s.icon,active&&s.activeText]}>{tab.icon}</Text><Text style={[s.label,active&&s.activeText]}>{tab.label}</Text></Pressable>})}</View>}

const s=StyleSheet.create({bar:{minHeight:72,paddingHorizontal:8,paddingTop:8,paddingBottom:10,flexDirection:'row',backgroundColor:theme.colors.surface,borderTopWidth:1,borderTopColor:theme.colors.line,shadowOpacity:.08,shadowRadius:8,shadowOffset:{width:0,height:-2},elevation:8},tab:{flex:1,minHeight:54,borderRadius:14,alignItems:'center',justifyContent:'center',gap:2},active:{backgroundColor:theme.colors.accentSoft},pressed:{opacity:.75},icon:{fontSize:20,lineHeight:24,color:theme.colors.muted},label:{fontSize:11,fontWeight:'700',color:theme.colors.muted},activeText:{color:theme.colors.ink}});