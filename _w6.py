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

# 1) 生日文件 -> 数据文件
rep('''    new Setting(containerEl).setName("生日文件").setDesc("存放「姓名，农历月日」的笔记路径（相对库根目录）")
      .addText(t => t.setValue(this.plugin.settings.birthdayFile).onChange(async v => { this.plugin.settings.birthdayFile = v; this.plugin.birthdayCache.stale = true; await this.plugin.saveSettings(); }));''',
'''    new Setting(containerEl).setName("数据文件").setDesc("统一数据源笔记路径（相对库根目录），含「## 生日日期」「## 单双休安排」「## 生活安排」三个区块")
      .addText(t => t.setValue(this.plugin.settings.dataFile).onChange(async v => { this.plugin.settings.dataFile = v.trim() || DATA_FILE_DEFAULT; this.plugin.dataCache.stale = true; this.plugin.birthdayCache.stale = true; await this.plugin.saveSettings(); }));''',
'1 dataFile setting')

# 2) 轮休设置块 -> 说明（从 h3 到 details 块结束）
old2 = '''    containerEl.createEl("h3", { text: "轮休设置" });
    new Setting(containerEl).setName("周末休息模式").setDesc("单双轮休：单休周只休一天，按奇偶周交替；手动：逐个周末指定")
      .addDropdown(dd => dd.addOption("double", "每周双休").addOption("single-double", "单双轮休").addOption("manual", "手动逐周")
        .setValue(this.plugin.settings.restMode)
        .onChange(async v => { this.plugin.settings.restMode = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("单休周休息日").setDesc("单休周休哪一天（另一天上班）")
      .addDropdown(dd => dd.addOption("sat", "休周六").addOption("sun", "休周日")
        .setValue(this.plugin.settings.singleDay)
        .onChange(async v => { this.plugin.settings.singleDay = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("当前周状态").setDesc("本周是单休还是双休，轮休按此顺序往下交替")
      .addDropdown(dd => dd.addOption("single", "本周单休").addOption("double", "本周双休")
        .setValue(this.plugin.settings.sdStart)
        .onChange(async v => { this.plugin.settings.sdStart = v; await this.plugin.saveSettings(); }));'''
new2 = '''    containerEl.createEl("h3", { text: "轮休设置" });
    containerEl.createEl("div", { cls: "wb-set-note", text: "单双休由「数据文件 → ## 单双休安排」表格读取（每周一行：周期 / 日期 / 休息日）。休息日列填「周日」=单休，填「周六、周日」=双休。" });'''
rep(old2, new2, '2 rest settings -> note')

# 3) 删除手动轮休表 details 块（从 "// 手动轮休表" 到该 details 块结束）
i3 = s.find('    // 手动轮休表：折叠 + 年份切换 + 全年周列表')
i4 = s.find('    _renderWeeks();', i3)
if i3 > 0 and i4 > 0:
    # 找 details 块结束：_det 相关代码后的下一个 h3 或 display 结束标记
    # 先找 "复制上一年" 按钮 onClick 结束到 details 闭合
    j = s.find('复制上一年', i3)
    k = s.find('});', j)  # addButton onClick 闭合
    k2 = s.find('});', k+1)  # new Setting(_det) 闭合
    k3 = s.find('}', k2+1)  # 可能还有
    print('manual block: i3=%d i4=%d j=%d k2=%d' % (i3, i4, j, k2))
    print(repr(s[i3:i3+80]))
    print(repr(s[k2-150:k2+150]))
else:
    print('MISS manual table anchors', i3, i4)

io.open(p, 'w', encoding='utf-8').write(s)
print("written", len(s))
