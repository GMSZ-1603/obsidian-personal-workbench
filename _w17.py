# -*- coding: utf-8 -*-
import io, sys
sys.stdout.reconfigure(encoding='utf-8')
base = r"C:\Users\admin\Doubao\chats\2026-09-03\new-chat-1\workbench-plugin"
r = io.open(base + r"\render-test.js", encoding='utf-8').read()
out = ["=== RENDER 18320-18920 ==="]
out.append(r[18320:18920])
t = io.open(base + r"\test.js", encoding='utf-8').read()
i = t.find('活动解析')
out.append("=== TEST 活动解析块 ===")
out.append(t[max(0,i-300):i+2500])
io.open(base + r"\_c.txt", 'w', encoding='utf-8').write(chr(10).join(out))
print("ok")
