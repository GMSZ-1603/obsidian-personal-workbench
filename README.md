# 个人工作台 (Personal Workbench)

Obsidian 插件：一个集成式的个人工作台独立视图页签，参考 [apex-dashboard](https://github.com/Slow-growing/apex-dashboard)（天气 / 农历 / 万年历 / 年度进度 / 统计横幅）与 [hearth](https://github.com/Slow-growing/hearth)（查询栏）设计。

## 功能

- **顶部统计横幅**：总笔记 / 本月新增 / 标签 / 链接 / 连续活跃天数 / 周月发文 / 任务完成率 / 连通度 / 孤立率，底部活跃点阵分 3 行展示（类似 apex）
- **查询栏**：搜索笔记、任务或输入命令
- **天气 + 农历**：当日天气与 6 天预报；下方显示干支、农历日期、节日/节气，以及每天自动更新的「每日一签」（按日期确定性生成，分两行展示）
- **农历万年历**：完整农历日历，标注节气、节日、生日与任务徽标；点击任意日期查看当日黄历（宜 / 忌）
- **年度进度**：当年已过百分比、进度条与剩余天数
- **今日任务**：自动统计所有 Tasks 任务，优先显示 `⏳ scheduled` 日期（无则回退 `📅 due`），可排除指定文件夹
- **生日提醒**：读取笔记中的农历生日（支持「姓名，称呼，农历出生年月日」格式），显示姓氏头像、称呼、农历月日与剩余天数；日历中同步标注
- **左右栏独立滚动**：顶部固定，下方左右两栏各自上下滚动，便于扩展更多卡片

## 安装

### 方法一：下载发布版

1. 在 Releases 页面下载最新版 `main.js`、`manifest.json`、`styles.css`、`data.json`
2. 在 vault 目录 `你的库/.obsidian/plugins/` 下新建文件夹 `personal-workbench`
3. 将四个文件放入该文件夹
4. 在 Obsidian「设置 → 第三方插件」中启用「个人工作台」

### 方法二：Clone 源码

```bash
git clone https://github.com/GMSZ-1603/obsidian-personal-workbench.git
cd obsidian-personal-workbench
npm install
npm run build
```

将 `dist/` 下的 `main.js`、`manifest.json`、`styles.css`、`data.json` 复制到 `你的库/.obsidian/plugins/personal-workbench/` 并启用。

## 使用

- 点击左侧边栏的仪表盘图标，或通过命令面板执行「打开个人工作台」
- 可在 `data.json` 中调整：城市与坐标（天气）、生日笔记路径、排除文件夹、各模块开关、启动时自动打开等

## 开发

```bash
node build.js        # 构建（lunar.js + main.js -> dist/main.js）
node render-test.js  # 渲染测试
node test.js         # 逻辑单元测试
node snapshot.js     # 生成本地预览快照 workbench-snapshot.html
```

## 更新日志

见项目内《个人工作台插件开发与发布标准操作文档.md》（v1.3.3）。

## 许可

MIT
