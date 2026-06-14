// pages/board-detail/board-detail.js - 留言详情页
const app = getApp();
const { callFunction } = require('../../utils/request');
const { toTimestamp, formatTime, showError, showSuccess } = require('../../utils/util');

Page({
  data: {
    postId: '',
    post: null,
    comments: [],      // 一级评论列表，每项有 replies: []
    commentContent: '',
    canSubmitComment: false,
    loading: true,
    submitting: false,
    replyTo: null,
    showCommentInput: false,
    liked: false,
    likeCount: 0
  },

  onLoad(options) {
    if (options.id) {
      this.data.postId = options.id;
      this.loadPostDetail(options.id);
      this.loadComments(options.id);
    }
  },

  onShow() {
    // 每次显示时刷新数据（比如从发布页返回）
    if (this.data.postId) {
      this.loadPostDetail(this.data.postId);
      this.loadComments(this.data.postId);
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadPostDetail(this.data.postId);
    this.loadComments(this.data.postId);
  },

  // 加载留言详情
  async loadPostDetail(id) {
    try {
      const result = await callFunction('getPostList', {
        action: 'detail',
        postId: id
      });

      if (!result) {
        this.setData({ loading: false });
        wx.showToast({ title: '留言不存在', icon: 'none' });
        return;
      }

      const post = result;
      // 过滤 cloud:// URL（iOS 无法直接显示）
      if (post.authorAvatar && post.authorAvatar.startsWith('cloud://')) post.authorAvatar = '';
      if (post.images && post.images.length > 0) {
        post.images = post.images.map(img =>
          (img && img.startsWith('cloud://')) ? '' : img
        );
      }
      const timeValue = post.createTime || post.publishTime;
      if (timeValue) {
        const ts = toTimestamp(timeValue);
        post.createTimeFormatted = ts > 0 ? formatTime(new Date(ts), 'YYYY-MM-DD HH:mm') : '未知时间';
      } else {
        post.createTimeFormatted = '未知时间';
      }
      
      this.setData({
        post,
        liked: post.isLiked || false,
        likeCount: post.likeCount || 0,
        loading: false
      });
    } catch (error) {
      console.error('加载留言详情失败:', error);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // 加载评论列表（云函数返回嵌套结构：一级评论，每个有 replies: []）
  async loadComments(postId) {
    try {
      const result = await callFunction('commentPost', {
        action: 'getList',
        postId: postId
      });

      // callFunction 已自动解出 result.data，这里 result 就是嵌套数组
      const topLevel = Array.isArray(result) ? result : [];

      // 格式化时间 + 过滤 cloud:// 头像
      const formatComment = (c) => {
        const ts = toTimestamp(c.createTime);
        let authorAvatar = c.authorAvatar || '';
        if (authorAvatar.startsWith('cloud://')) authorAvatar = '';
        return {
          ...c,
          authorAvatar,
          createTimeFormatted: ts > 0 ? formatTime(new Date(ts), 'MM-DD HH:mm') : '未知时间',
          replies: (c.replies || []).map(r => {
            let replyAvatar = r.authorAvatar || '';
            if (replyAvatar.startsWith('cloud://')) replyAvatar = '';
            return {
              ...r,
              authorAvatar: replyAvatar,
              createTimeFormatted: toTimestamp(r.createTime) > 0
                ? formatTime(new Date(toTimestamp(r.createTime)), 'MM-DD HH:mm')
                : '未知时间'
            };
          })
        };
      };

      const comments = topLevel.map(formatComment);
      this.setData({ comments });
    } catch (error) {
      console.error('加载评论失败:', error);
    }
  },

  // 点赞
  async onLike() {
    if (!app.globalData.isLoggedIn) {
      this.navigateToLogin();
      return;
    }

    try {
      const result = await callFunction('likePost', {
        postId: this.data.postId
      });

      if (result) {
        const newLiked = result.isLiked !== undefined ? result.isLiked : !this.data.liked;
        this.setData({
          liked: newLiked,
          likeCount: newLiked ? this.data.likeCount + 1 : this.data.likeCount - 1
        });
      }
    } catch (error) {
      console.error('点赞失败:', error);
    }
  },

  // 显示评论输入框
  onShowCommentInput(e) {
    const replyTo = e.currentTarget.dataset.reply || null;
    this.setData({
      showCommentInput: true,
      replyTo: replyTo
    });
  },

  // 隐藏评论输入框
  onHideCommentInput() {
    this.setData({
      showCommentInput: false,
      replyTo: null,
      commentContent: ''
    });
  },

  // 输入评论内容
  onCommentInput(e) {
    const val = e.detail.value;
    this.setData({
      commentContent: val,
      canSubmitComment: val.trim().length > 0
    });
  },

  // 提交评论
  async onSubmitComment() {
    if (!app.globalData.isLoggedIn) {
      this.navigateToLogin();
      return;
    }

    const { commentContent, postId, replyTo } = this.data;
    if (!commentContent.trim()) {
      wx.showToast({ title: '请输入评论内容', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    try {
      await callFunction('commentPost', {
        action: 'create',
        postId: postId,
        content: commentContent.trim(),
        replyToId: replyTo ? replyTo._id : ''
      });

      wx.showToast({ title: '评论成功', icon: 'success' });
      this.setData({ commentContent: '', showCommentInput: false, replyTo: null, submitting: false });
      this.loadComments(postId);
    } catch (error) {
      console.error('评论失败:', error);
      wx.showToast({ title: '评论失败', icon: 'none' });
      this.setData({ submitting: false });
    }
  },

  // 预览图片
  onPreviewImage(e) {
    const { url, urls } = e.currentTarget.dataset;
    wx.previewImage({
      current: url,
      urls: urls || [url]
    });
  },

  // 跳转登录
  navigateToLogin() {
    wx.showToast({ title: '请先登录', icon: 'none' });
    setTimeout(() => {
      wx.switchTab({ url: '/pages/profile/profile' });
    }, 1500);
  }
});
