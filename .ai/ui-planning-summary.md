# UI Architecture Planning Summary

## Decisions

1. **Prompt Selection UI**: Horizontal prompt selector bar with predefined prompts displayed as buttons above the ProcessButton, available to all users (including anonymous). Custom prompts for logged-in users accessed via a collapsible sidebar triggered from the header.

2. **Header Credit Display**: Right-aligned status block showing "1/1 DAILY SMELT" for anonymous, "X/5 LEFT THIS WEEK" for logged-in, and "UNLIMITED" for API key users. Color-coded lime (available) / coral (exhausted). Minimal "LOGIN" or email display.

3. **Authentication Page**: Single `/auth` page with toggle between login and registration modes (similar to file/text mode toggle). Centered form, max-width 400px, neobrutalist input styling, "OR" divider for future OAuth options.

4. **Combine Mode Toggle**: Always visible below input fields but disabled/greyed-out when fewer than 2 inputs. Text input + file(s) count toward the threshold (e.g., 1 text + 1 file = 2 inputs, enabling combine mode).

5. **Mixed Input Mode**: When both TextZone and DropZone have content, the "OR" divider changes to "AND". Display total input count (e.g., "2 INPUTS", "3 INPUTS"). This replaces chaos-smelter's mutual exclusivity model.

6. **Prompt Editor**: Popup overlay styled like ResultsView (black background, lime text). Supports both CREATE and EDIT modes. Header shows "NEW PROMPT" or editable existing title. Includes SAVE and CANCEL buttons. MD syntax highlighting deferred to post-MVP.

7. **Real-time Progress**: Use Supabase Realtime channel subscriptions (`smelt:{id}`) with identical UI/UX to current WebSocket approach—10-block ProgressBar with stage-based color transitions.

8. **Error Handling**: Maintain coral-background error blocks with neobrutalist uppercase messages. Include contextual CTAs (e.g., "SIGN UP" button, "ADD API KEY" link) within error messages.

9. **Prompt Sections**: Accordion pattern for organization. Collapsible headers with thick bottom borders. Inline editing for rename, trash icon for deletion. No drag-to-reorder (out of scope per PRD).

10. **Settings Page**: Dedicated `/settings` page for API key management. Masked input with SHOW toggle, VALIDATE button with spinning @ loading state, color-coded feedback (mint for valid, coral for invalid), REMOVE button.

11. **Astro + React Architecture**: Astro pages for auth and settings (minimal interactivity). React islands with `client:load` for main processing area, prompt sidebar, and API key validation. Zustand for state management across islands.

12. **Responsive Design**: Copy chaos-smelter's approach exactly—horizontal stacking on wide screens, vertical stacking on narrow/mobile. No separate mobile-specific patterns.

13. **Mobile Prompt Selection**: Full-screen overlay sliding up from bottom. Includes search filter, scrollable list with section accordions, CLOSE button (X icon). Selecting a prompt closes overlay automatically.

14. **ProcessButton**: Keep as simple "SMELT IT" button matching chaos-smelter. Mode selection (SEPARATE/COMBINE) and predefined prompt selection handled by separate button rows below the input fields.

15. **Custom Prompt Selection**: Done via clicking in the sidebar accordion. Selected custom prompt indicated by colored line/highlight. Only one custom prompt can be active at a time.

16. **Predefined Prompts Display**: Show as buttons without icons or labels—keep minimal. Always visible, appear as standard neobrutalist buttons.

17. **Prompt Storage**: Hardcode 5 predefined prompts as TypeScript constants in frontend. No API call needed for defaults.

18. **No Prompt Persistence**: Do not persist selected prompt across sessions or page refreshes. Design for quick selection (few seconds).

19. **Login Transition**: Clear all state (including any anonymous smelt results) upon successful login/registration. Fetch fresh user profile with 5 weekly credits.

20. **File Types**: Audio files only (MP3, WAV, M4A) for MVP. No text file uploads via DropZone. Direct text paste only via TextZone.

21. **Large Prompt Library**: Search/filter input at top of sidebar. Scrollable list with max-height. Section accordions for organization. Optional "RECENT" section showing last 3-5 used prompts.

22. **API Key Indicator**: Only "UNLIMITED" text in header—no icons, badges, or additional indicators.

