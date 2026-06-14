// pages/publish-board/publish-board.js - 发布留言页
const { callFunction } = require('../../utils/request');

Page({
  data: {
    title: '',
    content: '',
    images: [],
    maxImages: 9,
    submitting: false
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  onChooseImage() {
    const { images, maxImages } = this.data;
    const remaining = maxImages - images.length;
    if (remaining <= 0) {
      wx.showToast({ title: `最多上传${maxImages}张图片`, icon: 'none' });
      return;
    }

    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const newImages = res.tempFiles.map(file => file.tempFilePath);
        this.setData({ images: [...images, ...newImages] });
      }
    });
  },

  onDeleteImage(e) {
    const { index } = e.currentTarget.dataset;
    const images = this.data.images;
    images.splice(index, 1);
    this.setData({ images });
  },

  onPreviewImage(e) {
    const { url } = e.currentTarget.dataset;
    wx.previewImage({ current: url, urls: this.data.images });
  },

  async onSubmit() {
    const { title, content, images } = this.data;

    if (!content.trim()) {
      wx.showToast({ title: '请输入留言内容', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    try {
      // 上传图片
      let uploadedImages = [];
      for (let i = 0; i < images.length; i++) {
        const uploadRes = await this.uploadImage(images[i]);
        if (uploadRes) uploadedImages.push(uploadRes);
      }

      await callFunction('publishPost', {
        title: title.trim(),
        content: content.trim(),
        images: uploadedImages
      });

      wx.showToast({ title: '发布成功', icon: 'success' });
      getApp().globalData.needRefreshBoard = true;

      setTimeout(() => { wx.navigateBack(); }, 1500);
    } catch (error) {
      console.error('发布留言失败:', error);
      wx.showToast({ title: '发布失败，请重试', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  uploadImage(filePath) {
    return new Promise((resolve) => {
      const cloudPath = `board-images/${Date.now()}-${Math.random().toString(36).substr(2, 8)}.jpg`;
      wx.cloud.uploadFile({
        cloudPath,
        filePath,
        success: (res) => resolve(res.fileID),
        fail: (err) => {
          console.error('上传图片失败:', err);
          resolve(null);
        }
      });
    });
  }
});
