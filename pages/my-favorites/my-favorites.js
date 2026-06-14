// pages/my-favorites/my-favorites.js - 我的收藏页
const app = getApp();
const { callFunction } = require('../../utils/request');

Page({
  data: {
    favoritesList: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 10
  },

  onLoad() {
    this.loadFavorites(true);
  },

  onShow() {
    this.setData({ page: 1, hasMore: true });
    this.loadFavorites(true);
  },

  // 加载收藏列表
  async loadFavorites(refresh = false) {
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      const result = await callFunction('getFavoriteList', {
        page: refresh ? 1 : this.data.page,
        pageSize: this.data.pageSize
      });

      const newList = (result.list || []).map(item => {
        // 过滤 cloud:// URL（iOS 无法直接显示）
        if (item.goodsImage && item.goodsImage.startsWith('cloud://')) {
          item.goodsImage = '';
        }
        return item;
      });
      this.setData({
        favoritesList: refresh ? newList : [...this.data.favoritesList, ...newList],
        hasMore: result.hasMore !== false && newList.length >= this.data.pageSize,
        page: (refresh ? 1 : this.data.page) + 1
      });
    } catch (error) {
      console.error('加载收藏列表失败:', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true });
    this.loadFavorites(true).then(() => wx.stopPullDownRefresh());
  },

  // 触底加载
  onReachBottom() {
    this.loadFavorites();
  },

  // 跳转商品详情
  onGoodsTap(e) {
    const id = e.currentTarget.dataset.id;
    const status = e.currentTarget.dataset.status;
    // 如果商品已删除，不跳转
    if (status === 'deleted') {
      wx.showToast({ title: '该商品已删除', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: `/pages/goods-detail/goods-detail?id=${id}`
    });
  },

  // 取消收藏
  async onUnfavorite(e) {
    const goodsId = e.currentTarget.dataset.id;
    try {
      await callFunction('toggleFavorite', {
        action: 'remove',
        goodsId: goodsId
      });
      wx.showToast({ title: '已取消收藏', icon: 'success' });
      // 从列表中移除
      const list = this.data.favoritesList.filter(item => item.goodsId !== goodsId);
      this.setData({ favoritesList: list });
    } catch (error) {
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  }
});
