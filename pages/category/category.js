// pages/category/category.js - 分类浏览页
const app = getApp();
const { callFunction } = require('../../utils/request');
const { toTimestamp, formatTime } = require('../../utils/util');

Page({
  data: {
    categories: [],
    // 父级分类（顶部 tab）
    parentCategories: [
      { id: 'all', name: '全部', icon: '📋' },
      { id: 'agri', name: '农产时鲜', icon: '🥬' },
      { id: 'electronics', name: '家电数码', icon: '📺' },
      { id: 'furniture', name: '家具家居', icon: '🪑' },
      { id: 'clothing', name: '衣物鞋帽', icon: '👕' },
      { id: 'baby', name: '母婴用品', icon: '🍼' },
      { id: 'other', name: '其他闲置', icon: '📦' }
    ],
    // 当前选中的父分类
    currentParent: 'all',
    // 当前选中的子分类（空 = 该父分类下全部）
    currentSubCategory: '',
    // 子分类列表（仅 agri 等有子分类的父分类显示）
    subCategories: [],
    showSubGrid: false,
    // 商品列表
    goodsList: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 10
  },

  onLoad() {
    this.setData({
      categories: app.globalData.categories
    });
    this.updateSubCategories('all');
    this.loadGoodsList(true);
  },

  // 根据父分类更新子分类展示（仅农产时鲜等真正有子分类的才显示）
  updateSubCategories(parentId) {
    const { categories } = this.data;
    const subs = categories.filter(c => c.parent === parentId);
    this.setData({
      subCategories: subs,
      showSubGrid: subs.length > 0
    });
  },

  // 切换父分类
  onParentTap(e) {
    const parentId = e.currentTarget.dataset.id;
    if (parentId === this.data.currentParent) return;

    this.setData({
      currentParent: parentId,
      currentSubCategory: '',
      page: 1,
      goodsList: [],
      hasMore: true
    });
    this.updateSubCategories(parentId);

    // 如果该父分类有子分类，等用户选择子分类再加载；否则直接加载
    const { categories } = this.data;
    const hasSubs = categories.some(c => c.parent === parentId);
    if (!hasSubs) {
      // 无子分类的叶子分类，直接加载
      this.loadGoodsList(true);
    } else {
      // 有子分类，加载该父分类下全部商品
      this.loadGoodsList(true);
    }
  },

  // 切换子分类
  onSubTap(e) {
    const categoryId = e.currentTarget.dataset.id;
    const isCurrentlySelected = this.data.currentSubCategory === categoryId;

    // 点击已选中的子分类 → 取消筛选（回到该父分类全部）
    if (isCurrentlySelected) {
      this.setData({
        currentSubCategory: '',
        page: 1,
        goodsList: [],
        hasMore: true
      });
    } else {
      this.setData({
        currentSubCategory: categoryId,
        page: 1,
        goodsList: [],
        hasMore: true
      });
    }
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

      // 构建分类筛选条件
      if (this.data.currentSubCategory) {
        // 选中了具体子分类
        params.categoryId = this.data.currentSubCategory;
      } else if (this.data.currentParent !== 'all') {
        // 选中父分类但未选子分类 → 查该父分类下所有
        const subIds = this.data.categories
          .filter(c => c.parent === this.data.currentParent || c.id === this.data.currentParent)
          .map(c => c.id);
        if (subIds.length > 0) {
          params.categoryIds = subIds;
        } else {
          params.categoryId = this.data.currentParent;
        }
      }
      // currentParent === 'all' 时不传分类参数，查全部

      const result = await callFunction('getGoodsList', params);

      const myOpenid = result.myOpenid || '';

      const newList = (result.list || []).map(item => {
        let safeImage = '/images/default-goods.png';
        if (item.coverUrl && !item.coverUrl.startsWith('cloud://')) {
          safeImage = item.coverUrl;
        } else if (item.images && item.images[0] && !item.images[0].startsWith('cloud://')) {
          safeImage = item.images[0];
        }
        const ownerId = item._openid || item.sellerId || '';
        const isMine = !!(myOpenid && ownerId && String(ownerId) === String(myOpenid));
        const ts = toTimestamp(item.createTime || item.publishTime || item.createdAt);
        return {
          ...item,
          coverUrl: safeImage,
          isMyGoods: isMine,
          publishTimeText: ts > 0 ? formatTime(new Date(ts), 'MM-DD HH:mm') : ''
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
