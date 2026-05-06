const app = getApp()

Page({
  data: {
    statusBarHeight: 20,
    nickname: '老王爱种地',
    realName: '王建国',
    gender: '男',
    // 修改手机号弹窗
    showPhoneModal: false,
    newPhone: '',
    code: '',
    countdown: 0,
    phoneError: false,
    codeError: false,
    errorMsg: '',
    // 修改登录密码弹窗
    showPwdModal: false,
    oldPwd: '',
    newPwd: '',
    confirmPwd: '',
    showOldPwd: false,
    showNewPwd: false,
    showConfirmPwd: false,
    pwdErrorType: ''
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight || 20
    })
    this.fetchAccountInfo()
  },

  // 获取账户信息
  fetchAccountInfo() {
    wx.request({
      url: app.globalData.baseUrl + '/api/account/info',
      method: 'GET',
      header: { 'X-User-Id': app.globalData.userId || 1 },
      success: (res) => {
        if (res.data.code === 200) {
          const d = res.data.data
          this.setData({
            nickname: d.nickname || '未设置',
            realName: d.realName || '未设置',
            gender: d.gender === 0 ? '未设置' : d.gender === 1 ? '男' : '女',
            phone: d.phone || ''
          })
        }
      }
    })
  },

  goBack() {
    wx.navigateBack()
  },

  // 修改头像
  changeAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        wx.showToast({ title: '头像上传成功', icon: 'success' })
      }
    })
  },

  // 修改昵称
  editNickname() {
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入昵称',
      content: this.data.nickname,
      success: (res) => {
        if (res.confirm && res.content) {
          this.setData({ nickname: res.content })
          wx.showToast({ title: '昵称已修改', icon: 'success' })
          // TODO: 调用接口 POST /api/account/nickname
        }
      }
    })
  },

  // 修改真实姓名
  editRealName() {
    wx.showModal({
      title: '修改真实姓名',
      editable: true,
      placeholderText: '请输入真实姓名',
      content: this.data.realName,
      success: (res) => {
        if (res.confirm && res.content) {
          this.setData({ realName: res.content })
          wx.showToast({ title: '真实姓名已修改', icon: 'success' })
          // TODO: 调用接口 POST /api/account/realName
        }
      }
    })
  },

  // 修改性别
  editGender() {
    wx.showActionSheet({
      itemList: ['男', '女', '保密'],
      success: (res) => {
        const genders = ['男', '女', '保密']
        this.setData({ gender: genders[res.tapIndex] })
        wx.showToast({ title: '性别已修改为 ' + genders[res.tapIndex], icon: 'success' })
        // TODO: 调用接口 POST /api/account/gender
      }
    })
  },

  // 修改手机号
  editPhone() {
    this.setData({
      showPhoneModal: true,
      newPhone: '',
      code: '',
      countdown: 0,
      phoneError: false,
      codeError: false,
      errorMsg: ''
    })
  },

  // 关闭弹窗
  closePhoneModal() {
    this.setData({ showPhoneModal: false })
  },

  // 输入手机号
  onPhoneInput(e) {
    this.setData({
      newPhone: e.detail.value,
      phoneError: false,
      errorMsg: ''
    })
  },

  // 输入验证码
  onCodeInput(e) {
    this.setData({
      code: e.detail.value,
      codeError: false,
      errorMsg: ''
    })
  },

  // 发送验证码
  sendCode() {
    const phone = this.data.newPhone
    if (!phone || phone.length !== 11) {
      this.setData({ phoneError: true, errorMsg: '请输入正确的手机号' })
      return
    }
    // 格式校验
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      this.setData({ phoneError: true, errorMsg: '手机号格式不正确' })
      return
    }
    // 请求后端发验证码
    wx.request({
      url: app.globalData.baseUrl + '/api/account/sms/send',
      method: 'POST',
      header: { 'X-User-Id': app.globalData.userId || 1 },
      data: { phone },
      success: (res) => {
        if (res.data && res.data.code === 200) {
          wx.showToast({ title: '验证码已发送', icon: 'success' })
          this.startCountdown()
        } else {
          // 后端未部署时，模拟成功（演示用）
          wx.showToast({ title: '验证码已发送（演示）', icon: 'success' })
          this.startCountdown()
        }
      },
      fail: () => {
        // 后端未部署时，模拟成功（演示用）
        wx.showToast({ title: '验证码已发送（演示）', icon: 'success' })
        this.startCountdown()
      }
    })
  },

  // 倒计时
  startCountdown() {
    this.setData({ countdown: 60 })
    const timer = setInterval(() => {
      const c = this.data.countdown - 1
      if (c <= 0) {
        clearInterval(timer)
        this.setData({ countdown: 0 })
      } else {
        this.setData({ countdown: c })
      }
    }, 1000)
    this._countdownTimer = timer
  },

  // 确认修改手机号
  confirmPhoneChange() {
    const { newPhone, code } = this.data
    // 前端校验
    if (!newPhone || newPhone.length !== 11) {
      this.setData({ phoneError: true, errorMsg: '请输入正确的手机号' })
      return
    }
    if (!/^1[3-9]\d{9}$/.test(newPhone)) {
      this.setData({ phoneError: true, errorMsg: '手机号格式不正确' })
      return
    }
    if (!code || code.length < 4) {
      this.setData({ codeError: true, errorMsg: '请输入验证码' })
      return
    }
    wx.request({
      url: app.globalData.baseUrl + '/api/account/phone/change',
      method: 'POST',
      header: { 'X-User-Id': app.globalData.userId || 1, 'Content-Type': 'application/json' },
      data: { phone: newPhone, code },
      success: (res) => {
        if (res.data && res.data.code === 200) {
          wx.showToast({ title: '手机号修改成功', icon: 'success' })
          this.setData({ showPhoneModal: false })
        } else {
          // 后端未部署时，模拟成功（演示用）
          wx.showToast({ title: '手机号修改成功（演示）', icon: 'success' })
          this.setData({ showPhoneModal: false })
        }
      },
      fail: () => {
        // 后端未部署时，模拟成功（演示用）
        wx.showToast({ title: '手机号修改成功（演示）', icon: 'success' })
        this.setData({ showPhoneModal: false })
      }
    })
  },

  // 重置密码
  resetPassword() {
    this.setData({
      showPwdModal: true,
      oldPwd: '',
      newPwd: '',
      confirmPwd: '',
      showOldPwd: false,
      showNewPwd: false,
      showConfirmPwd: false,
      pwdErrorType: ''
    })
  },

  // 关闭密码弹窗
  closePwdModal() {
    this.setData({ showPwdModal: false })
  },

  // 切换密码可见性
  toggleOldPwd() { this.setData({ showOldPwd: !this.data.showOldPwd }) },
  toggleNewPwd() { this.setData({ showNewPwd: !this.data.showNewPwd }) },
  toggleConfirmPwd() { this.setData({ showConfirmPwd: !this.data.showConfirmPwd }) },

  onOldPwdInput(e) {
    this.setData({ oldPwd: e.detail.value, pwdErrorType: '' })
  },

  onNewPwdInput(e) {
    this.setData({ newPwd: e.detail.value, pwdErrorType: '' })
  },

  onConfirmPwdInput(e) {
    this.setData({ confirmPwd: e.detail.value, pwdErrorType: '' })
  },

  // 忘记密码
  onForgotPwd() {
    this.closePwdModal()
    wx.navigateTo({ url: '/pages/reset-password/reset-password' })
  },

  // 确认修改密码
  confirmPwdChange() {
    const { oldPwd, newPwd, confirmPwd } = this.data
    if (!oldPwd) {
      this.setData({ pwdErrorType: 'old', errorMsg: '请输入原密码' })
      return
    }
    if (!newPwd || newPwd.length < 8 || newPwd.length > 16) {
      this.setData({ pwdErrorType: 'confirm', errorMsg: '请检查新密码' })
      return
    }
    if (newPwd !== confirmPwd) {
      this.setData({ pwdErrorType: 'confirm', errorMsg: '两次输入的新密码不一致' })
      return
    }
    wx.request({
      url: app.globalData.baseUrl + '/api/account/password/change',
      method: 'POST',
      header: { 'X-User-Id': app.globalData.userId || 1, 'Content-Type': 'application/json' },
      data: { oldPwd, newPwd },
      success: (res) => {
        if (res.data && res.data.code === 200) {
          wx.showToast({ title: '密码修改成功', icon: 'success' })
          this.closePwdModal()
        } else {
          const msg = res.data && res.data.message ? res.data.message : '密码错误'
          this.setData({ pwdErrorType: 'old', errorMsg: msg })
        }
      },
      fail: () => {
        // 演示模式
        wx.showToast({ title: '密码修改成功（演示）', icon: 'success' })
        this.closePwdModal()
      }
    })
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出当前账号吗？',
      confirmColor: '#F5222D',
      success: (res) => {
        if (res.confirm) {
          // TODO: 调用接口 POST /api/account/logout
          wx.clearStorageSync()
          wx.reLaunch({ url: '/pages/login/login' })
        }
      }
    })
  }
})
