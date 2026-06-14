// app.js - 小程序入口文件
App({
  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-d2gp6bl1haf0a831a',
        traceUser: true
      });
    }

    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync();
    this.globalData.systemInfo = systemInfo;
    this.globalData.statusBarHeight = systemInfo.statusBarHeight;
    this.globalData.screenWidth = systemInfo.screenWidth;
    this.globalData.screenHeight = systemInfo.screenHeight;

    // 检查登录状态
    this.checkLoginStatus();

    // 自动获取 openid（不需要用户手动登录）
    this.ensureOpenid();
  },

  onShow() {
    // 小程序从后台进入前台
    this.checkLoginStatus();
    // 启动全局消息轮询（实时更新 TabBar「我的」红点）
    this.startUnreadPolling();
  },

  onHide() {
    // 小程序进入后台，停止轮询省电
    this.stopUnreadPolling();
  },

  // 检查登录状态
  checkLoginStatus() {
    const token = wx.getStorageSync('access_token');
    const userInfo = wx.getStorageSync('userInfo');
    const openid = wx.getStorageSync('openid');
    
    if (token && userInfo) {
      this.globalData.isLoggedIn = true;
      this.globalData.userInfo = userInfo;
    } else {
      this.globalData.isLoggedIn = false;
    }

    if (openid) {
      this.globalData.openid = openid;
    }
  },

  // 自动获取 openid（无需用户手动登录，任何进入小程序的用户都能拿到）
  async ensureOpenid() {
    if (this.globalData.openid) return this.globalData.openid;
    // 先从 storage 读取
    const cached = wx.getStorageSync('openid');
    if (cached) {
      this.globalData.openid = cached;
      return cached;
    }
    // 通过云函数获取
    try {
      const res = await this.callCloudFunction('getMyOpenid', {});
      if (res && res.success && res.data && res.data.openid) {
        const openid = res.data.openid;
        wx.setStorageSync('openid', openid);
        this.globalData.openid = openid;
        console.log('[app] openid 已缓存:', openid);
        return openid;
      }
    } catch (e) {
      console.warn('[app] 获取 openid 失败:', e);
    }
    return null;
  },

  // 微信登录
  async wxLogin() {
    try {
      const { code } = await wx.login();
      
      // 调用云函数或后端API进行登录
      const result = await this.callCloudFunction('userLogin', { code });
      
      if (result.success) {
        wx.setStorageSync('access_token', result.data.token);
        wx.setStorageSync('userInfo', result.data.user);
        if (result.data.openid) {
          wx.setStorageSync('openid', result.data.openid);
          this.globalData.openid = result.data.openid;
        }
        this.globalData.isLoggedIn = true;
        this.globalData.userInfo = result.data.user;
        return result.data;
      } else {
        throw new Error(result.message || '登录失败');
      }
    } catch (error) {
      console.error('微信登录失败:', error);
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none',
        duration: 2000
      });
      throw error;
    }
  },

  // 调用云函数（封装）
  callCloudFunction(name, data = {}) {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: name,
        data: data,
        success: (res) => {
          resolve(res.result);
        },
        fail: (err) => {
          console.error(`云函数 ${name} 调用失败:`, err);
          reject(err);
        }
      });
    });
  },

  // ========== 全局消息轮询（实时 TabBar 红点）==========
  // 每 5 秒检查一次未读消息数，实时更新「我的」TabBar 红点
  startUnreadPolling() {
    this.stopUnreadPolling();
    // 首次立即检查
    this.checkUnreadBadge();
    // 之后每 5 秒轮询
    this._unreadTimer = setInterval(() => {
      this.checkUnreadBadge();
    }, 5000);
  },

  stopUnreadPolling() {
    if (this._unreadTimer) {
      clearInterval(this._unreadTimer);
      this._unreadTimer = null;
    }
  },

  async checkUnreadBadge() {
    // 未登录时不检查消息（退出登录后不再显示红点）
    if (!this.globalData.isLoggedIn) {
      wx.removeTabBarBadge({ index: 4 }).catch(() => {});
      return;
    }
    try {
      const res = await this.callCloudFunction('getUserStats', {});
      if (res && res.data && res.data.unreadMsgCount !== undefined) {
        const count = res.data.unreadMsgCount;
        if (count > 0) {
          wx.setTabBarBadge({
            index: 4,
            text: count > 99 ? '99+' : String(count)
          });
        } else {
          wx.removeTabBarBadge({ index: 4 });
        }
      }
    } catch (e) {
      // 静默失败，不影响用户体验
    }
  },

  // 全局数据
  globalData: {
    isLoggedIn: false,
    userInfo: null,
    systemInfo: null,
    statusBarHeight: 0,
    screenWidth: 375,
    screenHeight: 667,
    // 村庄配置
    villageName: '高湖村',
    villageGroups: ['一组', '二组', '三组', '四组', '五组', '六组', '七组', '八组'],
    // 分类配置
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
    // 计价单位
    priceUnits: ['元/斤', '元/两', '元/公斤', '元/个', '元/把', '元/件', '元/套', '元/台'],
    // 页面刷新标记（发布成功后通知对应页面刷新）
    needRefreshIndex: false,
    needRefreshBoard: false
  }
});
