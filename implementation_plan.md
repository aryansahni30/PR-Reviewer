# Midnight Amber Theme Implementation Plan

## Proposed Changes
We will completely overhaul the current light mode UI into the "Midnight Amber" dark theme. 

### Global Styles & Tailwind Config
- #### [MODIFY] [globals.css](file:///Users/aryansahni/pr%20reviewer/frontend/src/app/globals.css)
  - Set the base background (`#0F111A`) and foreground text (`#FDF8F5`).
  - Darken scrollbars.
  - Remove light-mode specific glows and replace them with amber glows.
- #### [MODIFY] [tailwind.config.ts](file:///Users/aryansahni/pr%20reviewer/frontend/tailwind.config.ts)
  - Extend the theme palette to include our custom Midnight Amber tokens:
    - `midnight`: base (`#0F111A`), card (`#181B28`), border (`#262A3D`)
    - `amber`: primary (`#FFC300`), hover (`#FFD166`)
    - `teal`: success (`#06D6A0`)

### Page and Components
- #### [MODIFY] [page.tsx](file:///Users/aryansahni/pr%20reviewer/frontend/src/app/page.tsx)
  - Replace `bg-[#FAFAFA]` with `bg-midnight-base`.
  - Replace white cards (`bg-white border-gray-200`) with `bg-midnight-card border-midnight-border`.
  - Change main text `text-gray-900` to `text-gray-100`.
  - Update the "Analyze PR" button and CTA to use `bg-amber-primary text-midnight-base` and remove purple styling.
- #### [MODIFY] All components in `src/components/` (LandingInput, LoadingSteps, HealthScore, SummaryCard, DiffViewer, IssuesPanel)
  - Systematically replace hardcoded gray/white backgrounds with the new `midnight` tokens.
  - Ensure syntax highlighting and diff viewers contrast well against the new dark slate backgrounds.
  - Convert any existing purple gradients into glowing amber styles.

## Verification Plan
### Automated Tests
- Build verification: Run `npm run build` (or similar next build command) in the `frontend` directory to ensure no TypeScript or CSS syntax errors prevent compilation.

### Manual Verification
- We will start the dev server via `npm run dev` in the `frontend` folder.
- Then, we'll manually verify at `http://localhost:3000` to ensure that:
  1. The landing page background is deep slate and the Hero text pops.
  2. The input box and "Analyze PR" button look correct with amber accents.
  3. The mock PR card properly showcases the dark issue tags and teal success scores without any eye-straining contrast issues.
