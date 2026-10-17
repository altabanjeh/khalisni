import sys, json; sys.path.insert(0, '.')
from kh import *
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8009
a = qa('admin', port) if port == 8009 else demo('admin', port)
_, rules = a.get('/admin/workflow-rules/'); rules = rules['results']
json.dump(rules, open(f'../evidence/F05-workflow-rules-{port}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('RULES (admin-permitted):')
for r in rules:
    if 'admin' in r['allowed_roles']:
        print(f"  {r['from_status']:>20} -> {r['to_status']:<20} {r['action']:<32} checks={r['validation_checks']} channel={r['channel']}")
_, orders = a.get('/admin/orders/', params={'page_size': 200})
orders = orders.get('results', orders)
seen = {}
mism = []
for o in orders:
    _, d = a.get(f"/admin/orders/{o['id']}/")
    wt = d['allowed_actions']['workflow_transitions']
    ui = {(t['to_status'], t['action']): (t['available'], t['blocked_reasons']) for t in wt}
    expected = {(r['to_status'], r['action']) for r in rules if r['from_status'] == d['status'] and 'admin' in r['allowed_roles']}
    shown = set(ui)
    print(f"{d['order_number']} {d['status']:<20} gen={d['allowed_actions']['available_status_transitions']}")
    for k, v in ui.items(): print(f"     offered {k[0]:<20} {k[1]:<30} available={v[0]} blocked={v[1]}")
    if expected - shown: mism.append((d['order_number'], d['status'], 'rule-not-offered', sorted(expected - shown)))
    if {k for k in shown if 'admin' not in next((r['allowed_roles'] for r in rules if r['from_status']==d['status'] and r['to_status']==k[0] and r['action']==k[1]), [])}:
        mism.append((d['order_number'], d['status'], 'offered-but-not-admin-rule', None))
print('MISMATCHES:', mism)
