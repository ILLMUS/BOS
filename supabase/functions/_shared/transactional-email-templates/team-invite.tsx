/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  fullName?: string
  orgName?: string
  email?: string
  password?: string | null
  loginUrl?: string | null
  magicLink?: string | null
}

const TeamInviteEmail = ({
  fullName,
  orgName = 'your team',
  email,
  password,
  loginUrl,
  magicLink,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You have been invited to join {orgName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>You've been added to {orgName}</Heading>
        <Text style={text}>
          {fullName ? `Hi ${fullName},` : 'Hello,'} an administrator has created an
          account for you on {orgName}. Use the details below to sign in.
        </Text>

        <Section style={card}>
          <Text style={label}>Email</Text>
          <Text style={value}>{email || '—'}</Text>
          {password ? (
            <>
              <Text style={label}>Temporary password</Text>
              <Text style={value}>{password}</Text>
            </>
          ) : (
            <Text style={muted}>
              Use your existing password, or the one-time sign-in button below.
            </Text>
          )}
        </Section>

        {magicLink ? (
          <Button style={button} href={magicLink}>
            Sign in now
          </Button>
        ) : loginUrl ? (
          <Button style={button} href={loginUrl}>
            Go to sign in
          </Button>
        ) : null}

        <Hr style={hr} />
        <Text style={footer}>
          For your security, change your password after your first sign-in. If you
          weren't expecting this invitation, you can ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TeamInviteEmail,
  subject: (data: Props) =>
    `You've been invited to join ${data?.orgName || 'the team'}`,
  displayName: 'Team invitation',
  previewData: {
    fullName: 'Jane Dlamini',
    orgName: 'RST Sealed',
    email: 'jane@example.com',
    password: 'Xk3Rt9PqW2Zm',
    loginUrl: 'https://rst-flow-forge.lovable.app/login',
    magicLink: 'https://rst-flow-forge.lovable.app/login',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#111111', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#44464b', lineHeight: '1.6', margin: '0 0 20px' }
const card = {
  border: '1px solid #e5e5e5',
  borderRadius: '4px',
  padding: '16px 18px',
  margin: '0 0 24px',
  backgroundColor: '#fafafa',
}
const label = {
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  color: '#8a8d93',
  margin: '0 0 4px',
}
const value = { fontSize: '15px', color: '#111111', fontWeight: 'bold' as const, margin: '0 0 14px' }
const muted = { fontSize: '13px', color: '#8a8d93', margin: '0' }
const button = {
  backgroundColor: '#111111',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '4px',
  padding: '12px 22px',
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#e5e5e5', margin: '28px 0 16px' }
const footer = { fontSize: '12px', color: '#999999', margin: '0' }
