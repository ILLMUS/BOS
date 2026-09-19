import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendTemplateEmailLogged } from '../_shared/transactional-email-templates/send-and-log.ts'

// Emails a quote/invoice/receipt link to one client, triggered by a signed-in
// team member from the document preview dialog.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing authorization' }, 401)
    const { data: userData, error: userErr } = await admin.auth.getUser(
      authHeader.replace('Bearer ', ''),
    )
    if (userErr || !userData?.user) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') return json({ error: 'Invalid request body' }, 400)

    const str = (v: unknown, max = 500) =>
      typeof v === 'string' ? v.slice(0, max) : ''
    const recipient = str(body.recipientEmail, 320).trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      return json({ error: 'A valid client email address is required' }, 400)
    }
    const documentNumber = str(body.documentNumber, 64)
    if (!documentNumber) return json({ error: 'documentNumber is required' }, 400)

    const result = await sendTemplateEmailLogged('client-document', recipient, {
      idempotencyKey: str(body.idempotencyKey, 120) || `client-document-${documentNumber}`,
      templateData: {
        clientName: str(body.clientName, 160),
        businessName: str(body.businessName, 160),
        documentLabel: str(body.documentLabel, 60),
        documentNumber,
        amount: str(body.amount, 60),
        message: str(body.message, 2000),
        documentUrl: str(body.documentUrl, 2000),
      },
    })

    if (!result.sent) {
      return json({ success: false, reason: result.reason })
    }
    return json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not send the email'
    console.error('send-client-document error:', message)
    return json({ error: message }, 400)
  }
})
