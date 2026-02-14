# 中国主流音乐网站聚合搜索（原型）

这个版本重点修复了“截图只有 Not Found”的排查与稳定启动问题。

## 你会得到什么

- 一个可直接运行的网页：一次搜索网易云、QQ 音乐、酷狗、酷我、咪咕。
- 点击结果可弹出内嵌播放器（`<audio>`）播放；不可直链时自动给平台搜索跳转。
- 同源 `/api` 代理，避免前端直连第三方接口产生 CORS 问题。

## 启动

```bash
npm start
```

默认端口是 `8787`（故意不占用常见的 8000，避免端口冲突导致误看到别的服务的 `Not Found`）。

打开：`http://localhost:8787`

## 快速自检（重点）

如果你看到页面只有 `Not Found`，通常说明“当前端口不是本项目服务”。请先执行：

```bash
curl http://127.0.0.1:8787/health
```

正确返回应包含：`"app":"music_search_omni"`。

## 可配置项

- `PORT`：服务端口（默认 `8787`）
- `UPSTREAM`：上游聚合 API（默认 `https://music-api.gdstudio.xyz/api.php`）

例如：

```bash
PORT=9000 UPSTREAM=https://your-api.example.com npm start
```

## 测试建议（无公网依赖）

可开启本地 mock 数据，避免上游 API 不稳定影响联调：

```bash
MOCK_API=1 npm start
```

然后访问 `http://localhost:8787`，搜索任意关键词即可看到结果并测试弹窗播放器与歌词加载。
