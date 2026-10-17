import sys, glob, os, re, time; sys.path.insert(0, '.')
from kh import *
mail = os.environ['AUDIT_MAIL']; anon = C(8009); R = {}
email = sys.argv[1]
before = set(glob.glob(mail + '/*'))
anon.post('/auth/forgot-password/', json={'email': email}); time.sleep(1)
new = sorted(set(glob.glob(mail + '/*')) - before)
body = ''.join(open(x, encoding='utf-8', errors='replace').read() for x in new)
tok = re.search(r'reset-password/([A-Za-z0-9_\-:.]+)', body).group(1).rstrip('/.')
R['link_host'] = re.findall(r'https?://[^/\s]+/reset-password', body)[:1]
P = lambda p: {'new_password': p, 'confirm_new_password': p}
R['mismatch'] = anon.post(f'/auth/reset-password/{tok}/', json={'new_password': 'New-Strong-Pass-2026!', 'confirm_new_password': 'Different-2026!x'})
R['reset_ok'] = anon.post(f'/auth/reset-password/{tok}/', json=P('New-Strong-Pass-2026!'))
R['reset_reuse'] = anon.post(f'/auth/reset-password/{tok}/', json=P('Other-Strong-2026!x'))
for pw, k in (('New-Strong-Pass-2026!', 'login_new'), ('Strong-Pass-2026!', 'login_old')):
    try: C(8009, email, pw); R[k] = 'OK'
    except Exception as e: R[k] = 'rejected'
for k, v in R.items(): show(k, v, 400)
