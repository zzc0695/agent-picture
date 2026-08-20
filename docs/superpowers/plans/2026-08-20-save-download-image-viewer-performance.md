# Save, Download, Image Viewer, and Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make customer-plan saving observable, implement real high-resolution downloads, add an accessible zoomable image viewer, and remove the interaction delays users reported.

**Architecture:** Keep the existing workbench flow and database model. Add a small authenticated download route with strict source validation, extract the image viewer into a focused client component, and give `WorkbenchPage` separate action/error/success state so unrelated controls remain responsive.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Motion, Vitest, Testing Library

---

## File Structure

- Create `lib/files/download.ts`: validate downloadable image URLs and derive safe filenames.
- Create `app/api/files/download/route.ts`: authenticated image proxy that returns attachment responses.
- Create `components/image-viewer.tsx`: accessible fullscreen zoom, pan, reset, download, and close interactions.
- Modify `app/(dashboard)/page.tsx`: explicit save/download state, feedback, viewer integration, faster transitions, readable errors.
- Modify `app/globals.css`: responsive button pending styles and reduced-motion behavior.
- Create `tests/files/download.test.ts`: source-validation unit tests.
- Create `tests/api/file-download.test.ts`: download route authorization and response tests.
- Create `tests/components/image-viewer.test.tsx`: dialog, zoom, reset, download, and close tests.
- Modify `tests/components/workbench-page.test.tsx`: save success, error feedback, download, and viewer integration tests.

### Task 1: Secure Download Source Validation

**Files:**
- Create: `lib/files/download.ts`
- Test: `tests/files/download.test.ts`

- [ ] **Step 1: Write failing source-validation tests**

```ts
expect(resolveDownloadUrl("/uploads/effect.png", "https://app.test").href)
  .toBe("https://app.test/uploads/effect.png");
expect(resolveDownloadUrl("https://store.public.blob.vercel-storage.com/effect.png", "https://app.test").hostname)
  .toBe("store.public.blob.vercel-storage.com");
expect(() => resolveDownloadUrl("https://example.com/private", "https://app.test"))
  .toThrow("不允许下载该图片来源");
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- tests/files/download.test.ts`
Expected: FAIL because `@/lib/files/download` does not exist.

- [ ] **Step 3: Implement strict URL and filename helpers**

```ts
export function resolveDownloadUrl(value: string, origin: string) {
  const url = new URL(value, origin);
  const sameOriginUpload = url.origin === origin && url.pathname.startsWith("/uploads/");
  const vercelBlob = url.protocol === "https:" && url.hostname.endsWith(".blob.vercel-storage.com");
  if (!sameOriginUpload && !vercelBlob) throw new Error("不允许下载该图片来源");
  return url;
}

export function downloadFileName(contentType: string, now = new Date()) {
  const extension = contentType.includes("jpeg") ? "jpg" : contentType.includes("webp") ? "webp" : "png";
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  return `curtain-plan-${date}.${extension}`;
}
```

- [ ] **Step 4: Run the focused test and verify pass**

