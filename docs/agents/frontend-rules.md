# Frontend code rules (`web/`)

Binding for every agent and developer writing code in `web/`. Visual rules come from the HRM design system on Claude Design (`docs/agents/team.md`); these rules cover code.

## Structure

```
web/src/
├── app.tsx                  providers + router only
├── pages/<page>/            one folder per route
│   ├── <page>-page.tsx      composes sections; no business logic, no fetching details
│   └── <section>.tsx        page-only sections
├── features/<feature>/      one folder per glossary feature (employee, contract, leave…)
│   ├── api.ts               TanStack Query hooks + fetchers for this feature
│   ├── schemas.ts           zod schemas for its forms
│   ├── components/          feature components (employee-table.tsx…)
│   └── *.test.tsx           tests next to the code
├── components/
│   ├── ui/                  library components from Claude Design (button.tsx, badge.tsx…)
│   └── layout/              app shell pieces (app-header.tsx, sidebar-nav.tsx…)
├── lib/                     framework-free helpers (format.ts, utils.ts)
├── i18n/                    setup + locales/<lang>.json
└── styles/                  index.css (theme mapping) + tokens.css (generated)
```

- Features never import from another feature's `components/`; shared pieces move to `components/`.
- `components/ui/` holds only library components. A component that knows about employees, contracts or the API is a feature component.

## No god files: when to split

- **One exported component per file.** Small private helpers in the same file are fine.
- **Split when a file passes ~150 lines**, or a component has more than one job (layout + data + form), or JSX nests deeper than ~4 levels. Hard limit 250 lines; above that the PR must split it.
- **Pages compose, they don't implement.** A page file is mostly section components and layout.
- **Logic out of JSX.** Data fetching in `features/<f>/api.ts` hooks, derived state in a custom hook (`use-<thing>.ts`), formatting in `lib/format.ts`.
- **No catch-all files** (`helpers.ts`, `common.tsx`, `types.ts` for everything). Types live next to the code that owns them.

## Components

- Named exports only, no default exports. Files kebab-case (`employee-table.tsx`), components PascalCase (`EmployeeTable`).
- Props typed with an exported `<Name>Props` type; library component props mirror the Claude Design README "Consumer provides".
- Variants with `class-variance-authority`; merge classes with `cn()` from `lib/utils.ts`.
- Composition over boolean props: more than ~3 boolean props means split into variants or subcomponents.
- No prop drilling past two levels: lift into a feature hook or context.

## Styling

- Tokens only, through Tailwind utilities generated from `styles/tokens.css` (`bg-brand-blue`, `text-ink-muted`, `text-body`, `rounded-md`, `shadow-focus-ring`). No hex values, no raw px for colours, radii or shadows outside the generated file. Arbitrary values (`text-[14px]`) only when the design system defines that size and no token exists; note it.
- Icons from `lucide-react`, stroke 1.5, 16px inline / 20px in buttons and navigation.
- Status never by colour alone (Badge with text; heatmap cells with %).

## Data, forms, text

- Server state with TanStack Query only; no fetching in `useEffect`. API types generated from the backend OpenAPI.
- Forms with react-hook-form + zod; field errors say the cause and the fix.
- Every user-visible string through i18n (`t('<feature>.<key>')`), vi and en both filled. Errors map backend error `code`s to i18n keys.
- Dates, times, money, percentages only through `lib/format.ts`.
- "Today" is the company's day, never the browser's: use `companyToday()` / `companyTodayIso()` from `lib/company-time.ts`, not `new Date()`, for any date the API validates or that sets a period. The API decides on `COMPANY_ZONE` (Asia/Ho_Chi_Minh); the web tests run in UTC so a slip shows.

## Tests

- Vitest + Testing Library, next to the code. Query by role and accessible name, not by class or test id.
- Every feature component with logic gets a behaviour test; library components get a render test per variant that matters.
- MSW for API calls; no real network in tests.

## Design quality

Use the `frontend-design` skill for craft and self-critique (screenshots, restraint, writing). Where it conflicts with the HRM design system (palette, Inter, radius, voice), the design system wins.
