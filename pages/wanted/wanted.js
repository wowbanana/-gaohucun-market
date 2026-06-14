// pages/wanted/wanted.js - 求购广场
const { callFunction } = require('../../utils/request');
const { getRelativeTime, showError } = require('../../utils/util');

Page({
  data: {
    // 求购列表
    wantedList: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
    loading: false,
    
    // Tab切换
    currentTab: 'latest', // latest: 最新, mine: 我的求购
    
    // 筛选
    statusFilter: '', // 空表示全部
    
    // 刷新
    isRefreshing: false
  },

  onLoad() {
    this.loadWantedList();
  },

  onShow() {
    if (this.data.needRefresh) {
      this.refreshData();
    }
  },

  onPullDownRefresh() {
    this.refreshData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore();
    }
  },

  // 加载求购列表
  async loadWantedList(refresh = false) {
    if (this.data.loading) return;
    
    const page = refresh ? 1 : this.data.page;
    const isMine = this.data.currentTab === 'mine';
    
    this.setData({ loading: true });
    
    try {
      const result = await callFunction('getWantedList', {
        page: page,
        pageSize: this.data.pageSize,
        status: this.data.statusFilter,
        isMine: isMine
      });
      
      if (result) {
        const list = (result.list || []).map(item => ({
          ...item,
          publishTimeText: getRelativeTime(item.publishTime),
          budgetText: this.formatBudget(item.budgetMin, item.budgetMax, item.budgetText),
          statusText: this.getStatusText(item.status),
          statusClass: this.getStatusClass(item.status)
        }));
        
        const wantedList = refresh ? list : [...this.data.wantedList, ...list];
        
        this.setData({
          wantedList: wantedList,
          page: page + 1,
          hasMore: result.hasMore,
          loading: false,
          needRefresh: false
        });
      }
    } catch (error) {
      console.error('加载求购列表失败:', error);
      this.setData({ loading: false });
      showError('加载失败，请重试');
    }
  },

  // 刷新数据
  async refreshData() {
    this.setData({
      page: 1,
      hasMore: true,
      isRefreshing: true
    });
    
    await this.loadWantedList(true);
    
    this.setData({ isRefreshing: false });
  },

  // 加载更多
  loadMore() {
    this.loadWantedList(false);
  },

  // 切换Tab
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    
    if (tab === this.data.currentTab) return;
    
    this.setData({
      currentTab: tab,
      wantedList: [],
      page: 1,
      hasMore: true
    });
    
    this.loadWantedList(true);
  },

  // 发布求购
  onPublishTap() {
    wx.navigateTo({
      url: '/pages/publish-wanted/publish-wanted'
    });
  },

  // 点击求购卡片
  onWantedTap(e) {
    const wantedId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/wanted-detail/wanted-detail?id=${wantedId}`
    });
  },

  // 响应求购
  async onRespondTap(e) {
    const wantedId = e.currentTarget.dataset.id;
    const wanted = this.data.wantedList.find(item => item._id === wantedId);
    
    if (!wanted) return;
    
    // 复制联系方式
    if (wanted.contactInfo) {
      wx.setClipboardData({
        data: wanted.contactInfo,
        success: () => {
          wx.showToast({
            title: '联系方式已复制',
            icon: 'none',
            duration: 2000
          });
        }
      });
    } else {
      showError('买家未留下联系方式');
    }
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '高湖村求购广场 - 看看大家需要什么',
      path: '/pages/wanted/wanted',
      imageUrl: ''
    };
  },

  // 工具函数
  formatBudget(min, max, text) {
    if (text) return text;
    
    if (min && max) {
      return `预算：${min}-${max}元`;
    } else if (min) {
      return `预算：${min}元以上`;
    } else if (max) {
      return `预算：${max}元以下`;
    } else {
      return '预算：面议';
    }
  },

  getStatusText(status) {
    const statusMap = {
      'open': '求购中',
      'responded': '已响应',
      'closed': '已关闭'
    };
    return statusMap[status] || status;
  },

  getStatusClass(status) {
    const classMap = {
      'open': 'status--open',
      'responded': 'status--responded',
      'closed': 'status--closed'
    };
    return classMap[status] || '';
  }
});
