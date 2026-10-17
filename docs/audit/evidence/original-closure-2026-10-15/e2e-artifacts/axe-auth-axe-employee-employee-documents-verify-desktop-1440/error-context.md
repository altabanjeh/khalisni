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
+         "html": "<p class=\"mt-1 text-xs font-semibold text-slate-500\">#KH-2026-000009 · client-audit-qa-202610-authorization</p>",
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
    - generic [ref=e8]:
      - link "خلصني" [ref=e9] [cursor=pointer]:
        - /url: /
        - img "خلصني" [ref=e10]
      - link "خلصني" [ref=e11] [cursor=pointer]:
        - /url: /
        - img "خلصني" [ref=e12]
    - generic [ref=e13]:
      - paragraph [ref=e14]: بوابة العمل
      - paragraph [ref=e15]: بوابة الموظف
    - navigation [ref=e16]:
      - generic [ref=e17]:
        - paragraph [ref=e18]: نظرة عامة
        - link "الرئيسية" [ref=e20] [cursor=pointer]:
          - /url: /employee
      - generic [ref=e28]:
        - paragraph [ref=e29]: العمليات
        - generic [ref=e30]:
          - link "قائمة المراجعة" [ref=e31] [cursor=pointer]:
            - /url: /employee/orders
          - link "طلبات خدمات جديدة" [ref=e39] [cursor=pointer]:
            - /url: /employee/missing-service-requests
          - link "التحقق من الوثائق" [ref=e44] [cursor=pointer]:
            - /url: /employee/documents/verify
      - generic [ref=e50]:
        - paragraph [ref=e51]: التقارير والتدقيق
        - link "تقارير الموظف" [ref=e53] [cursor=pointer]:
          - /url: /employee/reports
      - generic [ref=e59]:
        - paragraph [ref=e60]: الإعدادات
        - link "الدليل" [ref=e62] [cursor=pointer]:
          - /url: /employee/manual
  - generic [ref=e67]:
    - banner [ref=e68]:
      - heading "بوابة الموظف" [level=2] [ref=e71]
      - generic [ref=e72]:
        - button "الإشعارات" [ref=e74] [cursor=pointer]
        - button "المزيد من الخيارات" [ref=e78] [cursor=pointer]
    - generic [ref=e82]:
      - banner [ref=e83]:
        - paragraph [ref=e84]: العمليات
        - heading "التحقق من الوثائق" [level=1] [ref=e85]
        - paragraph [ref=e89]: راجع كل ملف مرفوع، تحقق من وضوحه ومطابقته لنوع الخدمة، ثم اعتمده أو ارفضه بسبب واضح.
      - generic [ref=e90]:
        - complementary [ref=e91]:
          - paragraph [ref=e92]: بانتظار التحقق (3)
          - 'button "qa-valid.pdf مرفوع #KH-2026-000009 · client-audit-qa-202610-authorization" [ref=e93] [cursor=pointer]':
            - generic [ref=e94]:
              - paragraph [ref=e95]: qa-valid.pdf
              - generic [ref=e96]: مرفوع
            - paragraph [ref=e101]: "#KH-2026-000009 · client-audit-qa-202610-authorization"
          - 'button "qa-final-result.pdf مرفوع #KH-2026-000008 · final-result" [ref=e102] [cursor=pointer]':
            - generic [ref=e103]:
              - paragraph [ref=e104]: qa-final-result.pdf
              - generic [ref=e105]: مرفوع
            - paragraph [ref=e110]: "#KH-2026-000008 · final-result"
          - 'button "qa-upload-pending.pdf مرفوع #KH-2026-000006 · client-audit-qa-202610-authorization" [ref=e111] [cursor=pointer]':
            - generic [ref=e112]:
              - paragraph [ref=e113]: qa-upload-pending.pdf
              - generic [ref=e114]: مرفوع
            - paragraph [ref=e119]: "#KH-2026-000006 · client-audit-qa-202610-authorization"
        - generic [ref=e120]:
          - generic [ref=e121]:
            - iframe [active] [ref=e122]
            - link "تنزيل / فتح" [ref=e123] [cursor=pointer]:
              - /url: blob:http://127.0.0.1:4319/ded972a0-ea5a-44c8-8299-46d3137d8533
          - generic [ref=e127]:
            - generic [ref=e128]:
              - heading "تفاصيل الوثيقة" [level=2] [ref=e129]
              - generic [ref=e133]:
                - generic [ref=e134]:
                  - term [ref=e135]: الطلب
                  - definition [ref=e136]: KH-2026-000009
                - generic [ref=e137]:
                  - term [ref=e138]: الخدمة
                  - definition [ref=e139]: خدمة اختبار رحلة الطلب
                - generic [ref=e140]:
                  - term [ref=e141]: العميل
                  - definition [ref=e142]: QA Customer A
                - generic [ref=e143]:
                  - term [ref=e144]: نوع المستند
                  - definition [ref=e145]: client-audit-qa-202610-authorization
                - generic [ref=e146]:
                  - term [ref=e147]: اسم الملف
                  - definition [ref=e148]: qa-valid.pdf
                - generic [ref=e149]:
                  - term [ref=e150]: رفع بواسطة
                  - definition [ref=e151]: QA Customer A
                - generic [ref=e152]:
                  - term [ref=e153]: تاريخ الرفع
                  - definition [ref=e154]: ١٥ تشرين الأول ٢٠٢٦، ١١:١٦ م
            - generic [ref=e155]:
              - heading "قرار التحقق" [level=2] [ref=e156]
              - textbox "ملاحظة التحقق" [ref=e157]:
                - /placeholder: ملاحظة داخلية عند الاعتماد، أو سبب واضح عند الرفض
              - generic [ref=e158]:
                - button "اعتماد الوثيقة" [ref=e159] [cursor=pointer]
                - button "رفض وطلب استبدال" [ref=e163] [cursor=pointer]
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