// pages/goods-detail/goods-detail.js - 商品详情页
const { callFunction } = require('../../utils/request');
const { makePhoneCall, copyToClipboard, previewImage, showError, showSuccess, toTimestamp, formatTime } = require('../../utils/util');

Page({
  data: {
    goodsId: '',
    goods: null,
    loading: true,
    isFavorited: false,
    isOwner: false,
    currentImageIndex: 0,
    seller: null,
    viewCount: 0
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ goodsId: options.id });
      this.loadGoodsDetail(options.id);
    } else {
      showError('商品不存在');
      setTimeout(() => { wx.navigateBack(); }, 1500);
    }
  },

  onShow() {
    if (this.data.goodsId && this.data.goods) {
      // 从编辑页返回时，重新加载商品数据
      const app = getApp();
      if (app.globalData.needRefreshGoodsDetail === this.data.goodsId) {
        app.globalData.needRefreshGoodsDetail = null;
        this.loadGoodsDetail(this.data.goodsId);
        return;
      }
      // 仅刷新收藏状态
      this.checkFavoriteStatus();
    }
  },

  // 加载商品详情
  async loadGoodsDetail(goodsId) {
    this.setData({ loading: true });

    try {
      const goods = await callFunction('getGoodsDetail', { id: goodsId });

      if (goods) {
        // 调试：打印云函数返回的关键字段
        console.log('[商品详情] 云函数返回 _openid:', goods._openid, 'sellerOpenid:', goods.sellerOpenid, '_id:', goods._id);

        // 判断是否是自己的商品（优先使用 sellerOpenid）
        // 先确保 openid 已获取（异步），再比较
        const myOpenid = await getApp().ensureOpenid();
        const ownerOpenid = goods.sellerOpenid || goods._openid;
        const isOwner = !!(myOpenid && ownerOpenid && String(ownerOpenid) === String(myOpenid));
        console.log('[商品详情] myOpenid:', myOpenid, 'ownerOpenid:', ownerOpenid, 'isOwner:', isOwner);

        // 格式化时间 - 优先使用 createTimestamp（云函数转换好的），fallback createTime / publishTime
        const timeValue = goods.createTimestamp || goods.createTime || goods.publishTime;
        if (timeValue) {
          const ts = toTimestamp(timeValue);
          goods.publishTimeText = ts > 0 ? formatTime(new Date(ts), 'YYYY-MM-DD HH:mm') : '未知时间';
        } else {
          goods.publishTimeText = '未知时间';
        }

        goods.priceText = this.formatPrice(goods.price, goods.priceUnit);
        goods.conditionText = this.getConditionText(goods.condition);
        goods.priceUnitText = this.formatUnit(goods.priceUnit);

        // 确保图片数组存在
        if (!goods.imageUrls || goods.imageUrls.length === 0) {
          goods.imageUrls = goods.images && goods.images.length > 0 ? goods.images : ['/images/default-goods.png'];
        }

        const statusMap = { selling: '在售', sold: '已售', reserved: '已下架' };
        const statusText = statusMap[goods.status] || '在售';

        this.setData({
          goods: goods,
          isOwner: isOwner,
          isFavorited: goods.isFavorited || false,
          statusText: statusText,
          seller: {
            nickName: goods.sellerName || '匿名用户',
            avatarUrl: goods.sellerAvatar || '/images/default-avatar.png',
            publishTimeText: goods.publishTimeText
          },
          viewCount: goods.viewCount || 0,
          loading: false
        });

        // 设置页面标题
        wx.setNavigationBarTitle({
          title: goods.title.length > 10 ? goods.title.substring(0, 10) + '...' : goods.title
        });
      } else {
        throw new Error('商品不存在');
      }
    } catch (error) {
      console.error('加载商品详情失败:', error);
      this.setData({ loading: false });
      showError('加载失败，请重试');
      setTimeout(() => { wx.navigateBack(); }, 1500);
    }
  },

  // 检查收藏状态（非自己商品时才检查）
  async checkFavoriteStatus() {
    if (this.data.isOwner) return;
    try {
      const userInfo = wx.getStorageSync('userInfo');
      if (!userInfo || !this.data.goodsId) return;

      const result = await callFunction('getFavoriteStatus', { goodsId: this.data.goodsId });
      if (result && result.isFavorited !== undefined) {
        this.setData({ isFavorited: result.isFavorited });
      }
    } catch (error) {
      console.error('检查收藏状态失败:', error);
    }
  },

  // ========== 收藏 ==========
  async onFavoriteTap() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) { showError('请先登录'); return; }

    try {
      const action = this.data.isFavorited ? 'remove' : 'add';
      await callFunction('toggleFavorite', { action, goodsId: this.data.goodsId });

      const isFavorited = !this.data.isFavorited;
      this.setData({ isFavorited });
      showSuccess(isFavorited ? '已收藏' : '已取消收藏');
    } catch (error) {
      console.error('收藏操作失败:', error);
      showError('操作失败，请重试');
    }
  },

  // ========== 自己的商品操作 ==========
  // 编辑商品
  onEditTap() {
    wx.navigateTo({
      url: `/pages/edit-goods/edit-goods?id=${this.data.goodsId}`
    });
  },

  // 下架商品
  async onTakeOff() {
    const res = await wx.showModal({
      title: '确认下架',
      content: '下架后商品将不再展示给其他用户，确定下架吗？'
    });
    if (!res.confirm) return;

    try {
      await callFunction('updateGoodsStatus', { goodsId: this.data.goodsId, status: 'off' });
      showSuccess('已下架');
      this.loadGoodsDetail(this.data.goodsId);
    } catch (error) {
      showError('操作失败');
    }
  },

  // 重新上架
  async onPutOn() {
    try {
      await callFunction('updateGoodsStatus', { goodsId: this.data.goodsId, status: 'selling' });
      showSuccess('已上架');
      this.loadGoodsDetail(this.data.goodsId);
    } catch (error) {
      showError('操作失败');
    }
  },

  // 标记已售
  async onMarkSold() {
    const res = await wx.showModal({
      title: '确认已售',
      content: '标记已售后商品将从列表中移除，确定吗？'
    });
    if (!res.confirm) return;

    try {
      await callFunction('updateGoodsStatus', { goodsId: this.data.goodsId, status: 'sold' });
      showSuccess('已标记为已售');
      this.loadGoodsDetail(this.data.goodsId);
    } catch (error) {
      showError('操作失败');
    }
  },

  // 删除商品
  async onDeleteGoods() {
    const res = await wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确定删除吗？',
      confirmColor: '#DC2626'
    });
    if (!res.confirm) return;

    try {
      await callFunction('updateGoodsStatus', { goodsId: this.data.goodsId, status: 'deleted' });
      showSuccess('已删除');
      setTimeout(() => { wx.navigateBack(); }, 1500);
    } catch (error) {
      showError('删除失败');
    }
  },

  // ========== 通用操作 ==========
  onImageChange(e) { this.setData({ currentImageIndex: e.detail.current }); },

  onImagePreview(e) {
    const current = e.currentTarget.dataset.index;
    const urls = this.data.goods.imageUrls || this.data.goods.images;
    wx.previewImage({ urls, current: urls[current] });
  },

  // ========== 在线联系 ==========
  async onChatSeller() {
    const goods = this.data.goods;
    if (!goods) {
      showError('商品信息不存在');
      return;
    }

    // 不能联系自己
    if (this.data.isOwner) {
      showError('这是您自己发布的商品');
      return;
    }

    // 获取卖家 openid（优先使用云函数显式返回的 sellerOpenid）
    const sellerOpenid = goods.sellerOpenid || goods._openid;
    console.log('[在线联系] goods._openid:', goods._openid, 'goods.sellerOpenid:', goods.sellerOpenid, '最终sellerOpenid:', sellerOpenid);
    if (!sellerOpenid) {
      showError('卖家信息暂时无法获取，请稍后再试');
      return;
    }

    // 获取我的 openid（自动获取，无需手动登录）
    const myOpenid = await getApp().ensureOpenid();
    if (!myOpenid) {
      showError('获取用户信息失败，请稍后重试');
      return;
    }

    const ids = [myOpenid, sellerOpenid].sort();
    const chatId = goods._id ? `${ids[0]}_${ids[1]}_${goods._id}` : `${ids[0]}_${ids[1]}`;

    console.log('[在线联系] 跳转聊天页 chatId:', chatId, 'toUserId:', sellerOpenid, 'goodsId:', goods._id);
    wx.navigateTo({
      url: `/pages/chat/chat?chatId=${chatId}&toUserId=${sellerOpenid}&goodsId=${goods._id}`
    });
  },

  // 点击拨打电话
  onCallPhone() {
    const phone = this.data.goods && this.data.goods.contactInfo;
    if (!phone) return;
    wx.makePhoneCall({ phoneNumber: phone });
  },

  // 返回上一页
  onBackTap() {
    wx.navigateBack();
  },

  onBackHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  onShareAppMessage() {
    const goods = this.data.goods;
    return {
      title: `${goods.title} - 仅${goods.priceText}`,
      path: `/pages/goods-detail/goods-detail?id=${this.data.goodsId}`,
            imageUrl: (goods.imageUrls && goods.imageUrls[0]) || (goods.images && goods.images[0]) || ''
    };
  },

  onShareTimeline() {
    const goods = this.data.goods;
    return {
      title: `${goods.title} - 仅${goods.priceText} - 高湖村二手市场`,
      query: `id=${this.data.goodsId}`,
            imageUrl: (goods.imageUrls && goods.imageUrls[0]) || (goods.images && goods.images[0]) || ''
    };
  },

  // ========== 工具函数 ==========
  formatPrice(price, unit) {
    if (!price && price !== 0) return '面议';
    return '￥' + price;
  },

  formatUnit(unit) {
    if (!unit || unit === '元/件' || unit === '元/台' || unit === '元/套') return '';
    return '/' + unit.replace('元/', '');
  },

  getConditionText(condition) {
    const conditionMap = {
      'new': '全新', 'like_new': '九成新', 'good': '八成新',
      'fair': '七成新', 'poor': '五成新', 'negotiable': '面议'
    };
    return conditionMap[condition] || condition || '未知';
  }
});
