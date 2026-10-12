import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { PersistentWorkbench } from "@/components/persistent-workbench";
const route = vi.hoisted(() => ({ path: "/", query: "" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.path, useSearchParams: () => new URLSearchParams(route.query) }));
vi.mock("@/components/workbench-page", () => ({ default: function Draft() { const [value,setValue]=useState("");return <input aria-label="草稿" value={value} onChange={event=>setValue(event.target.value)} />; } }));
describe("workspace navigation", () => {
  it("keeps the mounted draft when visiting prompts and returning", async () => {
    const user=userEvent.setup();route.path="/";const view=render(<PersistentWorkbench />);
    await user.type(screen.getByLabelText("草稿"),"保留上传与要求");
    route.path="/prompts";view.rerender(<PersistentWorkbench />);
    expect(screen.getByLabelText("草稿")).not.toBeVisible();
    route.path="/";view.rerender(<PersistentWorkbench />);
    expect(screen.getByLabelText("草稿")).toHaveValue("保留上传与要求");
    expect(screen.getByLabelText("草稿")).toBeVisible();
  });
});
