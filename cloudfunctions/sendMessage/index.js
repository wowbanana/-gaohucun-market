// cloudfunctions/sendMessage/index.js - 发送消息
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { toUserId, goodsId, content, type = 'text' } = event;
  const wxContext = cloud.getWXContext();
  const fromUserId = wxContext.OPENID;

  if (!toUserId || !content) {
    return { success: false, message: '参数不完整' };
  }

  if (fromUserId === toUserId) {
    return { success: false, message: '不能给自己发消息' };
  }

  try {
    // 生成聊天室ID（两个用户+商品的唯一标识，排序确保一致）
    const ids = [fromUserId, toUserId].sort();
    const chatId = goodsId
      ? `${ids[0]}_${ids[1]}_${goodsId}`
      : `${ids[0]}_${ids[1]}`;

    const now = db.serverDate();
    const messageData = {
      chatId,
      fromUserId,
      toUserId,
      goodsId: goodsId || '',
      content,
      type,       // text, image
      isRead: false,
      createTime: now
    };

    // 写入消息
    const msgRes = await db.collection('messages').add({ data: messageData });

    // 更新或创建聊天记录
    const chatRes = await db.collection('chatList')
      .where({ chatId })
      .get();

    const chatInfo = {
      chatId,
      lastMessage: type === 'text' ? content : '[图片]',
      lastTime: now,
      fromUserId,
      toUserId,
      goodsId: goodsId || '',
      unreadCount: 0
    };

    if (chatRes.data.length === 0) {
      // 新建聊天记录
      await db.collection('chatList').add({
        data: {
          ...chatInfo,
          unreadCount: { [toUserId]: 1, [fromUserId]: 0 }
        }
      });
    } else {
      // 更新聊天记录
      const chatDoc = chatRes.data[0];
      const prevUnread = chatDoc.unreadCount || {};
      const prevToUserCount = prevUnread[toUserId] || 0;

      await db.collection('chatList').doc(chatDoc._id).update({
        data: {
          lastMessage: chatInfo.lastMessage,
          lastTime: now,
          fromUserId,
          toUserId,
          [`unreadCount.${toUserId}`]: prevToUserCount + 1
        }
      });
    }

    return { success: true, data: { messageId: msgRes._id, chatId } };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
