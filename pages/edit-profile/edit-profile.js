// pages/edit-profile/edit-profile.js - 编辑个人资料页
const app = getApp();
const { callFunction } = require('../../utils/request');

Page({
  data: {
    userInfo: null,
    nickname: '',
    phone: '',
    avatarUrl: '',
    hasChanged: false,
    submitting: false
  },

  onLoad() {
    if (!app.globalData.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');

    this.setData({
      userInfo,
      nickname: userInfo.nickName || '',
      phone: userInfo.phone || '',
      avatarUrl: userInfo.avatarUrl || ''
    });
  },

  // 修改头像
  onChangeAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        this.setData({
          avatarUrl: res.tempFiles[0].tempFilePath,
          hasChanged: true
        });
      }
    });
  },

  // 输入昵称
  onNicknameInput(e) {
    this.setData({
      nickname: e.detail.value,
      hasChanged: true
    });
  },

  // 输入手机号
  onPhoneInput(e) {
    this.setData({
      phone: e.detail.value,
      hasChanged: true
    });
  },

  // 获取微信手机号（需企业认证）
  onGetPhoneNumber(e) {
    if (e.detail.errMsg === 'getPhoneNumber:ok') {
      // 需要将 encryptedData 和 iv 发送到后端解密
      callFunction('getUserInfo', {
        action: 'decryptPhone',
        encryptedData: e.detail.encryptedData,
        iv: e.detail.iv
      }).then(result => {
        if (result.phoneNumber) {
          this.setData({
            phone: result.phoneNumber,
            hasChanged: true
          });
        }
      }).catch(err => {
        console.error('获取手机号失败:', err);
        wx.showToast({ title: '获取手机号失败', icon: 'none' });
      });
    }
  },

  // 保存资料
  async onSave() {
    const { nickname, phone, avatarUrl } = this.data;

    if (!nickname.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }

    // 验证手机号格式
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    try {
      // 上传新头像
      let newAvatarUrl = avatarUrl;
      if (avatarUrl && avatarUrl.startsWith('http://tmp') || avatarUrl.startsWith('wxfile://')) {
        const cloudPath = `avatars/${Date.now()}-${Math.random().toString(36).substr(2, 8)}.jpg`;
        const uploadRes = await new Promise((resolve) => {
          wx.cloud.uploadFile({
            cloudPath,
            filePath: avatarUrl,
            success: res => resolve(res.fileID),
            fail: () => resolve(null)
          });
        });
        if (uploadRes) newAvatarUrl = uploadRes;
      }

      await callFunction('updateUserProfile', {
        nickName: nickname.trim(),
        phone: phone,
        avatarUrl: newAvatarUrl
      });

      // 更新本地存储
      const updatedUser = {
        ...this.data.userInfo,
        nickName: nickname.trim(),
        phone,
        avatarUrl: newAvatarUrl
      };
      wx.setStorageSync('userInfo', updatedUser);
      app.globalData.userInfo = updatedUser;

      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (error) {
      console.error('保存资料失败:', error);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
