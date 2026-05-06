const app = getApp()

Page({
  data: {
    username: '',
    token: ''
  },

  onLoad() {
    const userInfo = app.globalData.userInfo
    if (userInfo) {
      this.setData({
        username: userInfo.nickname || '用户',
        token: userInfo.token || ''
      })
    }
  },

  logout() {
    app.globalData.token = null
    app.globalData.userInfo = null
    wx.showToast({ title: '已退出', icon: 'success' })
    setTimeout(() => {
      wx.reLaunch({ url: '/pages/login/login' })
    }, 1000)
  }
})
