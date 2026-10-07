import{useEffect,useState}from'react';import{ActivityIndicator,View}from'react-native';import{Stack,usePathname,useRouter}from'expo-router';import{QueryClient,QueryClientProvider}from'@tanstack/react-query';import{useAuth}from'../src/hooks/useAuth';import{getInitialNotificationUrl,subscribeToNotificationInteractions}from'../src/platform/notifications';

const protectedPrefixes=['/book/','/booking/','/bookings','/wallet','/messages','/message/','/profile','/locations','/notifications','/guruba-dashboard'];
function isProtectedPath(pathname:string){return protectedPrefixes.some(prefix=>pathname===prefix||pathname.startsWith(prefix));}

function SessionGate(){
  const{session,loading}=useAuth();const pathname=usePathname();const router=useRouter();const protectedPath=isProtectedPath(pathname);
  useEffect(()=>{if(!loading&&!session&&protectedPath)router.replace({pathname:'/sign-in',params:{redirect:pathname}})},[loading,session,protectedPath,pathname,router]);
  useEffect(()=>{
    if(loading)return;
    const open=(url:string)=>{if(session)router.push(url as never);else router.replace({pathname:'/sign-in',params:{redirect:url}});};
    getInitialNotificationUrl().then(url=>{if(url)open(url)}).catch(()=>{});
    return subscribeToNotificationInteractions(open);
  },[loading,session,router]);
  if(loading)return <View style={s.center}><ActivityIndicator/></View>;
  if(!session&&protectedPath)return <View style={s.center}><ActivityIndicator/></View>;
  return <Stack screenOptions={{headerShown:false}}/>;
}
export default function RootLayout(){const[queryClient]=useState(()=>new QueryClient({defaultOptions:{queries:{retry:1}}}));return <QueryClientProvider client={queryClient}><SessionGate/></QueryClientProvider>}
const s={center:{flex:1,justifyContent:'center' as const,alignItems:'center' as const}};