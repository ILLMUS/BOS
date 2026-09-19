import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  sendTemplateEmail,
  type SendTemplateEmailOptions,
  type SendTemplateEmailResult,
} from './send-email.ts'

// Sends a registered template through Lovable's managed email API and records
// the outcome in the project's own email_send_log table (notification only —
// it never gates a send).
export async function sendTemplateEmailLogged(
  templateName: string,
  to: string,
  options: SendTemplateEmailOptions = {},
): Promise<SendTemplateEmailResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const supabase = supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey) : null

  const log = async (status: string, errorMessage?: string) => {
    if (!supabase) return
    const { error } = await supabase.from('email_send_log').insert({
      message_id: null,
      template_name: templateName,
      recipient_email: to,
      status,
      ...(errorMessage ? { error_message: errorMessage } : {}),
    })
    if (error) {
      console.warn('Failed to write email_send_log', { code: error.code, message: error.message })
    }
  }

  try {
    const result = await sendTemplateEmail(templateName, to, options)
    if (result.sent) {
      await log('sent')
    } else {
      await log('suppressed', 'Recipient is suppressed')
    }
    return result
  } catch (error) {
    await log('failed', error instanceof Error ? error.message : 'Unknown send error')
    throw error
  }
}
