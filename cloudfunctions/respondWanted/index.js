// cloudfunctions/respondWanted/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { wantedId, content, contact } = event;
  try {
    await db.collection('wantedResponses').add({
      data: {
        wantedId, content, contact,
        userId: wxContext.OPENID,
        createTime: db.serverDate()
      }
    });
    await db.collection('wanted').doc(wantedId).update({
      data: { responseCount: db.command.inc(1) }
    });
    return { success: true };
  } catch (error) {
    return { success: false, message: '响应失败', error: error.message };
  }
};
