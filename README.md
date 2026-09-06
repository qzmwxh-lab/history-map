# History Map / 拓荒者足迹

一个面向历史资料浏览、路线展示与 360° 全景漫游的静态 Web 应用。主地图位于 `index.html`，全景编辑器位于 `vr.html`，独立管理工作台位于 `admin.html`。数据、认证和媒体存储由 Supabase 提供。

## 功能

- 中英文历史点位地图、年代筛选和主题路线
- 会员提交、管理员审核历史点位
- 全景作品、场景、热点和自动漫游
- PWA 安装及有限离线访问
- Supabase Realtime 数据刷新

## 本地运行

需要 Node.js 20 或更新版本。

```bash
npm ci --ignore-scripts
npm run verify
python3 -m http.server 8080
```

然后访问 `http://localhost:8080/`。不要直接双击 HTML 文件运行，因为 Service Worker、模块安全策略和部分浏览器 API 需要 HTTP 环境。

## Supabase 配置

浏览器端配置集中在 `app-config.js`。其中只能放 Supabase publishable/anon key，绝不能放 `service_role` 或 secret key。

首次部署或升级时：

1. 检查 `supabase/migrations/20260906000000_secure_public_data.sql` 是否与现有表结构兼容。
2. 使用 Supabase CLI 或 SQL Editor 应用迁移。
3. 通过受信任的 Admin API 将管理员用户的 `app_metadata.role` 设置为 `admin`。
4. 使用匿名、普通会员、管理员三个身份分别验证读取、提交、审核、删除和上传权限。

前端显示或隐藏按钮不是权限控制。真正的授权由数据库和 Storage RLS 完成。

## 独立管理后台

访问 `/admin.html`（项目子目录部署时保留子目录），使用管理员账号登录。

- 概览：精确统计全部点位、待审核、已发布、VR 作品数量。
- 点位：按名称搜索、每页 20 条服务端分页、新建、编辑、审核发布、确认删除。
- VR：维护作品和场景、上传全景图片 / 视频、设置初始视角，跳转现有编辑器维护热点。
- 安全：登录及每次写操作重新验证管理员身份；用户数据使用 DOM 文本渲染；后台页面不进入 Service Worker 离线缓存。
- 删除会保留 Storage 文件；数据库关联记录如何处理取决于现有外键规则，请先备份。上传成功而保存失败时，文件地址留在表单以便重试；关闭表单可能留下待人工清理的未引用文件。

这是独立的管理前端，认证、数据库及存储服务仍使用现有 Supabase，不包含另建服务器或账号授权界面。不要将管理员密钥写入页面。

当前配置的 Supabase 地址在本地验证环境无法连接，因此尚未完成真实账号和远端 CRUD 联调。已有 RLS 策略时，第一份迁移会主动拒绝执行，必须先审核旧策略；全景原子排序还需检查并应用 `20260906001000_atomic_scene_order.sql`。两份迁移均未在远端执行。上线前必须验证真实表字段、外键、管理员及普通用户权限。

## 找回密码配置

后台登录页的“忘记密码”通向 `reset-password.html`。输入注册邮箱后发送恢复邮件，打开有效链接后设置新密码，成功后返回登录。恢复页面使用独立、仅内存的认证会话；刷新或关闭后需重新申请有效邮件。不在浏览器存储密码，不赋予管理员权限。

上线前在 Supabase Authentication → URL Configuration 的 Redirect URLs 中添加准确的回调地址：

- 本地预览：`http://127.0.0.1:4180/reset-password.html`（若更换端口需同步修改允许列表）。
- 正式站点：`https://你的域名/项目路径/reset-password.html`。

配置正确的 Site URL，并确认恢复邮件模板保留官方的 ConfirmationURL 链接及邮件发送服务可用。回调地址需与访问页面的域名、端口、子目录一致；不要把正式站点回调配置为 localhost。默认邮件服务可能有限制，生产环境应配置并验证 SMTP。

流程依据 [Supabase 密码恢复接口](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail) 和 [重定向配置](https://supabase.com/docs/guides/auth/redirect-urls)。本地模拟测试不代表已验证实际邮件送达；目前云端连接仍待恢复。新密码由用户在页面自行输入，不应通过聊天发送。

## 数据与媒体

- `missionary_points`：历史点位及审核状态
- `vr_works`：全景作品
- `vr_scenes`：作品场景
- `vr_hotspots`：场景热点
- `history-media`：点位图片、音视频和 PDF
- `vr-media`：全景图片和视频

媒体文件存放在 Storage，数据表只保存 URL。客户端和 bucket 都限制文件大小与 MIME 类型。

## 安全约定

- 管理员身份只读取服务端签发的 `app_metadata.role`。
- 用户内容进入 HTML 前必须经过 `security.js` 转义。
- 媒体 URL 只接受 `http:`、`https:` 和页面创建的 `blob:` URL。
- 不在浏览器存储密码；“记住我”只记录邮箱。
- 数据库写入成功后才更新界面；上传和数据库写入不是跨服务事务，需定期检查未引用媒体。

## 部署

所有站内链接、Manifest 和 Service Worker 都使用相对路径，可部署在 GitHub Pages 的项目子路径，例如：

```text
https://<account>.github.io/history-map/
```

部署前必须先应用 Supabase 安全迁移。未配置 RLS 时不要开放注册或管理入口。

## 检查

```bash
npm run check   # HTML、内联 JavaScript、关键安全回归
npm test        # 安全、DOM 管理流程和 Service Worker 回归测试
npm run verify  # 全部检查
```

## 坐标说明

高德地图瓦片在中国境内采用 GCJ-02。录入来自 GPS、GeoJSON 或国际资料的 WGS-84 坐标时，应先完成坐标系确认和转换，否则可能出现位置偏移。

## 许可证

仓库尚未选择开源许可证。发布或接受外部贡献前，请由项目所有者确定许可证并添加 `LICENSE`。
