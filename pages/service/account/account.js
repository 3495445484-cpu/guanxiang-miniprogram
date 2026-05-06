const app = getApp()

Page({
  data: {
    statusBarHeight: 20,
    _isDark: false,
    _fontIndex: 0,

    // 用户信息
    userInfo: {
      nickname: '',
      realName: '',
      gender: 0,
      phone: '',
      avatar: ''
    },
    phoneMask: '未绑定',

    // 弹窗状态
    showPhoneModal: false,
    showPwdModal: false,
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: sysInfo.statusBarHeight || 20 })
    const app = getApp()
    this.setData({
      _isDark: app.globalData.darkMode,
      _fontIndex: app.globalData.fontIndex
    })
    app.applyTheme(this)
  },

  onShow() {
    const app = getApp()
    this.setData({
      _isDark: app.globalData.darkMode,
      _fontIndex: app.globalData.fontIndex
    })
    app.applyTheme(this)
    this.fetchUserInfo()
  },

  // 获取用户信息
  fetchUserInfo() {
    const app = getApp()
    const userId = app.globalData.userId
    if (!userId) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    wx.request({
      url: `${app.globalData.baseUrl}/api/account/info`,
      header: { 'X-User-Id': userId },
      success: (res) => {
        if (res.data.code === 200 && res.data.data) {
          this.setData({ userInfo: res.data.data })
          // 同步更新 globalData 和 storage，让其他页面也能读到最新数据
          const app = getApp()
          app.globalData.userInfo = res.data.data
          wx.setStorageSync('userInfo', {
            token: app.globalData.token,
            userInfo: res.data.data,
            userId: app.globalData.userId
          })
          const phone = res.data.data.phone
          if (phone) {
            this.setData({ phoneMask: phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') })
          } else {
            this.setData({ phoneMask: '未绑定' })
          }
        } else {
          // API失败时，回退到 globalData 里的本地数据（微信登录用户）
          const app = getApp()
          const localUser = app.globalData.userInfo
          if (localUser) {
            this.setData({ userInfo: localUser })
            const phone = localUser.phone
            if (phone) {
              this.setData({ phoneMask: phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') })
            } else {
              this.setData({ phoneMask: '未绑定' })
            }
          }
        }
      },
      fail: () => {
        const app = getApp()
        const localUser = app.globalData.userInfo
        if (localUser) {
          this.setData({ userInfo: localUser })
          const phone = localUser.phone
          if (phone) {
            this.setData({ phoneMask: phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') })
          } else {
            this.setData({ phoneMask: '未绑定' })
          }
        }
        wx.showToast({ title: '获取用户信息失败', icon: 'none' })
      }
    })
  },

  goBack() {
    wx.navigateBack()
  },

  changeAvatar() {
    wx.showActionSheet({
      itemList: ['拍照', '从相册选择'],
      success: (res) => {
        const sourceType = res.tapIndex === 0 ? ['camera'] : ['album']
        wx.chooseImage({
          count: 1,
          sourceType: sourceType,
          success: () => wx.showToast({ title: '头像已更新', icon: 'success' })
        })
      }
    })
  },

  // 修改昵称
  editNickname() {
    const current = this.data.userInfo.nickname || ''
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入昵称',
      content: current,
      success: (res) => {
        if (res.confirm && res.content && res.content.trim() !== current) {
          this.updateProfile({ nickname: res.content.trim() })
        }
      }
    })
  },

  // 修改真实姓名
  editRealName() {
    const current = this.data.userInfo.realName || ''
    wx.showModal({
      title: '修改真实姓名',
      editable: true,
      placeholderText: '请输入真实姓名',
      content: current,
      success: (res) => {
        if (res.confirm && res.content && res.content.trim() !== current) {
          // 真实姓名暂用 nickname 字段
          this.updateProfile({ nickname: res.content.trim() })
        }
      }
    })
  },

  // 修改性别
  editGender() {
    const genderText = ['', '男', '女', '保密']
    const current = this.data.userInfo.gender || 0
    wx.showActionSheet({
      itemList: ['男', '女', '保密'],
      success: (res) => {
        const gender = res.tapIndex + 1
        if (gender !== current) {
          this.updateProfile({ gender: gender })
        }
      }
    })
  },

  // 统一更新资料接口
  updateProfile(data) {
    const app = getApp()
    const userId = app.globalData.userId
    if (!userId) return
    wx.request({
      url: `${app.globalData.baseUrl}/api/account/profile/update`,
      method: 'POST',
      header: {
        'X-User-Id': userId,
        'Content-Type': 'application/json'
      },
      data: data,
      success: (res) => {
        if (res.data.code === 200) {
          wx.showToast({ title: '修改成功', icon: 'success' })
          this.fetchUserInfo()
        } else {
          wx.showToast({ title: res.data.msg || '修改失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.showToast({ title: '请求失败', icon: 'none' })
      }
    })
  },

  // ========== 修改手机号弹窗 ==========
  editPhone() {
    const app = getApp()
    if (!app.globalData.userId) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    this.setData({ showPhoneModal: true })
  },

  onPhoneModalClose() {
    this.setData({ showPhoneModal: false })
  },

  onPhoneSendCode() {
    const app = getApp()
    const userInfo = this.data.userInfo || {}
    const phone = userInfo.phone || ''
    if (!phone) {
      wx.showToast({ title: '手机号不能为空', icon: 'none' })
      return
    }
    wx.request({
      url: `${app.globalData.baseUrl}/api/account/sms/send`,
      method: 'POST',
      header: {
        'X-User-Id': app.globalData.userId,
        'Content-Type': 'application/json'
      },
      data: { phone: phone },
      success: (res) => {
        if (res.data.code === 200) {
          wx.showToast({ title: '验证码已发送', icon: 'success' })
        } else {
          wx.showToast({ title: res.data.msg || '发送失败', icon: 'none' })
        }
      }
    })
  },

  onPhoneSubmit(e) {
    const app = getApp()
    if (!app.globalData.userId) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    if (!e.detail || !e.detail.phone) {
      wx.showToast({ title: '表单数据异常', icon: 'none' })
      return
    }
    const { phone, code } = e.detail
    if (!phone || !code) {
      wx.showToast({ title: '请填写完整', icon: 'none' })
      return
    }
    wx.request({
      url: `${app.globalData.baseUrl}/api/account/phone/change`,
      method: 'POST',
      header: {
        'X-User-Id': app.globalData.userId,
        'Content-Type': 'application/json'
      },
      data: { phone, code },
      success: (res) => {
        if (res.data.code === 200) {
          wx.showToast({ title: '手机号已修改', icon: 'success' })
          this.setData({ showPhoneModal: false })
          this.fetchUserInfo()
        } else {
          wx.showToast({ title: res.data.msg || '修改失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.showToast({ title: '请求失败', icon: 'none' })
      }
    })
  },

  onPhoneError(e) {
    wx.showToast({ title: e.detail.msg, icon: 'none' })
  },

  // ========== 重置密码弹窗 ==========
  resetPassword() {
    this.setData({ showPwdModal: true })
  },

  onPwdModalClose() {
    this.setData({ showPwdModal: false })
  },

  onPwdSendCode() {
    const phone = this.data.userInfo.phone
    if (!phone) {
      wx.showToast({ title: '请先绑定手机号', icon: 'none' })
      return
    }
    wx.request({
      url: `${app.globalData.baseUrl}/api/account/sms/send`,
      method: 'POST',
      header: {
        'X-User-Id': app.globalData.userId,
        'Content-Type': 'application/json'
      },
      data: { phone: phone },
      success: (res) => {
        if (res.data.code === 200) {
          wx.showToast({ title: '验证码已发送', icon: 'success' })
        } else {
          wx.showToast({ title: res.data.msg || '发送失败', icon: 'none' })
        }
      }
    })
  },

  onPwdSubmit(e) {
    const app = getApp()
    if (!app.globalData.userId) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    if (!e.detail || !e.detail.newPwd) {
      wx.showToast({ title: '表单数据异常', icon: 'none' })
      return
    }
    const { oldPwd, newPwd } = e.detail
    if (!oldPwd || !newPwd) {
      wx.showToast({ title: '请填写完整', icon: 'none' })
      return
    }
    if (newPwd.length < 8 || newPwd.length > 16) {
      wx.showToast({ title: '新密码需8-16位', icon: 'none' })
      return
    }
    wx.request({
      url: `${app.globalData.baseUrl}/api/account/password/change`,
      method: 'POST',
      header: {
        'X-User-Id': app.globalData.userId,
        'Content-Type': 'application/json'
      },
      data: { oldPwd, newPwd },
      success: (res) => {
        if (res.data.code === 200) {
          wx.showToast({ title: '密码已重置', icon: 'success' })
          this.setData({ showPwdModal: false })
        } else {
          wx.showToast({ title: res.data.msg || '重置失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.showToast({ title: '请求失败', icon: 'none' })
      }
    })
  },

  onPwdError(e) {
    wx.showToast({ title: e.detail.msg, icon: 'none' })
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      confirmColor: '#FF3B30',
      success: (res) => {
        if (res.confirm) {
          const app = getApp()
          app.globalData.token = null
          app.globalData.userInfo = null
          app.globalData.userId = null
          wx.removeStorageSync('userInfo')
          wx.reLaunch({ url: '/pages/login/login' })
        }
      }
    })
  }
})
