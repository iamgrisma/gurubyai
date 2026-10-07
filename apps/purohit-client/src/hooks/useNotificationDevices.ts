import{useMutation,useQuery,useQueryClient}from'@tanstack/react-query';import*as api from'../data/contracts';

export const useNotificationDevices=()=>useQuery({queryKey:['notification-devices'],queryFn:api.api.getMyNotificationDevices,staleTime:30000});
export const useRegisterNotificationDevice=()=>{const q=useQueryClient();return useMutation({mutationFn:api.api.registerNotificationDevice,onSuccess:()=>q.invalidateQueries({queryKey:['notification-devices']})})};
export const useRemoveNotificationDevice=()=>{const q=useQueryClient();return useMutation({mutationFn:api.api.removeNotificationDevice,onSuccess:()=>q.invalidateQueries({queryKey:['notification-devices']})})};