# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: axe-auth.spec.js >> axe (admin) /admin/orders
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
+               "bgColor": "#0f5dd8",
+               "contrastRatio": 4.34,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#cfdff7",
+               "fontSize": "10.5pt (14px)",
+               "fontWeight": "bold",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.34 (foreground color: #cfdff7, background color: #0f5dd8, font size: 10.5pt (14px), font weight: bold). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<button aria-pressed=\"true\" class=\"kh-focusable inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-bold transition border-transparent bg-brand-600 text-white\" type=\"button\">الكل<span class=\"text-white/80\">11</span></button>",
+                 "target": Array [
+                   ".border-transparent",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 4.34 (foreground color: #cfdff7, background color: #0f5dd8, font size: 10.5pt (14px), font weight: bold). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"text-white/80\">11</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".text-white\\/80",
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
  - complementary "لوحة الإدارة" [ref=e6]:
    - generic [ref=e8]:
      - link "خلصني" [ref=e9] [cursor=pointer]:
        - /url: /
        - img "خلصني" [ref=e10]
      - link "خلصني" [ref=e11] [cursor=pointer]:
        - /url: /
        - img "خلصني" [ref=e12]
    - generic [ref=e13]:
      - paragraph [ref=e14]: بوابة العمل
      - paragraph [ref=e15]: لوحة الإدارة
    - navigation [ref=e16]:
      - generic [ref=e17]:
        - paragraph [ref=e18]: نظرة عامة
        - link "لوحة الإدارة" [ref=e20] [cursor=pointer]:
          - /url: /admin
      - generic [ref=e28]:
        - paragraph [ref=e29]: العمليات
        - generic [ref=e30]:
          - link "إدارة الطلبات" [ref=e31] [cursor=pointer]:
            - /url: /admin/orders
          - link "طلبات الخدمات الجديدة" [ref=e36] [cursor=pointer]:
            - /url: /admin/missing-service-requests
          - link "المدفوعات" [ref=e41] [cursor=pointer]:
            - /url: /admin/payments
          - link "قواعد التشغيل" [ref=e46] [cursor=pointer]:
            - /url: /admin/rules
          - link "الإشعارات" [ref=e52] [cursor=pointer]:
            - /url: /admin/notifications
      - generic [ref=e58]:
        - paragraph [ref=e59]: إدارة الخدمات
        - generic [ref=e60]:
          - link "تصنيفات الخدمات" [ref=e61] [cursor=pointer]:
            - /url: /admin/service-categories
          - link "الخدمات" [ref=e69] [cursor=pointer]:
            - /url: /admin/services
          - link "علاقات الخدمات" [ref=e75] [cursor=pointer]:
            - /url: /admin/service-relations
      - generic [ref=e82]:
        - paragraph [ref=e83]: المستخدمون والمزوّدون
        - generic [ref=e84]:
          - link "المستخدمون والأدوار" [ref=e85] [cursor=pointer]:
            - /url: /admin/users
          - link "المزوّدون" [ref=e92] [cursor=pointer]:
            - /url: /admin/providers
          - link "خدمات المزوّدين" [ref=e99] [cursor=pointer]:
            - /url: /admin/provider-services
      - generic [ref=e105]:
        - paragraph [ref=e106]: المحتوى والموقع العام
        - generic [ref=e107]:
          - link "الموقع العام" [ref=e108] [cursor=pointer]:
            - /url: /admin/public-site
          - link "محتوى الرئيسية" [ref=e113] [cursor=pointer]:
            - /url: /admin/public-site/content
          - link "الإعلانات" [ref=e119] [cursor=pointer]:
            - /url: /admin/public-site/advertisements
          - link "المظهر العام" [ref=e126] [cursor=pointer]:
            - /url: /admin/public-site/theme
          - link "معاينة الواجهة" [ref=e135] [cursor=pointer]:
            - /url: /admin/public-site/preview
          - link "إدارة الدليل" [ref=e141] [cursor=pointer]:
            - /url: /admin/help-guides
      - generic [ref=e146]:
        - paragraph [ref=e147]: التقارير والتدقيق
        - generic [ref=e148]:
          - link "التقارير" [ref=e149] [cursor=pointer]:
            - /url: /admin/reports
          - link "سجل التدقيق" [ref=e155] [cursor=pointer]:
            - /url: /admin/audit
      - generic [ref=e161]:
        - paragraph [ref=e162]: الإعدادات
        - generic [ref=e163]:
          - link "إعدادات النظام" [ref=e164] [cursor=pointer]:
            - /url: /admin/cms
          - link "الدليل" [ref=e171] [cursor=pointer]:
            - /url: /admin/manual
  - generic [ref=e176]:
    - banner [ref=e177]:
      - heading "لوحة الإدارة" [level=2] [ref=e180]
      - generic [ref=e181]:
        - button "الإشعارات" [ref=e183] [cursor=pointer]
        - button "المزيد من الخيارات" [ref=e187] [cursor=pointer]
    - generic [ref=e191]:
      - banner [ref=e192]:
        - generic [ref=e198]:
          - paragraph [ref=e199]: العمليات
          - heading "الطلبات" [level=1] [ref=e201]
          - paragraph [ref=e202]: قائمة تشغيل موحّدة لمتابعة الطلبات، الوصول السريع للتفاصيل، ومعرفة ما يحتاج إجراءً.
      - generic [ref=e203]:
        - generic [ref=e211]:
          - paragraph [ref=e212]: إجمالي الطلبات
          - paragraph [ref=e213]: "11"
        - generic [ref=e220]:
          - paragraph [ref=e221]: يحتاج إجراء
          - paragraph [ref=e222]: "4"
        - generic [ref=e229]:
          - paragraph [ref=e230]: قيد التنفيذ
          - paragraph [ref=e231]: "2"
        - generic [ref=e237]:
          - paragraph [ref=e238]: مكتملة
          - paragraph [ref=e239]: "3"
      - generic [ref=e240]:
        - generic [ref=e241]:
          - generic [ref=e242]: "عدد العناصر الظاهرة: 11"
          - generic [ref=e244]:
            - textbox "بحث في الطلبات" [ref=e246]:
              - /placeholder: ابحث برقم الطلب أو العميل أو الخدمة أو المزوّد
            - generic [ref=e247]:
              - button "الكل 11" [pressed] [ref=e248] [cursor=pointer]:
                - text: الكل
                - generic [ref=e249]: "11"
              - button "يحتاج إجراء 4" [ref=e250] [cursor=pointer]:
                - text: يحتاج إجراء
                - generic [ref=e251]: "4"
              - button "قيد التنفيذ 2" [ref=e252] [cursor=pointer]:
                - text: قيد التنفيذ
                - generic [ref=e253]: "2"
              - button "مكتملة 3" [ref=e254] [cursor=pointer]:
                - text: مكتملة
                - generic [ref=e255]: "3"
        - region [ref=e256]:
          - table [ref=e258]:
            - rowgroup [ref=e259]:
              - row [ref=e260]:
                - columnheader "رقم الطلب" [ref=e261]
                - columnheader "العميل" [ref=e262]
                - columnheader "الخدمة" [ref=e263]
                - columnheader "الحالة" [ref=e264]
                - columnheader "المزوّد" [ref=e265]
                - columnheader "تاريخ الإنشاء" [ref=e266]
                - columnheader "الإجراءات" [ref=e267]
            - rowgroup [ref=e268]:
              - row [ref=e269]:
                - cell "#KH-2026-000011" [ref=e270]
                - cell "QA Customer A" [ref=e272]
                - cell "خدمة اختبار رحلة الطلب" [ref=e273]
                - cell "مكتمل" [ref=e274]
                - cell "QA Provider A" [ref=e280]
                - cell "١٥ تشرين الأول ٢٠٢٦" [ref=e281]
                - cell [ref=e282]:
                  - link "فتح الطلب" [ref=e283] [cursor=pointer]:
                    - /url: /admin/orders/11
              - row [ref=e284]:
                - cell "#KH-2026-000010" [ref=e285]
                - cell "QA Customer A" [ref=e287]
                - cell "خدمة اختبار رحلة الطلب" [ref=e288]
                - cell "مكتمل" [ref=e289]
                - cell "QA Provider A" [ref=e295]
                - cell "١٥ تشرين الأول ٢٠٢٦" [ref=e296]
                - cell [ref=e297]:
                  - link "فتح الطلب" [ref=e298] [cursor=pointer]:
                    - /url: /admin/orders/10
              - row [ref=e299]:
                - cell "#KH-2026-000009" [ref=e300]
                - cell "QA Customer A" [ref=e302]
                - cell "خدمة اختبار رحلة الطلب" [ref=e303]
                - cell "قيد المراجعة" [ref=e304]
                - cell "غير معيّن" [ref=e311]
                - cell "١٥ تشرين الأول ٢٠٢٦" [ref=e312]
                - cell [ref=e313]:
                  - link "فتح الطلب" [ref=e314] [cursor=pointer]:
                    - /url: /admin/orders/9
              - row [ref=e315]:
                - cell "#KH-2026-000008" [ref=e316]
                - cell "QA Customer A" [ref=e318]
                - cell "خدمة اختبار رحلة الطلب" [ref=e319]
                - cell "جاهز للتسليم" [ref=e320]
                - cell "QA Provider A" [ref=e327]
                - cell "١٥ تشرين الأول ٢٠٢٦" [ref=e328]
                - cell [ref=e329]:
                  - link "فتح الطلب" [ref=e330] [cursor=pointer]:
                    - /url: /admin/orders/8
              - row [ref=e331]:
                - cell "#KH-2026-000007" [ref=e332]
                - cell "QA Customer B" [ref=e334]
                - cell "خدمة اختبار رحلة الطلب" [ref=e335]
                - cell "تم التعيين" [ref=e336]
                - cell "QA Provider B" [ref=e342]
                - cell "١٥ تشرين الأول ٢٠٢٦" [ref=e343]
                - cell [ref=e344]:
                  - link "فتح الطلب" [ref=e345] [cursor=pointer]:
                    - /url: /admin/orders/7
              - row [ref=e346]:
                - cell "#KH-2026-000006" [ref=e347]
                - cell "QA Customer A" [ref=e349]
                - cell "خدمة اختبار رحلة الطلب" [ref=e350]
                - cell "قيد المراجعة" [ref=e351]
                - cell "غير معيّن" [ref=e358]
                - cell "١٥ تشرين الأول ٢٠٢٦" [ref=e359]
                - cell [ref=e360]:
                  - link "فتح الطلب" [ref=e361] [cursor=pointer]:
                    - /url: /admin/orders/6
              - row [ref=e362]:
                - cell "#KH-2026-000005" [ref=e363]
                - cell "QA Customer A" [ref=e365]
                - cell "خدمة اختبار رحلة الطلب" [ref=e366]
                - cell "بانتظار العميل" [ref=e367]
                - cell "غير معيّن" [ref=e372]
                - cell "١٥ تشرين الأول ٢٠٢٦" [ref=e373]
                - cell [ref=e374]:
                  - link "فتح الطلب" [ref=e375] [cursor=pointer]:
                    - /url: /admin/orders/5
              - row [ref=e376]:
                - cell "#KH-2026-000004" [ref=e377]
                - cell "Demo Customer" [ref=e379]
                - cell "شهادة عدم محكومية" [ref=e380]
                - cell "جديد" [ref=e381]
                - cell "غير معيّن" [ref=e387]
                - cell "١٥ تشرين الأول ٢٠٢٦" [ref=e388]
                - cell [ref=e389]:
                  - link "فتح الطلب" [ref=e390] [cursor=pointer]:
                    - /url: /admin/orders/4
              - row [ref=e391]:
                - cell "#KH-2026-000003" [ref=e392]
                - cell "Demo Customer" [ref=e394]
                - cell "تجديد جواز السفر" [ref=e395]
                - cell "مكتمل" [ref=e396]
                - cell "Demo Provider" [ref=e402]
                - cell "١٥ تشرين الأول ٢٠٢٦" [ref=e403]
                - cell [ref=e404]:
                  - link "فتح الطلب" [ref=e405] [cursor=pointer]:
                    - /url: /admin/orders/3
              - row [ref=e406]:
                - cell "#KH-2026-000002" [ref=e407]
                - cell "Demo Customer" [ref=e409]
                - cell "حجز موعد جواز سفر" [ref=e410]
                - cell "قيد التنفيذ" [ref=e411]
                - cell "Demo Provider" [ref=e417]
                - cell "١٥ تشرين الأول ٢٠٢٦" [ref=e418]
                - cell [ref=e419]:
                  - link "فتح الطلب" [ref=e420] [cursor=pointer]:
                    - /url: /admin/orders/2
              - row [ref=e421]:
                - cell "#KH-2026-000001" [ref=e422]
                - cell "Demo Customer" [ref=e424]
                - cell "شهادة عدم محكومية" [ref=e425]
                - cell "ملغي" [ref=e426]
                - cell "غير معيّن" [ref=e432]
                - cell "١٥ تشرين الأول ٢٠٢٦" [ref=e433]
                - cell [ref=e434]:
                  - link "فتح الطلب" [ref=e435] [cursor=pointer]:
                    - /url: /admin/orders/1
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