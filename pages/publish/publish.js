// pages/publish/publish.js - 发布商品页
const { callFunction, uploadImages } = require('../../utils/request');
const { showError, showSuccess, showLoading, hideLoading } = require('../../utils/util');

Page({
  data: {
    // 表单数据
    formData: {
      title: '',
      description: '',
      category: '',
      price: '',
      priceUnit: '元/个',
      condition: '全新',
      contactInfo: ''
    },

    // 分类选项
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
    conditions: ['全新', '九成新', '八成新', '七成新', '五成新', '面议'],

    // 计价单位
    priceUnits: ['元/个', '元/件', '元/斤', '元/两', '元/公斤', '元/把', '元/套', '元/台'],

    // 图片上传
    imageList: [],

    // 表单状态
    submitting: false,
    canSubmit: false
  },

  onLoad() {
    // 预填联系方式
    this.prefillContactInfo();
  },

  onShow() {
    // 如果刚发布成功，重置表单
    if (this._justPublished) {
      this._justPublished = false;
      this.resetFormData();
    }
  },

  // 预填联系方式
  prefillContactInfo() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.phone) {
      this.setData({ 'formData.contactInfo': userInfo.phone });
    }
  },

  // ========== 表单输入 ==========

  onTitleInput(e) {
    this.setData({ 'formData.title': e.detail.value });
    this.checkCanSubmit();
  },

  onDescriptionInput(e) {
    this.setData({ 'formData.description': e.detail.value });
  },

  // 选择分类（点击卡片式）
  onCategoryTap(e) {
    const categoryId = e.currentTarget.dataset.id;
    const category = this.data.categories.find(c => c.id === categoryId);

    this.setData({
      'formData.category': categoryId,
      'formData.categoryName': category ? category.name : ''
    });

    // 自动设置计价单位
    this.autoSetPriceUnit(categoryId);
    this.checkCanSubmit();
  },

  // 自动设置计价单位
  autoSetPriceUnit(categoryId) {
    const agriCategories = ['agri_vegetable', 'agri_fruit', 'agri_meat', 'agri_grain'];
    const unit = agriCategories.includes(categoryId) ? '元/斤' : '元/个';
    this.setData({ 'formData.priceUnit': unit });
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
    this.setData({ 'formData.condition': this.data.conditions[index] });
    this.checkCanSubmit();
  },

  onContactInput(e) {
    this.setData({ 'formData.contactInfo': e.detail.value });
    this.checkCanSubmit();
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

      const newImages = res.tempFiles.map(file => ({
        path: file.tempFilePath,
        size: file.size,
        status: 'pending'
      }));

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
    const urls = this.data.imageList.map(img => img.path);
    wx.previewImage({
      urls: urls,
      current: urls[index]
    });
  },

  // ========== 提交 ==========

  checkCanSubmit() {
    const { title, category, price, condition } = this.data.formData;
    const hasImages = this.data.imageList.length > 0;
    const canSubmit = !!(title && category && price && condition && hasImages);
    this.setData({ canSubmit });
  },

  async onSubmit() {
    if (!this.data.canSubmit || this.data.submitting) return;
    if (!this.validateForm()) return;

    this.setData({ submitting: true });
    showLoading('发布中...');

    try {
      // 上传图片
      const filePaths = this.data.imageList.map(img => img.path);
      const imageUrls = await uploadImages(filePaths, 'goods');

      if (imageUrls.length === 0) {
        throw new Error('图片上传失败');
      }

      // 提交商品
      const formData = this.data.formData;
      await callFunction('publishGoods', {
        title: formData.title,
        description: formData.description,
        categoryId: formData.category,
        price: parseFloat(formData.price),
        priceUnit: formData.priceUnit,
        condition: formData.condition,
        location: '',
        contactInfo: formData.contactInfo,
        images: imageUrls
      });

      hideLoading();
      showSuccess('发布成功');

      // 标记刷新
      this._justPublished = true;
      getApp().globalData.needRefreshIndex = true;

      setTimeout(() => {
        wx.switchTab({ url: '/pages/index/index' });
      }, 1500);
    } catch (error) {
      hideLoading();
      console.error('发布失败:', error);
      showError(error.message || '发布失败，请重试');
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

  // 重置表单
  onReset() {
    wx.showModal({
      title: '确认重置',
      content: '确定要清空所有填写的内容吗？',
      success: (res) => {
        if (res.confirm) {
          this.resetFormData();
        }
      }
    });
  },

  resetFormData() {
    this.setData({
      formData: {
        title: '',
        description: '',
        category: '',
        categoryName: '',
        price: '',
        priceUnit: '元/个',
        condition: '全新',
        contactInfo: ''
      },
      imageList: [],
      canSubmit: false,
      submitting: false
    });
  }
});
