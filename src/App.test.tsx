import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import type { DashboardSummary } from "./analytics/types";

const zeroCounts = {
  quiz_start: 0,
  quiz_complete: 0,
  lead_form_view: 0,
  assessment_submit: 0,
  result_view: 0,
  audio_purchase_click: 0,
  recommended_audio_click: 0,
  line_click: 0,
  consultation_booking: 0,
  payment_success: 0
};

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  fetchDashboardSummary: vi.fn()
}));

vi.mock("./lib/supabaseClient", () => ({
  hasSupabaseConfig: true,
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      signInWithPassword: mocks.signInWithPassword
    }
  }
}));

vi.mock("./lib/api", () => ({
  fetchDashboardSummary: mocks.fetchDashboardSummary
}));

vi.mock("./components/TrendChart", () => ({
  default: () => <section aria-label="每日趨勢">每日趨勢</section>
}));

vi.mock("./components/HourlyTrendChart", () => ({
  default: () => <section aria-label="訪問時段分布">訪問時段分布</section>
}));

const summary: DashboardSummary = {
  overview: {
    page_views: 128,
    unique_visitors: 72,
    total_conversions: 18,
    payment_success: 4,
    total_conversion_rate: 0.25,
    payment_conversion_rate: 0.0556
  },
  sites: [
    {
      site_id: "quantum_frequency_assessment",
      site_label: "Quantum Frequency Assessment",
      page_views: 80,
      unique_visitors: 50,
      ...zeroCounts,
      quiz_start: 36,
      quiz_complete: 20,
      lead_form_view: 18,
      assessment_submit: 12,
      result_view: 12,
      audio_purchase_click: 3,
      line_click: 5,
      consultation_booking: 2,
      payment_success: 1,
      payment_conversion_rate: 0.02
    },
    {
      site_id: "timewaver_audio_sales",
      site_label: "TimeWaver Audio Sales",
      page_views: 48,
      unique_visitors: 30,
      ...zeroCounts,
      assessment_submit: 1,
      audio_purchase_click: 10,
      line_click: 2,
      consultation_booking: 0,
      payment_success: 3,
      payment_conversion_rate: 0.1
    }
  ],
  trends: [
    {
      date: "2026-06-18",
      page_views: 60,
      unique_visitors: 32,
      ...zeroCounts,
      quiz_start: 16,
      quiz_complete: 9,
      assessment_submit: 6,
      audio_purchase_click: 5,
      line_click: 3,
      consultation_booking: 1,
      payment_success: 2
    },
    {
      date: "2026-06-19",
      page_views: 68,
      unique_visitors: 40,
      ...zeroCounts,
      quiz_start: 20,
      quiz_complete: 11,
      assessment_submit: 7,
      audio_purchase_click: 8,
      line_click: 4,
      consultation_booking: 1,
      payment_success: 2
    }
  ],
  hourly_trends: [
    {
      hour: "00:00",
      page_views: 0,
      unique_visitors: 0,
      ...zeroCounts
    },
    {
      hour: "21:00",
      page_views: 38,
      unique_visitors: 21,
      ...zeroCounts,
      quiz_complete: 5,
      assessment_submit: 4,
      audio_purchase_click: 7,
      line_click: 3,
      consultation_booking: 1,
      payment_success: 2
    }
  ],
  sources: [
    {
      source: "facebook",
      page_views: 90,
      unique_visitors: 55,
      total_conversions: 14,
      payment_success: 3
    },
    {
      source: "direct",
      page_views: 38,
      unique_visitors: 24,
      total_conversions: 4,
      payment_success: 1
    }
  ]
};

function mockAuthSubscription() {
  mocks.onAuthStateChange.mockReturnValue({
    data: {
      subscription: {
        unsubscribe: vi.fn()
      }
    }
  });
}

describe("App", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthSubscription();
  });

  it("shows the login form when there is no active session", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } });

    render(<App />);

    expect(await screen.findByRole("heading", { name: "ABL 檢控面板" })).toBeInTheDocument();
    expect(screen.getByLabelText("管理者 Email")).toBeInTheDocument();
  });

  it("fetches the dashboard summary for an authenticated session and renders metrics", async () => {
    const session = { access_token: "admin-token" };
    mocks.getSession.mockResolvedValue({ data: { session } });
    mocks.fetchDashboardSummary.mockResolvedValue(summary);

    render(<App />);

    await waitFor(() => {
      expect(mocks.fetchDashboardSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: "admin-token"
        })
      );
    });

    const metrics = await screen.findByLabelText("總覽指標");
    expect(within(metrics).getByText("來訪總次數")).toBeInTheDocument();
    expect(within(metrics).getByText("128")).toBeInTheDocument();
    expect(within(metrics).getByText("不重複訪客")).toBeInTheDocument();
    expect(within(metrics).getByText("完成付款")).toBeInTheDocument();
    expect(screen.getAllByText("Quantum Frequency Assessment").length).toBeGreaterThan(0);
    expect(screen.getAllByText("facebook").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("網站")).toBeInTheDocument();
    expect(screen.getByLabelText("來源")).toBeInTheDocument();
    expect(screen.getByLabelText("事件")).toBeInTheDocument();
    expect(screen.getByLabelText("訪問時段分布")).toBeInTheDocument();
    expect(screen.getByText("合計")).toBeInTheDocument();
    expect(screen.getAllByText("72").length).toBeGreaterThan(1);
  });

  it("refetches when dashboard filters change", async () => {
    const session = { access_token: "admin-token" };
    mocks.getSession.mockResolvedValue({ data: { session } });
    mocks.fetchDashboardSummary.mockResolvedValue(summary);

    render(<App />);

    await screen.findByLabelText("總覽指標");
    await userEvent.selectOptions(screen.getByLabelText("網站"), "quantum_frequency_assessment");

    await waitFor(() => {
      expect(mocks.fetchDashboardSummary).toHaveBeenLastCalledWith(
        expect.objectContaining({
          accessToken: "admin-token",
          siteId: "quantum_frequency_assessment"
        })
      );
    });
  });

  it("shows a login error message when sign-in fails", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    mocks.signInWithPassword.mockResolvedValue({ error: new Error("invalid credentials") });

    render(<App />);

    await userEvent.type(await screen.findByLabelText("管理者 Email"), "admin@example.com");
    await userEvent.type(screen.getByLabelText("密碼"), "wrong-password");
    await userEvent.click(screen.getByRole("button", { name: "登入" }));

    expect(await screen.findByText("登入失敗，請確認帳號密碼。")).toBeInTheDocument();
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "admin@example.com",
      password: "wrong-password"
    });
  });
});
