import sys, glob, os, re, time; sys.path.insert(0, '.')
from kh import *
R = {}
anon = C(8009)
ts = str(int(time.time()))[-6:]
def reg(**kw):
    st, j = anon.post('/auth/register/', json=kw); return st, j
# U04 / B04 registration matrix
R['reg_ok_no_nid'] = reg(full_name='QA Reg One', phone='0791' + ts, email=f'qa-reg-{ts}@example.test', password='Strong-Pass-2026!')
R['reg_dup_email'] = reg(full_name='QA Reg Dup', phone='0792' + ts, email=f'qa-reg-{ts}@example.test', password='Strong-Pass-2026!')
R['reg_no_phone'] = reg(full_name='QA Reg NoPhone', email=f'qa-reg-np-{ts}@example.test', password='Strong-Pass-2026!')
R['reg_empty_phone'] = reg(full_name='QA Reg EmptyPhone', phone='', email=f'qa-reg-ep-{ts}@example.test', password='Strong-Pass-2026!')
R['reg_bad_phone'] = reg(full_name='QA Reg BadPhone', phone='abc', email=f'qa-reg-bp-{ts}@example.test', password='Strong-Pass-2026!')
R['reg_8char_common'] = reg(full_name='QA Reg Weak', phone='0793' + ts, email=f'qa-reg-wk-{ts}@example.test', password='password')
R['reg_8char_numeric'] = reg(full_name='QA Reg Num', phone='0794' + ts, email=f'qa-reg-nm-{ts}@example.test', password='12345678')
# login with new account, activation?
try:
    u = C(8009, f'qa-reg-{ts}@example.test', 'Strong-Pass-2026!'); R['new_login'] = (200, {k: u.login_body['user'].get(k) for k in ('role', 'is_active', 'is_email_verified', 'is_verified') if k in u.login_body['user']})
except Exception as e: R['new_login'] = str(e)
# contact
R['contact_no_email'] = anon.post('/public-site/contact-inquiries/', json={'name': 'QA', 'phone': '0790000000', 'message': 'QA audit inquiry'})
R['contact_no_phone'] = anon.post('/public-site/contact-inquiries/', json={'name': 'QA', 'email': 'q@example.test', 'message': 'QA audit inquiry'})
# B04 forgot / reset + enumeration
mail = os.environ['AUDIT_MAIL']
before = set(glob.glob(mail + '/*'))
R['forgot_known'] = anon.post('/auth/forgot-password/', json={'email': f'qa-reg-{ts}@example.test'})
R['forgot_unknown'] = anon.post('/auth/forgot-password/', json={'email': f'nobody-{ts}@example.test'})
time.sleep(1)
new = sorted(set(glob.glob(mail + '/*')) - before)
R['mail_files'] = [os.path.basename(x) for x in new]
body = ''.join(open(x, encoding='utf-8', errors='replace').read() for x in new)
m = re.search(r'reset-password/([A-Za-z0-9_\-:.]+)', body)
R['mail_to'] = re.findall(r'^To: .*$', body, re.M)
tok = m.group(1).rstrip('/.') if m else None
R['token_found'] = bool(tok)
if tok:
    R['reset_weak'] = anon.post(f'/auth/reset-password/{tok}/', json={'password': '123', 'new_password': '123', 'confirm_password': '123'})
    R['reset_ok'] = anon.post(f'/auth/reset-password/{tok}/', json={'password': 'New-Strong-Pass-2026!', 'new_password': 'New-Strong-Pass-2026!', 'confirm_password': 'New-Strong-Pass-2026!'})
    R['reset_reuse'] = anon.post(f'/auth/reset-password/{tok}/', json={'password': 'Other-Strong-2026!', 'new_password': 'Other-Strong-2026!', 'confirm_password': 'Other-Strong-2026!'})
    try: C(8009, f'qa-reg-{ts}@example.test', 'New-Strong-Pass-2026!'); R['login_new_pw'] = 'OK'
    except Exception as e: R['login_new_pw'] = str(e)
    try: C(8009, f'qa-reg-{ts}@example.test', 'Strong-Pass-2026!'); R['login_old_pw'] = 'STILL WORKS'
    except Exception as e: R['login_old_pw'] = 'rejected: ' + str(e)[:120]
R['reset_garbage'] = anon.post('/auth/reset-password/not-a-real-token/', json={'password': 'New-Strong-Pass-2026!', 'new_password': 'New-Strong-Pass-2026!', 'confirm_password': 'New-Strong-Pass-2026!'})
# B03 basic token lifecycle for a QA role
c = qa('customer_a')
R['me'] = c.get('/auth/me/')[0]
st, j = c.post('/auth/token/refresh/', json={'refresh': c.login_body['refresh']}); R['refresh'] = st
R['logout'] = c.post('/auth/logout/', json={'refresh': j.get('refresh', c.login_body['refresh']) if isinstance(j, dict) else c.login_body['refresh']})[0]
R['refresh_after_logout'] = c.post('/auth/token/refresh/', json={'refresh': j.get('refresh') if isinstance(j, dict) else ''})
R['bad_pw'] = anon.post('/auth/login/', json={'email': QA['customer_a'], 'password': 'wrong-password-x'})
R['unknown_user'] = anon.post('/auth/login/', json={'email': f'nobody-{ts}@example.test', 'password': 'wrong-password-x'})
for k, v in R.items(): show(k, v, 700)