Run: `npm test -- tests/files/download.test.ts`
Expected: all download helper tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/files/download.ts tests/files/download.test.ts
git commit -m "feat: validate effect image downloads"
```

### Task 2: Authenticated High-Resolution Download Route

**Files:**
- Create: `app/api/files/download/route.ts`
- Create: `tests/api/file-download.test.ts`

- [ ] **Step 1: Write failing route tests**

```ts
expect((await GET(new Request("http://localhost/api/files/download?url=%2Fuploads%2Feffect.png"))).status).toBe(401);
expect(response.headers.get("content-disposition")).toContain("attachment;");
expect(response.headers.get("content-type")).toBe("image/png");
expect(global.fetch).toHaveBeenCalledWith("http://localhost/uploads/effect.png", expect.any(Object));
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- tests/api/file-download.test.ts`
Expected: FAIL because the route does not exist.

- [ ] **Step 3: Implement the authenticated attachment response**

```ts
export async function GET(request: Request) {
  const session = await requireMerchantSession();
  if (!session) return unauthorizedResponse();
  try {
    const requestUrl = new URL(request.url);
    const source = resolveDownloadUrl(requestUrl.searchParams.get("url") ?? "", requestUrl.origin);
    const upstream = await fetch(source, { cache: "no-store" });
    const contentType = upstream.headers.get("content-type") ?? "";
    if (!upstream.ok || !contentType.startsWith("image/")) {
      return Response.json({ error: "高清图片读取失败" }, { status: 502 });
    }
    return new Response(upstream.body, {
      headers: {
        "content-type": contentType,
        "content-disposition": `attachment; filename="${downloadFileName(contentType)}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "下载失败" }, { status: 400 });
  }
}
```

- [ ] **Step 4: Run route and helper tests**

Run: `npm test -- tests/api/file-download.test.ts tests/files/download.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/files/download/route.ts tests/api/file-download.test.ts
git commit -m "feat: download generated images securely"
```

### Task 3: Accessible Zoomable Image Viewer

**Files:**
- Create: `components/image-viewer.tsx`
- Create: `tests/components/image-viewer.test.tsx`

- [ ] **Step 1: Write failing component tests**

```tsx
render(<ImageViewer imageUrl="/uploads/effect.png" open onClose={onClose} onDownload={onDownload} downloading={false} />);
expect(screen.getByRole("dialog", { name: "查看效果图细节" })).toBeInTheDocument();
await user.click(screen.getByRole("button", { name: "放大" }));
expect(screen.getByTestId("zoom-value")).toHaveTextContent("125%");
await user.keyboard("{Escape}");
expect(onClose).toHaveBeenCalled();
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- tests/components/image-viewer.test.tsx`
Expected: FAIL because `ImageViewer` does not exist.

- [ ] **Step 3: Implement the viewer as an isolated client component**

```tsx
export function ImageViewer({ imageUrl, open, onClose, onDownload, downloading }: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (!open) return;
    setScale(1);
    setOffset({ x: 0, y: 0 });
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="查看效果图细节">
      <img src={imageUrl} alt="效果图细节" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }} />
      <button aria-label="缩小" onClick={() => setScale((value) => Math.max(1, value - 0.25))}>−</button>
      <output data-testid="zoom-value">{Math.round(scale * 100)}%</output>
      <button aria-label="放大" onClick={() => setScale((value) => Math.min(4, value + 0.25))}>+</button>
      <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }}>复位</button>
      <button onClick={onDownload} disabled={downloading}>{downloading ? "下载中" : "下载高清图"}</button>
      <button aria-label="关闭图片查看器" onClick={onClose}>关闭</button>
    </div>
  );
}
```

Add pointer capture for drag translation and `onWheel` scale clamping to the image stage. Track the two active touch pointers and update the scale by their distance ratio for pinch gestures.

- [ ] **Step 4: Run viewer tests**

Run: `npm test -- tests/components/image-viewer.test.tsx`
Expected: all viewer tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/image-viewer.tsx tests/components/image-viewer.test.tsx
git commit -m "feat: add effect image detail viewer"
```

### Task 4: Observable Save and Download Actions

**Files:**
- Modify: `app/(dashboard)/page.tsx`
- Modify: `tests/components/workbench-page.test.tsx`

- [ ] **Step 1: Update workbench tests to describe the repaired behavior**

```tsx
await user.click(screen.getByRole("button", { name: "保存方案" }));
expect(await screen.findByText("方案已保存")).toBeInTheDocument();
expect(screen.getByRole("link", { name: "查看客户方案" })).toHaveAttribute("href", "/plans");

await user.click(screen.getByRole("button", { name: "放大查看效果图" }));
expect(screen.getByRole("dialog", { name: "查看效果图细节" })).toBeInTheDocument();

await user.click(screen.getByRole("button", { name: "下载高清图" }));
expect(downloadAnchor).toHaveAttribute("href", expect.stringContaining("/api/files/download?url="));
```

- [ ] **Step 2: Run the workbench tests and verify failure**

Run: `npm test -- tests/components/workbench-page.test.tsx`
Expected: FAIL because the new controls and feedback are not present.

- [ ] **Step 3: Implement separate save and download state**

```tsx
const [savedPlanId, setSavedPlanId] = useState("");
const [actionNotice, setActionNotice] = useState("");
const [actionError, setActionError] = useState("");
const [viewerOpen, setViewerOpen] = useState(false);
const [downloading, setDownloading] = useState(false);

async function savePlan() {
  setBusyAction("save");
  setActionError("");
  try {
    const result = await postJson<{ plan: { id: string } }>("/api/plans", planPayload);
    setSavedPlanId(result.plan.id);
    setActionNotice("方案已保存");
    setActiveStep(3);
  } catch (error) {
    setActionError(error instanceof Error ? error.message : "方案保存失败");
  } finally {
    setBusyAction(null);
  }
}

function downloadImage() {
  setDownloading(true);
  setActionError("");
  const anchor = document.createElement("a");
  anchor.href = `/api/files/download?url=${encodeURIComponent(imageUrl)}`;
  anchor.download = "curtain-plan.png";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => setDownloading(false), 400);
}
```

- [ ] **Step 4: Integrate the viewer and explicit controls**

```tsx
<button type="button" aria-label="放大查看效果图" onClick={onOpenViewer}>
  <Maximize2 aria-hidden="true" />
</button>
<button type="button" onClick={onDownload} disabled={downloading}>
  <Download aria-hidden="true" />
  {downloading ? "下载中" : "下载高清图"}
</button>
{actionNotice ? (
  <div role="status">方案已保存 · <Link href="/plans">查看客户方案</Link></div>
) : null}
{actionError ? <div role="alert">{actionError}</div> : null}
<ImageViewer
  imageUrl={displayImage}
  open={viewerOpen}
  onClose={() => setViewerOpen(false)}
  onDownload={downloadImage}
  downloading={downloading}
/>
```

- [ ] **Step 5: Improve API error messages**

```ts
const result = (await response.json()) as T & { error?: string };
if (!response.ok) {
  throw new Error(result.error || "请求失败，请稍后重试");
}
return result;
```

Every async action catches errors with `setActionError(error instanceof Error ? error.message : "操作失败，请重试")` and clears only its own pending state in `finally`.

- [ ] **Step 6: Run workbench tests**

Run: `npm test -- tests/components/workbench-page.test.tsx`
Expected: all workbench tests PASS.

- [ ] **Step 7: Commit**

```bash
git add app/(dashboard)/page.tsx tests/components/workbench-page.test.tsx
git commit -m "fix: make proposal actions observable"
```

### Task 5: Remove Perceived Interaction Lag

**Files:**
- Modify: `app/(dashboard)/page.tsx`
- Modify: `app/globals.css`
- Modify: `tests/components/workbench-page.test.tsx`

- [ ] **Step 1: Add assertions for immediate pending feedback**

```tsx
const deferred = Promise.withResolvers<Response>();
fetchMock.mockImplementationOnce(() => deferred.promise);
await user.click(screen.getByRole("button", { name: "保存方案" }));
expect(screen.getByRole("button", { name: "保存中" })).toBeDisabled();
expect(screen.getByRole("button", { name: "放大查看效果图" })).toBeEnabled();
deferred.resolve(Response.json({ plan: { id: "plan_1" } }, { status: 201 }));
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- tests/components/workbench-page.test.tsx`
Expected: pending-state assertion fails against the global busy-state implementation.

- [ ] **Step 3: Reduce animation and rendering cost**

```ts
const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8, transition: { duration: 0.12 } },
  transition: { duration: 0.2, ease: pageEase },
};
```

```css
.studio-primary-button,
.studio-secondary-button,
.studio-icon-button { touch-action: manipulation; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 4: Isolate pending actions**

```tsx
const saving = busyAction === "save";
const generating = busyAction === "generate";
<button disabled={saving}>{saving ? "保存中" : "保存方案"}</button>
<button disabled={downloading}>{downloading ? "下载中" : "下载高清图"}</button>
<button disabled={generating}>{generating ? "生成中" : "生成更多方案"}</button>
```

- [ ] **Step 5: Run focused and full tests**

Run: `npm test -- tests/components/workbench-page.test.tsx tests/components/image-viewer.test.tsx`
Expected: focused suites PASS.

Run: `npm test`
Expected: all project tests PASS.

- [ ] **Step 6: Commit**

```bash
git add app/(dashboard)/page.tsx app/globals.css tests/components/workbench-page.test.tsx
git commit -m "perf: speed up studio interactions"
```

### Task 6: Full Verification and Production Deployment

**Files:**
- Verify all modified files.

- [ ] **Step 1: Run static checks**

Run: `npm run lint`
Expected: exit 0.

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 2: Run a production build**

Run: `npx prisma generate && npx next build`
Expected: Next.js production build completes and lists `/api/files/download`.

- [ ] **Step 3: Run browser verification**

Open the local dev server, verify the workbench is not blank, open the effect viewer, test its controls, confirm save success feedback, and confirm there are no Next.js error overlays or console errors.

- [ ] **Step 4: Push and deploy**

Push the feature branch and merge the verified commit to `main` using the repository's existing deployment workflow.

- [ ] **Step 5: Inspect production logs**

Confirm the deployed commit is READY and scan `/api/plans` and `/api/files/download` for 4xx/5xx responses or runtime exceptions after the production interaction check.
