import os
import django
import re

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
from apps.accounts.models import User

client = Client()
admin_user = User.objects.filter(is_superuser=True).first()
client.force_login(admin_user)

urls = [
    '/admin/',
    '/admin/programs/program/',
    '/admin/programs/program/add/',
    '/admin/programs/ec/add/',
    '/admin/programs/ue/add/',
    '/admin/people/student/',
    '/admin/people/student/add/',
    '/admin/people/teacher/add/',
    '/admin/finance/invoice/add/',
    '/admin/evaluation/grade/add/',
    '/admin/lms/coursespace/add/',
    '/admin/admissions/application/add/',
    '/admin/enrollment/adminenrollment/add/',
    '/admin/scheduling_app/scheduledsession/add/',
    '/admin/communication/notification/',
    '/admin/virtual_class/virtualclasssession/add/',
    '/admin/internships/thesis/add/',
    '/admin/documents/generateddocument/',
    '/admin/analytics_app/engagementscore/',
    '/admin/library/librarydocument/add/',
]

print("=== TEST ADMIN URLS ===")
ok = 0
fail = 0
for url in urls:
    try:
        response = client.get(url)
        status = response.status_code
        if status == 500:
            content = response.content.decode('utf-8', errors='replace')
            m = re.search(r'Exception Value.*?<pre[^>]*>(.*?)</pre>', content, re.DOTALL)
            err = m.group(1)[:150].strip() if m else 'erreur inconnue'
            print(f"  FAIL {url}")
            print(f"       {err}")
            fail += 1
        else:
            print(f"  OK   {url} [{status}]")
            ok += 1
    except Exception as e:
        print(f"  CRASH {url}: {e}")
        fail += 1

print(f"\nResultat: {ok} OK / {fail} FAIL")
