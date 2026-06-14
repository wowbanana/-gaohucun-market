// pages/publish-wanted/publish-wanted.js - 发布求购
const { callFunction } = require('../../utils/request');
const { showError, showSuccess, showLoading, hideLoading } = require('../../utils/util');

Page({
  data: {
    // 表单数据
    formData: {
      title: '',
      description: '',
      category: '',
      budgetMin: '',
      budgetMax: '',
      budgetText: '',
      contactInfo: ''
    },
    
    // 分类选项
    categories: [
      { id: 'agri_vegetable', name: '农产品·蔬菜' },
      { id: 'agri_fruit', name: '农产品·水果' },
      { id: 'agri_meat', name: '农产品·肉类' },
      { id: 'agri_grain', name: '农产品·粮油' },
      { id: 'electronics', name: '家电数码' },
      { id: 'furniture', name: '家具家居' },
      { id: 'clothing', name: '衣物鞋帽' },
      { id: 'baby', name: '母婴用品' },
      { id: 'other', name: '其他闲置' }
    ],
    categoryNames: [],
    
    
    // 预算选项
    budgetOptions: ['面议', '具体金额'],
    budgetType: 0, // 0: 面议, 1: 具体金额
    
    // 表单状态
    submitting: false,
    canSubmit: false
  },

  onLoad() {
    // 初始化分类名称数组
    const categoryNames = this.data.categories.map(c => c.name);
    this.setData({ categoryNames });
    
    // 预填联系方式
    this.prefillContactInfo();
  },

  // 预填联系方式
  prefillContactInfo() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.phone) {
      this.setData({
        'formData.contactInfo': userInfo.phone
      });
    }
  },

  // 输入标题
  onTitleInput(e) {
    this.setData({
      'formData.title': e.detail.value
    });
    this.checkCanSubmit();
  },

  // 输入描述
  onDescriptionInput(e) {
    this.setData({
      'formData.description': e.detail.value
    });
  },

  // 选择分类
  onCategoryChange(e) {
    const index = e.detail.value;
    const category = this.data.categories[index];
    
    this.setData({
      'formData.category': category.id
    });
  },

  // 选择预算类型
  onBudgetTypeChange(e) {
    const index = e.detail.value;
    this.setData({
      budgetType: parseInt(index)
    });
    
    if (parseInt(index) === 0) {
      // 面议
      this.setData({
        'formData.budgetText': '面议',
        'formData.budgetMin': '',
        'formData.budgetMax': ''
      });
    } else {
      this.setData({
        'formData.budgetText': ''
      });
    }
  },

  // 输入最低预算
  onBudgetMinInput(e) {
    this.setData({
      'formData.budgetMin': e.detail.value
    });
  },

  // 输入最高预算
  onBudgetMaxInput(e) {
    this.setData({
      'formData.budgetMax': e.detail.value
    });
  },

  // 输入联系方式
  onContactInput(e) {
    this.setData({
      'formData.contactInfo': e.detail.value
    });
  },

  // 检查是否可以提交
  checkCanSubmit() {
    const { title, category, contactInfo } = this.data.formData;
    
    const canSubmit = title && category && contactInfo;
    this.setData({ canSubmit: !!canSubmit });
  },

  // 提交表单
  async onSubmit() {
    if (!this.data.canSubmit || this.data.submitting) return;
    
    // 表单验证
    if (!this.validateForm()) return;
    
    this.setData({ submitting: true });
    showLoading('发布中...');
    
    try {
      const formData = this.data.formData;
      
      // 处理预算
      let budgetMin = null;
      let budgetMax = null;
      let budgetText = '';
      
      if (this.data.budgetType === 0) {
        budgetText = '面议';
      } else {
        budgetMin = formData.budgetMin ? parseFloat(formData.budgetMin) : null;
        budgetMax = formData.budgetMax ? parseFloat(formData.budgetMax) : null;
        budgetText = '';
      }
      
      const result = await callFunction('publishWanted', {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        budgetMin: budgetMin,
        budgetMax: budgetMax,
        budgetText: budgetText,
        contactInfo: formData.contactInfo
      });
      
      hideLoading();
      
      showSuccess('发布成功');
      
      // 延迟返回求购广场
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/wanted/wanted'
        });
      }, 1500);
    } catch (error) {
      hideLoading();
      console.error('发布失败:', error);
      showError(error.message || '发布失败，请重试');
      this.setData({ submitting: false });
    }
  },

  // 表单验证
  validateForm() {
    const { title, category, contactInfo } = this.data.formData;
    
    if (!title || title.length < 2) {
      showError('请输入求购标题（至少2个字）');
      return false;
    }
    
    if (!category) {
      showError('请选择分类');
      return false;
    }
    
    if (this.data.budgetType === 1) {
      const { budgetMin, budgetMax } = this.data.formData;
      if (!budgetMin && !budgetMax) {
        showError('请填写预算范围');
        return false;
      }
    }
    
    if (!contactInfo) {
      showError('请填写联系方式');
      return false;
    }
    
    return true;
  }
});
