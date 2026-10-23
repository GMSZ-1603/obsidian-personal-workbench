# -*- coding: utf-8 -*-
import io, sys
sys.stdout.reconfigure(encoding='utf-8')
p = r"C:\Users\admin\Doubao\chats\2026-09-03\new-chat-1\workbench-plugin\src\main.js"
s = io.open(p, encoding='utf-8').read()
old = '''  async getData(force) {
    const c = this.dataCache;'''
new = '''  async getData(force) {
    if (!this.dataCache) this.dataCache = { data: null, stale: true };
    const c = this.dataCache;'''
if old in s:
    s = s.replace(old, new, 1)
    io.open(p, 'w', encoding='utf-8').write(s)
    print("OK lazy dataCache")
else:
    print("MISS")
