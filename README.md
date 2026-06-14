# 高湖村二手交易平台 - 项目说明

## 项目概述
本项目的完整微信小程序代码，包含 17 个页面、3 个自定义组件、18 个云函数。

## 文件结构统计
- 项目配置文件：5 个
- 工具类文件：3 个
- 页面文件：17 个页面 × 4 文件 = 68 个
- 自定义组件：3 个 × 4 文件 = 12 个
- 云函数：18 个（每个含 index.js + package.json）= 36 个
- 数据库脚本：1 个
- **总计：125 个文件**

## 功能模块对照 PRD

| PRD 模块 | 页面 | 状态 |
|---------|------|------|
| 1. 首页 Feed 流 | pages/index | ✅ |
| 2. 商品详情 | pages/goods-detail | ✅ |
| 3. 发布商品 | pages/publish | ✅ |
| 4. 分类浏览 | pages/category | ✅ |
| 5. 搜索（含热搜） | pages/search | ✅ |
| 6. 个人中心 | pages/profile | ✅ |
| 7. 我的发布 | pages/my-goods | ✅ |
| 8. 我的收藏 | pages/my-favorites | ✅ |
| 9. 编辑资料 | pages/edit-profile | ✅ |
| 10. 求购广场 | pages/wanted | ✅ |
| 11. 发布求购 | pages/publish-wanted | ✅ |
| 12. 求购详情 | pages/wanted-detail | ✅ |
| 13. 社区留言板 | pages/board | ✅ |
| 14. 留言详情 | pages/board-detail | ✅ |
| 15. 发布留言 | pages/publish-board | ✅ |
| 16. 公告详情 | pages/notice-detail | ✅ |
| 17. 热搜榜 | pages/hot-rank | ✅ |

## 下一步操作指南

### 1. 安装微信开发者工具
下载地址：https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html

### 2. 导入项目
- 打开微信开发者工具
- 选择"导入项目"
- 项目目录选择 `D:\code\高湖村二手交易`
- 使用测试号或绑定 AppID

### 3. 开通云开发
- 点击开发者工具顶部"云开发"按钮
- 开通云开发环境（免费版即可）
- 记录环境 ID

### 4. 部署云函数
在开发者工具中，右键每个云函数目录 → "上传并部署：云端安装依赖"
需要部署的云函数：
userLogin, publishGoods, getGoodsList, getGoodsDetail, searchGoods,
toggleFavorite, publishWanted, getWantedList, publishPost, getPostList,
getHotRank, updateGoodsStatus, getUserInfo, updateUserProfile,
getNotices, respondWanted, commentPost

### 5. 创建数据库集合
在云开发控制台 → 数据库 中创建以下集合：
- users（用户表）
- goods（商品表）
- categories（分类表）
- favorites（收藏表）
- wanted（求购表）
- wantedResponses（求购响应表）
- posts（留言表）
- comments（评论表）
- notices（公告表）

### 6. 初始化数据
运行 `database/init-database.js` 云函数或在数据库控制台手动添加分类数据。

### 7. 添加 TabBar 图标
将以下图标文件放入 `images/tabbar/` 目录（81×81 PNG）：
- home.png / home-active.png
- category.png / category-active.png
- publish.png / publish-active.png
- wanted.png / wanted-active.png
- board.png / board-active.png
- profile.png / profile-active.png

（可自制简单图标或使用微信官方图标库）

### 8. 修改 app.js 中的云开发调用
如果不需要云开发，可将 `app.js` 中的 `callCloudFunction` 改为调用自己的后端 API。

## 注意事项
1. **地理位置**：需要申请腾讯位置服务 Key
3. **内容安全**：用户生成内容需调用 msgSecCheck API 进行审核
4. **图片上传**：需要配置云存储权限
5. **隐私协议**：上线前需在小程序后台配置隐私政策

## 技术支持
如有问题，检查微信开发者工具控制台错误信息，或查阅官方文档：
https://developers.weixin.qq.com/miniprogram/dev/framework/
