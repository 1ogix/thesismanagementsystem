# Error: Homepage CSS Bleeding Into Auth and Dashboard Pages

## What Was the Error

After adding a custom `homepage.css` for the landing page and importing it in `src/app/page.tsx`, the dark navy background, custom font, and overridden CSS variables from the homepage started appearing on the login page, register page, and all dashboard routes.

Symptoms:
- Login page had a dark navy background instead of white
- Tailwind's `--border`, `--muted`, and other design tokens were overridden
- Hard refreshing any page (Ctrl+Shift+R) fixed it temporarily, but navigating from the homepage via the Sign In button broke it again

## Why It Happened

Next.js App Router loads CSS imports globally across all routes — not scoped to the component or page that imports them. When `src/app/page.tsx` did `import "./homepage.css"`, Next.js bundled that stylesheet into the global CSS output and loaded it for every page, not just the landing page.

Additionally, `homepage.css` declared a `body { background: #080e1a }` and `:root { --border: ...; --muted: ... }` that conflicted with and overrode Tailwind/shadcn's CSS variables used throughout the app.

The second layer of the problem was client-side navigation. When a user clicked "Sign In" on the homepage (which used Next.js `<Link>`), React rendered the new page *before* the old component unmounted. The `useEffect` cleanup that removed a `homepage` class from `<body>` ran too late — the new page was already visible with the wrong styles applied.

## How We Fixed It

**Step 1 — Scope all homepage styles to a `body.homepage` class**

Changed every top-level selector in `homepage.css` from:
```css
body { ... }
:root { --border: ...; }
body::after { ... }
```
To:
```css
body.homepage { ... }
body.homepage { --border: ...; }
body.homepage::after { ... }
```

This ensures the homepage styles only apply when the `homepage` class is present on `<body>`, preventing any bleed into other routes.

**Step 2 — Toggle the class in `useEffect`**

In `src/app/page.tsx`, added:
```tsx
useEffect(() => {
  document.body.classList.add("homepage");
  return () => document.body.classList.remove("homepage");
}, []);
```

**Step 3 — Replace `<Link>` with `<a>` for outbound navigation**

Because React concurrent mode renders the new page before the old component's cleanup runs, the class removal was always too late during client-side navigation. Fixed by replacing all `<Link href="...">` in the landing page with `<a href="...">` to force a full page reload, ensuring the `homepage` class is fully gone before the next page renders.
