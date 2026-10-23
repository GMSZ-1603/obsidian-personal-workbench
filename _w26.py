# -*- coding: utf-8 -*-
import io, sys
sys.stdout.reconfigure(encoding='utf-8')
base = r"C:\Users\admin\Doubao\chats\2026-09-03\new-chat-1\workbench-plugin"

# 1) src/main.js 导出补 ACTIVITY_DEFAULT_COLOR
p = base + r"\src\main.js"
s = io.open(p, encoding='utf-8').read()
old = '''expandActivityDates, buildActivityMap, expandLifeDates, parseDataFile, restFromTable, parseLifeRow, lunarLib'''
new = '''expandActivityDates, buildActivityMap, ACTIVITY_DEFAULT_COLOR, expandLifeDates, parseDataFile, restFromTable, parseLifeRow, lunarLib'''
if old in s:
    s = s.replace(old, new, 1); io.open(p, 'w', encoding='utf-8').write(s); print("OK export color")
else:
    print("MISS export color")

# 2) test.js 生活范围末日断言
t = base + r"\test.js"
s2 = io.open(t, encoding='utf-8').read()
old2 = '''  eq("生活范围末日", JSON.stringify((lm.get("2026-10-07") || []).map(a => a.name)), JSON.stringify(["回盱眙"]));'''
new2 = '''  eq("生活范围末日+多段首日", JSON.stringify((lm.get("2026-10-07") || []).map(a => a.name)), JSON.stringify(["回盱眙", "老爸休息"]));'''
if old2 in s2:
    s2 = s2.replace(old2, new2, 1); io.open(t, 'w', encoding='utf-8').write(s2); print("OK life assert")
else:
    print("MISS life assert")
