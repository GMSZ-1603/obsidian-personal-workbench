# -*- coding: utf-8 -*-
import io, sys
sys.stdout.reconfigure(encoding='utf-8')
p = r"C:\Users\admin\Doubao\chats\2026-09-03\new-chat-1\workbench-plugin\src\styles.css"
s = io.open(p, encoding='utf-8').read()

def rep(old, new, tag):
    global s
    if old in s:
        s = s.replace(old, new, 1); print("OK", tag)
    else:
        print("MISS", tag)

# 1) 背景渐变调亮
rep('''  background: linear-gradient(160deg, #0b0d13 0%, #151a28 60%, #0f1117 100%);''',
'''  background: linear-gradient(160deg, #151926 0%, #1d2436 60%, #131722 100%);''',
'1 bg gradient')

# 2) 主题变量调亮
rep('''  --wb-card: #1a1d27;
  --wb-card-2: #212531;
  --wb-line: rgba(255,255,255,.07);
  --wb-text: #e8eaf2;
  --wb-muted: #9aa0b0;''',
'''  --wb-card: #1f2330;
  --wb-card-2: #282d3d;
  --wb-line: rgba(255,255,255,.10);
  --wb-text: #f0f2f7;
  --wb-muted: #adb4c4;''',
'2 theme vars')

# 3) banner 背景调亮
rep('''    linear-gradient(120deg, #1c1f2e, #222639);''',
'''    linear-gradient(120deg, #232838, #2b324a);''',
'3 banner bg')

# 4) 休息日样式（wb-weekend -> wb-restday 更明显）
rep('''.wb-day.wb-weekend { background: color-mix(in srgb, var(--wb-holiday) 10%, var(--wb-card-2)); }''',
'''.wb-day.wb-restday { background: color-mix(in srgb, var(--wb-holiday) 22%, var(--wb-card-2)); border-color: color-mix(in srgb, var(--wb-holiday) 50%, transparent); }
.wb-day.wb-restday .wb-day-num { color: #ffb4b4; font-weight: 700; }''',
'4 restday style')

io.open(p, 'w', encoding='utf-8').write(s)
print("written", len(s))
