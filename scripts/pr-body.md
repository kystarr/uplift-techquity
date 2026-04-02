## Summary

This PR completes Backend Sprint 8 moderation/flagging hardening by moving moderation logic from client-driven flows into secure backend operations.

### BE-8.1 Flag Data Structure
- Confirmed and retained existing `Flag` + `AdminNotification` models and `flagCount` on `Business`/`Review`
- Added custom response types used by backend moderation APIs:
	- `FlagTargetDetails`
	- `FlagAdminView`
	- `FlagCounts`

### BE-8.2 Create Flag Flow
- Added `createFlag` custom mutation handled by moderation Lambda
- Enforces authentication
- Validates `targetType`, `targetId`, and non-empty `reason`
- Verifies target exists (`BUSINESS` or `REVIEW`) before creating the flag
- Creates flag with `PENDING` status
- Increments target `flagCount`
- Creates `AdminNotification` for new reports

### BE-8.3 Admin Flag Retrieval
- Added `listFlagsForAdmin` custom query handled by moderation Lambda
- Enforces admin authorization (`custom:role` or `cognito:groups`)
- Defaults to unresolved queue (`PENDING`) with optional status filtering
- Returns enriched target context for moderation UI

### BE-8.4 Flag Resolution
- Added `resolveFlag` custom mutation handled by moderation Lambda
- Enforces admin authorization
- Verifies flag exists
- Updates status to `RESOLVED`
- Stores `resolvedBy`, `resolvedAt`, and optional `adminNotes`
- Creates `AdminNotification` for resolution event

### BE-8.5 Duplicate Flag Prevention
- Backend guard prevents duplicate pending flags by the same user on the same target

### BE-8.6 Optional Counts/Filtering
- Added `flagCountsForAdmin` custom query returning:
	- total
	- pending
	- resolved
- Added status-based filtering support in admin flag retrieval

## Security/Architecture Changes
- Added dedicated moderation Lambda:
	- `amplify/functions/moderation/resource.ts`
	- `amplify/functions/moderation/handler.ts`
- Registered moderation function in backend stack
- Routed moderation flows through backend operations instead of direct model writes
- Tightened `Flag` model auth to avoid bypassing backend moderation checks

## Files Changed
- `amplify/data/resource.ts`
- `amplify/functions/moderation/resource.ts`
- `amplify/functions/moderation/handler.ts`
- `amplify/backend.ts`

## Test Plan
- [ ] Authenticated non-admin can create a flag for valid `BUSINESS` target
- [ ] Authenticated non-admin can create a flag for valid `REVIEW` target
- [ ] Create flag fails for invalid target ID
- [ ] Create flag fails for invalid target type
- [ ] Create flag fails for empty reason
- [ ] Duplicate pending flag from same user/target is rejected
- [ ] Non-admin cannot call `listFlagsForAdmin`
- [ ] Admin can list pending flags and view enriched target details
- [ ] Non-admin cannot call `resolveFlag`
- [ ] Admin can resolve a flag and see `resolvedBy`/`resolvedAt` set
- [ ] `flagCountsForAdmin` returns expected totals
