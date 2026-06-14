// pages/wanted-detail/wanted-detail.js - 求购详情页
const { callFunction } = require('../../utils/request');
const { makePhoneCall, copyToClipboard, showError, showSuccess, toTimestamp } = require('../../utils/util');

Page({
  data: {
    wantedId: '',
    wanted: null,
    loading: true,
    
    // 响应状态
    hasResponded: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ wantedId: options.id });
      this.loadWantedDetail(options.id);
    } else {
      showError('求购不存在');
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  // 加载求购详情
  async loadWantedDetail(wantedId) {
    this.setData({ loading: true });
    
    try {
      const wanted = await callFunction('getWantedDetail', { id: wantedId });
      
      if (wanted) {
        
        // 格式化数据
        wanted.publishTimeText = this.formatTime(wanted.publishTime);
        wanted.budgetText = this.formatBudget(wanted.budgetMin, wanted.budgetMax, wanted.budgetText);
        wanted.statusText = this.getStatusText(wanted.status);
        
        this.setData({
          wanted: wanted,
          loading: false
        });
        
        // 设置页面标题
        wx.setNavigationBarTitle({
          title: '求购详情'
        });
      } else {
        throw new Error('求购不存在');
      }
    } catch (error) {
      console.error('加载求购详情失败:', error);
      this.setData({ loading: false });
      showError('加载失败，请重试');
      
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  // 响应求购
  async onRespondTap() {
    const wanted = this.data.wanted;
    
    if (!wanted) return;
    
    // 复制联系方式
    if (wanted.contactInfo) {
      copyToClipboard(wanted.contactInfo, '联系方式已复制，请尽快联系买家');
      
      // 标记已响应
      try {
        await callFunction('respondWanted', { wantedId: this.data.wantedId });
        
        this.setData({ hasResponded: true });
      } catch (error) {
        console.error('标记响应失败:', error);
      }
    } else {
      showError('买家未留下联系方式');
    }
  },

  // 拨打电话
  onCallTap() {
    const phone = this.data.wanted.contactInfo;
    
    if (!phone) {
      showError('未留下电话号码');
      return;
    }
    
    makePhoneCall(phone);
  },

  // 复制微信号
  onCopyWechatTap() {
    const wechat = this.data.wanted.contactInfo;
    
    if (!wechat) {
      showError('未留下微信号');
      return;
    }
    
    copyToClipboard(wechat, '微信号已复制，请到微信添加好友');
  },

  // 分享
  onShareAppMessage() {
    const wanted = this.data.wanted;
    
    return {
      title: `求购：${wanted.title}`,
      path: `/pages/wanted-detail/wanted-detail?id=${this.data.wantedId}`
    };
  },

  // 工具函数
  formatTime(timestamp) {
    const ts = toTimestamp(timestamp);
    if (ts === 0) return '未知时间';
    
    const date = new Date(ts);
    const now = new Date();
    const diff = now - date;
    
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    
    if (diff < hour) {
      return Math.floor(diff / minute) + '分钟前';
    } else if (diff < day) {
      return Math.floor(diff / hour) + '小时前';
    } else if (diff < 7 * day) {
      return Math.floor(diff / day) + '天前';
    } else {
      const month = date.getMonth() + 1;
      const day2 = date.getDate();
      return `${month}月${day2}日`;
    }
  },

  formatBudget(min, max, text) {
    if (text) return text;
    
    if (min && max) {
      return `${min}-${max}元`;
    } else if (min) {
      return `${min}元以上`;
    } else if (max) {
      return `${max}元以下`;
    } else {
      return '面议';
    }
  },

  getStatusText(status) {
    const statusMap = {
      'open': '求购中',
      'responded': '已响应',
      'closed': '已关闭'
    };
    return statusMap[status] || status;
  }
});
