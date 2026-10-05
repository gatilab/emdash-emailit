import { describe, expect, it } from "vitest";

import { createDeliver, createPlugin, EMAILIT_ENDPOINT, emailit, formatFrom, SETTINGS_SCHEMA } from "../src/index.js";

function ctx(settings: Record<string, string> = {}) {
	const logs: unknown[] = [];
	return {
		logs,
		settings: { get: async (k: string) => settings[k] ?? null },
		log: { info: (...a: unknown[]) => void logs.push(a), warn() {}, error() {}, debug() {} },
	} as never;
}

function recorder(status = 200, body = "{}") {
	const calls: { url: string; init: RequestInit }[] = [];
	const fetch = (async (url: string, init: RequestInit) => {
		calls.push({ url, init });
		return new Response(body, { status });
	}) as typeof globalThis.fetch;
	return { calls, fetch };
}

const message = { to: "reader@example.com", subject: "Sign in", text: "Use this link: https://x.test/a?b=1 & <c>" };

describe("email:deliver", () => {
	it("posts to the v2 API with config defaults and an HTML fallback", async () => {
		const { calls, fetch } = recorder();
		const deliver = createDeliver({ from: "Gatilab <noreply@gatilab.com>", replyTo: "hello@gatilab.com" }, { fetch, envKey: () => "env-key" });
		await deliver({ message, source: "auth" }, ctx());
		expect(calls[0]!.url).toBe(EMAILIT_ENDPOINT);
		expect(EMAILIT_ENDPOINT).toBe("https://api.emailit.com/v2/emails");
		expect((calls[0]!.init.headers as Record<string, string>).Authorization).toBe("Bearer env-key");
		expect(JSON.parse(String(calls[0]!.init.body))).toEqual({
			from: "Gatilab <noreply@gatilab.com>",
			to: "reader@example.com",
			subject: "Sign in",
			text: message.text,
			html: '<pre style="font:inherit;white-space:pre-wrap">Use this link: https://x.test/a?b=1 &amp; &lt;c&gt;</pre>',
			reply_to: "hello@gatilab.com",
		});
	});

	it("lets admin settings win, ignores blank ones, and keeps a message's own reply-to and cc", async () => {
		const { calls, fetch } = recorder();
		const deliver = createDeliver({ from: "Config <c@example.com>" }, { fetch, envKey: () => "env-key" });
		await deliver(
			{ message: { ...message, html: "<p>Hi</p>", replyTo: "own@example.com", cc: ["cc@example.com"] }, source: "plugin" },
			ctx({ apiKey: "admin-key", fromName: 'Ga"ti<lab>', fromEmail: "team@example.com", replyTo: "  " }),
		);
		const body = JSON.parse(String(calls[0]!.init.body));
		expect((calls[0]!.init.headers as Record<string, string>).Authorization).toBe("Bearer admin-key");
		expect(body.from).toBe("Gatilab <team@example.com>");
		expect(body.reply_to).toBe("own@example.com");
		expect(body.cc).toEqual(["cc@example.com"]);
		expect(body.html).toBe("<p>Hi</p>");
	});

	it("fails clearly without a key, and on an API error", async () => {
		const none = createDeliver({ from: "a@example.com" }, { fetch: recorder().fetch, envKey: () => undefined });
		await expect(none({ message, source: "auth" }, ctx())).rejects.toThrow(/No Emailit API key/);

		const bad = recorder(422, '{"error":"invalid from"}');
		const deliver = createDeliver({ from: "a@example.com" }, { fetch: bad.fetch, envKey: () => "k" });
		await expect(deliver({ message, source: "auth" }, ctx())).rejects.toThrow('[emailit] Emailit 422: {"error":"invalid from"}');
	});
});

describe("plugin", () => {
	it("declares the exclusive provider hook, capability and settings", () => {
		const descriptor = emailit({ from: "Gatilab <noreply@gatilab.com>" }) as unknown as Record<string, unknown>;
		expect(descriptor).toMatchObject({ id: "emailit-email", format: "native", entrypoint: "@gatilab/emdash-emailit", capabilities: ["hooks.email-transport:register"], settingsSchema: SETTINGS_SCHEMA });
		const plugin = createPlugin({ from: "noreply@gatilab.com" }) as unknown as { id: string; hooks: Record<string, { exclusive?: boolean }> };
		expect(plugin.id).toBe("emailit-email");
		expect(plugin.hooks["email:deliver"]?.exclusive).toBe(true);
		expect(() => emailit({ from: "Gatilab" })).toThrow(/must be an email address/);
	});

	it("formats the sender header safely", () => {
		expect(formatFrom("Gatilab\r\nBcc: x", "a@example.com")).toBe("GatilabBcc: x <a@example.com>");
		expect(formatFrom(undefined, "a@example.com")).toBe("a@example.com");
	});
});
