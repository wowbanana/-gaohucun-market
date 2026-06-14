// pages/my-goods/my-goods.js - 我的发布页
const app = getApp();
const { callFunction } = require('../../utils/request');

Page({
  data: {
    tabList: [
      { key: 'selling', name: '在售' },
      { key: 'sold', name: '已售' },
      { key: 'off', name: '已下架' }
    ],
    currentTab: 'selling',
    goodsList: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 10
  },

  onLoad() {
    this.loadMyGoods(true);
  },

  onShow() {
    this.setData({ page: 1, hasMore: true });
    this.loadMyGoods(true);
  },

  // 切换Tab
  onTabChange(e) {
    const tab = e.currentTarget.dataset.key;
    this.setData({
      currentTab: tab,
      page: 1,
      goodsList: [],
      hasMore: true
    });
    this.loadMyGoods(true);
  },

  // 加载我的商品
  async loadMyGoods(refresh = false) {
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      const result = await callFunction('getGoodsList', {
        action: 'myGoods',
        status: this.data.currentTab,
        page: this.data.page,
        pageSize: this.data.pageSize
      });

      console.log('myGoods result:', JSON.stringify(result));

      const newList = (result && result.list) || [];
      this.setData({
        goodsList: refresh ? newList : [...this.data.goodsList, ...newList],
        hasMore: newList.length >= this.data.pageSize,
        page: this.data.page + 1
      });
    } catch (error) {
      console.error('加载我的商品失败:', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true });
    this.loadMyGoods(true).then(() => wx.stopPullDownRefresh());
  },

  // 触底加载
  onReachBottom() {
    this.loadMyGoods();
  },

  // 跳转商品详情
  onGoodsTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/goods-detail/goods-detail?id=${id}`
    });
  },

  // 上架商品
  async onPutOn(e) {
    const id = e.currentTarget.dataset.id;
    try {
      await callFunction('updateGoodsStatus', {
        goodsId: id,
        status: 'selling'
      });
      wx.showToast({ title: '已上架', icon: 'success' });
      this.setData({ page: 1, hasMore: true });
      this.loadMyGoods(true);
    } catch (error) {
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  // 下架商品
  async onTakeOff(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认下架',
      content: '下架后商品将不再展示，确定下架吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await callFunction('updateGoodsStatus', {
              goodsId: id,
              status: 'off'
            });
            wx.showToast({ title: '已下架', icon: 'success' });
            this.setData({ page: 1, hasMore: true });
            this.loadMyGoods(true);
          } catch (error) {
            wx.showToast({ title: '操作失败', icon: 'none' });
          }
        }
      }
    });
  },

  // 标记已售
  async onMarkSold(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认已售',
      content: '标记已售后商品将移至"已售"列表，确定吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await callFunction('updateGoodsStatus', {
              goodsId: id,
              status: 'sold'
            });
            wx.showToast({ title: '已标记为已售', icon: 'success' });
            this.setData({ page: 1, hasMore: true });
            this.loadMyGoods(true);
          } catch (error) {
            wx.showToast({ title: '操作失败', icon: 'none' });
          }
        }
      }
    });
  },

  // 删除商品
  async onDeleteGoods(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确定删除吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await callFunction('updateGoodsStatus', {
              goodsId: id,
              status: 'deleted'
            });
            wx.showToast({ title: '已删除', icon: 'success' });
            this.setData({ page: 1, hasMore: true });
            this.loadMyGoods(true);
          } catch (error) {
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  }
});
