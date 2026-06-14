// cloudfunctions/getMessages/index.js - 获取聊天消息
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
async function batchConvert(fileIDs) { const urlMap = {}; if (!fileIDs || fileIDs.length === 0) return urlMap; try { const unique = [...new Set(fileIDs.filter(Boolean))]; if (unique.length === 0) return urlMap; const res = await cloud.getTempFileURL({ fileList: unique.slice(0, 50) }); (res.fileList || []).forEach(f => { if (f.fileID && f.tempFileURL) urlMap[f.fileID] = f.tempFileURL; }); } catch (e) { console.warn('[batchConvert] 失败:', e.message || e); } return urlMap; }

exports.main = async (event) => {
  const { chatId, page = 1, pageSize = 20 } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!chatId) {
    return { success: false, message: '缺少聊天ID' };
  }

  try {
    const skip = (page - 1) * pageSize;

    const msgRes = await db.collection('messages')
      .where({ chatId })
      .orderBy('createTime', 'asc')
      .skip(skip)
      .limit(pageSize)
      .get();

    // 标记未读消息为已读
    await db.collection('messages')
      .where({
        chatId,
        toUserId: openid,
        isRead: false
      })
      .update({ data: { isRead: true } });

    // 清零聊天列表中的未读计数
    const chatRes = await db.collection('chatList')
      .where({ chatId })
      .get();

    if (chatRes.data.length > 0) {
      await db.collection('chatList').doc(chatRes.data[0]._id).update({
        data: { [`unreadCount.${openid}`]: 0 }
      });
    }

    // 批量转换图片消息中的 cloud:// URL
    const fileIDs = [];
    msgRes.data.forEach(msg => {
      if (msg.type === 'image' && msg.content && msg.content.startsWith('cloud://')) {
        fileIDs.push(msg.content);
      }
    });
    const urlMap = await batchConvert(fileIDs);

    const list = msgRes.data.map(msg => {
      if (msg.type === 'image' && msg.content && urlMap[msg.content]) {
        return { ...msg, content: urlMap[msg.content] };
      }
      return msg;
    });

    return {
      success: true,
      data: {
        list,
        hasMore: msgRes.data.length >= pageSize
      }
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
