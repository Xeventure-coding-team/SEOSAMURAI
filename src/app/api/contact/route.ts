import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const { category, subject, description, email } = await request.json();

    // Configure Mailtrap transporter
    const transporter = nodemailer.createTransport({
      host: process.env.MAILTRAP_HOST,
      port: Number(process.env.MAILTRAP_PORT),
      auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS,
      },
    });

    const currentDateTime = new Date().toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short'
    });

    const ticketId = `TKT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Professional minimal HTML email template with centered footer
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Support Request #${ticketId}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #f6f8fa; line-height: 1.5;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f6f8fa; padding: 48px 24px;">
             <tr>
              <td align="center">
                <!-- Main Container -->
                <table width="100%" max-width="600px" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
                  
                  <!-- Header with Logo -->
                  <tr>
                    <td style="padding: 32px 32px 0 32px;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td>
                            <span style="font-size: 24px; font-weight: 700; color: #111827; letter-spacing: -0.3px;">Rankerly</span>
                            <span style="font-size: 16px; font-weight: 400; color: #6b7280; margin-left: 8px;">Support</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-top: 8px;">
                            <span style="font-size: 13px; color: #6b7280; font-family: monospace;">${ticketId}</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Divider -->
                  <tr>
                    <td style="padding: 24px 32px 0 32px;">
                      <div style="height: 1px; background-color: #e5e7eb;"></div>
                    </td>
                  </tr>
                  
                  <!-- Request Details -->
                  <tr>
                    <td style="padding: 24px 32px 0 32px;">
                      <!-- From -->
                      <div style="margin-bottom: 20px;">
                        <div style="font-size: 11px; font-weight: 500; color: #6b7280; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 8px;">From</div>
                        <div style="font-size: 15px; color: #111827;">${email}</div>
                      </div>
                      
                      <!-- Category -->
                      <div style="margin-bottom: 20px;">
                        <div style="font-size: 11px; font-weight: 500; color: #6b7280; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 8px;">Category</div>
                        <div style="display: inline-block;">
                          <span style="display: inline-block; background-color: #f3f4f6; color: #374151; font-size: 13px; padding: 4px 12px; border-radius: 20px; font-weight: 500;">
                            ${category}
                          </span>
                        </div>
                      </div>
                      
                      <!-- Subject -->
                      <div style="margin-bottom: 24px;">
                        <div style="font-size: 11px; font-weight: 500; color: #6b7280; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 8px;">Subject</div>
                        <div style="font-size: 16px; color: #111827; font-weight: 500;">${subject}</div>
                      </div>
                      
                      <!-- Description -->
                      <div style="margin-bottom: 0;">
                        <div style="font-size: 11px; font-weight: 500; color: #6b7280; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 12px;">Description</div>
                        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
                          <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6; white-space: pre-wrap;">${description}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Action Button -->
                  <tr>
                    <td style="padding: 32px 32px 0 32px;">
                      <a href="mailto:${email}?subject=Re: ${subject}" style="display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; border: none; cursor: pointer;">
                        Reply to customer
                      </a>
                    </td>
                  </tr>
                  
                  <!-- Divider -->
                  <tr>
                    <td style="padding: 32px 32px 0 32px;">
                      <div style="height: 1px; background-color: #e5e7eb;"></div>
                    </td>
                  </tr>
                  
                  <!-- Footer - Centered -->
                  <tr>
                    <td style="padding: 24px 32px 32px 32px;">
                      <div style="text-align: center;">
                        <div style="font-size: 12px; color: #6b7280; margin-bottom: 12px;">
                          <span style="font-weight: 500;">Submitted:</span> ${currentDateTime}
                        </div>
                        <div style="font-size: 12px; color: #6b7280; margin-bottom: 20px;">
                          <span style="font-weight: 500;">Priority:</span> Normal
                        </div>
                        <div style="font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                          <p style="margin: 0 0 8px 0;">This is an automated message from Rankerly support.</p>
                          <p style="margin: 0;">© ${new Date().getFullYear()} Rankerly. All rights reserved.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

    // Clean plain text version with proper formatting
    const textContent = `
RANKERLY SUPPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ticket ID: ${ticketId}

FROM
${email}

CATEGORY
${category}

SUBJECT
${subject}

DESCRIPTION
${description}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Submitted: ${currentDateTime}
Priority: Normal
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is an automated message from Rankerly support.
© ${new Date().getFullYear()} Rankerly. All rights reserved.
    `;

    // Send email
    await transporter.sendMail({
      from: '"Rankerly Support" <support@rankerly.com>',
      to: "support@rankerly.com",
      subject: `[${category}] ${subject} (${ticketId})`,
      html: emailHtml,
      text: textContent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 },
    );
  }
}