Page({
  data: {
    phone: '',
    code: '',
    countdown: 0
  },

  onLoad() {},

  goBack() {
    wx.navigateBack()
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
  },

  onCodeInput(e) {
    this.setData({ code: e.detail.value })
  },

  sendCode() {
    if (!this.data.phone || this.data.phone.length !== 11) {
      this.setData({ message: '请输入正确的手机号', messageType: 'error' })
      setTimeout(() => this.setData({ message: '' }), 2000)
      return
    }
    this.setData({ countdown: 60 })
    const timer = setInterval(() => {
      if (this.data.countdown <= 1) {
        this.setData({ countdown: 0 })
        clearInterval(timer)
      } else {
        this.setData({ countdown: this.data.countdown - 1 })
      }
    }, 1000)
    wx.showToast({ title: '验证码已发送', icon: 'success' })
  },

  doSubmit() {
    if (!this.data.phone || this.data.phone.length !== 11) {
      this.setData({ message: '请输入正确的手机号', messageType: 'error' })
      setTimeout(() => this.setData({ message: '' }), 2000)
      return
    }
    if (!this.data.code || this.data.code.length < 4) {
      this.setData({ message: '请输入验证码', messageType: 'error' })
      setTimeout(() => this.setData({ message: '' }), 2000)
      return
    }
    this.setData({ message: '手机号修改成功', messageType: 'success' })
    setTimeout(() => {
      this.setData({ message: '' })
      wx.navigateBack()
    }, 1500)
  }
})
