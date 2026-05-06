const app = getApp()

Page({
  data: {
    statusBarHeight: 20,
    phone: '',
    code: '',
    newPassword: '',
    confirmPassword: '',
    showNewPwd: false,
    showConfirmPwd: false,
    countdown: 0,
    message: '',
    messageType: ''
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: sysInfo.statusBarHeight || 20 })
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
  },

  onCodeInput(e) {
    this.setData({ code: e.detail.value })
  },

  onNewPwdInput(e) {
    this.setData({ newPassword: e.detail.value })
  },

  onConfirmPwdInput(e) {
    this.setData({ confirmPassword: e.detail.value })
  },

  toggleNewPwd() {
    this.setData({ showNewPwd: !this.data.showNewPwd })
  },

  toggleConfirmPwd() {
    this.setData({ showConfirmPwd: !this.data.showConfirmPwd })
  },

  goBack() {
    wx.navigateBack()
  },

  sendCode() {
    const { phone } = this.data
    if (!phone || phone.length !== 11) {
      this.showMessage('请输入正确的手机号', 'error')
      return
    }

    wx.request({
      method: 'POST',
      url: `${app.globalData.baseUrl}/api/auth/send-code`,
      data: { phone },
      header: { 'Content-Type': 'application/json' },
      success: (res) => {
        if (res.data.code === 200) {
          this.showMessage('验证码已发送（演示模式填 123456）', 'success')
          this.startCountdown()
        } else {
          this.showMessage(res.data.msg || '发送失败', 'error')
        }
      },
      fail: () => {
        this.showMessage('网络错误', 'error')
      }
    })
  },

  startCountdown() {
    this.setData({ countdown: 60 })
    const timer = setInterval(() => {
      const count = this.data.countdown - 1
      if (count <= 0) {
        clearInterval(timer)
        this.setData({ countdown: 0 })
      } else {
        this.setData({ countdown: count })
      }
    }, 1000)
  },

  doReset() {
    const { phone, code, newPassword, confirmPassword } = this.data

    if (!phone || phone.length !== 11) {
      this.showMessage('请输入正确的手机号', 'error')
      return
    }
    if (!code) {
      this.showMessage('请输入验证码', 'error')
      return
    }
    if (!newPassword) {
      this.showMessage('请输入新密码', 'error')
      return
    }
    if (newPassword.length < 6) {
      this.showMessage('密码长度至少6位', 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      this.showMessage('两次密码不一致', 'error')
      return
    }

    wx.request({
      method: 'POST',
      url: `${app.globalData.baseUrl}/api/auth/forgot-password`,
      data: { phone, code, newPassword, confirmPassword },
      header: { 'Content-Type': 'application/json' },
      success: (res) => {
        if (res.data.code === 200) {
          this.showMessage('密码重置成功！', 'success')
          setTimeout(() => {
            wx.reLaunch({ url: '/pages/login/login' })
          }, 1500)
        } else {
          this.showMessage(res.data.msg || '重置失败', 'error')
        }
      },
      fail: () => {
        this.showMessage('网络错误', 'error')
      }
    })
  },

  showMessage(msg, type) {
    this.setData({ message: msg, messageType: type })
    setTimeout(() => {
      this.setData({ message: '' })
    }, 4000)
  }
})
