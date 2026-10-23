# -*- coding: utf-8 -*-
import io, sys
sys.stdout.reconfigure(encoding='utf-8')
p = r"C:\Users\admin\Doubao\chats\2026-09-03\new-chat-1\workbench-plugin\src\main.js"
s = io.open(p, encoding='utf-8').read()

# 1) 删除手动轮休表块（注释行 -> _renderWeeks();）
i3 = s.find('    // 手动轮休表：折叠 + 年份切换 + 全年周列表')
i4 = s.find('    _renderWeeks();', i3)
if i3 > 0 and i4 > 0:
    i4 += len('    _renderWeeks();\n')
    s = s[:i3] + s[i4:]
    print("OK remove manual rest table")
else:
    print("MISS manual rest table")

# 2) renderActivities 调用 -> renderActivitiesNote
old2 = '''    this.renderActivities(containerEl);
  }

  renderActivities(containerEl) {'''
new2 = '''    this.renderActivitiesNote(containerEl);
  }

  renderActivitiesNote(containerEl) {'''
if old2 in s:
    s = s.replace(old2, new2, 1); print("OK rename call+method head")
else:
    print("MISS rename head")

# 3) renderActivities 方法体 -> 说明
i5 = s.find('  renderActivitiesNote(containerEl) {')
i6 = s.find('    new Setting(containerEl).addButton(b => b.setButtonText("＋ 添加活动")')
if i5 > 0 and i6 > 0:
    # 找到该方法体结束：addButton 回调闭合 + 方法 } 
    i7 = s.find('});\n  }\n', i6)
    if i7 > 0:
        body_end = i7 + len('});\n  }\n')
        note = '''  renderActivitiesNote(containerEl) {
    containerEl.createEl("h3", { text: "生活安排" });
    containerEl.createEl("div", { cls: "wb-set-note", text: "生活安排（回家、旅行、老爸休息等）由「数据文件 → ## 生活安排」表格读取。表格两列：日期 / 名称。日期支持 20261001（单日）、20261002-07（范围）、20261007、14、21、28（多段，后续省略年月）。日历以紫色「● 生活」显示，日期详情可见当天生活安排。" });
  }
'''
        s = s[:i5] + note + s[body_end:]
        print("OK replace method body")
    else:
        print("MISS method body end")
else:
    print("MISS method anchors", i5, i6)

io.open(p, 'w', encoding='utf-8').write(s)
print("written", len(s))
