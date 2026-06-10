# AI Studio UI Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all dashboard frontend UI with the uploaded AI Studio design language while preserving backend behavior and current category data.

**Architecture:** Keep the Next.js App Router and server/client boundaries intact. Port the uploaded Vite UI style, motion, icons, and mobile frame into the existing components and pages, then reconnect the existing API calls and database-rendered categories.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, Vitest, Testing Library, `lucide-react`, `motion`.

---

## File Structure

- Modify `package.json` and `package-lock.json` to add `lucide-react` and `motion`.
- Modify `app/globals.css` for imported visual tokens, glass panels, mobile frame, motion-safe CSS helpers, and placeholder room-scene styling.
- Modify `components/app-shell.tsx` for the new studio shell and dashboard navigation.
- Modify `app/(dashboard)/page.tsx` to port the four-step UI while preserving API calls and flow state.
- Modify `components/material-card.tsx` and `components/customer-plan-card.tsx` to match the new cards.
- Modify `app/(dashboard)/materials/page.tsx`, `plans/page.tsx`, `prompts/page.tsx`, and `records/page.tsx` to use the new library layout.
- Modify `tests/components/workbench-page.test.tsx` and `tests/components/dashboard-layout.test.tsx` for updated labels and preserved behavior.

## Tasks

- [ ] Add frontend dependencies: run `npm install lucide-react motion`.
- [ ] Update workbench tests so they still assert API calls, prompt-library behavior, generation flow, save flow, and customer tabs under the new labels.
- [ ] Port global UI tokens and shell styles from the zip into `app/globals.css`.
- [ ] Replace `AppShell` with the studio background, mobile-first container, and dashboard navigation links.
- [ ] Rebuild `app/(dashboard)/page.tsx` with zip-equivalent views and `motion/react` transitions while retaining existing state and API payloads.
- [ ] Restyle material and plan cards without changing their props.
- [ ] Restyle materials, plans, prompts, and records pages while preserving server-side queries and category/status rendering.
- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Start the local dev server and verify the rendered UI in the browser.
