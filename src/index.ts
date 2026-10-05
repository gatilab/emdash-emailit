/**
 * @gatilab/emdash-emailit
 *
 * Emailit email provider for EmDash. Registers the exclusive `email:deliver`
 * hook, so EmDash's own mail (invites, magic-link sign-in, account recovery)
 * and any plugin's `ctx.email.send()` go out through the Emailit API. The API
 * key, sender and Reply-To are editable in the admin under Plugins →
 * emailit-email → Settings.
 *
 * @example
 * ```js
 * // astro.config.mjs
 * import { emailit } from "@gatilab/emdash-emailit";
 * emdash({ plugins: [emailit({ from: "Example <noreply@example.com>" })] })
 * ```
 */
import { definePlugin } from "emdash";
import type { PluginDescriptor, ResolvedPlugin } from "emdash";

import { createDeliver, type EmailitOptions } from "./deliver.js";
import { SETTINGS_SCHEMA } from "./settings.js";

export const PLUGIN_ID = "emailit-email";
export const PLUGIN_VERSION = "1.0.0";
export const PACKAGE_NAME = "@gatilab/emdash-emailit";
const CAPABILITIES = ["hooks.email-transport:register"] as const;

function assertOptions(options: EmailitOptions): void {
	if (!options?.from?.includes("@")) throw new Error("[emailit] `from` must be an email address, e.g. \"Example <noreply@example.com>\".");
}

/**
 * Descriptor for the `plugins` array of `emdash()`. The settings form and
 * capability are declared here too: the admin reads them from the
 * descriptor to show the settings page.
 */
export function emailit(options: EmailitOptions): PluginDescriptor<EmailitOptions> {
	assertOptions(options);
	return {
		id: PLUGIN_ID,
		version: PLUGIN_VERSION,
		format: "native",
		entrypoint: PACKAGE_NAME,
		options,
		capabilities: [...CAPABILITIES],
		settingsSchema: SETTINGS_SCHEMA,
	} as PluginDescriptor<EmailitOptions>;
}

/** Runtime entry: EmDash imports this and passes the descriptor's options. */
export function createPlugin(options: EmailitOptions): ResolvedPlugin {
	assertOptions(options);
	return definePlugin({
		id: PLUGIN_ID,
		version: PLUGIN_VERSION,
		capabilities: [...CAPABILITIES],
		admin: { settingsSchema: SETTINGS_SCHEMA },
		hooks: {
			"email:deliver": {
				exclusive: true,
				handler: createDeliver(options),
			},
		},
	});
}

export default createPlugin;

export { createDeliver, EMAILIT_ENDPOINT, formatFrom, type DeliverDeps, type EmailitOptions } from "./deliver.js";
export { SETTINGS_SCHEMA } from "./settings.js";
