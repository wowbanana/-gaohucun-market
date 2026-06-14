// pages/chat/chat.js - 聊天页
const { callFunction } = require('../../utils/request');
const { toTimestamp, formatTime } = require('../../utils/util');
const { createVoiceRecorder, createVoicePlayer, uploadVoice, formatDuration } = require('../../utils/voice');

Page({
  data: {
    chatId: '',
    toUserId: '',
    goodsId: '',
    myOpenid: '',
    myAvatar: '',
    otherUser: { nickName: '用户', avatarUrl: '' },
    goodsInfo: null,
    messageList: [],
    inputText: '',
    canSend: false,
    scrollToId: '',
    page: 1,
    hasMore: true,
    loading: false,
    pollTimer: null,
    // 语音相关
    inputMode: 'text',         // 'text' | 'voice'
    isRecording: false,
    recordingDuration: 0,
    recordingTimer: null,
    voicePlayingId: null,
    willCancel: false,         // 手指是否在取消区域
    _touchStartY: 0,           // 触摸起始 Y 坐标（内部用）
    // 语音 UI 计算属性（避免 WXML 嵌套三元）
    voiceBtnClass: '',
    voiceBtnText: '按住说话',
    voiceOverlayCardClass: '',
    voiceWaveBarClass: '',
    voiceOverlayHintText: '上滑取消发送'
  },

  onLoad(options) {
    const { chatId, toUserId, goodsId } = options;

    if (!chatId || !toUserId) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    this.setData({ chatId, toUserId, goodsId: goodsId || '' });

    const app = getApp();
    const myOpenid = app.globalData.openid || '';
    const userInfo = wx.getStorageSync('userInfo') || {};
    this.setData({
      myOpenid,
      myAvatar: userInfo.avatarUrl || ''
    });

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

    this.loadMessages();

    if (goodsId) {
      this.loadGoodsInfo(goodsId);
    }
    this.loadOtherUser(toUserId);
  },

  onShow() {
    this.setData({ page: 1, hasMore: true });
    this.loadMessages();
    this.startPolling();
  },

  onHide() {
    this.stopPolling();
  },

  onUnload() {
    this.stopPolling();
    if (this.data.recordingTimer) clearInterval(this.data.recordingTimer);
    if (this.voiceRecorder) this.voiceRecorder.destroy();
    if (this.voicePlayer) this.voicePlayer.destroy();
  },

  startPolling() {
    this.stopPolling();
    const pollTimer = setInterval(() => {
      if (!this.data.isRecording) {
        this.loadMessages();
      }
    }, 3000);
    this.data.pollTimer = pollTimer;
  },

  stopPolling() {
    if (this.data.pollTimer) {
      clearInterval(this.data.pollTimer);
      this.data.pollTimer = null;
    }
  },

  // 加载消息列表
  async loadMessages() {
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const result = await callFunction('getMessages', {
        chatId: this.data.chatId,
        page: 1,
        pageSize: 50
      });

      if (result && result.list) {
        const messageList = result.list.map(msg => {
          if (msg.createTime) {
            msg.timeText = formatTime(new Date(toTimestamp(msg.createTime)), 'YYYY-MM-DD HH:mm');
          }
          // 语音消息：云函数已转换 cloud:// → HTTPS，未转换的 fallback
          if (msg.type === 'voice' && msg.content && msg.content.startsWith('cloud://')) {
            msg._voiceSrc = '';
          } else {
            msg._voiceSrc = msg.content || '';
          }
          return msg;
        });

        this.setData({ messageList });

        setTimeout(() => {
          this.setData({ scrollToId: 'msg-' + (messageList.length - 1) });
        }, 100);
      }
    } catch (error) {
      console.error('加载消息失败:', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 加载商品信息
  async loadGoodsInfo(goodsId) {
    try {
      const result = await callFunction('getGoodsDetail', { id: goodsId });
      if (result) {
        // 优先用云函数转换好的 imageUrls（HTTPS），fallback 到 images[0]
        let imageUrl = '/images/default-goods.png';
        if (result.imageUrls && result.imageUrls.length > 0) {
          imageUrl = result.imageUrls[0];
        } else if (result.images && result.images[0]) {
          imageUrl = result.images[0].startsWith('cloud://') ? '/images/default-goods.png' : result.images[0];
        }
        this.setData({
          goodsInfo: {
            title: result.title,
            price: result.price,
            imageUrl: imageUrl
          }
        });
      }
    } catch (e) {
      console.error('加载商品信息失败:', e);
    }
  },

  // 加载对方用户信息
  async loadOtherUser(toUserId) {
    try {
      const result = await callFunction('getUserInfo', { userId: toUserId });
      if (result) {
        this.setData({
          otherUser: {
            nickName: result.nickName || '用户',
            avatarUrl: result.avatarUrl || ''
          }
        });
        wx.setNavigationBarTitle({ title: result.nickName || '聊天' });
      }
    } catch (e) {
      console.error('加载对方信息失败:', e);
    }
  },

  // ========== 文字输入 ==========

  onInputChange(e) {
    const val = e.detail.value || '';
    this.setData({
      inputText: val,
      canSend: val.trim().length > 0
    });
  },

  async onSend() {
    const content = this.data.inputText.trim();
    if (!content) return;

    this.setData({ inputText: '', canSend: false });

    try {
      await callFunction('sendMessage', {
        toUserId: this.data.toUserId,
        goodsId: this.data.goodsId,
        content,
        type: 'text'
      });
      await this.loadMessages();
    } catch (error) {
      console.error('发送消息失败:', error);
      wx.showToast({ title: '发送失败', icon: 'none' });
      this.setData({ inputText: content });
    }
  },

  // ========== 语音输入 ==========

  // 根据录音/取消状态算出 UI 状态，避免 WXML 嵌套三元
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

  // 切换文字/语音输入模式
  onToggleInputMode() {
    this.setData({
      inputMode: this.data.inputMode === 'text' ? 'voice' : 'text'
    });
  },

  // 按住开始录音
  async onVoiceTouchStart(e) {
    if (this.data.isRecording) return;
    if (this.voicePlayer) this.voicePlayer.stop();

    const touch = (e.touches && e.touches[0]) || {};
    this.setData({ willCancel: false, _touchStartY: touch.clientY || 0 });
    this._updateVoiceUI(this.data.isRecording, false);

    // 先请求授权
    try {
      await this.voiceRecorder.requestAuth();
    } catch (e) {
      this.setData({ isRecording: false, willCancel: false });
      this._updateVoiceUI(false, false);
      return;
    }

    // 开始录音，promise 在录音停止时 resolve
    this._recordPromise = this.voiceRecorder.start().then(async (res) => {
      this._recordPromise = null;
      const { tempFilePath, duration } = res;
      if (!tempFilePath) return;

      wx.showLoading({ title: '发送中...' });
      try {
        const fileID = await uploadVoice(tempFilePath);
        const voiceSeconds = Math.ceil(duration / 1000);
        await callFunction('sendMessage', {
          toUserId: this.data.toUserId,
          goodsId: this.data.goodsId,
          content: fileID,
          type: 'voice',
          duration: voiceSeconds
        });
        wx.hideLoading();
        await this.loadMessages();
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

  // 手指移动——检测是否上滑到取消区域
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

  // 松手
  onVoiceTouchEnd() {
    if (!this.data.isRecording) return;

    // 先保存当前 willCancel 状态，再重置
    const shouldCancel = this.data.willCancel;
    this.setData({ willCancel: false });

    // 上滑取消
    if (shouldCancel) {
      this.voiceRecorder.cancel();
      this._updateVoiceUI(false, false);
      return;
    }

    // 时长不足 1 秒
    if (this.data.recordingDuration < 1) {
      this.voiceRecorder.cancel();
      this._updateVoiceUI(false, false);
      wx.showToast({ title: '说话时间太短', icon: 'none' });
      return;
    }

    // 正常停止录音，结果由 _recordPromise 处理
    this._updateVoiceUI(false, false);
    this.voiceRecorder.stop();
  },

  // 系统中断
  onVoiceTouchCancel() {
    if (!this.data.isRecording) return;
    this.voiceRecorder.cancel();
    this.setData({ willCancel: false });
    this._updateVoiceUI(false, false);
  },

  // ========== 播放语音 ==========

  onPlayVoice(e) {
    const fileId = e.currentTarget.dataset.fileid;
    const msgId = e.currentTarget.dataset.msgid;
    if (!fileId) return;

    // 如果还是 cloud:// URL，先用 getTempFileURL 转换
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

  // 点击商品卡片
  onGoodsTap() {
    if (this.data.goodsId) {
      wx.navigateTo({
        url: '/pages/goods-detail/goods-detail?id=' + this.data.goodsId
      });
    }
  }
});
