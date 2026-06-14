// pages/index/index.js - 首页
const { callFunction } = require('../../utils/request');
const { toTimestamp, formatTime, showError } = require('../../utils/util');

Page({
  data: {
    // 高湖村风貌横幅
    bannerImage: '',
    bannerUpdateTime: '',
    
    // 公告栏
    notices: [],
    noticeIndex: 0,
    
    // 热搜榜
    hotGoods: [],
    showHotRank: true,
    
    // 分类Tab
    categories: [
      { id: 'all', name: '全部', icon: '📋' },
      { id: 'agri', name: '🥬农产品', icon: '' },
      { id: 'electronics', name: '📺家电', icon: '' },
      { id: 'furniture', name: '🪑家具', icon: '' },
      { id: 'clothing', name: '👕衣物', icon: '' },
      { id: 'baby', name: '🍼母婴', icon: '' },
      { id: 'other', name: '📦其他', icon: '' }
    ],
    currentCategory: 'all',
    
    // 商品列表
    goodsList: [],
    page: 1,
    pageSize: 16,
    hasMore: true,
    loading: false,
    sortBy: 'new',
    
    // 刷新状态
    isRefreshing: false,
    scrollTop: 0
  },

  onLoad() {
    this.loadInitialData();
  },

  onShow() {
    // 检查全局刷新标记（商品发布成功后设置）
    const app = getApp();
    if (app.globalData.needRefreshIndex) {
      app.globalData.needRefreshIndex = false;
      this.refreshData();
    } else if (this.data.needRefresh) {
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
      this.loadMoreGoods();
    }
  },

  // 加载初始数据
  async loadInitialData() {
    try {
      await Promise.all([
        this.loadNotices(),
        this.loadHotRank(),
        this.loadGoods()
      ]);
    } catch (error) {
      console.error('加载初始数据失败:', error);
    }
  },

  // 加载公告
  async loadNotices() {
    try {
      const list = await callFunction('getNotices', {
        pageSize: 5,
        status: 'published'
      });
      
      const notices = (list || []).map(item => {
        const ts = toTimestamp(item.publishTime || item.createdAt || item.createTime);
        return {
          ...item,
          publishTimeText: ts > 0 ? formatTime(new Date(ts), 'MM-DD HH:mm') : ''
        };
      });
      
      this.setData({ notices });
    } catch (error) {
      console.error('加载公告失败:', error);
    }
  },

  // 加载热搜榜
  async loadHotRank() {
    try {
      const list = await callFunction('getHotRank', {
        limit: 10
      });

      // 过滤 cloud:// URL（云函数可能尚未部署 getTempFileURL 转换）
      const hotGoods = (list || []).slice(0, 6).map(item => ({
        ...item,
        imageUrl: (item.imageUrl && !item.imageUrl.startsWith('cloud://'))
          ? item.imageUrl
          : '/images/default-goods.png'
      }));

      this.setData({
        hotGoods
      });
    } catch (error) {
      console.error('加载热搜榜失败:', error);
    }
  },

  // 加载商品列表
  async loadGoods(refresh = false) {
    if (this.data.loading) return;

    const page = refresh ? 1 : this.data.page;

    this.setData({ loading: true });

    try {
      const params = {
        page: page,
        pageSize: this.data.pageSize,
        category: this.data.currentCategory === 'all' ? '' : this.data.currentCategory,
        sortBy: this.data.sortBy
      };
      // "我的"tab 使用 myGoods action（云函数通过 wxContext 获取当前用户 openid）
      if (this.data.sortBy === 'my') {
        params.action = 'myGoods';
      }
      const result = await callFunction('getGoodsList', params);

      // 直接使用云函数返回的当前用户 openid（比 ensureOpenid 更可靠）
      const myOpenid = result.myOpenid || '';
      console.log('[index] 当前用户 openid:', myOpenid, '商品数:', (result.list || []).length);

      const newGoods = (result.list || []).map(item => {
        const ts = toTimestamp(item.createTime || item.publishTime || item.createdAt);
        // 安全获取图片URL：cloud:// 协议不能直接用于 <image>，必须用 HTTPS URL
        let safeImageUrl = '/images/default-goods.png';
        if (item.coverUrl && !item.coverUrl.startsWith('cloud://')) {
          safeImageUrl = item.coverUrl;
        } else if (item.images && item.images[0] && !item.images[0].startsWith('cloud://')) {
          safeImageUrl = item.images[0];
        }
        // 判断是否自己发布的：比较 _openid，同时兼容 sellerId
        const ownerId = item._openid || item.sellerId || '';
        const isMine = !!(myOpenid && ownerId && String(ownerId) === String(myOpenid));
        if (isMine) console.log('[index] 标记我发布的:', item.title, 'ownerId:', ownerId);
        return {
          ...item,
          publishTimeText: ts > 0 ? formatTime(new Date(ts), 'MM-DD HH:mm') : '',
          priceText: this.formatPrice(item.price, item.priceUnit),
          priceUnitText: this.formatUnit(item.priceUnit),
          imageUrl: safeImageUrl,
          isMyGoods: isMine
        };
      });
      
      const goodsList = refresh ? newGoods : [...this.data.goodsList, ...newGoods];
      const hasMore = result.hasMore !== false && newGoods.length >= this.data.pageSize;
      
      this.setData({
        goodsList: goodsList,
        page: page + 1,
        hasMore: hasMore,
        loading: false,
        needRefresh: false
      });
    } catch (error) {
      console.error('加载商品失败:', error);
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
    
    try {
      await Promise.all([
        this.loadNotices(),
        this.loadHotRank(),
        this.loadGoods(true)
      ]);
    } finally {
      this.setData({ isRefreshing: false });
    }
  },

  // 加载更多商品
  loadMoreGoods() {
    this.loadGoods(false);
  },

  // 切换分类
  onCategoryTap(e) {
    const categoryId = e.currentTarget.dataset.id;
    if (categoryId === this.data.currentCategory) return;
    
    this.setData({
      currentCategory: categoryId,
      goodsList: [],
      page: 1,
      hasMore: true
    });
    
    this.loadGoods(true);
  },

  // 切换排序
  onSortChange(e) {
    const sortBy = e.currentTarget.dataset.sort;
    if (sortBy === this.data.sortBy) return;
    
    this.setData({
      sortBy: sortBy,
      goodsList: [],
      page: 1,
      hasMore: true
    });
    
    this.loadGoods(true);
  },

  // 点击商品卡片
  onGoodsTap(e) {
    const goodsId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/goods-detail/goods-detail?id=${goodsId}`
    });
  },

  // 点击热搜榜商品
  onHotGoodsTap(e) {
    const goodsId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/goods-detail/goods-detail?id=${goodsId}`
    });
  },

  // 点击公告
  onNoticeTap(e) {
    const noticeId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/notice-detail/notice-detail?id=${noticeId}`
    });
  },

  // 查看全部热搜
  onViewAllHot() {
    wx.navigateTo({
      url: '/pages/hot-rank/hot-rank'
    });
  },

  // 搜索
  onSearchTap() {
    wx.navigateTo({
      url: '/pages/search/search'
    });
  },

  // 点击发布按钮（悬浮按钮）
  onPublishTap() {
    wx.switchTab({
      url: '/pages/publish/publish'
    });
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '高湖村二手市场 - 村里人的闲置交易平台',
      path: '/pages/index/index'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '高湖村二手市场 - 村里人的闲置交易平台',
      query: ''
    };
  },

  // 格式化价格（只返回价格数字，单位由模板单独显示）
  formatPrice(price, unit) {
    if (!price && price !== 0) return '面议';
    return '￥' + price;
  },

  // 格式化单位（元/斤 → /斤，默认单位如 元/件 不显示）
  formatUnit(unit) {
    if (!unit || unit === '元/件' || unit === '元/台' || unit === '元/套') return '';
    return '/' + unit.replace('元/', '');
  },
});
