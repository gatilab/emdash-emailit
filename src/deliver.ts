/**
 * The `email:deliver` handler: sends one EmDash email message through the
 * Emailit Email API. Admin settings win over the environment and the
 * config; blank settings don't count.
 */
import type { PluginContext } from "emdash";
import type { EmailDeliverEvent } from "emdash/plugin";

import type { SettingKey } from "./settings.js";

export interface EmailitOptions {
	/** Sender, e.g. `Gatilab <noreply@gatilab.com>`. The domain must be verified in Emailit. */
	from: string;
	/** Default Reply-To; a message's own replyTo wins. */
	replyTo?: string;
}

export const EMAILIT_ENDPOINT = "https://api.emailit.com/v2/emails";

export interface DeliverDeps {
	fetch: typeof fetch;
	/** Fallback API key source (defaults to process.env, which Workers populate with nodejs_compat). */
	envKey: () => string | undefined;
}

const defaultDeps: DeliverDeps = {
	fetch: (...args) => fetch(...args),
	envKey: () => (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.EMAILIT_API_KEY,
};

async function setting(ctx: Pick<PluginContext, "settings">, key: SettingKey): Promise<string | undefined> {
	const value = await ctx.settings.get<string>(key).catch(() => null);
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** `Name <address>`, with characters that would break the header removed from the name. */
export function formatFrom(name: string | undefined, address: string): string {
	const clean = name?.replace(/["<>\r\n]/g, "").trim();
	return clean ? `${clean} <${address}>` : address;
}

export function createDeliver(options: EmailitOptions, deps: DeliverDeps = defaultDeps) {
	return async (event: EmailDeliverEvent, ctx: Pick<PluginContext, "settings" | "log">): Promise<void> => {
		const { message } = event;
		const apiKey = (await setting(ctx, "apiKey")) ?? deps.envKey()?.trim();
		if (!apiKey) throw new Error("[emailit] No Emailit API key: add one under Plugins → emailit-email → Settings, or set EMAILIT_API_KEY.");

		const fromEmail = await setting(ctx, "fromEmail");
		const fromName = await setting(ctx, "fromName");
		const from = fromEmail ? formatFrom(fromName, fromEmail) : options.from;
		const replyTo = message.replyTo ?? (await setting(ctx, "replyTo")) ?? options.replyTo;

		const res = await deps.fetch(EMAILIT_ENDPOINT, {
			method: "POST",
			headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
			body: JSON.stringify({
				from,
				to: message.to,
				subject: message.subject,
				text: message.text,
				html: message.html ?? `<pre style="font:inherit;white-space:pre-wrap">${escapeHtml(message.text)}</pre>`,
				...(message.cc?.length ? { cc: message.cc } : {}),
				...(replyTo ? { reply_to: replyTo } : {}),
			}),
		});
		if (!res.ok) {
			const detail = await res.text().catch(() => "");
			throw new Error(`[emailit] Emailit ${res.status}: ${detail.slice(0, 200)}`);
		}
		ctx.log.info("email delivered via Emailit", { from, subject: message.subject, source: event.source });
	};
}
