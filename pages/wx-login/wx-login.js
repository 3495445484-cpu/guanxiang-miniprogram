const app = getApp()

Page({
  data: {
    statusBarHeight: 20,
    agreed: true  // 默认选中
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight || 20
    })
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 切换同意状态
  toggleAgree() {
    this.setData({ agreed: !this.data.agreed })
  },

  // 同意授权登录
  confirmLogin() {
    if (!this.data.agreed) {
      wx.showToast({ title: '请先同意授权', icon: 'none' })
      return
    }

    wx.showLoading({ title: '授权中...' })

    // TODO: 调用微信登录接口获取 code
    // 模拟微信授权流程
    setTimeout(() => {
      wx.hideLoading()
      
      // 模拟获取微信授权码成功
      const wxCode = 'wx_code_' + Date.now()
      
      // 调用后端接口，用wxCode换取token
      // wx.request({
      //   url: app.globalData.baseUrl + '/api/auth/wxlogin',
      //   method: 'POST',
      //   data: { code: wxCode },
      //   success: (res) => {
      //     if (res.data.code === 200) {
      //       app.globalData.token = res.data.data.token
      //       app.globalData.userInfo = res.data.data.userInfo
      //       wx.showToast({ title: '登录成功', icon: 'success' })
      //       setTimeout(() => {
      //         wx.reLaunch({ url: '/pages/home/home' })
      //       }, 1000)
      //     }
      //   }
      // })

      // 模拟登录成功，使用默认用户数据
      const userId = 999  // 微信登录专用默认用户ID
      app.globalData.token = 'wx-token-' + Date.now()
      app.globalData.userInfo = {
        id: userId,
        nickname: '老王爱种地',
        realName: '王大农',
        gender: 1,
        phone: '13888885678'
      }
      app.globalData.userId = userId
      wx.setStorageSync('userInfo', {
        token: app.globalData.token,
        userInfo: app.globalData.userInfo,
        userId: userId
      })

      wx.showToast({ title: '授权成功', icon: 'success' })
      setTimeout(() => {
        wx.reLaunch({ url: '/pages/home/home' })
      }, 1000)
    }, 1500)
  },

  // 拒绝
  refuseLogin() {
    wx.showModal({
      title: '提示',
      content: '取消后您将无法使用微信登录，是否取消？',
      confirmText: '继续登录',
      cancelText: '取消授权',
      success: (res) => {
        if (res.confirm) {
          // 继续登录，不做操作
        } else {
          // 取消授权，返回登录页
          wx.showToast({ title: '已取消授权', icon: 'none' })
          setTimeout(() => {
            wx.navigateBack()
          }, 1000)
        }
      }
    })
  }
})
