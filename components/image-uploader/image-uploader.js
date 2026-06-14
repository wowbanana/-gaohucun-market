// components/image-uploader/image-uploader.js - 图片上传组件
Component({
  properties: {
    // 已上传图片列表（临时路径或云文件ID）
    images: {
      type: Array,
      value: []
    },
    // 最多上传数量
    maxCount: {
      type: Number,
      value: 9
    },
    // 图片压缩质量 0-100
    quality: {
      type: Number,
      value: 80
    },
    // 是否可编辑
    editable: {
      type: Boolean,
      value: true
    }
  },

  data: {
    isUploading: false
  },

  methods: {
    // 选择图片
    onChooseImage() {
      if (!this.properties.editable) return;

      const { images, maxCount, quality } = this.properties;
      const remaining = maxCount - images.length;

      if (remaining <= 0) {
        wx.showToast({ title: `最多上传${maxCount}张图片`, icon: 'none' });
        return;
      }

      wx.chooseMedia({
        count: remaining,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed'],
        success: (res) => {
          const newPaths = res.tempFiles.map(file => file.tempFilePath);
          const newImages = [...images, ...newPaths];
          this.setData({ isUploading: true });

          // 触发事件，由父组件处理实际上传
          this.triggerEvent('choose', {
            tempPaths: newPaths,
            allImages: newImages
          });

          // 本地预览：直接更新图片列表
          this.setData({
            images: newImages,
            isUploading: false
          });
        }
      });
    },

    // 删除图片
    onDeleteImage(e) {
      if (!this.properties.editable) return;

      const { index } = e.currentTarget.dataset;
      const images = [...this.properties.images];
      const deletedImage = images.splice(index, 1)[0];

      this.setData({ images });
      this.triggerEvent('delete', {
        index,
        deletedImage,
        images
      });
    },

    // 预览图片
    onPreviewImage(e) {
      const { url } = e.currentTarget.dataset;
      wx.previewImage({
        current: url,
        urls: this.properties.images
      });
    },

    // 获取当前图片列表（供父组件调用）
    getImages() {
      return this.properties.images;
    },

    // 设置图片列表（供父组件调用，用于设置上传后的云文件ID）
    setImages(images) {
      this.setData({ images });
    }
  }
});
