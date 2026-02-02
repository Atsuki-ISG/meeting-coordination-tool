import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendInvitationEmailParams {
  to: string;
  inviterName: string;
  teamName: string;
  bookingUrl: string;
  note?: string;
}

export async function sendInvitationEmail({
  to,
  inviterName,
  teamName,
  bookingUrl,
  note,
}: SendInvitationEmailParams) {
  const fromEmail = process.env.EMAIL_FROM || 'noreply@example.com';

  try {
    const { data, error } = await resend.emails.send({
      from: `${teamName} <${fromEmail}>`,
      to: [to],
      subject: `【${teamName}】予約ページへの招待`,
      html: `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">
                ${teamName}
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
                予約ページへの招待
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px; background-color: #ffffff; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
                ${to} 様
              </p>

              <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
                ${inviterName} さんから、${teamName} の予約ページへの招待が届きました。
              </p>

              ${note ? `
              <div style="margin: 20px 0; padding: 16px; background-color: #f1f5f9; border-radius: 8px;">
                <p style="margin: 0; color: #475569; font-size: 14px;">
                  <strong>メッセージ:</strong><br>
                  ${note}
                </p>
              </div>
              ` : ''}

              <p style="margin: 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
                以下のボタンをクリックして、ご都合の良い日時を予約してください。
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 24px 0;">
                    <a href="${bookingUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 12px; box-shadow: 0 4px 14px -3px rgba(37, 99, 235, 0.5);">
                      予約ページを開く
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                このリンクはあなた専用の招待リンクです。他の方とは共有しないでください。
              </p>

              <!-- Link fallback -->
              <div style="margin: 24px 0; padding: 16px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px;">
                  ボタンがクリックできない場合は、以下のURLをコピーしてブラウザに貼り付けてください:
                </p>
                <p style="margin: 0; color: #3b82f6; font-size: 12px; word-break: break-all;">
                  ${bookingUrl}
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; text-align: center;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                Powered by MeetFlow
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error('Failed to send invitation email:', error);
      throw error;
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
}
