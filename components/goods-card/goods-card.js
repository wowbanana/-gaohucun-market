// components/goods-card/goods-card.js - 商品卡片组件
Component({
  properties: {
    // 商品数据
    goods: {
      type: Object,
      value: {}
    },
    // 显示模式：grid(网格) / list(列表)
    mode: {
      type: String,
      value: 'grid'
    },
    // 是否显示距离
    showDistance: {
      type: Boolean,
      value: true
    }
  },

  data: {
    defaultAvatar: '/images/default-avatar.png'
  },

  methods: {
    // 点击商品卡片
    onCardTap() {
      const { goods } = this.properties;
      if (goods && goods._id) {
        wx.navigateTo({
          url: `/pages/goods-detail/goods-detail?id=${goods._id}`
        });
      }
    },

    // 点击收藏按钮
    onFavoriteTap(e) {
      e.stopPropagation();
      const { goods } = this.properties;
      this.triggerEvent('favorite', { goodsId: goods._id, favorited: goods.isFavorited });
    },

    // 预览图片
    onImageTap(e) {
      e.stopPropagation();
      const { url } = e.currentTarget.dataset;
      const images = this.properties.goods.images || [url];
      wx.previewImage({
        current: url,
        urls: images
      });
    }
  }
});
