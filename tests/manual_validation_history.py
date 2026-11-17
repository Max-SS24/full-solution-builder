"""Live access regression: validates saved validation/reversal history and admin-only access.
Run after a manual validation/reversal or tests/browser_manual_validation_history.py.
"""
import requests
from live_helpers import URL, SERVICE, TempUser, admin_session, headers, rpc, select

token, admin_id, _ = admin_session()
events = select('manual_validation_history', 'select=*&order=created_at.desc&limit=100', token)
assert events, 'No audit events available; validate and reverse a check first'
validated = next((e for e in events if e['action'] == 'validated'), None)
reversed_event = next((e for e in events if e['action'] == 'reversed' and any(v['check_id'] == e['check_id'] and v['action'] == 'validated' for v in events)), None)
assert validated and reversed_event, 'Both validation and reversal must remain in history'
for event in [validated, reversed_event]:
    assert event['actor_id'] and event['created_at'], 'Missing admin identity or timestamp'
assert any(e['note'] for e in events), 'Notes must be retained'
for method, body in [('post', {'check_id': validated['check_id'], 'actor_id': admin_id, 'action': 'validated'}), ('patch', {'note': 'tampered'})]:
    response = getattr(requests, method)(f'{URL}/rest/v1/manual_validation_history?id=eq.{validated["id"]}', headers=headers(token), json=body, timeout=30)
    if method == 'post':
        assert response.status_code in (401, 403), 'Admin must not insert audit events'
    current = select('manual_validation_history', f'select=*&id=eq.{validated["id"]}', token)
    assert current == [validated], 'Admin modified an existing audit event'
response = requests.get(f'{URL}/rest/v1/manual_validation_history?select=id', headers=headers(), timeout=30)
assert response.status_code in (401, 403) or (response.status_code == 200 and response.json() == []), 'Visitors must not read audit history'
with TempUser() as user:
    assert select('manual_validation_history', 'select=id', user.token) == [], 'Non-admin can read history'
    status, _ = rpc('set_manual_validation', {'_check_id': validated['check_id'], '_validated': True, '_note': 'Unauthorized'}, user.token)
    assert status == 403, 'Non-admin can change validation'
print('PASS: both actions retain identity, notes and timestamps; visitors/non-admins cannot read history or change validation; admins cannot edit events')
