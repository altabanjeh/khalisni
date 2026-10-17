# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: axe-auth.spec.js >> axe (employee) /employee/documents/verify
- Location: e2e\axe-auth.spec.js:13:5

# Error details

```
Error: color-contrast (serious): Elements must meet minimum color contrast ratio thresholds

expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 58

- Array []
+ Array [
+   Object {
+     "description": "Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds",
+     "help": "Elements must meet minimum color contrast ratio thresholds",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.13/color-contrast?application=playwright",
+     "id": "color-contrast",
+     "impact": "serious",
+     "nodes": Array [
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#eff6ff",
+               "contrastRatio": 4.37,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#64748b",
+               "fontSize": "9.0pt (12px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.37 (foreground color: #64748b, background color: #eff6ff, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<button class=\"kh-focusable w-full rounded-[var(--radius-lg)] border p-3 text-start transition border-brand-400 bg-brand-50\" type=\"button\">",
+                 "target": Array [
+                   ".border-brand-400",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 4.37 (foreground color: #64748b, background color: #eff6ff, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<p class=\"mt-1 text-xs font-semibold text-slate-500\">#KH-2026-000014 · client-audit-qa-202610-authorization</p>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".border-brand-400 > .mt-1.text-slate-500.text-xs",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.color",
+       "wcag2aa",
+       "wcag143",
+       "TTv5",
+       "TT13.c",
+       "EN-301-549",
+       "EN-9.1.4.3",
+       "ACT",
+       "RGAAv4",
+       "RGAA-3.2.1",
+     ],
+   },
+ ]
```

# Page snapshot

