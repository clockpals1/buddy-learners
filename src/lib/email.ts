import { supabase } from "@/integrations/supabase/client";

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

async function getResendApiKey(): Promise<string | null> {
  const { data } = await supabase
    .from("integration_settings")
    .select("value")
    .eq("key", "RESEND_API_KEY")
    .maybeSingle();
  return data?.value ?? null;
}

async function getFromAddress(): Promise<string> {
  const { data } = await supabase
    .from("integration_settings")
    .select("value")
    .eq("key", "EMAIL_FROM_ADDRESS")
    .maybeSingle();
  return data?.value ?? "support@leafva.ca";
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  const apiKey = await getResendApiKey();
  if (!apiKey) {
    return { success: false, error: "Resend API key not configured" };
  }

  const from = options.from ?? await getFromAddress();

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// AI-generated email templates
export const emailTemplates = {
  welcome: (parentName: string, childName: string): EmailTemplate => ({
    subject: `Welcome to Leafva Academy, ${parentName}! 🎉`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to Leafva Academy!</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="color: #374151; font-size: 16px;">Hi ${parentName},</p>
          <p style="color: #374151; font-size: 16px;">We're thrilled to welcome you and <strong>${childName}</strong> to the Leafva Academy family! 🚀</p>
          <p style="color: #374151; font-size: 16px;">Your child's learning adventure is about to begin. Here's what you can expect:</p>
          <ul style="color: #374151; font-size: 16px; line-height: 1.8;">
            <li>✨ Interactive coding lessons tailored to their age</li>
            <li>🎮 Fun games and challenges to reinforce learning</li>
            <li>👥 Live sessions with experienced instructors</li>
            <li>🏆 Badges and achievements to celebrate progress</li>
          </ul>
          <p style="color: #374151; font-size: 16px;">Log in to your parent portal to get started:</p>
          <a href="${process.env.APP_URL || 'https://leafva-academy.workers.dev'}/portal" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Go to Parent Portal</a>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">If you have any questions, just reply to this email. We're here to help!</p>
          <p style="color: #6b7280; font-size: 14px;">Warm regards,<br>The Leafva Academy Team</p>
        </div>
      </div>
    `,
  }),

  enrollmentConfirmation: (parentName: string, childName: string, planName: string): EmailTemplate => ({
    subject: `Enrollment Confirmed: ${childName} is enrolled in ${planName} 📚`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">Enrollment Confirmed!</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="color: #374151; font-size: 16px;">Hi ${parentName},</p>
          <p style="color: #374151; font-size: 16px;">Great news! <strong>${childName}</strong> is now enrolled in the <strong>${planName}</strong> plan.</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <p style="color: #374151; font-size: 16px; margin: 0;"><strong>What's next?</strong></p>
            <ul style="color: #374151; font-size: 16px; line-height: 1.8; margin-top: 10px;">
              <li>📝 Complete the child's profile in the portal</li>
              <li>🎯 Choose their learning track (Explorers, Juniors, or Scholars)</li>
              <li>🚀 Start their first lesson today!</li>
            </ul>
          </div>
          <a href="${process.env.APP_URL || 'https://leafva-academy.workers.dev'}/portal" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Manage Enrollment</a>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Questions? We're just an email away.</p>
          <p style="color: #6b7280; font-size: 14px;">Best,<br>The Leafva Academy Team</p>
        </div>
      </div>
    `,
  }),

  lessonReminder: (childName: string, lessonTitle: string, dueDate: string): EmailTemplate => ({
    subject: `📚 Reminder: ${lessonTitle} is due soon!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">Lesson Reminder</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="color: #374151; font-size: 16px;">Hi there,</p>
          <p style="color: #374151; font-size: 16px;">Just a friendly reminder that <strong>${childName}</strong> has a lesson due:</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #374151; font-size: 18px; font-weight: bold; margin: 0;">${lessonTitle}</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 5px;">Due: ${dueDate}</p>
          </div>
          <a href="${process.env.APP_URL || 'https://leafva-academy.workers.dev'}/portal" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Go to Lesson</a>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Keep up the great work!</p>
          <p style="color: #6b7280; font-size: 14px;">The Leafva Academy Team</p>
        </div>
      </div>
    `,
  }),

  achievementUnlocked: (childName: string, badgeName: string, badgeDescription: string): EmailTemplate => ({
    subject: `🏆 ${childName} unlocked a new badge!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">🏆 Achievement Unlocked!</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="color: #374151; font-size: 16px;">Congratulations!</p>
          <p style="color: #374151; font-size: 16px;"><strong>${childName}</strong> has earned a new badge:</p>
          <div style="background: white; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 10px;">🎖️</div>
            <h2 style="color: #7c3aed; font-size: 24px; margin: 0;">${badgeName}</h2>
            <p style="color: #6b7280; font-size: 14px; margin-top: 10px;">${badgeDescription}</p>
          </div>
          <a href="${process.env.APP_URL || 'https://leafva-academy.workers.dev'}/portal" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View All Badges</a>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Amazing work! Keep it up!</p>
          <p style="color: #6b7280; font-size: 14px;">The Leafva Academy Team</p>
        </div>
      </div>
    `,
  }),

  paymentFailed: (parentName: string, planName: string): EmailTemplate => ({
    subject: `⚠️ Payment Failed for ${planName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">Payment Failed</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="color: #374151; font-size: 16px;">Hi ${parentName},</p>
          <p style="color: #374151; font-size: 16px;">We were unable to process your payment for the <strong>${planName}</strong> plan.</p>
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <p style="color: #991b1b; font-size: 16px; margin: 0;"><strong>What to do:</strong></p>
            <ul style="color: #991b1b; font-size: 16px; line-height: 1.8; margin-top: 10px;">
              <li>💳 Check your payment method is valid</li>
              <li>🔄 Update your payment information in the portal</li>
              <li>📧 Contact us if the issue persists</li>
            </ul>
          </div>
          <a href="${process.env.APP_URL || 'https://leafva-academy.workers.dev'}/portal" style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Update Payment</a>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">We'll retry the payment in 3 days. Please update your info before then.</p>
          <p style="color: #6b7280; font-size: 14px;">Questions? Reply to this email.</p>
          <p style="color: #6b7280; font-size: 14px;">The Leafva Academy Team</p>
        </div>
      </div>
    `,
  }),
};
