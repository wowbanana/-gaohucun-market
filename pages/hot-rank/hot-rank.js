// pages/hot-rank/hot-rank.js - 热搜榜页
const app = getApp();
const { callFunction } = require('../../utils/request');

Page({
  data: {
    hotGoodsList: [],
    hotKeywords: [],
    loading: true,
    currentTab: 'goods', // goods / keywords
    tabs: [
      { key: 'goods', name: '热门商品' },
      { key: 'keywords', name: '热搜词' }
    ]
  },

  onLoad() {
    this.loadHotRank();
  },

  // 切换Tab
  onTabChange(e) {
    const tab = e.currentTarget.dataset.key;
    this.setData({ currentTab: tab });
  },

  // 加载热搜数据
  async loadHotRank() {
    try {
      const [goodsResult, keywordsResult] = await Promise.all([
        callFunction('getHotRank', { action: 'goods', limit: 50 }),
        callFunction('getHotRank', { action: 'keywords', limit: 20 })
      ]);

      this.setData({
        hotGoodsList: goodsResult || [],
        hotKeywords: keywordsResult || []
      });
    } catch (error) {
      console.error('加载热搜榜失败:', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 跳转商品详情
  onGoodsTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/goods-detail/goods-detail?id=${id}`
    });
  },

  // 点击热搜词搜索
  onKeywordTap(e) {
    const keyword = e.currentTarget.dataset.keyword;
    wx.navigateTo({
      url: `/pages/search/search?keyword=${keyword}`
    });
  }
});
