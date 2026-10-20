# UI/UX Effectiveness Audit -- Retain-ly

**Audit Date:** 2026-09-09
**Scope:** Full codebase at `/home/bradley/project/Retain-ly`

## Summary

| Severity | Count |
|----------|-------|
| Critical UX | 4 |
| Major | 10 |
| Minor | 20 |
| Suggestion | 8 |
| **Total** | **42** |

---

## CRITICAL UX

### C1. Hardcoded Store Name in Customer Detail (RESOLVED)
**File:** `src/app/(app)/app/customers/[id]/page.tsx:295`

Previously every order row displayed a static store name. Now the row reads the real branch (`order.branch`), and the store name follows the active branch (`Cimahi (CMH)` / `Bandung (BDG)`).

**Fix:** Resolved — store name now derives from the active branch / settings.

### C2. `--color-mist: #94a3b8` Fails WCAG AA Contrast (3.03:1)
**File:** `src/app/globals.css:18`

Used for placeholder text, loading states, and secondary labels. Fails 4.5:1 minimum for normal text.

**Fix:** Darken to at least `#7a8fa5` (4.5:1) or use a token that adapts.

### C3. PIN Stored in Plaintext in DB and localStorage
**Files:** `src/app/(auth)/login/page.tsx:40-44,50`

Login queries `.eq('pin', pinCode)` and stores full user row (including PIN) in localStorage.

**Fix:** Hash PINs. Select only `id, username, role`. Never store credentials client-side.

### C4. Silent Error Swallowing Makes Server Failures Look Like Empty Data
**Files:** `src/app/(app)/app/customers/page.tsx:60`, `src/app/(app)/app/dashboard/page.tsx:42`, `src/app/(app)/app/follow-up/page.tsx:49,65`, `src/app/(app)/app/customers/[id]/page.tsx:66`

Empty `catch` blocks. Users see "no customers found" when real issue is server error.

**Fix:** Show error state with retry option. Never silently swallow errors.

---

## MAJOR

### M1. Dashboard Fetches 10,000 Customers Into Memory on Mount
**File:** `src/app/(app)/app/dashboard/page.tsx:40`

`getCustomersWithStats(0, 10000)` loads ALL customers. Slow initial load, high memory.

**Fix:** Use aggregated queries or server-side summary endpoint.

### M2. Follow-Up Checked-Off State Not Persistent
**File:** `src/app/(app)/app/follow-up/page.tsx:42`

`useState<Set<string>>` -- lost on refresh/navigation. Defeats purpose of tracking follow-ups.

**Fix:** Persist to localStorage or Supabase.

### M3. Export N+1 Query Pattern
**File:** `src/app/(app)/app/export/page.tsx:36-49`

10,000 customers + individual order query per customer = 10,001 Supabase queries.

**Fix:** Single query with join. Server-side streaming.

### M4. Multiple Silent Error Swallowing Instances
(See C4 above -- 4 pages affected)

### M5. Settings Stored Only in localStorage
**File:** `src/app/(app)/app/settings/page.tsx:21`

Lost on browser switch/cache clear. Should persist to Supabase.

### M6. Clickable Search Result Divs Not Keyboard-Accessible
**File:** `src/app/(app)/app/page.tsx:246-249`

`<div onClick>` instead of `<button>`. Not focusable, cannot be activated with Enter/Space.

**Fix:** Use `<button>` or add `role="button" tabIndex={0}`.

### M7. Near-Zero ARIA Attributes
No `aria-label` on icon buttons, no `aria-current="page"` on nav, no `aria-live` for toasts, no `aria-expanded` on hamburger.

### M8. `--color-ash: #64748b` Borderline Contrast (4.65:1)
**File:** `src/app/globals.css:17`

Barely passes AA for normal text. At `text-xs` size (used extensively), harder to read.

### M9. Dashboard Segment Thresholds Hardcoded, Don't Match User Settings
**File:** `src/app/(app)/app/dashboard/page.tsx:124-126`

Shows "0-30 hari", "31-60 hari", "61+ hari" regardless of user's custom thresholds.

**Fix:** Read thresholds from settings and display dynamically.

### M10. Churn Alert Loads All Customers Into Memory
**File:** `src/app/(app)/app/follow-up/page.tsx:59`

Same performance issue as dashboard.

---

## MINOR

### m1. Export Link in Sidebar Breaks NavLink Pattern
**File:** `src/app/(app)/layout.tsx:84-90`

Uses raw `<Link>` instead of `<NavLink>`. No active-state indicator.

### m2. Bottom Nav Label "Input" Is Ambiguous
**File:** `src/app/(app)/layout.tsx:140`

`label.split(' ')[0]` -- "Input Order" becomes "Input". Users may not know what "Input" means.

### m3. Default Store Name Hardcoded Before Settings Load
**File:** `src/app/(app)/layout.tsx:160`

