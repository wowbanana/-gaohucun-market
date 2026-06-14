// pages/board/board.js - 社区留言板
const { callFunction } = require('../../utils/request');
const { toTimestamp, formatTime, showError } = require('../../utils/util');

Page({
  data: {
    // 留言列表
    postList: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
    loading: false,
    
    // Tab切换
    currentTab: 'latest', // latest: 最新, hot: 最热
    
    // 刷新
    isRefreshing: false
  },

  onLoad() {
    this.loadPostList();
  },

  onShow() {
    // 检查全局刷新标记（留言发布成功后设置）
    const app = getApp();
    if (app.globalData.needRefreshBoard) {
      app.globalData.needRefreshBoard = false;
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
      this.loadMore();
    }
  },

  // 加载留言列表
  async loadPostList(refresh = false) {
    if (this.data.loading) return;
    
    const page = refresh ? 1 : this.data.page;
    const isMine = this.data.currentTab === 'mine';
    const isHot = this.data.currentTab === 'hot';
    
    this.setData({ loading: true });
    
    try {
      const result = await callFunction('getPostList', {
        page: page,
        pageSize: this.data.pageSize,
        sortBy: isHot ? 'hot' : 'new',
        isMine: isMine
      });
      
      if (result) {
        const list = (result.list || []).map(item => {
          const ts = toTimestamp(item.createTime || item.publishTime);
          // 过滤 cloud:// URL（iOS 无法直接显示）
          let authorAvatar = item.authorAvatar || '';
          if (authorAvatar.startsWith('cloud://')) authorAvatar = '';
          let images = (item.images || []).map(img =>
            (img && img.startsWith('cloud://')) ? '' : img
          );
          return {
            ...item,
            authorAvatar,
            images,
            publishTimeText: ts > 0 ? formatTime(new Date(ts), 'MM-DD HH:mm') : '未知时间',
            likeCountText: this.formatCount(item.likeCount),
            commentCountText: this.formatCount(item.commentCount)
          };
        });
        
        const postList = refresh ? list : [...this.data.postList, ...list];
        
        this.setData({
          postList: postList,
          page: page + 1,
          hasMore: result.hasMore,
          loading: false,
          needRefresh: false
        });
      }
    } catch (error) {
      console.error('加载留言列表失败:', error);
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
    
    await this.loadPostList(true);
    
    this.setData({ isRefreshing: false });
  },

  // 加载更多
  loadMore() {
    this.loadPostList(false);
  },

  // 切换Tab
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    
    if (tab === this.data.currentTab) return;
    
    this.setData({
      currentTab: tab,
      postList: [],
      page: 1,
      hasMore: true
    });
    
    this.loadPostList(true);
  },

  // 发布留言
  onPublishTap() {
    wx.navigateTo({
      url: '/pages/publish-board/publish-board'
    });
  },

  // 点击留言卡片
  onPostTap(e) {
    const postId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/board-detail/board-detail?id=${postId}`
    });
  },

  // 点赞留言
  async onLikeTap(e) {
    const postId = e.currentTarget.dataset.id;
    
    try {
      const result = await callFunction('likePost', { postId: postId });
      
      if (result) {
        const postList = this.data.postList.map(post => {
          if (post._id === postId) {
            post.likeCount += result.isLiked ? 1 : -1;
            post.isLiked = result.isLiked;
            post.likeCountText = this.formatCount(post.likeCount);
          }
          return post;
        });
        
        this.setData({ postList });
      }
    } catch (error) {
      console.error('点赞失败:', error);
    }
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '高湖村留言板 - 村里人的交流天地',
      path: '/pages/board/board'
    };
  },

  // 工具函数
  formatCount(count) {
    if (!count) return '0';
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'k';
    }
    return count.toString();
  }
});
