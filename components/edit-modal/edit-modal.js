Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    // 'phone' | 'password'
    mode: {
      type: String,
      value: 'phone'
    },
    title: {
      type: String,
      value: '修改手机号'
    },
    subtitle: {
      type: String,
      value: '验证后即可绑定新的手机号码'
    },
    submitText: {
      type: String,
      value: '确认修改'
    },
    // 当前手机号（仅 phone 模式显示）
    currentPhone: {
      type: String,
      value: ''
    }
  },

  data: {
    phone: '',
    code: '',
    oldPwd: '',
    newPwd: '',
    confirmPwd: '',
    countdown: 0,
  },

  methods: {
    onOverlayTap() {
      this.triggerEvent('close')
    },

    stopProp() {
      return
    },

    onClose() {
      this.triggerEvent('close')
    },

    onPhoneInput(e) {
      this.setData({ phone: e.detail.value })
    },

    onCodeInput(e) {
      this.setData({ code: e.detail.value })
    },

    onNewPwdInput(e) {
      this.setData({ newPwd: e.detail.value })
    },

    onConfirmPwdInput(e) {
      this.setData({ confirmPwd: e.detail.value })
    },

    onOldPwdInput(e) {
      this.setData({ oldPwd: e.detail.value })
    },

    onSendCode() {
      if (this.data.countdown > 0) return
      this.setData({ countdown: 60 })
      const timer = setInterval(() => {
        if (this.data.countdown <= 1) {
          this.setData({ countdown: 0 })
          clearInterval(timer)
        } else {
          this.setData({ countdown: this.data.countdown - 1 })
        }
      }, 1000)
      this.triggerEvent('sendcode')
    },

    onSubmit() {
      if (this.properties.mode === 'phone') {
        if (!this.data.phone || this.data.phone.length !== 11) {
          this.triggerEvent('error', { msg: '请输入正确的11位手机号' })
          return
        }
        if (!this.data.code || this.data.code.length < 4) {
          this.triggerEvent('error', { msg: '请输入验证码' })
          return
        }
      } else {
        if (!this.data.oldPwd) {
          this.triggerEvent('error', { msg: '请输入原密码' })
          return
        }
        if (!this.data.newPwd || this.data.newPwd.length < 8) {
          this.triggerEvent('error', { msg: '新密码至少8位' })
          return
        }
        if (this.data.newPwd !== this.data.confirmPwd) {
          this.triggerEvent('error', { msg: '两次密码不一致' })
          return
        }
      }
      this.triggerEvent('submit', {
        phone: this.data.phone,
        code: this.data.code,
        oldPwd: this.data.oldPwd,
        newPwd: this.data.newPwd
      })
      // 重置
      this.setData({ phone: '', code: '', newPwd: '', confirmPwd: '', countdown: 0 })
    }
  }
})