23. **Offline/Connection Handling**: Display coral error block: "CONNECTION LOST. CHECK YOUR INTERNET AND TRY AGAIN." Include RETRY button. No credits consumed on incomplete smelts.

24. **Theme Strategy**: Create custom shadcn/ui theme in `tailwind.config.ts` with chaos-smelter's exact color palette and utilities (shadow-brutal, border-brutal). Base on neobrutalism.dev components.

25. **Mode Preference**: No persistence of separate/combine mode preference. Default to combine for logged-in users with 2+ inputs.

26. **Credit Reset**: Require page refresh to see updated credits after weekly reset. No automatic in-UI update.

---

## Matched Recommendations

1. **Prompt Bar + Sidebar Architecture**: Horizontal bar for 5 predefined prompts (always visible, minimal buttons) positioned above ProcessButton. Collapsible sidebar from header for logged-in users' custom prompt library with section accordions.

2. **Credit Display Pattern**: Header status block with color-coded credit counter following the pattern `X/Y [PERIOD] [UNIT]`. Lime for available, coral for exhausted, mint for unlimited.

3. **Auth Page Toggle Pattern**: Reuse the file/text mode toggle UX pattern for login/registration switching on a single `/auth` page with consistent neobrutalist form styling.

4. **Mixed Input "AND" Mode**: When both input zones have content, change divider from "OR" to "AND" and display combined input count. Enable combine mode toggle when total inputs ≥ 2.

5. **ResultsView-Style Prompt Editor**: Black background with lime/green text popup overlay for prompt creation/editing. Same visual language as results display. Character counter matching TextZone pattern.

6. **Supabase Realtime Integration**: Subscribe to `smelt:{id}` channel on smelt creation. Map progress events to existing ProgressBar stages. Unsubscribe on completion/error.

7. **Contextual Error CTAs**: Error messages include inline buttons/links for recovery actions (signup, add API key, retry) styled within the coral error block.

8. **Accordion Sections**: Collapsible section headers with click-to-expand, inline title editing, and delete icons. No drag-to-reorder. Prompts can be assigned to sections during creation.

9. **Settings Page with API Key Flow**: Dedicated page with masked input, VALIDATE button showing "TESTING..." with spinning @ symbol, color-coded result messages, and REMOVE functionality.

10. **Astro Islands Strategy**: Static Astro pages where possible, React islands with `client:load` for interactive components. Zustand without persistence for state management (no localStorage for prompt selection).

11. **Chaos-Smelter Responsive Pattern**: Exact replication of existing responsive behavior—horizontal side-by-side on wide viewports, vertical stacking on narrow viewports.

12. **Mobile Prompt Overlay**: Full-screen overlay sliding from bottom with search filter, scrollable accordion list, X close button, tap-to-select-and-close behavior.

13. **Simple ProcessButton**: Maintain "SMELT IT" as the primary CTA without embedded mode/prompt information. Separate button rows for mode and predefined prompt selection.

14. **Custom Theme Configuration**: Define colors (cream, lime, lavender, coral, cyan, mint, yellow, black) and custom utilities (shadow-brutal variants, border-brutal variants) in Tailwind config. Apply consistently via shadcn/ui component overrides.

15. **Page Refresh for Credit Reset**: Simple implementation—check reset timestamp on page load only, require refresh for users who leave page open across reset boundary.

---

## UI Architecture Planning Summary

### Main UI Architecture Requirements

The application follows a **single-page application pattern** built with **Astro 5** for static shell and **React 19 islands** for interactive components. The visual design extends the existing **chaos-smelter neobrutalist aesthetic** using **Tailwind CSS 4**, **shadcn/ui**, and **neobrutalism.dev** components as the foundation.

