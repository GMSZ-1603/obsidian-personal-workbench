# -*- coding: utf-8 -*-
import io, json, sys
sys.stdout.reconfigure(encoding='utf-8')
base = r"C:\Users\admin\Doubao\chats\2026-09-03\new-chat-1\workbench-plugin"
VER = "1.5.15"

for rel in ["manifest.json", r"src\manifest.json", r"dist\manifest.json"]:
    p = base + "\\" + rel
    d = json.load(io.open(p, encoding='utf-8'))
    d["version"] = VER
    io.open(p, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
    print("OK manifest", rel)

for rel in ["versions.json", r"dist\versions.json"]:
    p = base + "\\" + rel
    d = json.load(io.open(p, encoding='utf-8'))
    d[VER] = "1.5.2"
    io.open(p, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
    print("OK versions", rel)
