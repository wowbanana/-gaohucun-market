// pages/profile/profile.js - 个人中心
const { callFunction } = require('../../utils/request');
const { showError, showSuccess } = require('../../utils/util');

Page({
  data: {
    // 用户信息
    userInfo: null,
    isLoggedIn: false,
    
    // 统计数据
    stats: {
      publishCount: 0,
      favoriteCount: 0,
      unreadMsgCount: 0
    },
    
    // 菜单列表
    menuList: [
      { id: 'my_goods', name: '我的发布', icon: '📦', count: 0 },
      { id: 'my_favorites', name: '我的收藏', icon: '❤️', count: 0 },
      { id: 'my_messages', name: '我的消息', icon: '💬', count: 0 }
    ],
    
    // 设置菜单
    settingList: [
      { id: 'edit_profile', name: '编辑个人资料', icon: '✏️' },
      { id: 'rules', name: '平台规则', icon: '📋' },
      { id: 'feedback', name: '意见反馈', icon: '💡' }
    ]
  },

  onLoad() {
    this.checkLoginStatus();
  },

  onShow() {
    this.checkLoginStatus();
    // 仅登录后才加载统计数据
    if (this.data.isLoggedIn) {
      this.loadUserStats();
    }
  },

  // 检查登录状态
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo');
    const isLoggedIn = !!userInfo;

    if (isLoggedIn) {
      this.setData({
        userInfo: userInfo,
        isLoggedIn: true
      });
    } else {
      // 未登录时清空所有数据
      this.setData({
        userInfo: null,
        isLoggedIn: false,
        stats: { publishCount: 0, favoriteCount: 0, unreadMsgCount: 0 },
        'menuList[0].count': 0,
        'menuList[1].count': 0,
        'menuList[2].count': 0
      });
      wx.removeTabBarBadge({ index: 4 }).catch(() => {});
    }
  },

  // 加载用户统计
  async loadUserStats() {
    try {
      const stats = await callFunction('getUserStats', {});
      console.log('[profile] getUserStats 返回:', JSON.stringify(stats));

      if (stats && typeof stats === 'object') {
        const unreadMsgCount = stats.unreadMsgCount || 0;
        this.setData({
          stats: {
            publishCount: stats.publishCount || 0,
            favoriteCount: stats.favoriteCount || 0,
            unreadMsgCount: unreadMsgCount
          }
        }, () => {
          // 数据更新后再同步到 menuList 显示
          this.syncStatsToMenu();
          console.log('[profile] stats 已更新:', JSON.stringify(this.data.stats));

          // 设置 TabBar 未读红点
          if (unreadMsgCount > 0) {
            wx.setTabBarBadge({ index: 4, text: unreadMsgCount > 99 ? '99+' : String(unreadMsgCount) });
          } else {
            wx.removeTabBarBadge({ index: 4 });
          }
        });
      } else {
        console.warn('[profile] getUserStats 返回数据异常:', stats);
      }
    } catch (error) {
      console.error('加载用户统计失败:', error);
    }
  },

  // 将 stats 同步到 menuList 的 count 显示
  syncStatsToMenu() {
    const { stats } = this.data;
    this.setData({
      'menuList[0].count': stats.publishCount,
      'menuList[1].count': stats.favoriteCount,
      'menuList[2].count': stats.unreadMsgCount
    });
  },

  // 微信登录
  async onLoginTap() {
    try {
      wx.showLoading({ title: '登录中...' });

      // callFunction 已自动解包 result.data
      // 云函数返回 { success:true, data:{token,openid,user} }
      // → callFunction 返回 { token, openid, user }
      const data = await callFunction('userLogin', {});

      if (data && data.token) {
        wx.setStorageSync('access_token', data.token);
        wx.setStorageSync('userInfo', data.user);
        if (data.openid) {
          wx.setStorageSync('openid', data.openid);
          getApp().globalData.openid = data.openid;
        }
        getApp().globalData.isLoggedIn = true;
        getApp().globalData.userInfo = data.user;

        wx.hideLoading();
        showSuccess('登录成功');
        this.checkLoginStatus();
        this.loadUserStats();
      } else {
        throw new Error('登录返回数据异常');
      }
    } catch (error) {
      wx.hideLoading();
      console.error('登录失败:', error);
      showError('登录失败，请重试');
    }
  },

  // 获取用户资料（头像昵称）
  getUserProfile() {
    return new Promise((resolve) => {
      wx.getUserProfile({
        desc: '用于完善个人资料',
        success: (res) => {
          resolve(res.userInfo || null);
        },
        fail: () => {
          resolve(null); // 拒绝授权也正常继续
        }
      });
    });
  },

  // 菜单点击
  onMenuTap(e) {
    const menuId = e.currentTarget.dataset.id;
    
    if (!this.data.isLoggedIn) {
      this.onLoginTap();
      return;
    }
    
    const routeMap = {
      'my_goods': '/pages/my-goods/my-goods',
      'my_favorites': '/pages/my-favorites/my-favorites',
      'my_messages': '/pages/chat-list/chat-list'
    };
    
    const url = routeMap[menuId];
    if (url) {
      wx.navigateTo({
        url: url
      });
    }
  },

  // 设置菜单点击
  onSettingTap(e) {
    const settingId = e.currentTarget.dataset.id;
    
    const routeMap = {
      'edit_profile': '/pages/edit-profile/edit-profile',
      'rules': '/pages/rules/rules',
      'feedback': '/pages/feedback/feedback'
    };

    const url = routeMap[settingId];
    if (url) {
      wx.navigateTo({ url: url });
    }
  },

  // 退出登录
  async onLogoutTap() {
    const result = await wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      confirmText: '确定',
      confirmColor: '#DC2626'
    });

    if (result.confirm) {
      wx.removeStorageSync('access_token');
      wx.removeStorageSync('userInfo');

      // 同步清空全局状态
      getApp().globalData.isLoggedIn = false;
      getApp().globalData.userInfo = null;

      // 清空页面数据
      this.setData({
        userInfo: null,
        isLoggedIn: false,
        stats: { publishCount: 0, favoriteCount: 0, unreadMsgCount: 0 },
        'menuList[0].count': 0,
        'menuList[1].count': 0,
        'menuList[2].count': 0
      });

      // 清除 TabBar 红点
      wx.removeTabBarBadge({ index: 4 }).catch(() => {});

      showSuccess('已退出登录');
    }
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '高湖村二手市场 - 村里人的闲置交易平台',
      path: '/pages/index/index'
    };
  }
});
