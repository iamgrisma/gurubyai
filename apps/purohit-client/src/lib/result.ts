export type AppErrorCode='authentication_required'|'permission_denied'|'unavailable'|'conflict'|'invalid_input'|'insufficient_credits'|'slot_unavailable'|'duplicate_request'|'network_error'|'unknown_error';

export function toAppError(error:unknown):{code:AppErrorCode;message:string}{
  const message=error instanceof Error?error.message:'Unexpected error';
  const lower=message.toLowerCase();
  if(lower.includes('permission')||lower.includes('not authorized')) return {code:'permission_denied',message:'You do not have permission for this action.'};
  if(lower.includes('duplicate')||lower.includes('idempot')) return {code:'duplicate_request',message:'This request was already submitted.'};
  if(lower.includes('conflict')||lower.includes('unavailable')) return {code:'conflict',message:'That option is no longer available.'};
  if(lower.includes('network')||lower.includes('fetch')) return {code:'network_error',message:'Network problem. Please retry.'};
  return {code:'unknown_error',message:'Something went wrong. Please try again.'};
}