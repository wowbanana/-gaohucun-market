// pages/board-detail/board-detail.js - 留言详情页
const app = getApp();
const { callFunction } = require('../../utils/request');
const { toTimestamp, formatTime, showError, showSuccess } = require('../../utils/util');
const { createVoiceRecorder, createVoicePlayer, uploadVoice, formatDuration } = require('../../utils/voice');

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
    likeCount: 0,
    // 语音相关
    inputMode: 'text',         // 'text' | 'voice'
    isRecording: false,
    recordingDuration: 0,
    voicePlayingId: null,
    willCancel: false,
    _touchStartY: 0,
    // 语音 UI 计算属性（避免 WXML 嵌套三元编译报错）
    voiceBtnClass: '',
    voiceBtnText: '按住说话',
    voiceOverlayCardClass: '',
    voiceWaveBarClass: '',
    voiceOverlayHintText: '上滑取消发送'
  },

  onLoad(options) {
    if (options.id) {
      this.data.postId = options.id;
      this.loadPostDetail(options.id);
      this.loadComments(options.id);
    }

    // 初始化语音模块
    this.voiceRecorder = createVoiceRecorder();
    this.voicePlayer = createVoicePlayer();

    this.voiceRecorder.onStateChange((state) => {
      this.setData({
        isRecording: state.isRecording,
        recordingDuration: state.currentDuration
      });
      this._updateVoiceUI(state.isRecording, this.data.willCancel);
    });

    this.voicePlayer.onStateChange((state) => {
      this.setData({ voicePlayingId: state.playingId });
    });
  },

  onShow() {
    if (this.data.postId) {
      this.loadPostDetail(this.data.postId);
      this.loadComments(this.data.postId);
    }
  },

  onUnload() {
    if (this.voiceRecorder) this.voiceRecorder.destroy();
    if (this.voicePlayer) this.voicePlayer.destroy();
  },

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

  // 加载评论列表
  async loadComments(postId) {
    try {
      const result = await callFunction('commentPost', {
        action: 'getList',
        postId: postId
      });

      const topLevel = Array.isArray(result) ? result : [];

      const formatComment = (c) => {
        const ts = toTimestamp(c.createTime);
        let authorAvatar = c.authorAvatar || '';
        if (authorAvatar.startsWith('cloud://')) authorAvatar = '';
        // 语音评论：云函数可能已转换 cloud:// 为 HTTPS
        let voiceUrl = '';
        if (c.type === 'voice' && c.content) {
          voiceUrl = c.content.startsWith('cloud://') ? '' : c.content;
        }
        return {
          ...c,
          authorAvatar,
          _voiceUrl: voiceUrl,
          createTimeFormatted: ts > 0 ? formatTime(new Date(ts), 'MM-DD HH:mm') : '未知时间',
          replies: (c.replies || []).map(r => {
            let replyAvatar = r.authorAvatar || '';
            if (replyAvatar.startsWith('cloud://')) replyAvatar = '';
            let rVoiceUrl = '';
            if (r.type === 'voice' && r.content) {
              rVoiceUrl = r.content.startsWith('cloud://') ? '' : r.content;
            }
            return {
              ...r,
              authorAvatar: replyAvatar,
              _voiceUrl: rVoiceUrl,
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

  // 提交文字评论
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
        type: 'text',
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

  // ========== 语音输入 ==========

  _updateVoiceUI(isRecording, willCancel) {
    if (!isRecording) {
      this.setData({
        voiceBtnClass: '',
        voiceBtnText: '按住说话',
        voiceOverlayCardClass: '',
        voiceWaveBarClass: '',
        voiceOverlayHintText: '上滑取消发送'
      });
    } else if (willCancel) {
      this.setData({
        voiceBtnClass: 'voice-cancel',
        voiceBtnText: '松开取消',
        voiceOverlayCardClass: 'voice-overlay-cancel',
        voiceWaveBarClass: 'voice-wave-bar--cancel',
        voiceOverlayHintText: '松开取消'
      });
    } else {
      this.setData({
        voiceBtnClass: 'voice-recording',
        voiceBtnText: '松开发送 · 上滑取消',
        voiceOverlayCardClass: '',
        voiceWaveBarClass: '',
        voiceOverlayHintText: '上滑取消发送'
      });
    }
  },

  onToggleInputMode() {
    this.setData({
      inputMode: this.data.inputMode === 'text' ? 'voice' : 'text'
    });
  },

  async onVoiceTouchStart(e) {
    if (this.data.isRecording) return;
    if (this.voicePlayer) this.voicePlayer.stop();

    const touch = (e.touches && e.touches[0]) || {};
    this.setData({ willCancel: false, _touchStartY: touch.clientY || 0 });
    this._updateVoiceUI(this.data.isRecording, false);

    try {
      await this.voiceRecorder.requestAuth();
    } catch (e) {
      this.setData({ isRecording: false, willCancel: false });
      this._updateVoiceUI(false, false);
      return;
    }

    this._recordPromise = this.voiceRecorder.start().then(async (res) => {
      this._recordPromise = null;
      const { tempFilePath, duration } = res;
      if (!tempFilePath) return;

      wx.showLoading({ title: '发送中...' });
      try {
        const fileID = await uploadVoice(tempFilePath);
        const voiceSeconds = Math.ceil(duration / 1000);
        await callFunction('commentPost', {
          action: 'create',
          postId: this.data.postId,
          content: fileID,
          type: 'voice',
          duration: voiceSeconds,
          replyToId: this.data.replyTo ? this.data.replyTo._id : ''
        });
        wx.hideLoading();
        wx.showToast({ title: '语音评论成功', icon: 'success' });
        this.setData({ showCommentInput: false, replyTo: null });
        this.loadComments(this.data.postId);
      } catch (error) {
        wx.hideLoading();
        console.error('语音发送失败:', error);
        wx.showToast({ title: '语音发送失败', icon: 'none' });
      }
    }).catch((err) => {
      this._recordPromise = null;
      console.error('录音失败:', err);
    });
  },

  onVoiceTouchMove(e) {
    if (!this.data.isRecording) return;
    const touch = (e.touches && e.touches[0]) || {};
    const currentY = touch.clientY || 0;
    const startY = this.data._touchStartY;
    const willCancel = startY > 0 && (startY - currentY) > 30;
    if (willCancel !== this.data.willCancel) {
      this.setData({ willCancel });
      this._updateVoiceUI(this.data.isRecording, willCancel);
    }
  },

  onVoiceTouchEnd() {
    if (!this.data.isRecording) return;

    const shouldCancel = this.data.willCancel;
    this.setData({ willCancel: false });

    if (shouldCancel) {
      this.voiceRecorder.cancel();
      this._updateVoiceUI(false, false);
      return;
    }

    if (this.data.recordingDuration < 1) {
      this.voiceRecorder.cancel();
      this._updateVoiceUI(false, false);
      wx.showToast({ title: '说话时间太短', icon: 'none' });
      return;
    }

    this._updateVoiceUI(false, false);
    this.voiceRecorder.stop();
  },

  onVoiceTouchCancel() {
    if (!this.data.isRecording) return;
    this.voiceRecorder.cancel();
    this.setData({ willCancel: false });
    this._updateVoiceUI(false, false);
  },

  // 播放评论语音
  onPlayCommentVoice(e) {
    let fileId = e.currentTarget.dataset.fileid;
    const msgId = e.currentTarget.dataset.msgid;
    if (!fileId) return;

    if (fileId.startsWith('cloud://')) {
      wx.cloud.getTempFileURL({
        fileList: [fileId],
        success: (res) => {
          if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
            this.voicePlayer.play(res.fileList[0].tempFileURL, msgId);
          }
        },
        fail: () => {
          wx.showToast({ title: '语音加载失败', icon: 'none' });
        }
      });
    } else {
      this.voicePlayer.play(fileId, msgId);
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
