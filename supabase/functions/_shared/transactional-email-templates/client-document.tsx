import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  clientName?: string
  businessName?: string
  documentLabel?: string
  documentNumber?: string
  amount?: string
  message?: string
  documentUrl?: string
}

const Email = ({
  clientName, businessName, documentLabel, documentNumber, amount, message, documentUrl,
}: Props) => {
  const label = documentLabel || 'Document'
  const business = businessName || 'Our team'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`${label} ${documentNumber || ''} from ${business}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={eyebrow}>{business.toUpperCase()}</Text>
          <Heading style={heading}>
            {label}{documentNumber ? ` ${documentNumber}` : ''}
          </Heading>
          <Text style={text}>{clientName ? `Hi ${clientName},` : 'Hi there,'}</Text>
          <Text style={text}>
            {message || `Please find your ${label.toLowerCase()} attached via the link below.`}
          </Text>
          {amount ? (
            <Section style={totalBox}>
              <Text style={totalLabel}>Total</Text>
              <Text style={totalValue}>{amount}</Text>
            </Section>
          ) : null}
          {documentUrl ? (
            <Section style={{ margin: '24px 0' }}>
              <Button href={documentUrl} style={button}>View {label.toLowerCase()} (PDF)</Button>
            </Section>
          ) : null}
          <Text style={muted}>
            If you have any questions about this {label.toLowerCase()}, simply reply to this email.
          </Text>
          <Text style={muted}>{business}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (data: Props) =>
    `${data?.documentLabel || 'Document'} ${data?.documentNumber || ''} from ${data?.businessName || 'our team'}`.replace(/\s+/g, ' ').trim(),
  displayName: 'Client document (quote / invoice / receipt)',
  previewData: {
    clientName: 'Thabo',
    businessName: 'RST Sealed',
    documentLabel: 'Invoice',
    documentNumber: 'INV-0001',
    amount: 'E 12,500.00',
    message: 'Please find your invoice for the completed work.',
    documentUrl: 'https://example.com/invoice.pdf',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '28px 26px', maxWidth: '560px', border: '1px solid #e5e7eb' }
const eyebrow = { fontSize: '11px', letterSpacing: '2px', color: '#6b7280', margin: '0 0 6px' }
const heading = { fontSize: '22px', color: '#1f2933', margin: '0 0 18px', fontWeight: 700 }
const text = { fontSize: '14px', lineHeight: '22px', color: '#1f2933', margin: '0 0 12px' }
const muted = { fontSize: '12px', lineHeight: '18px', color: '#6b7280', margin: '0 0 6px' }
const totalBox = { border: '1px solid #e5e7eb', padding: '12px 14px', margin: '16px 0' }
const totalLabel = { fontSize: '11px', letterSpacing: '1px', color: '#6b7280', margin: '0' }
const totalValue = { fontSize: '20px', fontWeight: 700, color: '#1f2933', margin: '4px 0 0' }
const button = {
  backgroundColor: '#ea580c', color: '#ffffff', fontSize: '14px', fontWeight: 700,
  padding: '12px 20px', textDecoration: 'none', display: 'inline-block',
}
