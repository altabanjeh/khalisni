import sys, uuid, json; sys.path.insert(0, '.')
from kh import *
DOC = 'client-audit-qa-202610-authorization'
ca, cb, emp, adm, pa, pb = (qa(k) for k in ('customer_a', 'customer_b', 'employee', 'admin', 'provider_a', 'provider_b'))
F = lambda n, ct='application/pdf': (n, open('files/' + n, 'rb').read(), ct)
_, svc = C(8009).get('/services/'); sid = next(s['id'] for s in svc if s['slug'] == 'client-audit-qa-202610-service')


def create(cl, key=None, fname='qa-valid.pdf', notes='B07 probe'):
    h = {'Idempotency-Key': key} if key else {}
    data = {'service': sid, 'full_name': 'QA Customer A', 'phone': '0798800103', 'city': 'Amman', 'consent': 'true', 'notes': notes, 'document_types': DOC}
    return cl.post('/orders/', data=data, files={'documents': F(fname)}, headers=h)


def tok(cl, docid):
    s, j = cl.get(f'/documents/{docid}/download-token/')
    return s, (j.get('token') if isinstance(j, dict) else None), j


R = {}
# ---- B07 idempotency ----
k = str(uuid.uuid4())
r1 = create(ca, k); r2 = create(ca, k); r3 = create(ca, k, notes='changed payload')
R['B07_first'] = (r1[0], r1[1].get('order_number') if isinstance(r1[1], dict) else r1[1])
R['B07_replay_same_key'] = (r2[0], r2[1].get('order_number') if isinstance(r2[1], dict) else r2[1])
R['B07_same_key_changed_payload'] = (r3[0], str(r3[1])[:200])
R['B07_same_key_other_customer'] = create(cb, k)[0]
X = r1[1]['id']
R['X'] = X
# ---- B02 on order X ----
_, d = emp.get(f'/admin/orders/{X}/'); R['X_initial'] = (d['status'], d['allowed_actions']['readiness'])
R['X_start_review'] = emp.patch(f'/admin/orders/{X}/status/', json={'status': 'UNDER_REVIEW'})[0]
R['X_request_docs_empty'] = emp.post(f'/admin/orders/{X}/request-documents/', json={'note': 'x', 'document_types': []})
R['X_request_docs_unknown'] = emp.post(f'/admin/orders/{X}/request-documents/', json={'note': 'x', 'document_types': ['legal_authorization']})
R['X_request_docs_ok'] = emp.post(f'/admin/orders/{X}/request-documents/', json={'note': 'يرجى رفع التفويض', 'document_types': [DOC]})[0]
_, d = ca.get(f'/customer/orders/{X}/')
R['X_customer_view_waiting'] = {'status': d['status'], 'missing': d.get('missing_document_types'), 'aa': {k2: d['allowed_actions'].get(k2) for k2 in ('can_upload_customer_document', 'can_view_missing_documents_form')}}
up = lambda cl, f, ct='application/pdf', oid=X: cl.post(f'/customer/orders/{oid}/documents/', data={'document_type': DOC}, files={'file': F(f, ct)})
R['up_exe'] = up(ca, 'qa-bad.exe', 'application/octet-stream')
R['up_oversize_11MB'] = up(ca, 'qa-oversize.pdf')
R['up_html_renamed_pdf'] = up(ca, 'qa-html-as.pdf')
R['status_after_invalid'] = ca.get(f'/customer/orders/{X}/')[1]['status']
R['up_png_on_pdf_only_requirement'] = up(ca, 'qa-valid.png', 'image/png')
R['status_after_png'] = ca.get(f'/customer/orders/{X}/')[1]['status']
R['B06_custB_upload_to_A_order'] = up(cb, 'qa-valid.pdf')[0]
if R['status_after_png'] == 'WAITING_CUSTOMER':
    R['up_valid_pdf'] = up(ca, 'qa-valid.pdf')[0]
