// cloudfunctions/updateUserProfile/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { nickName, phone, avatarUrl, group } = event;
  try {
    await db.collection('users').where({ _openid: wxContext.OPENID }).update({
      data: { nickName, phone, avatarUrl, group, updateTime: db.serverDate() }
    });
    return { success: true };
  } catch (error) {
    return { success: false, message: '更新失败', error: error.message };
  }
};
