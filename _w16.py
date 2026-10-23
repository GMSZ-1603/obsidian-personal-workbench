# -*- coding: utf-8 -*-
import io, sys, re
sys.stdout.reconfigure(encoding='utf-8')
base = r"C:\Users\admin\Doubao\chats\2026-09-03\new-chat-1\workbench-plugin"
r = io.open(base + r"\render-test.js", encoding='utf-8').read()
out = []
for m in re.finditer(r'getActivities', r):
    out.append("getActivities @ %d:\n%s" % (m.start(), r[max(0,m.start()-200):m.start()+300]))
for m in re.finditer(r'wb-weekend', r):
    out.append("wb-weekend @ %d:\n%s" % (m.start(), r[max(0,m.start()-150):m.start()+150]))
for m in re.finditer(r'wb-lg-act', r):
    out.append("wb-lg-act @ %d:\n%s" % (m.start(), r[max(0,m.start()-150):m.start()+150]))
io.open(base + r"\_c.txt", 'w', encoding='utf-8').write(chr(10).join(out))
print("ok")
