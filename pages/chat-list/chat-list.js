// pages/chat-list/chat-list.js - 消息列表页（交易消息 + 回复通知）
const { callFunction } = require('../../utils/request');
const { toTimestamp, formatTime, getRelativeTime } = require('../../utils/util');

Page({
  data: {
    chatList: [],       // 交易消息
    notifList: [],       // 回复通知
    messageList: [],     // 合并后的总列表
    loading: false
  },

  onLoad() {
    this.loadAll();
  },

  onShow() {
    this.loadAll();
  },

  // 加载所有消息（聊天 + 通知）
  async loadAll() {
    this.setData({ loading: true });
    console.log('[chat-list] loadAll 开始');

    try {
      const [chatResult, notifResult] = await Promise.all([
        callFunction('getChatList', {}).catch((e) => { console.error('[chat-list] getChatList 失败:', e); return null; }),
        callFunction('getNotifications', { action: 'list' }).catch((e) => { console.error('[chat-list] getNotifications 失败:', e); return null; })
      ]);

      console.log('[chat-list] chatResult:', JSON.stringify(chatResult).slice(0, 200));
      console.log('[chat-list] notifResult:', JSON.stringify(notifResult).slice(0, 200));

      // 处理交易消息
      const chatList = (chatResult && chatResult.list ? chatResult.list : []).map(chat => {
        if (chat.lastTime) {
          chat.lastTimeText = getRelativeTime(chat.lastTime);
        } else {
          chat.lastTimeText = '';
        }
        chat.msgType = 'trade';
        chat._key = 'trade_' + chat.chatId;  // 避免 wx:key 用三元
        return chat;
      });

      // 处理回复通知
      const notifList = (notifResult && notifResult.list ? notifResult.list : []).map(n => {
        const ts = toTimestamp(n.createTime);
        return {
          ...n,
          lastTimeText: ts > 0 ? getRelativeTime(new Date(ts)) : '',
          lastTime: n.createTime,
          msgType: 'comment',
          unreadCount: n.read ? 0 : 1,
          otherUser: {
            nickName: n.fromUser.nickName || '村友',
            avatarUrl: n.fromUser.avatarUrl || ''
          },
          lastMessage: n.commentContent || '',
          notifId: n._id,
          postId: n.postId,
          postTitle: n.postTitle,
          _key: 'notif_' + n._id  // 避免 wx:key 用三元
        };
      });

      // 合并并按时间降序排列
      const merged = [...chatList, ...notifList].sort((a, b) => {
        const timeA = a.lastTime ? new Date(a.lastTime).getTime() : 0;
        const timeB = b.lastTime ? new Date(b.lastTime).getTime() : 0;
        return timeB - timeA;
      });

      console.log('[chat-list] chatList 条数:', chatList.length, 'notifList 条数:', notifList.length, 'merged 条数:', merged.length);
      this.setData({ chatList, notifList, messageList: merged, loading: false });
      console.log('[chat-list] setData 完成, messageList 条数:', merged.length);

      // 标记通知为已读（静默）
      callFunction('getNotifications', { action: 'markRead' }).catch((e) => { console.error('[chat-list] markRead 失败:', e); });
    } catch (error) {
      console.error('[chat-list] loadAll 异常:', error);
      this.setData({ loading: false });
    }
  },

  // 点击消息项
  onItemTap(e) {
    const item = e.currentTarget.dataset.item;

    if (item.msgType === 'comment') {
      // 回复通知 → 跳转到留言详情页
      wx.navigateTo({
        url: `/pages/board-detail/board-detail?id=${item.postId}`
      });
    } else {
      // 交易消息 → 跳转到聊天页
      const toUserId = item.otherUserId || '';
      const goodsId = item.goodsId || '';
      wx.navigateTo({
        url: `/pages/chat/chat?chatId=${item.chatId}&toUserId=${toUserId}&goodsId=${goodsId}`
      });
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadAll().then(() => wx.stopPullDownRefresh());
  }
});
