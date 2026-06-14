// pages/feedback/feedback.js - 意见反馈页
const { callFunction } = require('../../utils/request');
const { toTimestamp, formatTime } = require('../../utils/util');

Page({
  data: {
    content: '',
    contact: '',
    canSubmit: false,
    submitting: false,
    feedbackList: [],
    loadingHistory: false
  },

  onLoad() {
    this.loadHistory();
  },

  // 加载自己的反馈记录
  async loadHistory() {
    this.setData({ loadingHistory: true });
    try {
      const result = await callFunction('submitFeedback', { action: 'list' });
      const list = (result && result.list) || [];
      this.setData({
        feedbackList: list.map(item => {
          const ts = toTimestamp(item.createTime);
          return {
            ...item,
            timeText: ts > 0 ? formatTime(new Date(ts), 'MM-DD HH:mm') : '',
            statusText: item.status === 'read' ? '已读' : '已收到'
          };
        })
      });
    } catch (err) {
      console.error('加载反馈记录失败:', err);
    } finally {
      this.setData({ loadingHistory: false });
    }
  },

  onContentInput(e) {
    const val = e.detail.value || '';
    this.setData({
      content: val,
      canSubmit: val.trim().length >= 3
    });
  },

  onContactInput(e) {
    this.setData({
      contact: e.detail.value || ''
    });
  },

  async onSubmit() {
    const { content, contact } = this.data;

    if (!content.trim()) {
      wx.showToast({ title: '请输入反馈内容', icon: 'none' });
      return;
    }

    if (content.trim().length < 3) {
      wx.showToast({ title: '至少输入3个字', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    try {
      await callFunction('submitFeedback', {
        content: content.trim(),
        contact: contact.trim()
      });

      wx.showToast({ title: '感谢反馈！', icon: 'success' });
      // 清空表单
      this.setData({ content: '', contact: '', canSubmit: false, submitting: false });
      // 刷新记录列表
      this.loadHistory();
    } catch (err) {
      console.error('提交反馈失败:', err);
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
      this.setData({ submitting: false });
    }
  }
});
