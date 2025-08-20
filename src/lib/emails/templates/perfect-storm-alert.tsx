import * as React from 'react';
import {
  Body,
  Button,
  Container,
  Column,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components';

interface PerfectStormAlertEmailProps {
  userName: string;
  stockSymbol: string;
  stockName: string;
  currentPrice: number;
  stockBeaconScore: number;
  triggers: {
    priceTarget: boolean;
    scoreThreshold: boolean;
    technicalSignal: boolean;
    fundamentalStrength: boolean;
  };
  moatStrength: 'Strong' | 'Moderate' | 'Weak';
  recommendation: string;
  strengths: string[];
}

export default function PerfectStormAlertEmail({
  userName = 'Investor',
  stockSymbol = 'AAPL',
  stockName = 'Apple Inc.',
  currentPrice = 150.00,
  stockBeaconScore = 85,
  triggers = {
    priceTarget: true,
    scoreThreshold: true,
    technicalSignal: true,
    fundamentalStrength: true,
  },
  moatStrength = 'Strong',
  recommendation = 'All your buy criteria have been met. This stock is showing exceptional strength across all metrics.',
  strengths = [
    'Strong financial health with ROE above 20%',
    'Trading near key support level',
    'Revenue growing at 15% annually',
  ],
}: PerfectStormAlertEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://stockbeacon.app';
  
  return (
    <Html>
      <Head />
      <Preview>🚨 Perfect Storm Alert: {stockSymbol} meets all your buy criteria!</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Row>
              <Column>
                <Heading style={h1}>🎯 StockBeacon</Heading>
              </Column>
            </Row>
          </Section>

          {/* Alert Badge */}
          <Section style={alertSection}>
            <div style={alertBadge}>
              ⚡ PERFECT STORM ALERT
            </div>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Text style={greeting}>Hi {userName},</Text>
            
            <Heading style={h2}>
              {stockName} ({stockSymbol}) is showing a Perfect Storm signal!
            </Heading>
            
            <Text style={paragraph}>
              Great news! All your watchlist criteria have been met for <strong>{stockSymbol}</strong>.
              This is the signal you've been waiting for.
            </Text>

            {/* Stock Score Card */}
            <Section style={scoreCard}>
              <Row>
                <Column style={scoreColumn}>
                  <Text style={scoreLabel}>Current Price</Text>
                  <Text style={scoreValue}>${currentPrice.toFixed(2)}</Text>
                </Column>
                <Column style={scoreColumn}>
                  <Text style={scoreLabel}>StockBeacon Score</Text>
                  <Text style={scoreValueHighlight}>{stockBeaconScore}/100</Text>
                </Column>
                <Column style={scoreColumn}>
                  <Text style={scoreLabel}>Moat Strength</Text>
                  <Text style={scoreValue}>{moatStrength}</Text>
                </Column>
              </Row>
            </Section>

            {/* Triggers Met */}
            <Section style={triggersSection}>
              <Heading style={h3}>✅ All Triggers Met:</Heading>
              <div style={triggersList}>
                {triggers.priceTarget && (
                  <div style={triggerItem}>
                    <span style={checkmark}>✓</span> Price reached your target level
                  </div>
                )}
                {triggers.scoreThreshold && (
                  <div style={triggerItem}>
                    <span style={checkmark}>✓</span> StockBeacon Score above threshold
                  </div>
                )}
                {triggers.technicalSignal && (
                  <div style={triggerItem}>
                    <span style={checkmark}>✓</span> Technical indicators aligned
                  </div>
                )}
                {triggers.fundamentalStrength && (
                  <div style={triggerItem}>
                    <span style={checkmark}>✓</span> Strong fundamental metrics
                  </div>
                )}
              </div>
            </Section>

            {/* Key Strengths */}
            <Section style={strengthsSection}>
              <Heading style={h3}>🎯 Key Strengths:</Heading>
              {strengths.map((strength, index) => (
                <Text key={index} style={strengthItem}>
                  • {strength}
                </Text>
              ))}
            </Section>

            {/* Recommendation */}
            <Section style={recommendationSection}>
              <Text style={recommendationText}>
                <strong>Our Analysis:</strong> {recommendation}
              </Text>
            </Section>

            {/* CTA Button */}
            <Section style={buttonContainer}>
              <Button
                style={button}
                href={`${baseUrl}/stocks/${stockSymbol}`}
              >
                View Full Analysis →
              </Button>
            </Section>

            {/* Disclaimer */}
            <Text style={disclaimer}>
              This alert is based on your configured criteria. Always do your own research before making investment decisions.
              Past performance doesn't guarantee future results.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Row>
              <Column>
                <Link href={`${baseUrl}/watchlist`} style={footerLink}>
                  Manage Watchlist
                </Link>
                <Text style={footerDivider}>•</Text>
                <Link href={`${baseUrl}/settings/notifications`} style={footerLink}>
                  Alert Settings
                </Link>
                <Text style={footerDivider}>•</Text>
                <Link href={`${baseUrl}/unsubscribe`} style={footerLink}>
                  Unsubscribe
                </Link>
              </Column>
            </Row>
            <Text style={footerText}>
              © 2024 StockBeacon. Making investing simple and confident.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '24px 32px',
  backgroundColor: '#1a1f2e',
};

const h1 = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '32px',
  margin: '0',
};

const alertSection = {
  padding: '20px 32px',
  textAlign: 'center' as const,
};

const alertBadge = {
  display: 'inline-block',
  backgroundColor: '#10b981',
  color: '#ffffff',
  padding: '8px 20px',
  borderRadius: '20px',
  fontSize: '14px',
  fontWeight: '600',
  letterSpacing: '0.5px',
};

const content = {
  padding: '0 32px',
};

const greeting = {
  fontSize: '16px',
  lineHeight: '24px',
  marginBottom: '8px',
  color: '#484848',
};

const h2 = {
  color: '#1a1f2e',
  fontSize: '20px',
  fontWeight: '600',
  lineHeight: '28px',
  marginBottom: '16px',
};

const h3 = {
  color: '#1a1f2e',
  fontSize: '16px',
  fontWeight: '600',
  lineHeight: '24px',
  marginBottom: '12px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  marginBottom: '24px',
  color: '#484848',
};

const scoreCard = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '20px',
  marginBottom: '24px',
};

