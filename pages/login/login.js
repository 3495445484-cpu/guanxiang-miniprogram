Page({
  data: {
    accountValue: '',
    passwordValue: '',
    rememberMe: false,
    passwordVisible: false,
  },

  onShow() {
    const app = getApp()
    app.applyTheme(this)
  },

  onShareAppMessage() {
    return {};
  },

  onAccountInput(e) {
    this.setData({ accountValue: e.detail.value })
  },

  onFocusAccount() {
    this.setData({ accountFocus: true })
  },

  onBlurAccount() {
    this.setData({ accountFocus: false })
  },

  onPasswordInput(e) {
    this.setData({ passwordValue: e.detail.value })
  },

  onFocusPassword() {
    this.setData({ passwordFocus: true })
  },

  onBlurPassword() {
    this.setData({ passwordFocus: false })
  },

  togglePasswordVisible() {
    this.setData({ passwordVisible: !this.data.passwordVisible })
  },

  toggleRememberMe() {
    this.setData({ rememberMe: !this.data.rememberMe })
  },

  goRegister() {
    wx.navigateTo({ url: '/pages/register/register' })
  },

  goWxLogin() {
    wx.navigateTo({ url: '/pages/wx-login/wx-login' })
  },

  goPhoneLogin() {
    wx.navigateTo({ url: '/pages/phone-login/phone-login' })
  },

  goResetPassword() {
    wx.navigateTo({ url: '/pages/reset-password/reset-password' })
  },

  onLogin() {
    const { accountValue, passwordValue } = this.data
    console.log('账号:', accountValue, '密码:', passwordValue)
    if (!accountValue) {
      wx.showToast({ title: '请输入账号', icon: 'none' })
      return
    }
    if (!passwordValue) {
      wx.showToast({ title: '请输入密码', icon: 'none' })
      return
    }
    const app = getApp()
    wx.request({
      url: app.globalData.baseUrl + '/api/auth/login',
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: { username: accountValue, password: passwordValue },
      success: (res) => {
        console.log('登录响应:', res.data)
        if (res.data.code === 200) {
          wx.showToast({ title: '登录成功', icon: 'success' })
          app.globalData.token = res.data.data.token
          app.globalData.userInfo = res.data.data.userInfo
          app.globalData.userId = res.data.data.userId
          wx.setStorageSync('userInfo', {
            token: res.data.data.token,
            userInfo: res.data.data,
            userId: res.data.data.userId
          })
          setTimeout(() => {
            wx.reLaunch({ url: '/pages/home/home' })
          }, 1500)
        } else {
          wx.showToast({ title: res.data.msg || '登录失败', icon: 'none' })
        }
      },
      fail: (err) => {
        console.error('登录失败:', err)
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },
})
