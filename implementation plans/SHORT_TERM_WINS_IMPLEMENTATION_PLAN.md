# Short-Term Wins Implementation Plan

## Objective

Deliver a set of focused improvements that improve product readiness, reliability, and user confidence without waiting on the full billing system to be completed.

## Win 1: Admin password reset flow

### Goal
Complete the remaining admin-driven reset-password capability and close the user management gap.

### Scope
- Add an admin reset endpoint
- Validate access control for admin actions
- Add service-layer logic
- Add DTOs and request/response handling
- Confirm security requirements and auditability

### Acceptance criteria
- Admin can trigger a password reset for a user
- Reset respects permission rules
- User receives or can use the reset flow without breaking security
- Error states are clear and safe

### Suggested files
- `atom-school-management/src/users/users.controller.ts`
- `atom-school-management/src/users/users.service.ts`
- `atom-school-management/src/users/dto/reset-password.dto.ts`

### Estimate
1 day

---

## Win 2: Auth flow cleanup and security polish

### Goal
Improve reliability around login, password changes, reset flows, and redirects.

### Scope
- Validate current password change flow
- Handle invalid/expired reset links gracefully
- Improve success and error messaging
- Confirm redirect behavior after auth actions

### Acceptance criteria
- Invalid auth flows do not crash or show confusing states
- User sees clear messages for failed reset or change attempts
- Auth transitions feel predictable and consistent

### Suggested files
- `Asset-Manager/client/src/pages/Login.tsx`
- `Asset-Manager/client/src/pages/ResetPassword.tsx`
- `Asset-Manager/client/src/pages/ForgotPassword.tsx`

### Estimate
1-2 days

---

## Win 3: Dashboard refresh behavior

### Goal
Keep the dashboard data stable while the user navigates, while still refreshing in the background.

### Scope
- Keep previous dashboard data visible during route changes
- Fetch fresh data in the background
- Preserve a good loading/error state
- Avoid data flicker or blank states

### Acceptance criteria
- Switching routes does not wipe dashboard data
- Re-entering the dashboard updates data without losing the previous view
- Loading state remains smooth and non-disruptive

### Suggested files
- `Asset-Manager/client/src/pages/Dashboard.tsx`
- `Asset-Manager/client/src/lib/queryClient.ts`

### Estimate
0.5-1 day

---

## Win 4: Environment-based app branding

### Goal
Remove hardcoded brand names and make brand configuration centrally managed.

### Scope
- Use `VITE_APP_NAME` as the main branding value
- Ensure sidebars and app headings use the env value
- Keep fallback behavior for local/dev setups

### Acceptance criteria
- App name is controlled by environment variable
- Hardcoded brand strings are removed from shared UI
- Local and deployed environments can change branding without code edits

### Suggested files
- `Asset-Manager/client/.env`
- `Asset-Manager/client/src/components/layout/AppLayout.tsx`

### Estimate
0.5 day

---

## Win 5: Clean up unimplemented / placeholder routes

### Goal
Reduce the feeling of incompleteness by replacing placeholder or unused routes with real product direction.

### Scope
- Review placeholder pages and routes
- Identify which ones must be actual features vs hidden for now
- Replace generic coming-soon pages with coherent navigation behavior

### Acceptance criteria
- Users do not hit obvious dead ends without a clear path
- Unfinished features are clearly marked and consistent
- Navigation remains trustworthy

### Suggested files
- `Asset-Manager/client/src/App.tsx`
- `Asset-Manager/client/src/pages/ComingSoon.tsx`

### Estimate
1 day

---

## Suggested execution order

1. Dashboard refresh behavior
2. Environment-based branding
3. Auth flow cleanup
4. Admin password reset
5. Placeholder route cleanup

This order delivers visible UX improvements quickly while setting up a cleaner foundation for the more meaningful billing features.

## Timeline suggestion

### Week 1
- Dashboard refresh behavior
- App branding cleanup
- Auth flow polish

### Week 2
- Admin password reset flow
- Placeholder route cleanup
- QA and regression testing

## Expected outcome

After this sprint, the app will feel more coherent, more reliable, and more production-ready, while also preparing the team for the larger fee and payment system rollout.
