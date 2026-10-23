# -*- coding: utf-8 -*-
import io, sys
sys.stdout.reconfigure(encoding='utf-8')
p = r"C:\Users\admin\Doubao\chats\2026-09-03\new-chat-1\workbench-plugin\src\main.js"
s = io.open(p, encoding='utf-8').read()
old = '''可见当天生活安排。" });
  }
  }
}'''
new = '''可见当天生活安排。" });
  }
}'''
if old in s:
    s = s.replace(old, new, 1)
    io.open(p, 'w', encoding='utf-8').write(s)
    print("OK fixed double brace")
else:
    print("MISS", s.find('可见当天生活安排'))
    # 打印该段
    i = s.find('可见当天生活安排')
    print(repr(s[i-20:i+120]))
