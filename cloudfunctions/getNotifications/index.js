// cloudfunctions/getNotifications/index.js - 获取评论/回复通知
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function batchConvert(fileIDs) {
  const urlMap = {};
  if (!fileIDs || fileIDs.length === 0) return urlMap;
  try {
    const unique = [...new Set(fileIDs.filter(Boolean))];
    if (unique.length === 0) return urlMap;
    const res = await cloud.getTempFileURL({ fileList: unique.slice(0, 50) });
    (res.fileList || []).forEach(f => {
      if (f.fileID && f.tempFileURL) urlMap[f.fileID] = f.tempFileURL;
    });
  } catch (e) { console.warn('[batchConvert] 失败:', e.message || e); }
  return urlMap;
}

exports.main = async (event) => {
  const { action = 'list' } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // 集合不存在时返回空数据，避免首次使用时报错
  const ensureCollection = async (name) => {
    try {
      return await db.collection(name).limit(1).get();
    } catch (e) {
      if (e.errCode === -502005 || String(e.message).includes('not exist')) {
        return null;
      }
      throw e;
    }
  };

  try {
    if (action === 'list') {
      // 检查集合是否存在
      const testRes = await ensureCollection('notifications');
      if (testRes === null) {
        return { success: true, data: { list: [] } };
      }

      // 获取发给当前用户的通知
      const res = await db.collection('notifications')
        .where({ toOpenid: openid })
        .orderBy('createTime', 'desc')
        .limit(50)
        .get();

      // 收集头像 cloud:// URL
      const avatarFileIDs = [];
      res.data.forEach(n => {
        if (n.fromUser && n.fromUser.avatarUrl && n.fromUser.avatarUrl.startsWith('cloud://')) {
          avatarFileIDs.push(n.fromUser.avatarUrl);
        }
      });
      const urlMap = await batchConvert(avatarFileIDs);

      const list = res.data.map(n => ({
        ...n,
        fromUser: {
          ...n.fromUser,
          avatarUrl: urlMap[n.fromUser.avatarUrl] || n.fromUser.avatarUrl || ''
        }
      }));

      return { success: true, data: { list } };
    }

    if (action === 'markRead') {
      const testRes = await ensureCollection('notifications');
      if (testRes === null) {
        return { success: true, data: { markedCount: 0 } };
      }

      // 标记所有通知为已读
      const unreadRes = await db.collection('notifications')
        .where({ toOpenid: openid, read: false })
        .get();

      for (const n of unreadRes.data) {
        await db.collection('notifications').doc(n._id).update({
          data: { read: true }
        }).catch(() => {});
      }

      return { success: true, data: { markedCount: unreadRes.data.length } };
    }

    return { success: false, message: '未知操作' };
  } catch (error) {
    return { success: false, message: '查询失败', error: error.message };
  }
};
