# 高湖村二手交易 - 项目记忆

## 技术栈
- 微信小程序云开发（云函数 + 云数据库 + 云存储）
- 前端：WXML + WXSS + JS
- 后端：云函数（wx-server-sdk）
- TabBar：首页/分类/发布/留言/我的

## 关键约定
- 云函数返回格式：`{ success: true, data: ... }` 或 `{ success: false, message: '...' }`
- `request.js` 的 `callFunction` 会自动解出 `result.data`
- 收藏查询用 `_openid`（云函数自动注入），不用 `userId`
- 新发布商品默认 `status: 'selling'`
- 不使用 `getPhoneNumber`（需企业认证），手机号手动输入
- 已移除"求购"功能模块
- 已移除"所在村组"功能，所有页面不再显示和选择村组
- 已移除电话/微信联系按钮，改为"在线联系"（聊天功能）
- 首页分类用 broad ID（如 `agri`），数据库存的是具体 ID（如 `agri_vegetable`），云函数用前缀匹配

## 数据库集合（12个）
users, goods, categories, favorites, wanted, wantedResponses, posts, comments, notices, likes, messages, chatList

## 常见问题
- 云函数修改后必须重新上传才能生效
- 热重载有时不生效，需手动点"编译"
- `formatRelativeTime` 不存在，应使用 `getRelativeTime`；`formatDate` 不存在，用 `formatTime`
- 云数据库的 Date 字段经云函数返回后被序列化为 `{ $date: "ISO字符串" }` 对象，前端必须用 `toTimestamp()` 转换后才能做日期运算，否则得到 NaN
- TabBar 页面不会销毁重建，发布页等需要在 `onShow` 中检测并重置表单数据
- chatId 规则：两个 openid 排序后拼接 + 可选 goodsId，格式 `{id1}_{id2}_{goodsId}`