const scoreColumn = {
  textAlign: 'center' as const,
  paddingRight: '20px',
};

const scoreLabel = {
  fontSize: '12px',
  color: '#6b7280',
  marginBottom: '4px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const scoreValue = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#1a1f2e',
  margin: '0',
};

const scoreValueHighlight = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#10b981',
  margin: '0',
};

const triggersSection = {
  marginBottom: '24px',
};

const triggersList = {
  backgroundColor: '#f0fdf4',
  borderRadius: '8px',
  padding: '16px',
};

const triggerItem = {
  fontSize: '14px',
  lineHeight: '20px',
  marginBottom: '8px',
  color: '#065f46',
};

const checkmark = {
  color: '#10b981',
  fontWeight: '700',
  marginRight: '8px',
};

const strengthsSection = {
  marginBottom: '24px',
};

const strengthItem = {
  fontSize: '14px',
  lineHeight: '20px',
  marginBottom: '8px',
  color: '#484848',
};

const recommendationSection = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '32px',
};

const recommendationText = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#92400e',
  margin: '0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  marginBottom: '32px',
};

const button = {
  backgroundColor: '#1a1f2e',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
};

const disclaimer = {
  fontSize: '12px',
  lineHeight: '18px',
  color: '#9ca3af',
  marginBottom: '32px',
  fontStyle: 'italic',
};

const footer = {
  padding: '32px',
  backgroundColor: '#f9fafb',
  borderTop: '1px solid #e5e7eb',
};

const footerLink = {
  color: '#6b7280',
  fontSize: '12px',
  textDecoration: 'none',
  marginRight: '8px',
};

const footerDivider = {
  display: 'inline',
  color: '#9ca3af',
  margin: '0 8px',
};

const footerText = {
  fontSize: '12px',
  color: '#9ca3af',
  marginTop: '16px',
  textAlign: 'center' as const,
};
