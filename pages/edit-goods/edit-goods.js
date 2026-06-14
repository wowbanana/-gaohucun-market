// pages/edit-goods/edit-goods.js - 编辑商品页
const { callFunction, uploadImages } = require('../../utils/request');
const { showError, showSuccess, showLoading, hideLoading } = require('../../utils/util');

Page({
  data: {
    goodsId: '',
    goods: null,
    loading: true,
    submitting: false,
    canSubmit: false,

    // 分类选项（与发布页一致）
    categories: [
      { id: 'agri_vegetable', name: '蔬菜', icon: '🥬', parent: 'agri' },
      { id: 'agri_fruit', name: '水果', icon: '🍎', parent: 'agri' },
      { id: 'agri_meat', name: '肉类', icon: '🥩', parent: 'agri' },
      { id: 'agri_grain', name: '粮油', icon: '🌾', parent: 'agri' },
      { id: 'electronics', name: '家电数码', icon: '📺', parent: '' },
      { id: 'furniture', name: '家具家居', icon: '🪑', parent: '' },
      { id: 'clothing', name: '衣物鞋帽', icon: '👕', parent: '' },
      { id: 'baby', name: '母婴用品', icon: '🍼', parent: '' },
      { id: 'other', name: '其他闲置', icon: '📦', parent: '' }
    ],

    // 成色选项
    conditionOptions: ['全新', '九成新', '八成新', '七成新', '五成新', '面议'],

    // 计价单位（与发布页顺序一致）
    priceUnits: ['元/个', '元/件', '元/斤', '元/两', '元/公斤', '元/把', '元/套', '元/台'],

    // 图片列表
    imageList: [],

    // 表单数据
    formData: {
      title: '',
      description: '',
      category: '',
      price: '',
      priceUnit: '元/个',
      condition: '',
      conditionDisplay: '',
      contactInfo: '',
      images: []
    }
  },

  onLoad(options) {
    if (!options.id) {
      showError('商品不存在');
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    this.setData({ goodsId: options.id });
    this.loadGoods(options.id);
  },

  // 加载商品详情
  async loadGoods(goodsId) {
    try {
      const goods = await callFunction('getGoodsDetail', { id: goodsId });

      if (!goods) {
        showError('商品不存在');
        setTimeout(() => wx.navigateBack(), 1500);
        return;
      }

      // 成色 ID → 显示名 映射
      const conditionMap = {
        'new': '全新', 'like_new': '九成新', 'good': '八成新',
        'fair': '七成新', 'poor': '五成新', 'negotiable': '面议'
      };
      const conditionDisplay = conditionMap[goods.condition] || goods.condition || '';

      this.setData({
        goods,
        loading: false,
        imageList: goods.images || [],
        formData: {
          title: goods.title || '',
          description: goods.description || '',
          category: goods.categoryId || '',
          price: goods.price ? String(goods.price) : '',
          priceUnit: goods.priceUnit || '元/个',
          condition: goods.condition || '',
          conditionDisplay: conditionDisplay,
          contactInfo: goods.contactInfo || '',
          images: goods.images || []
        }
      }, () => {
        this.checkCanSubmit();
      });
    } catch (error) {
      console.error('加载商品失败:', error);
      this.setData({ loading: false });
      showError('加载失败');
    }
  },

  // ========== 图片操作 ==========

  async onChooseImage() {
    const remaining = 9 - this.data.imageList.length;
    if (remaining <= 0) {
      showError('最多上传9张图片');
      return;
    }

    try {
      const res = await wx.chooseMedia({
        count: remaining,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed'],
        camera: 'back'
      });

      const newImages = res.tempFiles.map(file => file.tempFilePath);
      this.setData({
        imageList: [...this.data.imageList, ...newImages]
      });
      this.checkCanSubmit();
    } catch (error) {
      if (error.errMsg !== 'chooseMedia:fail cancel') {
        showError('选择图片失败');
      }
    }
  },

  onDeleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const imageList = [...this.data.imageList];
    imageList.splice(index, 1);
    this.setData({ imageList });
    this.checkCanSubmit();
  },

  onPreviewImage(e) {
    const index = e.currentTarget.dataset.index;
    wx.previewImage({
      current: this.data.imageList[index],
      urls: this.data.imageList
    });
  },

  // ========== 表单输入 ==========

  onTitleInput(e) {
    this.setData({ 'formData.title': e.detail.value });
    this.checkCanSubmit();
  },

  onDescriptionInput(e) {
    this.setData({ 'formData.description': e.detail.value });
  },

  // 选择分类（点击芯片，与发布页一致）
  onCategoryTap(e) {
    const categoryId = e.currentTarget.dataset.id;
    this.setData({ 'formData.category': categoryId });
    this.checkCanSubmit();
  },

  onPriceInput(e) {
    this.setData({ 'formData.price': e.detail.value });
    this.checkCanSubmit();
  },

  onPriceUnitChange(e) {
    const index = e.detail.value;
    this.setData({ 'formData.priceUnit': this.data.priceUnits[index] });
  },

  onConditionChange(e) {
    const index = e.detail.value;
    const conditionDisplay = this.data.conditionOptions[index];
    // 成色显示名 → 存储ID 映射
    const conditionIdMap = {
      '全新': 'new', '九成新': 'like_new', '八成新': 'good',
      '七成新': 'fair', '五成新': 'poor', '面议': 'negotiable'
    };
    this.setData({
      'formData.condition': conditionIdMap[conditionDisplay] || conditionDisplay,
      'formData.conditionDisplay': conditionDisplay
    });
    this.checkCanSubmit();
  },

  onContactInput(e) {
    this.setData({ 'formData.contactInfo': e.detail.value });
  },

  // ========== 提交校验 ==========

  checkCanSubmit() {
    const { title, category, price, condition } = this.data.formData;
    const hasImages = this.data.imageList.length > 0;
    const canSubmit = !!(title && category && price && condition && hasImages);
    this.setData({ canSubmit });
  },

  // ========== 保存修改 ==========

  async onSave() {
    if (!this.data.canSubmit || this.data.submitting) return;
    if (!this.validateForm()) return;

    this.setData({ submitting: true });
    showLoading('保存中...');

    try {
      const formData = this.data.formData;
      const imageList = this.data.imageList;

      // 判断哪些是新选择的本地图片 vs 已有的云端图片
      const existingImages = formData.images || [];
      const newLocalImages = imageList.filter(img => !existingImages.includes(img));
      const keptImages = imageList.filter(img => existingImages.includes(img));

      let uploadedUrls = [];
      if (newLocalImages.length > 0) {
        uploadedUrls = await uploadImages(newLocalImages, 'goods');
      }

      const finalImages = [...keptImages, ...uploadedUrls];

      // 调用云函数更新
      await callFunction('updateGoods', {
        goodsId: this.data.goodsId,
        title: formData.title,
        description: formData.description,
        categoryId: formData.category,
        price: parseFloat(formData.price),
        priceUnit: formData.priceUnit,
        condition: formData.condition,
        contactInfo: formData.contactInfo,
        images: finalImages
      });

      hideLoading();
      showSuccess('保存成功');
      // 设置刷新标记，让商品详情页 onShow 时重新加载
      getApp().globalData.needRefreshGoodsDetail = this.data.goodsId;
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (error) {
      hideLoading();
      console.error('保存失败:', error);
      showError(error.message || '保存失败，请重试');
      this.setData({ submitting: false });
    }
  },

  validateForm() {
    const { title, price, condition } = this.data.formData;
    const imageList = this.data.imageList;

    if (!title || title.length < 2) {
      showError('请输入商品标题（至少2个字）');
      return false;
    }
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      showError('请输入有效的价格');
      return false;
    }
    if (!condition) {
      showError('请选择商品成色');
      return false;
    }
    if (imageList.length === 0) {
      showError('请至少上传一张图片');
      return false;
    }
    return true;
  },

  // 取消编辑
  onCancel() {
    wx.navigateBack();
  }
});