R['status_after_valid'] = ca.get(f'/customer/orders/{X}/')[1]['status']
_, d = emp.get(f'/admin/orders/{X}/')
docs = [x for x in d['documents'] if x['document_type'] == DOC]
R['X_docs_employee'] = [(x['id'], x['status'], x.get('original_name') or x.get('file_name')) for x in docs]
latest = docs[0]['id']
R['reject_without_reason'] = emp.post(f'/staff/documents/{latest}/verify/', json={'is_verified': False})
R['reject_with_reason'] = emp.post(f'/staff/documents/{latest}/verify/', json={'is_verified': False, 'note': 'الصورة غير واضحة - QA'})[0]
_, d = ca.get(f'/customer/orders/{X}/')
R['customer_sees_after_reject'] = {'status': d['status'], 'docs': [{k2: x.get(k2) for k2 in ('id', 'status', 'verification_note', 'rejection_reason', 'is_verified')} for x in d['documents']], 'readiness': d['allowed_actions'].get('readiness'), 'aa_upload': d['allowed_actions'].get('can_upload_customer_document')}
_, d = emp.get(f'/admin/orders/{X}/'); R['employee_readiness_after_reject'] = d['allowed_actions']['readiness']
# ---- download authorization ----
s, t, j = tok(ca, latest); R['dl_token_owner'] = (s, list(j.keys()) if isinstance(j, dict) else j)
if t:
    rr = ca.s.get(ca.base + f'/documents/{latest}/download/', params={'token': t}); R['dl_owner'] = (rr.status_code, rr.headers.get('content-type'), rr.content[:8])
    rr = requests.get(ca.base + f'/documents/{latest}/download/', params={'token': t}); R['dl_token_without_auth_header'] = rr.status_code
R['dl_token_custB'] = tok(cb, latest)[0]
R['dl_token_provA_unassigned'] = tok(pa, latest)[0]
R['dl_direct_custB_no_token'] = cb.s.get(cb.base + f'/documents/{latest}/download/').status_code
# ---- B06 isolation matrix with seeded orders ----
R['custB_get_A_order5'] = cb.get('/customer/orders/5/')[0]
R['custB_cancel_A_order5'] = cb.post('/customer/orders/5/cancel/', json={'reason': 'x'})[0]
R['custA_get_B_order7'] = ca.get('/customer/orders/7/')[0]
R['custA_admin_endpoint'] = ca.get('/admin/orders/5/')[0]
R['custA_list_ids'] = sorted(o['order_number'] for o in (ca.get('/customer/orders/')[1].get('results', [])))
R['custB_list_ids'] = sorted(o['order_number'] for o in (cb.get('/customer/orders/')[1].get('results', [])))
R['provA_list'] = sorted(o['order_number'] for o in (pa.get('/provider/orders/')[1].get('results', [])))
R['provB_list'] = sorted(o['order_number'] for o in (pb.get('/provider/orders/')[1].get('results', [])))
R['provA_get_B_order7'] = pa.get('/provider/orders/7/')[0]
R['provB_get_A_order8'] = pb.get('/provider/orders/8/')[0]
R['provA_get_unassigned_order5'] = pa.get('/provider/orders/5/')[0]
R['provA_status_on_order7'] = pa.patch('/provider/orders/7/status/', json={'status': 'IN_PROGRESS'})[0]
R['provA_customer_endpoint'] = pa.get('/customer/orders/8/')[0]
R['provA_admin_endpoint'] = pa.get('/admin/orders/8/')[0]
R['provB_dl_token_A_doc8'] = tok(pb, 8)[0]
R['provA_dl_token_own_final9'] = tok(pa, 9)[0]
R['custA_dl_token_final9_before_completion'] = tok(ca, 9)[0]
R['custB_dl_token_own_doc7'] = tok(cb, 7)[0]
R['custA_dl_token_B_doc7'] = tok(ca, 7)[0]
_, d5 = ca.get('/customer/orders/5/')
blob = json.dumps(d5, ensure_ascii=False)
R['custA_order5_internal_note_leak'] = 'INTERNAL QA NOTE' in blob
R['custA_order5_keys'] = sorted(d5.keys())
R['custA_order5_assigned_employee'] = d5.get('assigned_employee')
_, d7 = cb.get('/customer/orders/7/')
R['custB_order7_provider_field'] = d7.get('assigned_provider'); R['custB_order7_has_internal_notes_key'] = 'internal_notes' in d7
_, dp = pa.get('/provider/orders/8/')
R['provA_order8_internal_note_leak'] = 'INTERNAL QA NOTE' in json.dumps(dp, ensure_ascii=False)
tr = C(8009).get('/orders/track/', params={'order_number': 'KH-2026-000005', 'phone': '0798800103'})[1]
R['track5_leak'] = [s2 for s2 in ('INTERNAL QA NOTE', 'QA Provider', 'download', 'file') if s2 in json.dumps(tr, ensure_ascii=False)]
R['track_wrong_phone'] = C(8009).get('/orders/track/', params={'order_number': 'KH-2026-000005', 'phone': '0798800104'})
tr7 = C(8009).get('/orders/track/', params={'order_number': 'KH-2026-000007', 'phone': '0798800104'})[1]
R['track7_provider_leak'] = 'QA Provider' in json.dumps(tr7, ensure_ascii=False)
R['emp_admin_rules'] = emp.get('/admin/workflow-rules/')[0]
R['emp_admin_users'] = emp.get('/admin/users/')[0]
for k2, v in R.items():
    show(k2, v, 900)
json.dump(R, open('../evidence/B02-B06-B07-api.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1, default=str)
