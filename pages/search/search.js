// pages/search/search.js - 搜索页
const app = getApp();
const { callFunction } = require('../../utils/request');

Page({
  data: {
    keyword: '',
    searchHistory: [],
    hotKeywords: [],
    goodsList: [],
    loading: false,
    hasSearched: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
    sortBy: 'time', // time / price_asc / price_desc
    filterCondition: '', // 成色筛选
    showFilter: false
  },

  onLoad() {
    // 加载搜索历史
    const history = wx.getStorageSync('searchHistory') || [];
    this.setData({ searchHistory: history });

    // 加载热门关键词
    this.loadHotKeywords();
  },

  // 加载热门关键词
  async loadHotKeywords() {
    try {
      const result = await callFunction('getHotRank', {
        action: 'keywords'
      });
      this.setData({ hotKeywords: result || [] });
    } catch (error) {
      console.error('加载热门关键词失败:', error);
    }
  },

  // 输入搜索关键词
  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  // 执行搜索
  async onSearch() {
    const { keyword } = this.data;
    if (!keyword.trim()) {
      wx.showToast({ title: '请输入搜索关键词', icon: 'none' });
      return;
    }

    // 保存搜索历史
    this.saveSearchHistory(keyword.trim());

    this.setData({
      hasSearched: true,
      page: 1,
      goodsList: [],
      hasMore: true
    });

    await this.searchGoods(true);
  },

  // 搜索商品
  async searchGoods(refresh = false) {
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      const result = await callFunction('searchGoods', {
        keyword: this.data.keyword.trim(),
        page: this.data.page,
        pageSize: this.data.pageSize,
        sortBy: this.data.sortBy,
        condition: this.data.filterCondition
      });

      const newList = result.list || [];
      this.setData({
        goodsList: refresh ? newList : [...this.data.goodsList, ...newList],
        hasMore: newList.length >= this.data.pageSize,
        page: this.data.page + 1
      });
    } catch (error) {
      console.error('搜索失败:', error);
      wx.showToast({ title: '搜索失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 保存搜索历史
  saveSearchHistory(keyword) {
    let history = this.data.searchHistory.filter(h => h !== keyword);
    history.unshift(keyword);
    history = history.slice(0, 10); // 最多10条
    this.setData({ searchHistory: history });
    wx.setStorageSync('searchHistory', history);
  },

  // 点击历史关键词
  onHistoryTap(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({ keyword });
    this.onSearch();
  },

  // 点击热门关键词
  onHotKeywordTap(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({ keyword });
    this.onSearch();
  },

  // 清空搜索历史
  onClearHistory() {
    wx.showModal({
      title: '提示',
      content: '确定清空搜索历史？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ searchHistory: [] });
          wx.removeStorageSync('searchHistory');
        }
      }
    });
  },

  // 切换排序方式
  onSortChange(e) {
    const sortBy = e.currentTarget.dataset.sort;
    this.setData({
      sortBy,
      page: 1,
      goodsList: [],
      hasMore: true
    });
    this.searchGoods(true);
  },

  // 切换筛选面板
  onToggleFilter() {
    this.setData({ showFilter: !this.data.showFilter });
  },

  // 选择成色筛选
  onConditionFilter(e) {
    const condition = e.currentTarget.dataset.value;
    this.setData({
      filterCondition: condition === this.data.filterCondition ? '' : condition,
      page: 1,
      goodsList: [],
      hasMore: true,
      showFilter: false
    });
    this.searchGoods(true);
  },

  // 触底加载
  onReachBottom() {
    if (this.data.hasSearched) {
      this.searchGoods();
    }
  },

  // 清空输入
  onClearInput() {
    this.setData({
      keyword: '',
      hasSearched: false,
      goodsList: []
    });
  },

  // 跳转商品详情
  onGoodsTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/goods-detail/goods-detail?id=${id}`
    });
  }
});
