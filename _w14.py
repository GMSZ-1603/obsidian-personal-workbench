# -*- coding: utf-8 -*-
import io, sys, datetime
sys.stdout.reconfigure(encoding='utf-8')

NOTE = r"D:\Obsidian\Second Brain\生活\个人工作台数据.md"
YEAR = 2026

# ISO 周 -> (周六, 周日)
weeks = {}
d = datetime.date(YEAR, 1, 1)
while d.isoweekday() != 4:  # 找第一个周四
    d += datetime.timedelta(days=1)
while d.isocalendar()[0] == YEAR:
    iso = d.isocalendar()
    sat = d + datetime.timedelta(days=2)
    sun = d + datetime.timedelta(days=3)
    weeks[iso[1]] = (sat, sun)
    d += datetime.timedelta(days=7)

def mmdd(x): return x.strftime("%m%d")

lines = ["## 单双休安排", "### %d年" % YEAR, "", "| 周期  |    日期     |  休息日  |", "| :-: | :-------: | :---: |"]
for wk in sorted(weeks):
    sat, sun = weeks[wk]
    rest = "  周日   " if wk % 2 == 1 else " 周六、周日"
    lines.append("| %d  | %s-%s | %s |" % (wk, mmdd(sat), mmdd(sun), rest.strip()))
# 尾部空行
body = "\n".join(lines) + "\n\n\n"

s = io.open(NOTE, encoding='utf-8').read()
i1 = s.find("## 单双休安排")
i2 = s.find("## 生活安排")
assert i1 >= 0 and i2 > i1, (i1, i2)
s = s[:i1] + body + s[i2:]
io.open(NOTE, 'w', encoding='utf-8').write(s)
print("OK weeks=%d written" % len(weeks))
print(lines[6], lines[7], lines[-1])