**Core Design System:**
- **Color Palette**: cream (#FFFEF0), lime (#E8FF8D), lavender (#C8B6FF), coral (#FF6B6B), cyan (#A8E6FF), mint (#7BF1A8), yellow (#FFDE59), black (#000000)
- **Typography**: Space Mono (monospace), uppercase headers, wide letter-spacing
- **Styling**: Hard shadows (8px offset, no blur), thick borders (4px solid black), zero border-radius
- **Interactions**: Button press animations (3px translate), color transitions, spinning @ for loading states

### Key Views, Screens, and User Flows

**1. Main Processing Page (/)** — React Islands
- Header with logo, credit display, LOGIN/user email, SETTINGS link (logged-in only), PROMPTS toggle (logged-in only)
- DropZone for audio file upload (MP3, WAV, M4A)
- OR/AND divider (dynamic based on input state)
- TextZone for direct text paste
- Combine mode toggle ([ SEPARATE ] / [ COMBINE ]) — visible when ≥2 inputs, disabled otherwise
- Predefined prompt selector (5 horizontal buttons)
- ProcessButton ("SMELT IT")
- ProgressBar (10 blocks, stage-based colors)
- ResultsView (black background, lime text, copy/download actions)
- Error display (coral background with CTAs)

**2. Authentication Page (/auth)** — Astro Page with React Island
- Toggle between LOGIN and REGISTER modes
- Email and password inputs (neobrutalist styling)
- Submit button
- OR divider for future OAuth
- Error messages inline

**3. Settings Page (/settings)** — Astro Page with React Island
- API Key section:
  - Masked input field with SHOW toggle
  - VALIDATE button (shows "TESTING..." → "KEY VALID ✓" or "KEY INVALID ✗")
  - REMOVE button
- Back to main link

**4. Prompt Sidebar (logged-in only)** — React Island
- Triggered by PROMPTS button in header
- Slides in from left on desktop, full-screen overlay on mobile
- Search/filter input at top
- Optional "RECENT" section (last 3-5 used)
- Section accordions with collapsible prompt lists
- NEW PROMPT and ADD SECTION buttons
- Inline rename, delete icons

**5. Prompt Editor Popup** — React Component
- Overlay with semi-transparent cream backdrop
- Black background, lime text (matching ResultsView)
- Header: "NEW PROMPT" or editable existing title
- Body textarea with 4,000 character counter
- Section assignment dropdown (optional)
- SAVE and CANCEL buttons
- UPLOAD .MD option for file import

### User Flows

**Anonymous User Flow:**
1. Land on main page → see "1/1 DAILY SMELT AVAILABLE"
2. Upload audio file(s) OR paste text
3. Select predefined prompt (5 options)
4. Click "SMELT IT"
5. View progress → receive results
6. Copy or download result
7. Daily limit reached → see error with "SIGN UP" CTA

**Logged-in User Flow:**
1. Land on main page → see "5/5 LEFT THIS WEEK"
2. Open sidebar → manage custom prompts
3. Upload files AND/OR paste text (mixed input supported)
4. Toggle combine mode if ≥2 inputs
5. Select predefined OR custom prompt
6. Click "SMELT IT"
7. View progress → receive results
8. Weekly limit reached → see error with "ADD API KEY" CTA

**Power User Flow (API Key):**
1. Go to /settings → add API key
2. See "TESTING..." → "KEY VALID ✓"
3. Header updates to "UNLIMITED"
4. Process unlimited smelts

### API Integration and State Management Strategy

**State Management:**
- **Zustand** for React state across islands
- **No persistence** for prompt selection (design for quick re-selection)
- LocalStorage only for auth tokens (via Supabase client)

**API Integration:**
- **Supabase Auth** for registration, login, logout, session management
- **Supabase Database** for user profiles, prompts, sections, API keys
- **Supabase Realtime** for processing progress (subscribe to `smelt:{id}` channel)
- **REST API** endpoints per api-plan.md for CRUD operations

**Key API Flows:**
- `POST /api/smelts` — multipart form with files/text, mode, prompt selection
- Subscribe to Realtime channel for progress events
- `GET /api/smelts/:id` — fetch results on completion
- `GET /api/prompts` — fetch custom prompt library
- `POST /api/api-keys` — validate and store API key

**Credit System:**
- Pre-flight check before processing (client-side timestamp check + server validation)
- Credits consumed only on successful completion
- Page refresh required to see reset credits

### Responsiveness, Accessibility, and Security Considerations

**Responsiveness:**
- Mobile-first with md breakpoint (768px)
- Horizontal layout on wide screens (DropZone | OR | TextZone side-by-side)
- Vertical stacking on narrow screens (DropZone above TextZone)
- Mobile prompt selection: full-screen bottom sheet overlay
- Touch-friendly button sizes (minimum 44×44px)
- Same responsive pattern as existing chaos-smelter

**Accessibility:**
- Semantic HTML elements
- ARIA labels on custom components
- Keyboard navigation (tab order, focus indicators)
- Screen reader announcements for status changes
- Color contrast maintained (black on cream, lime, etc.)
- Neobrutalism.dev components provide accessible foundations

**Security:**
- API keys encrypted at rest (server-side)
- API keys never returned to client after storage
- IP-based rate limiting for anonymous users
- JWT tokens with 1-hour expiry
- Row-level security on all Supabase tables
- CORS restricted to application domain
- No permanent file storage (memory processing)

### Component Mapping to Neobrutalism.dev

| chaos-smelter Component | Neobrutalism.dev Base | Customization |
|------------------------|----------------------|---------------|
| DropZone | Card + custom drag handling | shadow-brutal, border-brutal, lime/yellow states |
| TextZone | Textarea | shadow-brutal-sm, monospace font |
| ProcessButton | Button | Large size, shadow-brutal-lg, btn-press animation |
| ProgressBar | Custom (keep existing) | 10-block grid, stage colors |
| ResultsView | Card + Tabs | Black bg, lime text, code styling |
| Prompt buttons | Button (variant) | Pill-style, thick border |
| Sidebar | Sheet | Custom slide-in, cream bg |
| Prompt Editor | Dialog/Card | Black bg overlay, lime text |
| Form inputs | Input | No border-radius, thick borders |

---

## Unresolved Issues

1. **Predefined Prompt Content**: The 5 predefined prompts need exact text/body content defined (summarization, action items, detailed notes, Q&A format, table of contents mentioned in PRD but not specified).

2. **OAuth Providers**: The auth page includes an "OR" divider for OAuth, but specific providers (Google, GitHub, etc.) are not confirmed for MVP.

3. **Smelt History**: PRD mentions history is out of scope for MVP, but `GET /api/smelts` endpoint exists in API plan. Clarify if this should be implemented or hidden from UI.

4. **Section Default Behavior**: When a user creates their first custom prompt, should they be prompted to create a section, or should prompts start as "unsectioned"?

5. **Maximum Files Display**: With 5 files maximum, the DropZone file list styling in combine mode needs consideration—how to display 5 filenames without excessive scrolling.

6. **Prompt Editor Upload Size**: PRD states 10KB max for .MD file upload, but character limit is 4,000 chars (~4KB). These constraints may conflict depending on encoding.

7. **Results Filename Format**: For combine mode, exact filename pattern needs specification (e.g., `combined_YYYYMMDD_HHMMSS.md` vs concatenated source names).

8. **Weekly Reset Timezone Display**: The tooltip mentions "MIDNIGHT UTC" but users may prefer local timezone display—clarify preference.

---

## Reference: Existing chaos-smelter Design System

### Color Palette (from index.css)
```css
--color-cream:     #FFFEF0   /* Primary background */
--color-lime:      #E8FF8D   /* Active/highlight (files) */
--color-lavender:  #C8B6FF   /* Active/highlight (text) */
--color-coral:     #FF6B6B   /* Error/destructive */
--color-cyan:      #A8E6FF   /* Secondary action */
--color-mint:      #7BF1A8   /* Success/complete */
--color-yellow:    #FFDE59   /* Drag state */
--color-black:     #000000   /* Border, text, shadows */
```

### Custom Utilities
```css
/* Shadows (Neobrutalist) */
.shadow-brutal:    8px 8px 0 #000
.shadow-brutal-lg: 12px 12px 0 #000
.shadow-brutal-sm: 4px 4px 0 #000

/* Borders */
.border-brutal:       4px solid #000
.border-brutal-thick: 6px solid #000

/* Interactions */
.btn-press:active: translate(3px, 3px) + reduced shadow
```

### Typography
- **Font Family**: Space Mono (Google Fonts)
- **Headers**: font-bold uppercase tracking-tighter
- **Status text**: text-xs uppercase tracking-widest opacity-70
- **Body**: text-sm monospace tracking-wide

### Existing Components (chaos-smelter)
- **App.tsx**: Root component with state management
- **DropZone.tsx**: File upload with drag-and-drop
- **TextZone.tsx**: Text input area
- **ProcessButton.tsx**: Main action button
- **ProgressBar.tsx**: 10-block progress visualization
- **ResultsView.tsx**: Results display with copy/download
- **useWebSocket.ts**: WebSocket state management hook
