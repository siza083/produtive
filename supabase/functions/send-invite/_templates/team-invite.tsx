import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Button,
  Section,
  Hr,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface TeamInviteEmailProps {
  teamName: string
  inviteLink: string
  inviterName?: string
}

export const TeamInviteEmail = ({
  teamName,
  inviteLink,
  inviterName,
}: TeamInviteEmailProps) => (
  <Html>
    <Head />
    <Preview>Convite para ${teamName} — Produtive</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Você foi convidado para o time!</Heading>
        
        <Text style={text}>
          {inviterName ? `${inviterName} convidou você` : 'Você foi convidado'} para fazer parte do time <strong>{teamName}</strong> no Produtive.
        </Text>
        
        <Section style={buttonContainer}>
          <Button style={button} href={inviteLink}>
            Aceitar Convite
          </Button>
        </Section>
        
        <Text style={text}>
          Ou copie e cole este link no seu navegador:
        </Text>
        
        <Text style={linkText}>
          {inviteLink}
        </Text>
        
        <Hr style={hr} />
        
        <Text style={footer}>
          Se você não esperava este convite, pode ignorar este e-mail com segurança.
        </Text>
        
        <Text style={footer}>
          <Link href="https://produtive.lovable.app" style={link}>
            Produtive
          </Link>
          — Gerencie suas equipes e projetos com eficiência.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default TeamInviteEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  textAlign: 'left' as const,
  padding: '0 40px',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#000',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '200px',
  padding: '12px 16px',
  margin: '0 auto',
}

const linkText = {
  color: '#666',
  fontSize: '14px',
  padding: '0 40px',
  wordBreak: 'break-all' as const,
}

const link = {
  color: '#067df7',
  textDecoration: 'underline',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
}

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '0 40px',
  textAlign: 'center' as const,
}