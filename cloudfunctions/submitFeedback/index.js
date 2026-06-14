// cloudfunctions/submitFeedback/index.js - 提交/查看意见反馈
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { action, content, contact } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // 查看自己的反馈记录
  if (action === 'list') {
    try {
      const res = await db.collection('feedbacks')
        .where({ _openid: openid })
        .orderBy('createTime', 'desc')
        .limit(30)
        .get();
      return { success: true, data: { list: res.data } };
    } catch (err) {
      console.error('查询反馈失败:', err);
      return { success: true, data: { list: [] } };
    }
  }

  // 提交新反馈（默认）
  if (!content || !content.trim()) {
    return { success: false, message: '反馈内容不能为空' };
  }

  try {
    await db.collection('feedbacks').add({
      data: {
        _openid: openid,
        content: content.trim(),
        contact: (contact || '').trim(),
        createTime: new Date(),
        status: 'unread'
      }
    });

    return { success: true };
  } catch (err) {
    console.error('提交反馈失败:', err);
    return { success: false, message: '提交失败: ' + (err.message || err.errMsg || '未知错误') };
  }
};
