import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AdminSoftDeleteModal from './AdminSoftDeleteModal'
import { LanguageProvider } from '../context/LanguageContext'

function renderModal(props) {
  window.localStorage.setItem('khalisni-language', 'ar')
  return render(
    <LanguageProvider>
      <AdminSoftDeleteModal open title="حذف الخدمة: طلب سند تسجيل" impact="ستختفي الخدمة من الموقع العام ويمكن استرجاعها لاحقاً." requireReason {...props} />
    </LanguageProvider>,
  )
}

describe('AdminSoftDeleteModal (SD1-SD8)', () => {
  it('shows the record and its impact, and refuses to confirm without a reason', async () => {
    const onConfirm = vi.fn()
    renderModal({ onConfirm, onClose: vi.fn() })
    expect(screen.getByText('حذف الخدمة: طلب سند تسجيل')).toBeInTheDocument()
    expect(screen.getByText('ستختفي الخدمة من الموقع العام ويمكن استرجاعها لاحقاً.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد الحذف' }))
    expect(await screen.findByText('سبب الحذف مطلوب.')).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('sends the trimmed reason and the password to the delete guard', async () => {
    const onConfirm = vi.fn()
    renderModal({ onConfirm, onClose: vi.fn() })
    fireEvent.change(screen.getByPlaceholderText('اكتب سبب الحذف لأغراض التدقيق والاسترجاع.'), { target: { value: '  خدمة مكررة  ' } })
    fireEvent.change(screen.getByPlaceholderText('أدخل كلمة مرور الحذف إذا كانت مفعلة.'), { target: { value: 'secret-value' } })
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد الحذف' }))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith({ delete_reason: 'خدمة مكررة', delete_password: 'secret-value' }))
  })
})
