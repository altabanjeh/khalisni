function FaqPage() {
  const items = [
    { q: 'هل يجب أن أزور الجهة الحكومية بنفسي؟', a: 'يعتمد ذلك على نوع الخدمة، لكن خلصني يغطي المتابعة والتنسيق والرفع والتسليم قدر الإمكان.' },
    { q: 'كيف أعرف الوثائق المطلوبة؟', a: 'لكل خدمة صفحة تفاصيل توضح الوثائق المطلوبة والمدة المتوقعة والرسوم.' },
    { q: 'كيف أتابع حالة طلبي؟', a: 'من صفحة تتبع الطلب باستخدام رقم الطلب ورقم الهاتف، أو من لوحة العميل بعد تسجيل الدخول.' },
    { q: 'هل يمكنني رفع وثائق إضافية بعد إنشاء الطلب؟', a: 'نعم، عند طلب وثائق إضافية ستظهر لك إمكانية الرفع من لوحة العميل.' },
  ]

  return (
    <div className="space-y-4">
      <div className="glass-panel p-6">
        <p className="text-sm font-bold text-brand-700">الأسئلة الشائعة</p>
        <h1 className="mt-2 text-3xl font-extrabold text-ink">إجابات سريعة قبل البدء</h1>
      </div>
      {items.map((item) => (
        <div key={item.q} className="glass-panel p-6">
          <h2 className="text-lg font-bold text-ink">{item.q}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">{item.a}</p>
        </div>
      ))}
    </div>
  )
}

export default FaqPage