```yaml
- generic [ref=e5]:
  - complementary "بوابة الموظف" [ref=e6]:
    - generic [ref=e7]:
      - generic [ref=e8]:
        - link "خلصني" [ref=e9] [cursor=pointer]:
          - /url: /
          - img "خلصني" [ref=e10]
        - link "خلصني" [ref=e11] [cursor=pointer]:
          - /url: /
          - img "خلصني" [ref=e12]
      - button "إغلاق القائمة" [ref=e13] [cursor=pointer]
    - generic [ref=e17]:
      - paragraph [ref=e18]: بوابة العمل
      - paragraph [ref=e19]: بوابة الموظف
    - navigation [ref=e20]:
      - generic [ref=e21]:
        - paragraph [ref=e22]: نظرة عامة
        - link "الرئيسية" [ref=e24] [cursor=pointer]:
          - /url: /employee
      - generic [ref=e32]:
        - paragraph [ref=e33]: العمليات
        - generic [ref=e34]:
          - link "قائمة المراجعة" [ref=e35] [cursor=pointer]:
            - /url: /employee/orders
          - link "طلبات خدمات جديدة" [ref=e43] [cursor=pointer]:
            - /url: /employee/missing-service-requests
          - link "التحقق من الوثائق" [ref=e48] [cursor=pointer]:
            - /url: /employee/documents/verify
      - generic [ref=e54]:
        - paragraph [ref=e55]: التقارير والتدقيق
        - link "تقارير الموظف" [ref=e57] [cursor=pointer]:
          - /url: /employee/reports
      - generic [ref=e63]:
        - paragraph [ref=e64]: الإعدادات
        - link "الدليل" [ref=e66] [cursor=pointer]:
          - /url: /employee/manual
  - generic [ref=e71]:
    - banner [ref=e72]:
      - generic [ref=e73]:
        - button "فتح القائمة الجانبية" [ref=e74] [cursor=pointer]
        - heading "بوابة الموظف" [level=2] [ref=e77]
      - generic [ref=e78]:
        - button "الإشعارات" [ref=e80] [cursor=pointer]
        - button "المزيد من الخيارات" [ref=e84] [cursor=pointer]
    - generic [ref=e88]:
      - banner [ref=e89]:
        - paragraph [ref=e90]: العمليات
        - heading "التحقق من الوثائق" [level=1] [ref=e91]
        - paragraph [ref=e95]: راجع كل ملف مرفوع، تحقق من وضوحه ومطابقته لنوع الخدمة، ثم اعتمده أو ارفضه بسبب واضح.
      - generic [ref=e96]:
        - complementary [ref=e97]:
          - paragraph [ref=e98]: بانتظار التحقق (5)
          - 'button "authorization.pdf مرفوع #KH-2026-000014 · client-audit-qa-202610-authorization" [ref=e99] [cursor=pointer]':
            - generic [ref=e100]:
              - paragraph [ref=e101]: authorization.pdf
              - generic [ref=e102]: مرفوع
            - paragraph [ref=e107]: "#KH-2026-000014 · client-audit-qa-202610-authorization"
          - 'button "authorization.pdf مرفوع #KH-2026-000013 · client-audit-qa-202610-authorization" [ref=e108] [cursor=pointer]':
            - generic [ref=e109]:
              - paragraph [ref=e110]: authorization.pdf
              - generic [ref=e111]: مرفوع
            - paragraph [ref=e116]: "#KH-2026-000013 · client-audit-qa-202610-authorization"
          - 'button "qa-valid.pdf مرفوع #KH-2026-000009 · client-audit-qa-202610-authorization" [ref=e117] [cursor=pointer]':
            - generic [ref=e118]:
              - paragraph [ref=e119]: qa-valid.pdf
              - generic [ref=e120]: مرفوع
            - paragraph [ref=e125]: "#KH-2026-000009 · client-audit-qa-202610-authorization"
          - 'button "qa-final-result.pdf مرفوع #KH-2026-000008 · final-result" [ref=e126] [cursor=pointer]':
            - generic [ref=e127]:
              - paragraph [ref=e128]: qa-final-result.pdf
              - generic [ref=e129]: مرفوع
            - paragraph [ref=e134]: "#KH-2026-000008 · final-result"
          - 'button "qa-upload-pending.pdf مرفوع #KH-2026-000006 · client-audit-qa-202610-authorization" [ref=e135] [cursor=pointer]':
            - generic [ref=e136]:
              - paragraph [ref=e137]: qa-upload-pending.pdf
              - generic [ref=e138]: مرفوع
            - paragraph [ref=e143]: "#KH-2026-000006 · client-audit-qa-202610-authorization"
        - generic [ref=e144]:
          - generic [ref=e145]:
            - iframe [active] [ref=e146]
            - link "تنزيل / فتح" [ref=e147] [cursor=pointer]:
              - /url: blob:http://127.0.0.1:4319/2aa490ba-ef96-4de5-8428-a58f0f9389d2
          - generic [ref=e151]:
            - generic [ref=e152]:
              - heading "تفاصيل الوثيقة" [level=2] [ref=e153]
              - generic [ref=e157]:
                - generic [ref=e158]:
                  - term [ref=e159]: الطلب
                  - definition [ref=e160]: KH-2026-000014
                - generic [ref=e161]:
                  - term [ref=e162]: الخدمة
                  - definition [ref=e163]: خدمة اختبار رحلة الطلب
                - generic [ref=e164]:
                  - term [ref=e165]: العميل
                  - definition [ref=e166]: QA Customer A
                - generic [ref=e167]:
                  - term [ref=e168]: نوع المستند
                  - definition [ref=e169]: client-audit-qa-202610-authorization
                - generic [ref=e170]:
                  - term [ref=e171]: اسم الملف
                  - definition [ref=e172]: authorization.pdf
                - generic [ref=e173]:
                  - term [ref=e174]: رفع بواسطة
                  - definition [ref=e175]: QA Customer A
                - generic [ref=e176]:
                  - term [ref=e177]: تاريخ الرفع
                  - definition [ref=e178]: ١٥ تشرين الأول ٢٠٢٦، ١١:٤٩ م
            - generic [ref=e179]:
              - heading "قرار التحقق" [level=2] [ref=e180]
              - textbox "ملاحظة التحقق" [ref=e181]:
                - /placeholder: ملاحظة داخلية عند الاعتماد، أو سبب واضح عند الرفض
              - generic [ref=e182]:
                - button "اعتماد الوثيقة" [ref=e183] [cursor=pointer]
                - button "رفض وطلب استبدال" [ref=e187] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect, authenticateAs } from './_helpers.js'
  2  | import AxeBuilderReal from '@axe-core/playwright'
  3  | 
  4  | const ROUTES = {
  5  |   customer: ['/customer', '/customer/orders', '/customer/orders/new', '/customer/profile'],
  6  |   employee: ['/employee', '/employee/orders', '/employee/documents/verify', '/employee/reports'],
  7  |   admin: ['/admin', '/admin/orders', '/admin/services', '/admin/service-categories', '/admin/users', '/admin/providers'],
  8  |   provider: ['/provider', '/provider/orders'],
  9  | }
  10 | 
  11 | for (const [role, routes] of Object.entries(ROUTES)) {
  12 |   for (const route of routes) {
  13 |     test(`axe (${role}) ${route}`, async ({ page, request }) => {
  14 |       await authenticateAs(page, request, role)
  15 |       await page.goto(route, { waitUntil: 'domcontentloaded' })
  16 |       await page.waitForFunction(() => {
  17 |         const r = document.querySelector('#root')
  18 |         return r && r.innerText && r.innerText.trim().length > 20
  19 |       }, { timeout: 15000 })
  20 |       await page.waitForTimeout(500)
  21 |       const results = await new AxeBuilderReal({ page })
  22 |         .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
  23 |         .analyze()
  24 |       const blocking = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact))
> 25 |       expect(blocking, blocking.map((v) => `${v.id} (${v.impact}): ${v.help}`).join('\n')).toEqual([])
     |                                                                                            ^ Error: color-contrast (serious): Elements must meet minimum color contrast ratio thresholds
  26 |     })
  27 |   }
  28 | }
  29 | 
```