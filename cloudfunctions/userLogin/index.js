// cloudfunctions/userLogin/index.js - 用户登录云函数
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;
async function batchConvert(fileIDs) { const urlMap = {}; if (!fileIDs || fileIDs.length === 0) return urlMap; try { const unique = [...new Set(fileIDs.filter(Boolean))]; if (unique.length === 0) return urlMap; const res = await cloud.getTempFileURL({ fileList: unique.slice(0, 50) }); (res.fileList || []).forEach(f => { if (f.fileID && f.tempFileURL) urlMap[f.fileID] = f.tempFileURL; }); } catch (e) { console.warn('[batchConvert] 失败:', e.message || e); } return urlMap; }

exports.main = async (event, context) => {
  const { code, nickName, avatarUrl } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    const userRes = await db.collection('users').where({ _openid: openid }).get();

    if (userRes.data.length > 0) {
      const user = userRes.data[0];
      const updateData = {
        lastLoginTime: db.serverDate(),
        updateTime: db.serverDate()
      };
      if (nickName && !user.nickName) updateData.nickName = nickName;
      if (avatarUrl && !user.avatarUrl) updateData.avatarUrl = avatarUrl;

      await db.collection('users').doc(user._id).update({ data: updateData });

      // 转换头像 cloud:// URL
      let finalAvatar = avatarUrl || user.avatarUrl || '';
      if (finalAvatar && finalAvatar.startsWith('cloud://')) {
        const urlMap = await batchConvert([finalAvatar]);
        finalAvatar = urlMap[finalAvatar] || finalAvatar;
      }

      return {
        success: true,
        data: {
          token: openid,
          openid: openid,
          user: {
            _id: user._id,
            nickName: nickName || user.nickName || '村民',
            avatarUrl: finalAvatar,
            phone: user.phone || '',
            group: user.group || '',
            _openid: openid
          }
        }
      };
    } else {
      const newUser = {
        _openid: openid,
        nickName: nickName || '村民',
        avatarUrl: avatarUrl || '',
        phone: '',
        group: '',
        createTime: db.serverDate(),
        lastLoginTime: db.serverDate(),
        updateTime: db.serverDate()
      };

      const addRes = await db.collection('users').add({ data: newUser });

      return {
        success: true,
        data: {
          token: openid,
          openid: openid,
          user: {
            _id: addRes._id,
            ...newUser,
            createTime: newUser.createTime,
            _openid: openid
          }
        }
      };
    }
  } catch (error) {
    console.error('用户登录失败:', error);
    return {
      success: false,
      message: '登录失败，请重试',
      error: error.message
    };
  }
};
