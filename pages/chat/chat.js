// pages/chat/chat.js - 聊天页
const { callFunction } = require('../../utils/request');
const { toTimestamp, formatTime } = require('../../utils/util');

Page({
  data: {
    chatId: '',
    toUserId: '',
    goodsId: '',
    myOpenid: '',
    myAvatar: '',
    otherUser: { nickName: '用户', avatarUrl: '' },
    goodsInfo: null,
    messageList: [],
    inputText: '',
    canSend: false,
    scrollToId: '',
    page: 1,
    hasMore: true,
    loading: false,
    pollTimer: null
  },

  onLoad(options) {
    const { chatId, toUserId, goodsId } = options;

    if (!chatId || !toUserId) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    this.setData({ chatId, toUserId, goodsId: goodsId || '' });

    // 获取自己的openid
    const app = getApp();
    const myOpenid = app.globalData.openid || '';
    const userInfo = wx.getStorageSync('userInfo') || {};
    this.setData({
      myOpenid,
      myAvatar: userInfo.avatarUrl || ''
    });

    // 加载消息
    this.loadMessages();

    // 如果有商品ID，加载商品信息
    if (goodsId) {
      this.loadGoodsInfo(goodsId);
    }

    // 加载对方用户信息
    this.loadOtherUser(toUserId);
  },

  onShow() {
    // 页面显示时刷新消息
    this.setData({ page: 1, hasMore: true });
    this.loadMessages();
    // 启动轮询，每3秒检查新消息
    this.startPolling();
  },

  onHide() {
    // 离开页面停止轮询
    this.stopPolling();
  },

  onUnload() {
    this.stopPolling();
  },

  startPolling() {
    this.stopPolling();
    const pollTimer = setInterval(() => {
      this.loadMessages();
    }, 3000);
    this.data.pollTimer = pollTimer;
  },

  stopPolling() {
    if (this.data.pollTimer) {
      clearInterval(this.data.pollTimer);
      this.data.pollTimer = null;
    }
  },

  // 加载消息列表
  async loadMessages() {
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      const result = await callFunction('getMessages', {
        chatId: this.data.chatId,
        page: 1,
        pageSize: 50
      });

      if (result && result.list) {
        const messageList = result.list.map(msg => {
          if (msg.createTime) {
            msg.timeText = formatTime(new Date(toTimestamp(msg.createTime)), 'YYYY-MM-DD HH:mm');
          }
          return msg;
        });

        this.setData({ messageList });

        // 滚动到底部
        setTimeout(() => {
          this.setData({
            scrollToId: `msg-${messageList.length - 1}`
          });
        }, 100);
      }
    } catch (error) {
      console.error('加载消息失败:', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 加载商品信息
  async loadGoodsInfo(goodsId) {
    try {
      const result = await callFunction('getGoodsDetail', { id: goodsId });
      if (result) {
        let imageUrl = result.images ? result.images[0] : '';
        // 过滤 cloud:// URL（iOS 无法直接显示）
        if (imageUrl && imageUrl.startsWith('cloud://')) {
          imageUrl = '/images/default-goods.png';
        }
        this.setData({
          goodsInfo: {
            title: result.title,
            price: result.price,
            imageUrl: imageUrl || '/images/default-goods.png'
          }
        });
      }
    } catch (e) {
      console.error('加载商品信息失败:', e);
    }
  },

  // 加载对方用户信息
  async loadOtherUser(toUserId) {
    try {
      const result = await callFunction('getUserInfo', { userId: toUserId });
      if (result) {
        this.setData({
          otherUser: {
            nickName: result.nickName || '用户',
            avatarUrl: result.avatarUrl || ''
          }
        });
        // 设置导航栏标题
        wx.setNavigationBarTitle({ title: result.nickName || '聊天' });
      }
    } catch (e) {
      console.error('加载对方信息失败:', e);
    }
  },

  // 输入消息
  onInputChange(e) {
    const val = e.detail.value || '';
    this.setData({
      inputText: val,
      canSend: val.trim().length > 0
    });
  },

  // 发送消息
  async onSend() {
    const content = this.data.inputText.trim();
    if (!content) return;

    this.setData({ inputText: '', canSend: false });

    try {
      await callFunction('sendMessage', {
        toUserId: this.data.toUserId,
        goodsId: this.data.goodsId,
        content,
        type: 'text'
      });

      // 刷新消息列表
      await this.loadMessages();
    } catch (error) {
      console.error('发送消息失败:', error);
      wx.showToast({ title: '发送失败', icon: 'none' });
      // 恢复输入内容
      this.setData({ inputText: content });
    }
  },

  // 点击商品卡片跳转到商品详情
  onGoodsTap() {
    if (this.data.goodsId) {
      wx.navigateTo({
        url: `/pages/goods-detail/goods-detail?id=${this.data.goodsId}`
      });
    }
  }
});
