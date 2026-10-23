# -*- coding: utf-8 -*-
import io, sys
sys.stdout.reconfigure(encoding='utf-8')
base = r"C:\Users\admin\Doubao\chats\2026-09-03\new-chat-1\workbench-plugin"
r = io.open(base + r"\render-test.js", encoding='utf-8').read()
out = r[18050:18350]
io.open(base + r"\_c.txt", 'w', encoding='utf-8').write(out)
print("ok")
