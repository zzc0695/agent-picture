import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import LoginPage from "@/app/(auth)/login/page";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
beforeEach(() => vi.clearAllMocks());

it("labels the login fields and prevents repeat submissions while signing in", async () => {
  const user = userEvent.setup();
  let finish!: (response: Response) => void;
  const fetchMock = vi.fn(() => new Promise<Response>((resolve) => { finish = resolve; }));
  vi.stubGlobal("fetch", fetchMock);
  render(<LoginPage />);
  expect(screen.getByLabelText("邮箱")).toHaveValue("demo@example.com");
  expect(screen.getByLabelText("密码")).toHaveAttribute("type", "password");
  await user.click(screen.getByRole("button", { name: "登录" }));
  expect(screen.getByRole("button", { name: "登录中..." })).toBeDisabled();
  await act(async () => finish(Response.json({ ok: true })));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(router.replace).toHaveBeenCalledWith("/");
});

it.each(["network", "html"])("shows a recoverable error for a %s login failure", async (failure) => {
  const user = userEvent.setup();
  const fetchMock = failure === "network"
    ? vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))
    : vi.fn().mockResolvedValue(new Response("<html>error</html>", { status: 503 }));
  vi.stubGlobal("fetch", fetchMock);
  render(<LoginPage />);
  await user.click(screen.getByRole("button", { name: "登录" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/重试/);
  expect(screen.getByRole("button", { name: "登录" })).toBeEnabled();
  expect(router.replace).not.toHaveBeenCalled();
});
