// pages/notice-detail/notice-detail.js - 公告详情页
const app = getApp();
const { callFunction } = require('../../utils/request');

Page({
  data: {
    notice: null,
    loading: true
  },

  onLoad(options) {
    if (options.id) {
      this.loadNoticeDetail(options.id);
    }
  },

  async loadNoticeDetail(id) {
    try {
      const result = await callFunction('getNotices', {
        action: 'detail',
        noticeId: id
      });

      this.setData({
        notice: result,
        loading: false
      });
    } catch (error) {
      console.error('加载公告详情失败:', error);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // 分享公告
  onShareAppMessage() {
    const { notice } = this.data;
    return {
      title: notice ? notice.title : '高湖村公告',
      path: `/pages/notice-detail/notice-detail?id=${notice._id}`
    };
  }
});
