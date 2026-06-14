// cloudfunctions/getChatList/index.js - 获取聊天列表
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
async function batchConvert(fileIDs) { const urlMap = {}; if (!fileIDs || fileIDs.length === 0) return urlMap; try { const unique = [...new Set(fileIDs.filter(Boolean))]; if (unique.length === 0) return urlMap; const res = await cloud.getTempFileURL({ fileList: unique.slice(0, 50) }); (res.fileList || []).forEach(f => { if (f.fileID && f.tempFileURL) urlMap[f.fileID] = f.tempFileURL; }); } catch (e) { console.warn('[batchConvert] 失败:', e.message || e); } return urlMap; }

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    const chatRes = await db.collection('chatList')
      .where({
        chatId: db.RegExp({
          regexp: openid,
          options: 'i'
        })
      })
      .orderBy('lastTime', 'desc')
      .limit(50)
      .get();

    const myChats = chatRes.data.filter(chat => {
      return chat.fromUserId === openid || chat.toUserId === openid;
    });

    // 先收集所有的 cloud:// fileID
    const fileIDs = [];
    const result = [];
    for (const chat of myChats) {
      const otherUserId = chat.fromUserId === openid ? chat.toUserId : chat.fromUserId;

      let otherUser = { nickName: '用户', avatarUrl: '' };
      try {
        const userRes = await db.collection('users')
          .where({ _openid: otherUserId })
          .limit(1)
          .get();
        if (userRes.data.length > 0) {
          const av = userRes.data[0].avatarUrl || '';
          otherUser = {
            nickName: userRes.data[0].nickName || '用户',
            avatarUrl: av
          };
          if (av) fileIDs.push(av);
        }
      } catch (e) {}

      let goodsInfo = null;
      if (chat.goodsId) {
        try {
          const goodsRes = await db.collection('goods')
            .doc(chat.goodsId)
            .get();
          if (goodsRes.data) {
            const img = (goodsRes.data.images && goodsRes.data.images[0]) || '';
            goodsInfo = {
              title: goodsRes.data.title,
              price: goodsRes.data.price,
              imageUrl: img
            };
            if (img) fileIDs.push(img);
          }
        } catch (e) {}
      }

      const unreadCount = (chat.unreadCount && chat.unreadCount[openid]) || 0;

      result.push({
        chatId: chat.chatId,
        otherUserId,
        otherUser,
        goodsId: chat.goodsId || '',
        goodsInfo,
        lastMessage: chat.lastMessage,
        lastTime: chat.lastTime,
        unreadCount,
        _otherAvatarRaw: otherUser.avatarUrl,
        _goodsImageRaw: goodsInfo ? goodsInfo.imageUrl : ''
      });
    }

    // 批量转换 cloud:// → HTTPS
    const urlMap = await batchConvert(fileIDs);

    // 应用转换
    const finalResult = result.map(item => ({
      ...item,
      otherUser: {
        ...item.otherUser,
        avatarUrl: urlMap[item._otherAvatarRaw] || item._otherAvatarRaw || ''
      },
      goodsInfo: item.goodsInfo ? {
        ...item.goodsInfo,
        imageUrl: urlMap[item._goodsImageRaw] || item._goodsImageRaw || ''
      } : null,
      _otherAvatarRaw: undefined,
      _goodsImageRaw: undefined
    }));

    return { success: true, data: { list: finalResult } };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
