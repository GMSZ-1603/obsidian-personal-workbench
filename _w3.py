# -*- coding: utf-8 -*-
import io, sys
sys.stdout.reconfigure(encoding='utf-8')
p = r"C:\Users\admin\Doubao\chats\2026-09-03\new-chat-1\workbench-plugin\src\main.js"
s = io.open(p, encoding='utf-8').read()

def rep(old, new, tag):
    global s
    if old in s:
        s = s.replace(old, new, 1); print("OK", tag)
    else:
        print("MISS", tag)

# 1) Promise.all：getActivities -> getLifeActivities，并预载 getData
rep('''      this.getBirthdays(),
      this.getWeather(),
      this.getWeatherExtra(),
      this.getActivities()
    ]);''',
'''      this.getBirthdays(),
      this.getWeather(),
      this.getWeatherExtra(),
      this.getLifeActivities(),
      this.getData()
    ]);''',
'1 Promise.all')

# 2) 周末判定：笔记单双休表 + 新 class wb-restday
rep('''      else if (dow === 0 || dow === 6) {
        if (weekendRest(this.settings, c.y, c.m, c.d, dow)) cell.addClass("wb-weekend");
        else cell.addClass("wb-workday");
      }''',
'''      else if (dow === 0 || dow === 6) {
        const _rest = this.dataCache && this.dataCache.data ? this.dataCache.data.weekRest : null;
        if (restFromTable(_rest, c.y, c.m, c.d, dow)) cell.addClass("wb-restday");
        else cell.addClass("wb-workday");
      }''',
'2 restday from table')

# 3) 图例文案 活动 -> 生活
rep('''    legend.createSpan({ text: "● 活动", cls: "wb-lg-act" });''',
'''    legend.createSpan({ text: "● 生活", cls: "wb-lg-act" });''',
'3 legend life')

io.open(p, 'w', encoding='utf-8').write(s)
print("written", len(s))
