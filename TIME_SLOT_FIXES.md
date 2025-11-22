# Time Slot Availability Fixes - Summary

## Issues to Fix

1. **Default availability hours**: Change from 9am-5pm to 5am-6pm
2. **Time slot calculation**: Use service duration + 30min buffer instead of fixed 30min steps
3. **Booking status filtering**: Only block slots for pending/confirmed/awaiting_client_confirmation bookings (not cancelled ones)

## Changes Made

### ✅ 1. Guruba Schedule Default Hours
**File**: `features/guruba/dashboard/Schedule.tsx`
**Line 49**: Changed default time from `'05:00', end: '21:00'` to `'05:00', end: '18:00'`

## Changes Needed

### 2. Booking Modal - Time Slot Calculation
**File**: `features/booking/BookingModal.tsx`

**Lines 146-152** - Update booking query to only fetch non-cancelled bookings:
```typescript
const { data: existingBookings } = await supabase
    .from('bookings')
    .select('scheduled_at, status, service_id, services(duration_minutes)')
    .eq('guruba_id', guruba.id)
    .gte('scheduled_at', startOfDay.toISOString())
    .lte('scheduled_at', endOfDay.toISOString())
    .in('status', ['pending', 'confirmed', 'awaiting_client_confirmation']); // Only block non-cancelled bookings
```

**Lines 160-172** - Update slot calculation to use service duration + buffer:
```typescript
const workStart = toMinutes(availData.start_time);
const workEnd = toMinutes(availData.end_time);
const serviceDuration = service.duration_minutes || 60;
const bufferTime = 30; // 30 minutes for transition/travel
const slotStep = serviceDuration + bufferTime; // Total time per slot including buffer

// Build blocked time ranges from existing bookings
const blockedRanges = existingBookings?.map((b: any) => {
    const bookingDate = new Date(b.scheduled_at);
    const startMins = bookingDate.getHours() * 60 + bookingDate.getMinutes();
    const duration = b.services?.duration_minutes || 60;
    // Block the service duration + buffer time
    return { start: startMins, end: startMins + duration + bufferTime };
}) || [];

// Generate available slots
for (let t = workStart; t + serviceDuration <= workEnd; t += slotStep) {
```

## How It Works

### Example: 90-minute service
- Service duration: 90 minutes
- Buffer time: 30 minutes  
- Total slot step: 120 minutes (2 hours)

**Available slots**:
- 5:00 AM (service ends 6:30 AM, buffer until 7:00 AM)
- 7:00 AM (service ends 8:30 AM, buffer until 9:00 AM)
- 9:00 AM (service ends 10:30 AM, buffer until 11:00 AM)
- And so on...

### Booking Status Logic
- **Blocked**: pending, confirmed, awaiting_client_confirmation
- **Not Blocked**: cancelled, completed

This ensures that:
1. Cancelled bookings don't block time slots
2. Each slot includes the service duration + 30min travel/transition time
3. Default availability is 5am-6pm (13 hours)
