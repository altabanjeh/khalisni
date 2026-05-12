import { UserRound } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import PageHeader from '../../components/PageHeader'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../api/services'

function ProfilePage() {
  const { user, setUser } = useAuth()
  const [saved, setSaved] = useState(false)
  const { register, handleSubmit } = useForm({
    defaultValues: {
      full_name: user?.full_name,
      phone: user?.phone,
      email: user?.email,
      national_id: user?.national_id,
    },
  })

  async function onSubmit(values) {
    const updated = await api.updateProfile(values)
    setUser((current) => ({ ...current, ...updated }))
    setSaved(true)
  }

  return (
    <div className="page-section">
      <PageHeader
        description="تحديث معلومات الحساب المستخدمة في الطلبات والإشعارات."
        eyebrow="الملف الشخصي"
        icon={UserRound}
        title="بيانات العميل"
      />

      <div className="glass-panel p-6">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="mb-2 block text-sm font-semibold">الاسم</label>
            <input className="field" {...register('full_name')} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold">الهاتف</label>
            <input className="field" {...register('phone')} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold">البريد الإلكتروني</label>
            <input className="field" {...register('email')} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold">الرقم الوطني</label>
            <input className="field" {...register('national_id')} />
          </div>
          <div className="md:col-span-2">
            <button className="btn-primary">حفظ التعديلات</button>
          </div>
        </form>
        {saved ? <p className="mt-4 text-sm text-success">تم تحديث البيانات.</p> : null}
      </div>
    </div>
  )
}

export default ProfilePage
