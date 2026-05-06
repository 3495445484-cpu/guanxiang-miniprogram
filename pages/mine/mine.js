const app = getApp()

// 状态覆盖：02号=警告(光照)，03号=危机(土壤)
const _statusOverride = {
  5: { status: 'warning', abnormalType: 'light', healthStatus: '注意', healthClass: 'yellow' },
  6: { status: 'danger', abnormalType: 'soil', healthStatus: '危及', healthClass: 'red' }
}

Page({
  data: {
    currentParkId: 1,
    currentPark: { id: 1, name: '加载中...' },
    parkList: [],
    showParkPicker: false,
    showAddPark: false,
    statusBarHeight: 20,
    _isDark: false,
    _fontIndex: 0,
    userName: '未登录',
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: sysInfo.statusBarHeight || 20 })
  },

  onShow() {
    const app = getApp()
    const fontSizes = ['28rpx', '32rpx', '36rpx', '40rpx']
    const baseFontSize = fontSizes[app.globalData.fontIndex] || '28rpx'

    // 同步用户名
    const user = app.globalData.userInfo
    let userName = '未登录'
    if (user) {
      if (user.nickname && user.nickname.trim()) {
        userName = user.nickname
      } else if (user.phone) {
        userName = user.phone
      } else if (user.realName) {
        userName = user.realName
      }
    }

    this.setData({
      _isDark: app.globalData.darkMode,
      _fontIndex: app.globalData.fontIndex,
      _baseFontSize: baseFontSize,
      userName: userName,
    })
    app.applyTheme(this)

    // 获取真实园区列表
    this.fetchParkList()

    // 检查 globalData.currentParkId 是否有变化，有则刷新页面数据
    const globalParkId = app.globalData.currentParkId
    if (globalParkId) {
      const pid = Number(globalParkId)
      if (this.data.currentParkId !== pid) {
        const park = app.globalData.parkList.find(p => Number(p.id) === pid) || app.globalData.currentPark
        this.setData({ currentParkId: pid, currentPark: park })
      }
    }
  },

  // 获取真实园区列表（API）
  fetchParkList() {
    const app = getApp()
    const userId = app.globalData.userId || 1
    wx.request({
      url: `${app.globalData.baseUrl}/api/park/list`,
      header: { 'X-User-Id': userId },
      success: (res) => {
        if (res.data.code === 200 && res.data.data && res.data.data.length > 0) {
          const list = res.data.data
          const apiParks = list.map(p => ({
            id: Number(p.id),
            name: p.name || ('园区' + p.id),
            displayName: p.name || ('园区' + p.id),
            address: p.address || '',
            healthScore: p.healthScore || '85',
            healthStatus: p.healthStatus || '健康',
            healthClass: p.healthClass || 'green',
            weather: p.weather || '晴'
          }))
          if (app.globalData.parkList && app.globalData.parkList.length > 0) {
            apiParks.forEach(p => {
              const existing = app.globalData.parkList.find(gp => Number(gp.id) === Number(p.id))
              if (existing) {
                p.status = existing.status || 'healthy'
                p.abnormalType = existing.abnormalType || ''
              }
            })
          }
          apiParks.forEach(p => {
            const ov = _statusOverride[Number(p.id)]
            if (ov) {
              p.status = ov.status
              p.abnormalType = ov.abnormalType
              p.healthStatus = ov.healthStatus
              p.healthClass = ov.healthClass
              p.displayStatus = ov.healthStatus
            }
            if (!p.displayStatus) p.displayStatus = '健康'
            if (p.status === 'warning') p.statusClass = 'yellow'
            else if (p.status === 'danger') p.statusClass = 'red'
            else p.statusClass = 'green'
          })
          app.globalData.parkList = apiParks
          this.setData({ parkList: apiParks })
          // 同步当前选中园区
          const cid = app.globalData.currentParkId || apiParks[0].id
          const c = apiParks.find(x => Number(x.id) === Number(cid)) || apiParks[0]
          app.globalData.currentParkId = Number(c.id)
          app.globalData.currentPark = c
          this.setData({ currentParkId: Number(c.id), currentPark: c })
        }
      },
      fail: () => {
        const cached = app.globalData.parkList
        if (cached && cached.length > 0) {
          this.setData({ parkList: cached })
        } else {
          const fallback = [
            { id: 1, name: '01号种植园集群', displayName: '01号种植园集群', address: '东莞市大岭山镇', healthStatus: '健康', healthClass: 'green' },
            { id: 5, name: '02号科技种植区', displayName: '02号科技种植区', address: '东莞市大岭山镇', healthStatus: '健康', healthClass: 'green' },
            { id: 6, name: '03号古树保护区', displayName: '03号古树保护区', address: '东莞市大岭山镇', healthStatus: '健康', healthClass: 'green' }
          ]
          app.globalData.parkList = fallback
          this.setData({ parkList: fallback, currentParkId: 1, currentPark: fallback[0] })
          app.globalData.currentParkId = 1
          app.globalData.currentPark = fallback[0]
        }
      }
    })
  },

  // 园区选择器弹窗
  showParkPicker() { this.setData({ showParkPicker: true }) },
  hideParkPicker() {
    if (this.data.showParkPicker) {
      this.setData({ showParkPicker: false })
    }
  },
  stopPropagation(e) { e.stopPropagation() },

  // 公开方法：切换园区（供弹窗调用）
  selectPark(e) {
    const id = Number(e.currentTarget.dataset.id)
    this.selectParkById(id)
  },

  // 按ID切换园区
  selectParkById(id) {
    const app = getApp()
    const list = this.data.parkList && this.data.parkList.length > 0
      ? this.data.parkList
      : (app.globalData.parkList || [])
    const nid = Number(id)
    let park = list.find(p => Number(p.id) === nid)
    if (park) {
      this._doSwitchPark(park)
      return
    }
    // 列表为空，发 API 获取数据后切换
    if (list.length === 0) {
      wx.request({
        url: app.globalData.baseUrl + '/api/park/list',
        header: { 'X-User-Id': app.globalData.userId || 1 },
        success: (res) => {
          if (res.data.code === 200 && res.data.data) {
            const fresh = res.data.data.map(p => ({
              id: Number(p.id), name: p.name || ('园区' + p.id),
              displayName: p.name || ('园区' + p.id), address: p.address || '',
              healthScore: '85', healthStatus: '健康', healthClass: 'green'
            }))
            app.globalData.parkList = fresh
            this.setData({ parkList: fresh })
            const found = fresh.find(p => Number(p.id) === nid)
            if (found) this._doSwitchPark(found)
          }
        }
      })
      return
    }
    if (list.length > 0) this._doSwitchPark(list[0])
  },

  // 内部方法：真正执行园区切换
  _doSwitchPark(park) {
    const app = getApp()
    const pid = Number(park.id)
    const parkName = park.name || ('园区' + pid)
    const fullPark = {
      id: pid, name: parkName, displayName: parkName,
      address: park.address || '',
      temp: park.temp || '26',
      temperature: park.temperature || '26',
      humidity: park.humidity || '62',
      healthScore: park.healthScore || '85',
      healthStatus: park.healthStatus || '健康',
      healthClass: park.healthClass || 'green',
      diagnoses: park.diagnoses || [],
      pendingCount: park.pendingCount || 0,
      weather: park.weather || '晴'
    }
    // 立即更新本地状态
    this.setData({ currentParkId: pid, currentPark: fullPark, showParkPicker: false })
    app.globalData.currentParkId = pid
    app.globalData.currentPark = fullPark
    // 持久化到 storage（与首页一致）
    app.saveCurrentPark(pid, fullPark)
    // 通知后端切换园区
    wx.request({
      url: app.globalData.baseUrl + '/api/park/switch',
      method: 'POST',
      header: { 'X-User-Id': app.globalData.userId || 1, 'Content-Type': 'application/json' },
      data: { gardenId: pid },
      fail: () => {}
    })
  },

  // 新增园区成功回调
  onParkAddSuccess() { this.fetchParkList() },

  // 新增园区
  showAddPark() { this.setData({ showAddPark: true }) },
  hideAddPark() { this.setData({ showAddPark: false }) },
  addPark() { this.setData({ showAddPark: true }) },

  // 导航
  goHome() {
    const app = getApp()
    app.speakText('正在返回首页')
    wx.navigateTo({ url: '/pages/home/home' })
  },
  goRemote() {
    const app = getApp()
    app.speakText('正在打开远程控制页面')
    wx.navigateTo({ url: '/pages/remote/remote' })
  },
  goProfile() {
    const app = getApp()
    app.speakText('正在打开编辑园区')
    wx.navigateTo({ url: '/pages/park/edit-park-list/edit-park-list' })
  },
  goAccount() {
    const app = getApp()
    app.speakText('正在打开账户页面')
    wx.navigateTo({ url: '/pages/service/account/account' })
  },
  goSettings() {
    const app = getApp()
    app.speakText('正在打开设置页面')
    wx.navigateTo({ url: '/pages/service/settings/settings' })
  },
  goHelp() {
    const app = getApp()
    app.speakText('正在打开帮助页面')
    wx.navigateTo({ url: '/pages/service/help/help' })
  },
  goAbout() {
    const app = getApp()
    app.speakText('正在打开关于页面')
    wx.navigateTo({ url: '/pages/service/about/about' })
  },

})
