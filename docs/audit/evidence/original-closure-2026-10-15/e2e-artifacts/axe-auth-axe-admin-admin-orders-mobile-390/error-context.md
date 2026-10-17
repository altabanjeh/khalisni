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
+                 "html": "<button aria-pressed=\"true\" class=\"kh-focusable inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-bold transition border-transparent bg-brand-600 text-white\" type=\"button\">الكل<span class=\"text-white/80\">14</span></button>",
+                 "target": Array [
+                   ".border-transparent",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 4.34 (foreground color: #cfdff7, background color: #0f5dd8, font size: 10.5pt (14px), font weight: bold). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"text-white/80\">14</span>",
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
      - paragraph [ref=e19]: لوحة الإدارة
    - navigation [ref=e20]:
      - generic [ref=e21]:
        - paragraph [ref=e22]: نظرة عامة
        - link "لوحة الإدارة" [ref=e24] [cursor=pointer]:
          - /url: /admin
      - generic [ref=e32]:
        - paragraph [ref=e33]: العمليات
        - generic [ref=e34]:
          - link "إدارة الطلبات" [ref=e35] [cursor=pointer]:
            - /url: /admin/orders
          - link "طلبات الخدمات الجديدة" [ref=e40] [cursor=pointer]:
            - /url: /admin/missing-service-requests
          - link "المدفوعات" [ref=e45] [cursor=pointer]:
            - /url: /admin/payments
          - link "قواعد التشغيل" [ref=e50] [cursor=pointer]:
            - /url: /admin/rules
          - link "الإشعارات" [ref=e56] [cursor=pointer]:
            - /url: /admin/notifications
      - generic [ref=e62]:
        - paragraph [ref=e63]: إدارة الخدمات
        - generic [ref=e64]:
          - link "تصنيفات الخدمات" [ref=e65] [cursor=pointer]:
            - /url: /admin/service-categories
          - link "الخدمات" [ref=e73] [cursor=pointer]:
            - /url: /admin/services
          - link "علاقات الخدمات" [ref=e79] [cursor=pointer]:
            - /url: /admin/service-relations
      - generic [ref=e86]:
        - paragraph [ref=e87]: المستخدمون والمزوّدون
        - generic [ref=e88]:
          - link "المستخدمون والأدوار" [ref=e89] [cursor=pointer]:
            - /url: /admin/users
          - link "المزوّدون" [ref=e96] [cursor=pointer]:
            - /url: /admin/providers
          - link "خدمات المزوّدين" [ref=e103] [cursor=pointer]:
            - /url: /admin/provider-services
      - generic [ref=e109]:
        - paragraph [ref=e110]: المحتوى والموقع العام
        - generic [ref=e111]:
          - link "الموقع العام" [ref=e112] [cursor=pointer]:
            - /url: /admin/public-site
          - link "محتوى الرئيسية" [ref=e117] [cursor=pointer]:
            - /url: /admin/public-site/content
          - link "الإعلانات" [ref=e123] [cursor=pointer]:
            - /url: /admin/public-site/advertisements
          - link "المظهر العام" [ref=e130] [cursor=pointer]:
            - /url: /admin/public-site/theme
          - link "معاينة الواجهة" [ref=e139] [cursor=pointer]:
            - /url: /admin/public-site/preview
          - link "إدارة الدليل" [ref=e145] [cursor=pointer]:
            - /url: /admin/help-guides
      - generic [ref=e150]:
        - paragraph [ref=e151]: التقارير والتدقيق
        - generic [ref=e152]:
          - link "التقارير" [ref=e153] [cursor=pointer]:
            - /url: /admin/reports
          - link "سجل التدقيق" [ref=e159] [cursor=pointer]:
            - /url: /admin/audit
      - generic [ref=e165]:
        - paragraph [ref=e166]: الإعدادات
        - generic [ref=e167]:
          - link "إعدادات النظام" [ref=e168] [cursor=pointer]:
            - /url: /admin/cms
          - link "الدليل" [ref=e175] [cursor=pointer]:
            - /url: /admin/manual
  - generic [ref=e180]:
    - banner [ref=e181]:
      - generic [ref=e182]:
        - button "فتح القائمة الجانبية" [ref=e183] [cursor=pointer]
        - heading "لوحة الإدارة" [level=2] [ref=e186]
      - generic [ref=e187]:
        - button "الإشعارات" [ref=e189] [cursor=pointer]
        - button "المزيد من الخيارات" [ref=e193] [cursor=pointer]
    - generic [ref=e197]:
      - banner [ref=e198]:
        - generic [ref=e204]:
          - paragraph [ref=e205]: العمليات
          - heading "الطلبات" [level=1] [ref=e207]
          - paragraph [ref=e208]: قائمة تشغيل موحّدة لمتابعة الطلبات، الوصول السريع للتفاصيل، ومعرفة ما يحتاج إجراءً.
      - generic [ref=e209]:
        - generic [ref=e217]:
          - paragraph [ref=e218]: إجمالي الطلبات
          - paragraph [ref=e219]: "14"
        - generic [ref=e226]:
          - paragraph [ref=e227]: يحتاج إجراء
          - paragraph [ref=e228]: "6"
        - generic [ref=e235]:
          - paragraph [ref=e236]: قيد التنفيذ
          - paragraph [ref=e237]: "2"
        - generic [ref=e243]:
          - paragraph [ref=e244]: مكتملة
          - paragraph [ref=e245]: "4"
      - generic [ref=e246]:
        - generic [ref=e247]:
          - generic [ref=e248]: "عدد العناصر الظاهرة: 14"
          - generic [ref=e250]:
            - textbox "بحث في الطلبات" [ref=e252]:
              - /placeholder: ابحث برقم الطلب أو العميل أو الخدمة أو المزوّد
            - generic [ref=e253]:
              - button "الكل 14" [pressed] [ref=e254] [cursor=pointer]:
                - text: الكل
                - generic [ref=e255]: "14"
              - button "يحتاج إجراء 6" [ref=e256] [cursor=pointer]:
                - text: يحتاج إجراء
                - generic [ref=e257]: "6"
              - button "قيد التنفيذ 2" [ref=e258] [cursor=pointer]:
                - text: قيد التنفيذ
                - generic [ref=e259]: "2"
              - button "مكتملة 4" [ref=e260] [cursor=pointer]:
                - text: مكتملة
                - generic [ref=e261]: "4"
        - generic [ref=e262]:
          - generic [ref=e264]:
            - generic [ref=e265]:
              - paragraph [ref=e266]: "#KH-2026-000014"
              - generic [ref=e267]: جديد
            - generic [ref=e272]:
              - paragraph [ref=e273]: QA Customer A
              - paragraph [ref=e274]: خدمة اختبار رحلة الطلب
              - paragraph [ref=e275]: غير معيّن
            - link "فتح الطلب" [ref=e276] [cursor=pointer]:
              - /url: /admin/orders/14
          - generic [ref=e278]:
            - generic [ref=e279]:
              - paragraph [ref=e280]: "#KH-2026-000013"
              - generic [ref=e281]: جديد
            - generic [ref=e286]:
              - paragraph [ref=e287]: QA Customer A
              - paragraph [ref=e288]: خدمة اختبار رحلة الطلب
              - paragraph [ref=e289]: غير معيّن
            - link "فتح الطلب" [ref=e290] [cursor=pointer]:
              - /url: /admin/orders/13
          - generic [ref=e292]:
            - generic [ref=e293]:
              - paragraph [ref=e294]: "#KH-2026-000012"
              - generic [ref=e295]: مكتمل
            - generic [ref=e300]:
              - paragraph [ref=e301]: QA Customer A
              - paragraph [ref=e302]: خدمة اختبار رحلة الطلب
              - paragraph [ref=e303]: QA Provider A
            - link "فتح الطلب" [ref=e304] [cursor=pointer]:
              - /url: /admin/orders/12
          - generic [ref=e306]:
            - generic [ref=e307]:
              - paragraph [ref=e308]: "#KH-2026-000011"
              - generic [ref=e309]: مكتمل
            - generic [ref=e314]:
              - paragraph [ref=e315]: QA Customer A
              - paragraph [ref=e316]: خدمة اختبار رحلة الطلب
              - paragraph [ref=e317]: QA Provider A
            - link "فتح الطلب" [ref=e318] [cursor=pointer]:
              - /url: /admin/orders/11
          - generic [ref=e320]:
            - generic [ref=e321]:
              - paragraph [ref=e322]: "#KH-2026-000010"
              - generic [ref=e323]: مكتمل
            - generic [ref=e328]:
              - paragraph [ref=e329]: QA Customer A
              - paragraph [ref=e330]: خدمة اختبار رحلة الطلب
              - paragraph [ref=e331]: QA Provider A
            - link "فتح الطلب" [ref=e332] [cursor=pointer]:
              - /url: /admin/orders/10
          - generic [ref=e334]:
            - generic [ref=e335]:
              - paragraph [ref=e336]: "#KH-2026-000009"
              - generic [ref=e337]: قيد المراجعة
            - generic [ref=e343]:
              - paragraph [ref=e344]: QA Customer A
              - paragraph [ref=e345]: خدمة اختبار رحلة الطلب
              - paragraph [ref=e346]: غير معيّن
            - link "فتح الطلب" [ref=e347] [cursor=pointer]:
              - /url: /admin/orders/9
          - generic [ref=e349]:
            - generic [ref=e350]:
              - paragraph [ref=e351]: "#KH-2026-000008"
              - generic [ref=e352]: جاهز للتسليم
            - generic [ref=e358]:
              - paragraph [ref=e359]: QA Customer A
              - paragraph [ref=e360]: خدمة اختبار رحلة الطلب
              - paragraph [ref=e361]: QA Provider A
            - link "فتح الطلب" [ref=e362] [cursor=pointer]:
              - /url: /admin/orders/8
          - generic [ref=e364]:
            - generic [ref=e365]:
              - paragraph [ref=e366]: "#KH-2026-000007"
              - generic [ref=e367]: تم التعيين
            - generic [ref=e372]:
              - paragraph [ref=e373]: QA Customer B
              - paragraph [ref=e374]: خدمة اختبار رحلة الطلب
              - paragraph [ref=e375]: QA Provider B
            - link "فتح الطلب" [ref=e376] [cursor=pointer]:
              - /url: /admin/orders/7
          - generic [ref=e378]:
            - generic [ref=e379]:
              - paragraph [ref=e380]: "#KH-2026-000006"
              - generic [ref=e381]: قيد المراجعة
            - generic [ref=e387]:
              - paragraph [ref=e388]: QA Customer A
              - paragraph [ref=e389]: خدمة اختبار رحلة الطلب
              - paragraph [ref=e390]: غير معيّن
            - link "فتح الطلب" [ref=e391] [cursor=pointer]:
              - /url: /admin/orders/6
          - generic [ref=e393]:
            - generic [ref=e394]:
              - paragraph [ref=e395]: "#KH-2026-000005"
              - generic [ref=e396]: بانتظار العميل
            - generic [ref=e400]:
              - paragraph [ref=e401]: QA Customer A
              - paragraph [ref=e402]: خدمة اختبار رحلة الطلب
              - paragraph [ref=e403]: غير معيّن
            - link "فتح الطلب" [ref=e404] [cursor=pointer]:
              - /url: /admin/orders/5
          - generic [ref=e406]:
            - generic [ref=e407]:
              - paragraph [ref=e408]: "#KH-2026-000004"
              - generic [ref=e409]: جديد
            - generic [ref=e414]:
              - paragraph [ref=e415]: Demo Customer
              - paragraph [ref=e416]: شهادة عدم محكومية
              - paragraph [ref=e417]: غير معيّن
            - link "فتح الطلب" [ref=e418] [cursor=pointer]:
              - /url: /admin/orders/4
          - generic [ref=e420]:
            - generic [ref=e421]:
              - paragraph [ref=e422]: "#KH-2026-000003"
              - generic [ref=e423]: مكتمل
            - generic [ref=e428]:
              - paragraph [ref=e429]: Demo Customer
              - paragraph [ref=e430]: تجديد جواز السفر
              - paragraph [ref=e431]: Demo Provider
            - link "فتح الطلب" [ref=e432] [cursor=pointer]:
              - /url: /admin/orders/3
          - generic [ref=e434]:
            - generic [ref=e435]:
              - paragraph [ref=e436]: "#KH-2026-000002"
              - generic [ref=e437]: قيد التنفيذ
            - generic [ref=e442]:
              - paragraph [ref=e443]: Demo Customer
              - paragraph [ref=e444]: حجز موعد جواز سفر
              - paragraph [ref=e445]: Demo Provider
            - link "فتح الطلب" [ref=e446] [cursor=pointer]:
              - /url: /admin/orders/2
          - generic [ref=e448]:
            - generic [ref=e449]:
              - paragraph [ref=e450]: "#KH-2026-000001"
              - generic [ref=e451]: ملغي
            - generic [ref=e456]:
              - paragraph [ref=e457]: Demo Customer
              - paragraph [ref=e458]: شهادة عدم محكومية
              - paragraph [ref=e459]: غير معيّن
            - link "فتح الطلب" [ref=e460] [cursor=pointer]:
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