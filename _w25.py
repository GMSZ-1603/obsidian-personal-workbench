# -*- coding: utf-8 -*-
import io, sys
sys.stdout.reconfigure(encoding='utf-8')
p = r"C:\Users\admin\Doubao\chats\2026-09-03\new-chat-1\workbench-plugin\test.js"
s = io.open(p, encoding='utf-8').read()
old = '''  eq("休息表 周六双休", rt(df.weekRest, 2026, 10, 10, 6), true);
  eq("休息表 周日单休(41周)", rt(df.weekRest, 2026, 10, 11, 0), true);
  eq("休息表 单休周六上班", rt(df.weekRest, 2026, 10, 10, 6) === true && rt({ "2026": { "41": "sun" } }, 2026, 10, 10, 6) === false, true);'''
new = '''  eq("休息表 41周六单休上班", rt(df.weekRest, 2026, 10, 10, 6), false);
  eq("休息表 41周日单休休息", rt(df.weekRest, 2026, 10, 11, 0), true);
  eq("休息表 42周六双休休息", rt(df.weekRest, 2026, 10, 17, 6), true);
  eq("休息表 单休周六上班", rt({ "2026": { "41": "sun" } }, 2026, 10, 10, 6), false);'''
if old in s:
    s = s.replace(old, new, 1)
    io.open(p, 'w', encoding='utf-8').write(s)
    print("OK test fixed")
else:
    print("MISS")
