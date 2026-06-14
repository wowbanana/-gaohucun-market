// cloudfunctions/getUserInfo/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
async function batchConvert(fileIDs) { const urlMap = {}; if (!fileIDs || fileIDs.length === 0) return urlMap; try { const unique = [...new Set(fileIDs.filter(Boolean))]; if (unique.length === 0) return urlMap; const res = await cloud.getTempFileURL({ fileList: unique.slice(0, 50) }); (res.fileList || []).forEach(f => { if (f.fileID && f.tempFileURL) urlMap[f.fileID] = f.tempFileURL; }); } catch (e) { console.warn('[batchConvert] 失败:', e.message || e); } return urlMap; }

exports.main = async (event) => {
  const { userId } = event;
  const wxContext = cloud.getWXContext();

  try {
    const targetId = userId || wxContext.OPENID;
    const res = await db.collection('users').where({ _openid: targetId }).get();

    if (res.data.length > 0) {
      const user = res.data[0];
      // 转换头像 cloud:// URL
      let avatarUrl = user.avatarUrl || '';
      if (avatarUrl && avatarUrl.startsWith('cloud://')) {
        const urlMap = await batchConvert([avatarUrl]);
        avatarUrl = urlMap[avatarUrl] || avatarUrl;
      }
      return {
        success: true,
        data: {
          _id: user._id,
          _openid: user._openid,
          nickName: user.nickName || '用户',
          avatarUrl,
          phone: user.phone || '',
          createTime: user.createTime
        }
      };
    }
    return { success: false, message: '用户不存在' };
  } catch (error) {
    return { success: false, message: '查询失败', error: error.message };
  }
};
