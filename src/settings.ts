/**
 * Settings form shown in the EmDash admin under Plugins → emailit-email.
 * Empty fields fall back to the EMAILIT_API_KEY environment variable and to
 * the options passed to `emailit()` in astro.config.mjs. The API key is
 * stored encrypted with EMDASH_ENCRYPTION_KEY.
 */
import type { SettingField } from "emdash";

export const SETTINGS_SCHEMA = {
	apiKey: {
		type: "secret",
		label: "Emailit API key",
		description: "Key from emailit.com → Credentials. Leave empty to use the EMAILIT_API_KEY environment variable.",
	},
	fromName: {
		type: "string",
		label: "From name",
		description: "Shown as the sender. Leave empty to use the name in astro.config.mjs.",
	},
	fromEmail: {
		type: "email",
		label: "From address",
		description: "Must be on a domain verified in Emailit. Leave empty to use the address in astro.config.mjs.",
	},
	replyTo: {
		type: "email",
		label: "Reply-To address",
		description: "Optional. Where replies go when a message doesn't set its own.",
	},
} satisfies Record<string, SettingField>;

export type SettingKey = keyof typeof SETTINGS_SCHEMA;
