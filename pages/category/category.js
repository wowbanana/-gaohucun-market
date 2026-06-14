// pages/category/category.js - 分类浏览页
const app = getApp();
const { callFunction } = require('../../utils/request');

Page({
  data: {
    categories: [],
    currentParent: 'all',
    currentSubCategory: '',
    goodsList: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
    parentCategories: [
      { id: 'all', name: '全部' },
      { id: 'agri', name: '农产时鲜' },
      { id: 'electronics', name: '家电数码' },
      { id: 'furniture', name: '家具家居' },
      { id: 'clothing', name: '衣物鞋帽' },
      { id: 'baby', name: '母婴用品' },
      { id: 'other', name: '其他闲置' }
    ],
    subCategories: []
  },

  onLoad() {
    this.setData({
      categories: app.globalData.categories
    });
    this.updateSubCategories('all');
    this.loadGoodsList(true);
  },

  onShow() {
    // 页面显示时刷新列表
  },

  // 更新子分类
  updateSubCategories(parentId) {
    let subs = [];
    if (parentId === 'all') {
      subs = this.data.categories.map(c => ({
        id: c.id,
        name: c.name,
        icon: c.icon
      }));
    } else {
      subs = this.data.categories.filter(c => c.parent === parentId || c.id === parentId);
    }
    this.setData({ subCategories: subs });
  },

  // 切换父分类
  onParentCategoryTap(e) {
    const parentId = e.currentTarget.dataset.id;
    this.setData({
      currentParent: parentId,
      currentSubCategory: '',
      page: 1,
      goodsList: [],
      hasMore: true
    });
    this.updateSubCategories(parentId);
    this.loadGoodsList(true);
  },

  // 切换子分类
  onSubCategoryTap(e) {
    const categoryId = e.currentTarget.dataset.id;
    this.setData({
      currentSubCategory: categoryId,
      page: 1,
      goodsList: [],
      hasMore: true
    });
    this.loadGoodsList(true);
  },

  // 加载商品列表
  async loadGoodsList(refresh = false) {
    if (this.data.loading) return;
    if (!refresh && !this.data.hasMore) return;

    this.setData({ loading: true });

    try {
      const params = {
        action: 'byCategory',
        page: this.data.page,
        pageSize: this.data.pageSize
      };

      if (this.data.currentSubCategory) {
        params.categoryId = this.data.currentSubCategory;
      } else if (this.data.currentParent !== 'all') {
        // 获取该父分类下所有子分类
        const subIds = this.data.categories
          .filter(c => c.parent === this.data.currentParent || c.id === this.data.currentParent)
          .map(c => c.id);
        params.categoryIds = subIds;
      }

      const result = await callFunction('getGoodsList', params);

      // 直接使用云函数返回的当前用户 openid
      const myOpenid = result.myOpenid || '';
      console.log('[category] 当前用户 openid:', myOpenid, '商品数:', (result.list || []).length);

      // 处理商品列表：安全获取图片 + 标记自己发布的
      const newList = (result.list || []).map(item => {
        // 优先使用云函数转换后的 coverUrl（HTTPS），fallback 到 images[0]
        let safeImage = '/images/default-goods.png';
        if (item.coverUrl && !item.coverUrl.startsWith('cloud://')) {
          safeImage = item.coverUrl;
        } else if (item.images && item.images[0] && !item.images[0].startsWith('cloud://')) {
          safeImage = item.images[0];
        }
        const ownerId = item._openid || item.sellerId || '';
        const isMine = !!(myOpenid && ownerId && String(ownerId) === String(myOpenid));
        if (isMine) console.log('[category] 标记我发布的:', item.title, 'ownerId:', ownerId);
        return {
          ...item,
          coverUrl: safeImage,
          isMyGoods: isMine
        };
      });
      this.setData({
        goodsList: refresh ? newList : [...this.data.goodsList, ...newList],
        hasMore: newList.length >= this.data.pageSize,
        page: this.data.page + 1
      });
    } catch (error) {
      console.error('加载商品列表失败:', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 触底加载更多
  onReachBottom() {
    this.loadGoodsList();
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true });
    this.loadGoodsList(true).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 跳转商品详情
  onGoodsTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/goods-detail/goods-detail?id=${id}`
    });
  },

  // 跳转搜索
  onGoSearch() {
    wx.navigateTo({
      url: '/pages/search/search'
    });
  }
});
