# Build Log: gp-input v1.0

**Ship Date**: April 18, 2026  
**Status**: Ready for client  
**Form State**: 0/0 fields filled (fresh sheet, ready for first responses)

---

## Overview

gp-input is a React form for collecting deck input responses from clients. Users fill in data fields (text/long-form), media fields (image/PDF upload), can defer items for later, and provide slide-level comments. All responses persist to a Google Sheet.

**Key Features Shipped:**
- Form field state visualization (saved/unsaved/cleared)
- File upload with progress tracking
- Per-slide comments
- Defer/"will provide later" toggle
- Progress counter and visual bar
- Slide thumbnail display
- Auto-save and submit buttons

---

## Build Phases

### Phase 1: Design & Planning (Design Review)
- Conducted visual QA using design-review skill
- Established field state color system:
  - **Saved** (#0028ff, blue): value from server matches current value
  - **Unsaved** (#fbbf24, amber): user edited but not saved
  - **Cleared** (black): user explicitly deleted or pristine
  - **All active/focused** (black ring): regardless of saved state
- Added context copy for unsaved state
- Revised styling to reduce color clutter

**Commit**: `118ecef style: revise field state colors and add unsaved context copy`

### Phase 2: Core Implementation
- Implemented `getFieldState()` helper to derive field visual state
- Created `borderClasses` mapping for state-based styling
- Added focus state override (always black when active)
- Implemented unsaved changes banner above data fields section
- Integrated with existing form state management

**Commits**:
- `5e3bd5d feat(styling): add form field state styling with border colors`
- `f5d1bcd style(design): add micro-interactions and improve visual separation`
- `005d9de refactor: simplify and optimize form state management and API calls`

### Phase 3: Bug Fix - X Clear Button
**Problem**: Clicking the X (clear) button did nothing; fields reverted to original server value instead of clearing.

**Root Cause**: Field value logic used `||` (logical OR) instead of `??` (nullish coalescing). Empty string (`""`) is falsy, so `values[elementId] || ph.clientResponse` would always return the server value.

```tsx
// BEFORE (broken)
value={values[elementId] || (isFilled ? ph.clientResponse : "")}

// AFTER (fixed)
value={values[ph.elementId] ?? (isFilled ? ph.clientResponse : "")}
```

Also refactored `handleClear()` to set `values[elementId] = ""` instead of deleting the key, ensuring the value is always tracked.

**Commit**: `8b61a47 fix: use nullish coalescing for empty field values and add debugging logs for clear button`

### Phase 4: Data Persistence Fix
**Problem**: Form showed 6/22 filled even after clearing everything via backend. Google Sheets API was returning stale cached data.

**Solution**: User cleared the Google Sheet manually using shared CLI tools (`nst-google-sheets`), resetting to 0/0.

**Lesson**: API caching + sheet version history is a safety net for accidental deletes.

### Phase 5: UI Polish - Loading States
- Added animated spinner during file uploads
- Integrated ProgressBar component consistently
- Color-coded spinner to match primary brand color (#0028ff)

**Commit**: `fd0d276 style: add loading spinner for file uploads and update progress bar color to blue (#0028ff)`

### Phase 6: Code Refactoring & Performance
**Goal**: Eliminate duplication, optimize hot paths, improve maintainability.

**Changes Made:**

1. **Extracted Color Constants** → `src/lib/colors.ts`
   - Centralized `COLORS.primary` (#0028ff)
   - Centralized `FIELD_STATES` (saved/unsaved/default)
   - Single source of truth for brand colors

2. **Extracted Form Utilities** → `src/lib/form-utils.ts`
   - `calculateFilledCount()`: Shared progress counter logic (was duplicated in InputForm + SlideCard)
   - `buildTextResponses()`: Shared text response filtering (was duplicated in handleSave + handleSubmit)
   - Changed from O(N²) placeholder lookups (Array.find per iteration) to O(N) Map lookup

3. **Extracted ProgressBar Component** → `src/components/ui/ProgressBar.tsx`
   - Reusable progress bar used in InputForm + FileUpload
   - Eliminated duplicate progress bar markup

4. **Memoized Field Classifications** in SlideCard
   - `classifyFieldType()` was called 3x per field (in render loop)
   - Now memoized via `useMemo` at component level
   - Reduced O(N) string operations per render to O(1) lookup

5. **Updated Components to Use Utilities**
   - SlideCard: uses `calculateFilledCount()` + memoized classifications
   - InputForm: uses `ProgressBar`, `calculateFilledCount()`, `buildTextResponses()`
   - FileUpload: uses `ProgressBar` + color constants

**Commit**: `83300e3 refactor: extract utilities and constants, optimize performance hotpaths`

---

## Key Learnings

### 1. Nullish Coalescing vs Logical OR (Critical)
**Learning**: When working with empty strings or 0 as valid values, `??` is safer than `||`.
- `""` is falsy → `"" || fallback` returns fallback
- `""` is not nullish → `"" ?? fallback` returns `""`
**Impact**: This was the root cause of the X button bug. Would have been caught with unit tests on field value logic.

### 2. Google Sheets API Caching
**Learning**: API responses may be cached; don't assume fresh data on every request.
**Mitigation**: Version history in Google Sheets is a safety net. User can restore without re-building.

### 3. Memoization Catches Expensive Operations
**Learning**: Field classification (checking 20+ keywords per field) doesn't seem expensive until you realize it runs 3x per field per render.
**Impact**: Small O(N) operations in render loops become O(N²) fast.

### 4. Utility Extraction Prevents Silent Bugs
**Learning**: Code duplication (calculateFilledCount in 2 places, buildTextResponses in 2 places) is a silent bug waiting to happen. When you fix one, the other is now wrong.
**Pattern**: Extract utilities early, especially for state-derived values.

### 5. Colors & Constants Should Be Centralized
**Learning**: Hard-coded colors in components lead to visual inconsistency. #0028ff appeared in 5+ places with different names.
**Benefit**: COLORS.ts makes it trivial to rebrand (change one place, all components update).

---

## Testing Checklist (For Client)

- [ ] Form loads with 0/0 fields filled (fresh sheet)
- [ ] Typing in a field shows amber border + unsaved banner
- [ ] Saving persists text to sheet
- [ ] Clicking X clears field to empty state
- [ ] Re-typing cleared field shows amber again
- [ ] Deferred items count as filled (progress counter)
- [ ] File upload shows spinner + progress bar
- [ ] Slide comments save and load
- [ ] Focus state always shows black border
- [ ] Progress bar updates correctly

---

## Known Limitations / Future Work

1. **No offline support**: Form requires live connection; no draft persistence in localStorage
2. **No duplicate field detection**: If two placeholders have same elementId, behavior is undefined
3. **No file size validation UI**: Backend rejects >10MB, but no pre-upload warning
4. **No retry logic for failed uploads**: User must re-upload manually
5. **No keyboard shortcuts**: Tab/Enter could improve entry speed

---

## Deployment Notes

**Frontend**:
- Next.js 14+ with React 18+
- Tailwind CSS (arbitrary color values)
- Deploy to Vercel (existing pipeline)

**Backend**:
- Node.js API at `/api/submit` (text responses)
- Node.js API at `/api/upload` (file uploads)
- Google Sheets integration (via serviceAccount.json)
- Google Drive integration (upload to folder)

**Environment**:
- `NEXT_PUBLIC_SHEET_ID` (public, safe to expose)
- `GOOGLE_DRIVE_FOLDER_ID` (passed in form props)
- Google service account credentials (backend only)

---

## Code Quality

**Performance**:
- No N+1 queries (using Map for placeholder lookups)
- Memoized expensive operations (field classifications)
- ProgressBar is reusable, prevents duplication

**Maintainability**:
- Field state logic centralized in `getFieldState()`
- Colors centralized in `colors.ts`
- Utilities extracted to `form-utils.ts`
- Clear separation of concerns (layout, state, utility)

**Testing**:
- No unit tests yet (should add for field state logic + buildTextResponses)
- Manual QA: form behavior validated end-to-end
- Build logs + this document serve as acceptance criteria

---

## What's Ready to Ship

✅ All features working  
✅ No console errors  
✅ Visual feedback system (saved/unsaved/cleared)  
✅ Progress tracking  
✅ File uploads with spinners  
✅ Code refactored for maintainability  
✅ Form state reset to 0/0 for client  
✅ Documentation (this file)  

**Client can start filling in responses immediately.**

---

**Built by**: Claude Code  
**Duration**: ~1 session  
**Commits**: 14 key commits (see git log)  
**Code Quality**: Good (no tech debt blocking v1)  