Flash of wrong name before `syncSettings()` runs.

### m4. Debounce Timer Stored in State Instead of Ref
**File:** `src/app/(app)/app/page.tsx:52`

Causes unnecessary re-renders on every keystroke.

### m5. Phone Validation Regex Too Loose
**File:** `src/app/(app)/app/page.tsx:69`

`/^\d{8,15}$/` accepts non-Indonesian numbers. Should use `isValidPhone()` from utils.

### m6. Error Banner Has No Dismiss Mechanism
**File:** `src/app/(app)/app/page.tsx:143-144`

Appears with no close button, no auto-dismiss.

### m7. Client-Side Date Filtering After Full Fetch
**File:** `src/app/(app)/app/customers/page.tsx:69-74`

All customers loaded even for narrow date range.

### m8. Count Aggregation Can Produce NaN
**File:** `src/app/(app)/app/customers/page.tsx:99-100`

`counts[c.retention_status as keyof typeof counts]++` -- unexpected values produce NaN.

### m9. Customer Detail Error Silently Swallowed
**File:** `src/app/(app)/app/customers/[id]/page.tsx:66`

### m10. "WA Verified" Badge Always Shown Regardless of Status
**File:** `src/app/(app)/app/customers/[id]/page.tsx:190-193`

Every customer gets green checkmark. No actual verification.

### m11. Zero-Count Channels Shown in Dashboard Breakdown
**File:** `src/app/(app)/app/dashboard/page.tsx:240-258`

Visual clutter. Should hide or collapse.

### m12. 6 Bottom Nav Items Including Logout Is Crowded
**File:** `src/app/(app)/layout.tsx:124-154`

Logout shares equal space with navigation. Should be in hamburger menu only.

### m13. Bottom Nav Label at 9px Is Below Readability Minimum
**File:** `src/app/(app)/layout.tsx:137`

WCAG minimum is 12px.

### m14. Fixed CTA Bottom Spacing May Cause Content Overlap
**File:** `src/app/(app)/app/page.tsx:187`

`pb-36` (144px) vs `bottom-20` (80px) -- tight relationship.

### m15. No Explicit Heading Scale in Design System
**File:** `src/app/globals.css`

Heading sizes applied ad-hoc per page. No shared component or utility.

### m16. Emerald Used for Both Online Status and WA Buttons
Semantic overload -- different meanings sharing one color.

### m17. No Min/Max Validation on Threshold Inputs
**File:** `src/app/(app)/app/settings/page.tsx:118-138`

Accepts 0, negative, non-numeric. Silent fallback to 30.

### m18. WA Template Has No Character Limit
**File:** `src/app/(app)/app/settings/page.tsx:165-170`

Very long templates produce extremely long WhatsApp messages.

### m19. Filename Uses Placeholder "A"/"B" for Missing Dates
**File:** `src/app/(app)/app/export/page.tsx:74-76`

### m20. PIN Auto-Focus Uses Fragile `document.getElementById`
**File:** `src/app/(auth)/login/page.tsx:24`

---

## SUGGESTIONS

### S1. Add safe-area-inset-bottom for iPhone Notch
**File:** `src/app/(app)/layout.tsx:124`

Floating bottom nav needs `env(safe-area-inset-bottom)` padding.

### S2. Channel Pills May Require Scroll on Mobile
**File:** `src/app/(app)/app/page.tsx:440-453`

7 channels in `grid-cols-2` -- some below the fold.

### S3. Toast Needs Progress Indicator or Haptic Feedback
**File:** `src/app/(app)/app/page.tsx:165`

Green toast may go unnoticed on mobile.

### S4. Empty State Needs CTA to Input Order
**File:** `src/app/(app)/app/customers/page.tsx:282-289`

Dead end when no customers found.

### S5. Bulk vCard Ignores Checked State
**File:** `src/app/(app)/app/follow-up/page.tsx:89-93`

Downloads all daily orders regardless of selection.

### S6. WA Link Opens with No Feedback
**File:** `src/app/(app)/app/follow-up/page.tsx:275-284`

New tab opens, user switches apps. No visual confirmation.

### S7. Use `:focus-visible` Instead of `:focus`
**File:** `src/app/globals.css:171-173`

Blue ring on every field click is noisy for mouse users.

### S8. Briefly Show Last PIN Digit for Accuracy
**File:** `src/app/(auth)/login/page.tsx:126-141`

Like iOS passcode -- improves accuracy on shared devices.

---

## TOP 5 PRIORITY FIXES

1. ~~Fix hardcoded store name~~ -- resolved; store name now follows the active branch (Cimahi (CMH) / Bandung (BDG))
2. Darken `--color-mist` to pass WCAG AA (4.5:1 minimum)
3. Fix silent error swallowing -- show error state with retry
4. Persist follow-up checked-off state to localStorage
5. Replace `<div onClick>` with `<button>` in search results for keyboard accessibility
