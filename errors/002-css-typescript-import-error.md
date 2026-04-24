# Error: TypeScript Error on CSS Import in page.tsx

## What Was the Error

`src/app/page.tsx` had a plain CSS import:
```ts
import "./homepage.css";
```

TypeScript threw an error on this line because it does not know how to handle `.css` file imports — it only understands JavaScript/TypeScript modules by default.

## Why It Happened

TypeScript resolves imports as modules. A `.css` file is not a JS module, so TypeScript reports: *"Cannot find module './homepage.css' or its corresponding type declarations."*

This only affects plain CSS imports (e.g. `import "./styles.css"`). CSS Modules (e.g. `import styles from "./styles.module.css"`) work because Next.js ships built-in type declarations for `*.module.css` files.

An attempt was made to fix this by creating `src/types/css.d.ts` with:
```ts
declare module '*.css' {}
```
This silenced the TypeScript error but caused a different problem — it overrode the built-in CSS Module type declarations, breaking components that used `import styles from "*.module.css"` (they lost their typed class name autocompletion and TypeScript started accepting any string as a valid class name).

## How We Fixed It

Deleted `src/types/css.d.ts` entirely and instead added a `// @ts-ignore` comment on the specific import line in `src/app/page.tsx`:

```ts
// @ts-ignore
import "./homepage.css";
```

This suppresses the error for only that one line without affecting CSS Module typing anywhere else in the project. It is a targeted workaround acceptable for a plain global CSS import where no typed exports are expected.
