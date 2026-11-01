import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import OrderConsentStatement from './OrderConsentStatement'
import { consentSegments, ORDER_CONSENT_TEXT, ORDER_CONSENT_VERSION } from '../utils/orderConsent'

test('the web form shows consent statement v2', () => {
  expect(ORDER_CONSENT_VERSION).toBe('order-consent-web-v2')
})

test('segments keep the exact recorded wording', () => {
  for (const language of ['ar', 'en']) {
    expect(consentSegments(language).map((segment) => segment.text).join('')).toBe(ORDER_CONSENT_TEXT[language])
  }
})

test('the Arabic statement links to the terms and the privacy policy', () => {
  const { container } = render(<MemoryRouter><OrderConsentStatement language="ar" /></MemoryRouter>)
  expect(container).toHaveTextContent(ORDER_CONSENT_TEXT.ar)
  expect(screen.getByRole('link', { name: 'شروط الاستخدام' })).toHaveAttribute('href', '/terms')
  expect(screen.getByRole('link', { name: 'سياسة الخصوصية' })).toHaveAttribute('href', '/privacy')
  expect(screen.getByRole('link', { name: 'سياسة الخصوصية' })).toHaveAttribute('target', '_blank')
})

test('the English statement links to the terms and the privacy policy', () => {
  const { container } = render(<MemoryRouter><OrderConsentStatement language="en" /></MemoryRouter>)
  expect(container).toHaveTextContent(ORDER_CONSENT_TEXT.en)
  expect(screen.getByRole('link', { name: 'Terms of Use' })).toHaveAttribute('href', '/terms')
  expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy')
})

test('the mobile v2 statement on the server has the same wording as the web statement', () => {
  const registry = readFileSync(resolve(__dirname, '../../../backend/orders/consent.py'), 'utf8')
  const mobile = registry.slice(registry.indexOf('"order-consent-mobile-v2"'))
  expect(mobile).toContain(`"ar": "${ORDER_CONSENT_TEXT.ar}"`)
  expect(mobile).toContain(`"en": "${ORDER_CONSENT_TEXT.en}"`)
})
