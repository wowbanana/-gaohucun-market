// cloudfunctions/getUserStats/index.js - 获取用户统计数据
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async () => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    if (!openid) {
      return { success: false, message: '未登录' };
    }

    // 统计发布数量（同时匹配 _openid 和 sellerId，与 getGoodsList 的 myGoods 保持一致）
    const goodsRes = await db.collection('goods')
      .where(_.and([
        _.or([{ _openid: openid }, { sellerId: openid }]),
        { status: _.neq('deleted') }
      ]))
      .count();

    console.log('[getUserStats] openid:', openid, 'publishCount:', goodsRes.total);

    // 统计收藏数量
    const favRes = await db.collection('favorites')
      .where({ _openid: openid })
      .count();

    // 统计未读消息数（聊天）
    let unreadMsgCount = 0;
    try {
      const chatRes = await db.collection('chatList')
        .where({
          chatId: db.RegExp({
            regexp: openid,
            options: 'i'
          })
        })
        .get();

      for (const chat of chatRes.data) {
        if (chat.fromUserId === openid || chat.toUserId === openid) {
          const count = (chat.unreadCount && chat.unreadCount[openid]) || 0;
          unreadMsgCount += count;
        }
      }
    } catch (e) {
      // chatList 集合可能还不存在
    }

    // 统计未读评论/回复通知数
    try {
      const notifRes = await db.collection('notifications')
        .where({ toOpenid: openid, read: false })
        .count();
      unreadMsgCount += notifRes.total;
    } catch (e) {
      // notifications 集合可能还不存在
    }

    return {
      success: true,
      data: {
        publishCount: goodsRes.total,
        favoriteCount: favRes.total,
        unreadMsgCount
      }
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
