const NAVY_BACKGROUND = "#020817";
const CARD_NAVY = "#111827";
const GOLD = "#D4AF37";
const IVORY = "#f5f5f0";
const IVORY_MUTED = "#a3a3ad";
const BODY_TEXT = "#d4d4d8";

const SERIF_FONT = "Georgia, 'Times New Roman', Times, serif";
const SANS_FONT = "Arial, Helvetica, sans-serif";
const DIVIDER = "━━━━━━━━━━━━━━";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeHtmlWithLineBreaks(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

export interface AristolegionEmailOptions {
  eyebrow: string;
  title: string;
  subtitle?: string;
  body: string;
  buttonText: string;
  buttonUrl: string;
}

/**
 * Every Resend email in this app (subscriber/application notifications,
 * newsletter issues, publication and essay announcements) renders through
 * this one function, so the brand only needs to be designed once. Table-based
 * layout with inline styles only, no external stylesheet or <style> block —
 * required for consistent rendering in Gmail, Outlook, and mobile clients,
 * none of which reliably support external/embedded CSS in email.
 */
export function createAristolegionEmail({
  eyebrow,
  title,
  subtitle,
  body,
  buttonText,
  buttonUrl,
}: AristolegionEmailOptions): string {
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0; padding:0; background-color:${NAVY_BACKGROUND};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${NAVY_BACKGROUND};">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
            <tr>
              <td align="center" style="padding-bottom:24px;">
                <p style="margin:0; color:${GOLD}; font-family:${SANS_FONT}; font-size:12px; letter-spacing:0.3em;">${DIVIDER}</p>
                <p style="margin:16px 0 0; color:${IVORY}; font-family:${SERIF_FONT}; font-size:24px; font-weight:bold; letter-spacing:0.2em;">ARISTOLEGION</p>
                <p style="margin:12px 0 0; color:${IVORY_MUTED}; font-family:${SANS_FONT}; font-size:12px; line-height:1.6;">
                  Where Elegance Meets Strength.<br />Brilliance Meets Fortitude.
                </p>
                <p style="margin:16px 0 0; color:${GOLD}; font-family:${SANS_FONT}; font-size:12px; letter-spacing:0.3em;">${DIVIDER}</p>
              </td>
            </tr>
            <tr>
              <td style="background-color:${CARD_NAVY}; border:1px solid #3a3220; padding:40px 32px;">
                <p style="margin:0; color:${GOLD}; font-family:${SANS_FONT}; font-size:12px; font-weight:bold; letter-spacing:0.15em; text-transform:uppercase;">
                  ${escapeHtml(eyebrow)}
                </p>
                <p style="margin:16px 0 0; color:${IVORY}; font-family:${SERIF_FONT}; font-size:26px; font-weight:bold; line-height:1.3;">
                  ${escapeHtml(title)}
                </p>
                ${
                  subtitle
                    ? `<p style="margin:12px 0 0; color:${IVORY_MUTED}; font-family:${SANS_FONT}; font-size:15px; line-height:1.5;">${escapeHtml(subtitle)}</p>`
                    : ""
                }
                <p style="margin:24px 0 0; color:${BODY_TEXT}; font-family:${SANS_FONT}; font-size:15px; line-height:1.7;">
                  ${escapeHtmlWithLineBreaks(body)}
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px;">
                  <tr>
                    <td align="center" bgcolor="${GOLD}" style="border-radius:4px;">
                      <a
                        href="${buttonUrl}"
                        target="_blank"
                        style="display:inline-block; padding:14px 28px; font-family:${SANS_FONT}; font-size:14px; font-weight:bold; color:${NAVY_BACKGROUND}; text-decoration:none; letter-spacing:0.05em;"
                      >
                        ${escapeHtml(buttonText)}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:24px 16px 0;">
                <p style="margin:0; color:${IVORY_MUTED}; font-family:${SANS_FONT}; font-size:12px; line-height:1.6;">
                  You are receiving this because you subscribed to Aristolegion.
                </p>
                <p style="margin:8px 0 0; color:${IVORY_MUTED}; font-family:${SANS_FONT}; font-size:12px;">
                  © Aristolegion
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`.trim();
}
