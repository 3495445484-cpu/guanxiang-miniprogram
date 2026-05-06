const app = getApp()

Page({
  data: {
    statusBarHeight: 20,
    phoneValue: '',
    codeValue: '',
    agreed: false,
    countdown: 0,
    timer: null,
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: sysInfo.statusBarHeight || 20 })
  },

  onPhoneInput(e) {
    this.setData({ phoneValue: e.detail.value })
  },

  onCodeInput(e) {
    this.setData({ codeValue: e.detail.value })
  },

  onSendCode() {
    if (this.data.countdown > 0) return
    const phone = this.data.phoneValue
    if (!phone || phone.length !== 11) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' })
      return
    }
    wx.request({
      method: 'POST',
      url: app.globalData.baseUrl + '/api/auth/send-code',
      header: { 'Content-Type': 'application/json' },
      data: { phone: phone },
      success: (res) => {
        if (res.data.code === 200) {
          wx.showToast({ title: '验证码已发送', icon: 'success' })
        } else {
          wx.showToast({ title: res.data.msg || '发送失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
    this.setData({ countdown: 60 })
    const timer = setInterval(() => {
      if (this.data.countdown <= 1) {
        clearInterval(this.data.timer)
        this.setData({ countdown: 0, timer: null })
      } else {
        this.setData({ countdown: this.data.countdown - 1 })
      }
    }, 1000)
    this.setData({ timer })
  },

  toggleAgree() {
    this.setData({ agreed: !this.data.agreed })
  },

  onLogin() {
    if (!this.data.agreed) {
      wx.showToast({ title: '请先阅读并同意协议', icon: 'none' })
      return
    }
    const phone = this.data.phoneValue
    const code = this.data.codeValue
    if (!phone || phone.length !== 11) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' })
      return
    }
    if (!code || code.length !== 6) {
      wx.showToast({ title: '请输入6位验证码', icon: 'none' })
      return
    }
    wx.request({
      method: 'POST',
      url: app.globalData.baseUrl + '/api/auth/sms-login',
      header: { 'Content-Type': 'application/json' },
      data: { phone: phone, code: code },
      success: (res) => {
        if (res.data.code === 200) {
          app.globalData.token = res.data.data.token
          app.globalData.userId = res.data.data.userId
          app.globalData.userInfo = res.data.data
          wx.setStorageSync('userInfo', {
            token: res.data.data.token,
            userInfo: res.data.data,
            userId: res.data.data.userId
          })
          wx.showToast({ title: '登录成功', icon: 'success' })
          setTimeout(() => {
            wx.reLaunch({ url: '/pages/home/home' })
          }, 1000)
        } else {
          wx.showToast({ title: res.data.msg || '登录失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  goBack() {
    wx.navigateBack()
  },

  onShareAppMessage() {
    return {};
  },
})
