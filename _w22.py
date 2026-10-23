# -*- coding: utf-8 -*-
import io, sys
sys.stdout.reconfigure(encoding='utf-8')
base = r"C:\Users\admin\Doubao\chats\2026-09-03\new-chat-1\workbench-plugin"
r = io.open(base + r"\render-test.js", encoding='utf-8').read()
out = []
for kw in ['onOpen', 'new WorkbenchPlugin', 'activityCache', 'dataCache', 'settings =', 'loadData']:
    for m in __import__('re').finditer(kw, r):
        out.append("%d | %s" % (m.start(), r[max(0,m.start()-80):m.start()+100].replace(chr(10),' ')))
io.open(base + r"\_c.txt", 'w', encoding='utf-8').write(chr(10).join(out[:30]))
print("ok")
