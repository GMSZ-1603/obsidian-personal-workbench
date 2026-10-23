# -*- coding: utf-8 -*-
import io, sys, re
sys.stdout.reconfigure(encoding='utf-8')
base = r"C:\Users\admin\Doubao\chats\2026-09-03\new-chat-1\workbench-plugin"
t = io.open(base + r"\test.js", encoding='utf-8').read()
r = io.open(base + r"\render-test.js", encoding='utf-8').read()
out = []
for name, s in (("TEST", t), ("RENDER", r)):
    for kw in ['getActivities', 'getLifeActivities', 'getData', 'activityByKey', 'activities', 'wb-weekend', 'wb-restday', '● 活动', '● 生活', '活动解析', 'expandActivityDates', 'buildActivityMap', 'getWeekRest', 'wb-lg-act']:
        n = len(re.findall(re.escape(kw), s))
        out.append("%s %s=%d" % (name, kw, n))
io.open(base + r"\_c.txt", 'w', encoding='utf-8').write(chr(10).join(out))
print("ok")
