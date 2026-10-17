import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { emailIsConfigured, sendEmail } from "@/lib/email/send";

describe("sendEmail", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", 'RESEND_API_KEY = "test-token"');
    vi.stubEnv("EMAIL_FROM", "EMAIL_FROM='PilotQBank <noreply@example.com>'");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("normalizes Resend environment values before sending", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const outcome = await sendEmail({
      to: "student@example.com",
      subject: "Password changed",
      text: "Your password was changed.",
    });

    expect(outcome).toEqual({ delivered: true, via: "resend" });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(request.headers.Authorization).toBe(["Bearer ", "test-token"].join(""));
    expect(JSON.parse(request.body)).toMatchObject({
      from: "PilotQBank <noreply@example.com>",
      to: ["student@example.com"],
    });
  });

  it("reports the provider as unconfigured when either value is absent", () => {
    vi.stubEnv("RESEND_API_KEY", "");

    expect(emailIsConfigured()).toBe(false);
  });
});
