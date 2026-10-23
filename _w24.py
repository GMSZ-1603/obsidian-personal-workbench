# -*- coding: utf-8 -*-
import io, sys
sys.stdout.reconfigure(encoding='utf-8')
p = r"C:\Users\admin\Doubao\chats\2026-09-03\new-chat-1\workbench-plugin\src\main.js"
s = io.open(p, encoding='utf-8').read()
old = '''      const f = this.app.vault.getAbstractFileByPath(this.settings.dataFile);'''
new = '''      const fp = this.settings.dataFile || DATA_FILE_DEFAULT;
      const f = this.app.vault.getAbstractFileByPath(fp);'''
if old in s:
    s = s.replace(old, new, 1)
    io.open(p, 'w', encoding='utf-8').write(s)
    print("OK dataFile fallback")
else:
    print("MISS")
