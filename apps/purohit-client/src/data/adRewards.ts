import { supabase } from './supabase';

export interface AdRewardStatus {
  credits_balance: number;
  today_ads_viewed: number;
  daily_limit: number;
  daily_ads_remaining: number;
  daily_checkin_claimed: boolean;
  seconds_until_ready: number;
  points_per_video: number;
  points_per_daily_checkin: number;
}

export interface ClaimRewardResult {
  success: boolean;
  is_duplicate?: boolean;
  points_awarded: number;
  new_balance: number;
  today_ads_viewed?: number;
  daily_limit?: number;
  message?: string;
}

export async function getAdRewardStatus(): Promise<AdRewardStatus> {
  const { data, error } = await supabase.rpc('get_ad_reward_status');
  if (error) throw error;
  return data as AdRewardStatus;
}

export async function claimAdReward(
  rewardType: 'rewarded_video' | 'daily_checkin' | 'offer_wall' = 'rewarded_video',
  adPlacement?: string
): Promise<ClaimRewardResult> {
  const idempotencyKey = `reward_${rewardType}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  const { data, error } = await supabase.rpc('claim_ad_reward', {
    p_reward_type: rewardType,
    p_idempotency_key: idempotencyKey,
    p_ad_placement: adPlacement ?? 'in_app_reward_slot',
  });

  if (error) throw error;
  return data as ClaimRewardResult;
}
