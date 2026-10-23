# -*- coding: utf-8 -*-
import io, sys
sys.stdout.reconfigure(encoding='utf-8')
p = r"C:\Users\admin\Doubao\chats\2026-09-03\new-chat-1\workbench-plugin\src\main.js"
s = io.open(p, encoding='utf-8').read()

i5 = s.find('  renderActivitiesNote(containerEl) {')
print('method @', i5)
# 找方法体结束：addButton(＋ 添加活动) 的 onClick 闭合 "    }));" 后的 "  }\n"
j = s.find('＋ 添加活动', i5)
k = s.find('    }));', j)
print('addBtn @', j, 'close @', k)
# 方法闭合
i_end = s.find('  }\n', k + 1)
# 若下一个是类闭合 "}"，i_end 指向方法闭合
note = '''  renderActivitiesNote(containerEl) {
    containerEl.createEl("h3", { text: "生活安排" });
    containerEl.createEl("div", { cls: "wb-set-note", text: "生活安排（回家、旅行、老爸休息等）由「数据文件 → ## 生活安排」表格读取。表格两列：日期 / 名称。日期支持 20261001（单日）、20261002-07（范围）、20261007、14、21、28（多段，后续省略年月）。日历以紫色「● 生活」显示，日期详情可见当天生活安排。" });
  }
'''
if i5 > 0 and i_end > i5:
    s = s[:i5] + note + s[i_end:]
    print("OK replace method body, end @", i_end)
else:
    print("MISS anchors", i5, i_end)
io.open(p, 'w', encoding='utf-8').write(s)
print("written", len(s))
