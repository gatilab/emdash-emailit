# Emailit for EmDash

An email provider plugin for [EmDash](https://emdashcms.com) that sends through [Emailit](https://emailit.com). It covers EmDash's own mail (invites, magic-link sign-in, account recovery) and any plugin email sent with `ctx.email.send()`. Without an email provider, EmDash can only show invite links for you to share by hand.

## Install

```sh
pnpm add @gatilab/emdash-emailit
```

```js
// astro.config.mjs
import emdash from "emdash/astro";
import { emailit } from "@gatilab/emdash-emailit";

export default defineConfig({
	integrations: [
		emdash({
			plugins: [emailit({ from: "Example <noreply@example.com>", replyTo: "hello@example.com" })],
		}),
	],
});
```

The `from` address must be on a domain you've verified in Emailit. When this is the only email provider, EmDash selects it automatically.

## Settings

The settings are in the admin under **Plugins › emailit-email › Settings**:

| Setting | Fallback when empty |
| --- | --- |
| Emailit API key (stored encrypted) | the `EMAILIT_API_KEY` environment variable |
| From name | the name in `from` |
| From address | the address in `from` |
| Reply-To | `replyTo`. A message's own Reply-To always wins. |

Encrypted settings need `EMDASH_ENCRYPTION_KEY` set on the site. Generate one with `npx emdash secrets generate`, then keep a copy somewhere safe: secrets encrypted with a lost key can't be read.

On Cloudflare Workers, `EMAILIT_API_KEY` is read from `process.env`, which Workers fill from secrets when the `nodejs_compat` flag is on.

To check delivery, use **Settings › Email › Send test email** in the admin. It sends a real email.

## Behaviour

- Messages go to `POST https://api.emailit.com/v2/emails` with `from`, `to`, `subject`, `text`, `html`, `cc` and `reply_to`.
- A text-only message gets an HTML version: the text in a pre-formatted block, escaped.
- A non-2xx answer throws with Emailit's status and message. EmDash then reports the failure to whatever sent the email.

## License

MIT. See [LICENSE](./LICENSE).
