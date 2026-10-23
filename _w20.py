# -*- coding: utf-8 -*-
import io, sys
sys.stdout.reconfigure(encoding='utf-8')
base = r"C:\Users\admin\Doubao\chats\2026-09-03\new-chat-1\workbench-plugin"

def repf(path, old, new, tag):
    s = io.open(path, encoding='utf-8').read()
    if old in s:
        s = s.replace(old, new, 1)
        io.open(path, 'w', encoding='utf-8').write(s)
        print("OK", tag)
    else:
        print("MISS", tag)

rt = base + r"\render-test.js"

# R1) getActivities mock -> getLifeActivities
repf(rt, '''  plugin.getActivities = async () => {''',
        '''  plugin.getLifeActivities = async () => {''', 'R1 life mock')

# R2) 轮休断言重写（笔记表驱动：37 奇单休 38 偶双休）
old_r2 = '''  const _w37Single = (plugin.settings.sdStart === "single") === ((37 % 2) === (_wkNow % 2));
  const _w38Single = (plugin.settings.sdStart === "single") === ((38 % 2) === (_wkNow % 2));
  check("W37周六按单双轮休", _w37Single ? (cl(12).includes("wb-workday") && !cl(12).includes("wb-weekend")) : cl(12).includes("wb-weekend"), cl(12) + " wkNow=" + _wkNow + " w37Single=" + _w37Single);
  check("W37周日休息(单双均休周日)", cl(13).includes("wb-weekend"), cl(13));
  check("W38周六按单双轮休", _w38Single ? (cl(19).includes("wb-workday") && !cl(19).includes("wb-weekend")) : cl(19).includes("wb-weekend"), cl(19) + " w38Single=" + _w38Single);
  check("9/20调休补班非休息", cl(20).includes("wb-workday") && !cl(20).includes("wb-weekend"), cl(20));
  plugin.settings.restMode = "double";'''
new_r2 = '''  check("W37周六单休周上班", cl(12).includes("wb-workday") && !cl(12).includes("wb-restday"), cl(12));
  check("W37周日休息", cl(13).includes("wb-restday"), cl(13));
  check("W38周六双休周休息", cl(19).includes("wb-restday"), cl(19));
  check("9/20调休补班非休息", cl(20).includes("wb-workday") && !cl(20).includes("wb-restday"), cl(20));'''
repf(rt, old_r2, new_r2, 'R2 rest asserts')

# R3) 图例含活动 -> 含生活
repf(rt, '''  check("图例含活动", _legAct.some(t => t.includes("活动")), _legAct.join(","));''',
        '''  check("图例含生活", _legAct.some(t => t.includes("生活")), _legAct.join(","));''', 'R3 legend life')

# ---- test.js 追加数据解析块 ----
tj = base + r"\test.js"
anchor = '''console.log(`\\n通过 ${pass} / ${pass + fail}`);'''
add = '''console.log("== 数据解析(笔记版) ==");
{
  const d = T.expandLifeDates;
  eq("生活缩位范围", JSON.stringify(d("20261002-07", 2026)), JSON.stringify(["2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07"]));
  eq("生活多段级联", JSON.stringify(d("20261007、14、21、28", 2026)), JSON.stringify(["2026-10-07", "2026-10-14", "2026-10-21", "2026-10-28"]));
  eq("生活单日", JSON.stringify(d("20261001", 2026)), JSON.stringify(["2026-10-01"]));
  eq("生活跨年范围", JSON.stringify(d("20261230-20270102", 2026)), JSON.stringify(["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]));
  eq("生活空输入", JSON.stringify(d("", 2026)), "[]");
  const sample = "## 生日日期\\n卢小南，爸爸，一九六四年八月十二\\n张玉轩，轩轩，\\n\\n## 单双休安排\\n### 2026年\\n\\n| 周期  |    日期     |  休息日  |\\n| :-: | :-------: | :---: |\\n| 41  | 1010-1011 |  周日   |\\n| 42  | 1017-1018 | 周六、周日 |\\n\\n## 生活安排\\n### 2026年\\n\\n| 日期                | 生活   |\\n| ----------------- | ---- |\\n| 20261002-07       | 回盱眙  |\\n| 20261007、14、21、28 | 老爸休息 |";
  const df = T.parseDataFile(sample);
  eq("生日农历年解析", df.birthdays[0].type + ":" + df.birthdays[0].month + ":" + df.birthdays[0].day + ":" + df.birthdays[0].lunarYear + ":" + df.birthdays[0].nickname, "lunar:8:12:1964:爸爸");
  eq("生日无日期跳过", df.birthdays.length, 1);
  eq("单双休 41 单休", df.weekRest["2026"]["41"], "sun");
  eq("单双休 42 双休", df.weekRest["2026"]["42"], "double");
  const lm = df.lifeMap;
  eq("生活范围首日", JSON.stringify((lm.get("2026-10-02") || []).map(a => a.name)), JSON.stringify(["回盱眙"]));
  eq("生活范围末日", JSON.stringify((lm.get("2026-10-07") || []).map(a => a.name)), JSON.stringify(["回盱眙"]));
  eq("生活多段集", JSON.stringify((lm.get("2026-10-21") || []).map(a => a.name)), JSON.stringify(["老爸休息"]));
  const rt = T.restFromTable;
  eq("休息表 周六双休", rt(df.weekRest, 2026, 10, 10, 6), true);
  eq("休息表 周日单休(41周)", rt(df.weekRest, 2026, 10, 11, 0), true);
  eq("休息表 单休周六上班", rt(df.weekRest, 2026, 10, 10, 6) === true && rt({ "2026": { "41": "sun" } }, 2026, 10, 10, 6) === false, true);
  eq("休息表 双休周周日", rt({ "2026": { "42": "double" } }, 2026, 10, 18, 0), true);
  eq("休息表 缺省双休", rt(null, 2026, 10, 17, 6), true);
}

'''
s = io.open(tj, encoding='utf-8').read()
if anchor in s:
    s = s.replace(anchor, add + anchor, 1)
    io.open(tj, 'w', encoding='utf-8').write(s)
    print("OK test.js add data-parse block")
else:
    print("MISS test.js anchor")
