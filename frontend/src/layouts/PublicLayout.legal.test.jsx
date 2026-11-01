// Total closure (D05/D06): footer legal links in both languages, and the
// published contact block with WhatsApp (wa.me, digits only) and office hours.
import { afterEach, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import PublicLayout from './PublicLayout'
import { api } from '../api/services'
import { LanguageProvider } from '../context/LanguageContext'
import { LANGUAGE_STORAGE_KEY } from '../utils/i18n'

vi.mock('../context/AuthContext', async () => {
  const actual = await vi.importActual('../context/AuthContext')
  return { ...actual, useAuth: () => ({ user: null }) }
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

const blank = {
  contact_phone: '', whatsapp_number: '', email: '', office_address: '', office_address_en: '',
  office_hours_ar: '', office_hours_en: '',
}

function renderLayout(content, language) {
  if (language) localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  vi.spyOn(api, 'getPublicHomepage').mockResolvedValue({ content, advertisements: [], important_alert: null })
  return render(
    <LanguageProvider>
      <MemoryRouter initialEntries={['/']}>
        <Routes><Route element={<PublicLayout />}><Route index element={<p>home</p>} /></Route></Routes>
      </MemoryRouter>
    </LanguageProvider>,
  )
}

test('the footer links to the privacy policy and the terms of use in Arabic', async () => {
  renderLayout({ ...blank })
  await waitFor(() => expect(screen.getByText('معلومات التواصل غير منشورة حالياً.')).toBeInTheDocument())
  expect(screen.getByRole('link', { name: 'سياسة الخصوصية' })).toHaveAttribute('href', '/privacy')
  expect(screen.getByRole('link', { name: 'شروط الاستخدام' })).toHaveAttribute('href', '/terms')
})

test('the footer links to the privacy policy and the terms of use in English', async () => {
  renderLayout({ ...blank }, 'en')
  await waitFor(() => expect(screen.getByText('Contact details are not published yet.')).toBeInTheDocument())
  expect(screen.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', '/privacy')
  expect(screen.getByRole('link', { name: 'Terms of use' })).toHaveAttribute('href', '/terms')
})

test('published WhatsApp is a wa.me link with digits only and hours are shown in the page language', async () => {
  renderLayout({ ...blank, whatsapp_number: '+962 79 552 7381', office_hours_ar: 'الأحد - الخميس', office_hours_en: 'Sunday - Thursday' })
  const whatsapp = await screen.findByText('+962 79 552 7381')
  expect(whatsapp.closest('a')).toHaveAttribute('href', 'https://wa.me/962795527381')
  expect(screen.getByText('الأحد - الخميس')).toBeInTheDocument()
  expect(screen.queryByText('Sunday - Thursday')).not.toBeInTheDocument()
  expect(screen.queryByText('معلومات التواصل غير منشورة حالياً.')).not.toBeInTheDocument()
})

test('a 00-prefixed WhatsApp number drops the international prefix in the wa.me link', async () => {
  renderLayout({ ...blank, whatsapp_number: '00962 79 552 7381', office_hours_en: 'Sunday - Thursday' }, 'en')
  const whatsapp = await screen.findByText('00962 79 552 7381')
  expect(whatsapp.closest('a')).toHaveAttribute('href', 'https://wa.me/962795527381')
  expect(screen.getByText('Sunday - Thursday')).toBeInTheDocument()
})
