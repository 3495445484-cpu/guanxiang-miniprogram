const app = getApp()

// 状态覆盖（与首页 home.js 保持一致）
const _statusOverride = {
  1: { status: 'healthy', nutrient: 75, light: 54612, ventilationRpm: 40 },
  5: { status: 'warning', abnormalType: 'light', healthStatus: '注意', healthClass: 'yellow', nutrient: 42, light: 28000, ventilationRpm: 35 },
  6: { status: 'danger', abnormalType: 'soil', healthStatus: '危及', healthClass: 'red', nutrient: 28, light: 15000, ventilationRpm: 50 }
}

// 各园区对应的设备数据（key = 数据库真实 parkId：1=01号, 5=02号, 6=03号）
const parkDevices = {
  1: {
    irrigation: { on: true, auto: true, currentHumidity: 42, flow: 65, targetFlow: 65, isIrrigationOk: true },
    nutrient: { on: true, auto: true, ec: 1.2, ph: 6.2, amount: 30, targetAmount: 30 },
    ventilation: { on: true, auto: true, rpm: 40, targetRpm: 40 },
    light: { on: true, auto: true, brightness: 850, targetBrightness: 25000 }
  },
  5: {
    irrigation: { on: true, auto: true, currentHumidity: 38, flow: 55, targetFlow: 55, isIrrigationOk: false },
    nutrient: { on: true, auto: true, ec: 1.0, ph: 6.5, amount: 25, targetAmount: 25 },
    ventilation: { on: true, auto: true, rpm: 35, targetRpm: 35 },
    light: { on: true, auto: true, brightness: 720, targetBrightness: 25000 }
  },
  6: {
    irrigation: { on: true, auto: true, currentHumidity: 50, flow: 45, targetFlow: 45, isIrrigationOk: true },
    nutrient: { on: true, auto: true, ec: 1.5, ph: 6.0, amount: 35, targetAmount: 35 },
    ventilation: { on: true, auto: true, rpm: 50, targetRpm: 50 },
    light: { on: true, auto: true, brightness: 600, targetBrightness: 25000 }
  }
}

// 园区名 → 完整园区名（用于园区切换）
const parkNameMap = {
  '01号园区': '01号种植园集群',
  '02号园区': '02号科技种植区',
  '03号园区': '03号古树保护区'
}

// 完整园区名 → 对应设备 key（用于高亮定位）
const parkToDeviceMap = {
  '01号种植园集群': 'irrigation',
  '02号科技种植区': 'nutrient',
  '03号古树保护区': 'ventilation'
}

Page({
  data: {
    currentParkId: 1,
    currentPark: { id: 1, name: '加载中...' },
    parkList: [],
    showParkPicker: false,
    agentEnabled: false,
    _isDark: false,
    _fontIndex: 0,
    statusBarHeight: 20,
    devices: {
      irrigation: { on: true, auto: true, currentHumidity: 42, flow: 65, targetFlow: 65, isIrrigationOk: true },
      nutrient: { on: true, auto: true, ec: 1.2, ph: 6.2, amount: 30, targetAmount: 30 },
      ventilation: { on: true, auto: true, rpm: 40, targetRpm: 40 },
      light: { on: true, auto: true, brightness: 850, targetBrightness: 25000, lightMode: 'sun' },
      weatherData: { windText: '无风', weather: '晴', temperature: '--', humidity: '--' }
    }
  },

  // 从 _statusOverride 同步 nutrient/light 到 devices（与首页保持一致）
  _syncDevicesFromOverride(devices, pid) {
    const ov = _statusOverride[pid]
    if (!ov) return devices
    const d = JSON.parse(JSON.stringify(devices))
    if (ov.nutrient != null) {
      d.nutrient = Object.assign({}, d.nutrient, { amount: ov.nutrient, targetAmount: ov.nutrient })
    }
    if (ov.light != null) {
      d.light = Object.assign({}, d.light, { brightness: ov.light, targetBrightness: ov.light })
    }
    if (ov.ventilationRpm != null) {
      d.ventilation = Object.assign({}, d.ventilation, { rpm: ov.ventilationRpm, targetRpm: ov.ventilationRpm })
    }
    return d
  },

  onLoad(options) {
    const sysInfo = wx.getSystemInfoSync()
    const app = getApp()
    this.setData({ statusBarHeight: sysInfo.statusBarHeight || 20 })

    if (options.from === 'home' && options.park) {
      const park = decodeURIComponent(options.park)
      const pidMap = { '01号园区': 1, '02号园区': 5, '03号园区': 6 }
      const pid = pidMap[park] || 1
      const parkName = parkNameMap[park] || park
      const deviceKey = options.device || (parkName ? parkToDeviceMap[parkName] : null)
      const tempPark = { id: pid, name: parkName, displayName: parkName }
      const baseDevices = parkDevices[pid] || this.data.devices
      const devices = this._syncDevicesFromOverride(baseDevices, pid)
      this.setData({ currentParkId: pid, currentPark: tempPark, devices: devices, _isTempPark: true })
      if (deviceKey) {
        this._pendingDeviceKey = deviceKey
        this.highlightDevice()
      }
      return
    }

    const globalParkId = app.globalData.currentParkId
    const globalPark = app.globalData.currentPark
    if (globalParkId) {
      const pid = Number(globalParkId)
      const baseDevices = parkDevices[pid] || this.data.devices
      const devices = this._syncDevicesFromOverride(baseDevices, pid)
      this.setData({ currentParkId: pid, currentPark: globalPark || this.data.currentPark, devices: devices })
    }
    this.fetchParkList()
    this.fetchAutoConfig()
  },

  fetchParkList() {
    const app = getApp()
    const userId = app.globalData.userId || 1
    wx.request({
      url: `${app.globalData.baseUrl}/api/park/list`,
      header: { 'X-User-Id': userId },
      success: (res) => {
        if (res.data.code === 200 && res.data.data && res.data.data.length > 0) {
          const list = res.data.data.map(p => {
            const ov = _statusOverride[Number(p.id)]
            let statusClass = 'green'
            let displayStatus = '健康'
            if (ov) {
              statusClass = ov.status === 'warning' ? 'yellow' : (ov.status === 'danger' ? 'red' : 'green')
              displayStatus = ov.healthStatus || '健康'
            }
            return { id: Number(p.id), name: p.name || ('园区' + p.id), displayName: p.name || ('园区' + p.id), address: p.address || '', statusClass, displayStatus }
          })
          this.setData({ parkList: list })
        }
      },
      fail: () => {}
    })
  },

  highlightDevice(deviceKey) {
    const devices = this.data.devices
    for (let k in devices) { devices[k].highlighted = false }
    const key = deviceKey || this._pendingDeviceKey
    if (key && devices[key]) {
      devices[key].highlighted = true
      this.setData({ devices })
      wx.showToast({ title: '已定位到：' + key, icon: 'none' })
    }
    this._pendingDeviceKey = null
  },

  onShow() {
    const app = getApp()
    const fontSizes = ['28rpx', '32rpx', '36rpx', '40rpx']
    const baseFontSize = fontSizes[app.globalData.fontIndex] || '28rpx'
    this.setData({ _isDark: app.globalData.darkMode, _fontIndex: app.globalData.fontIndex, _baseFontSize: baseFontSize })
    app.applyTheme(this)

    const globalParkId = app.globalData.currentParkId
    if (globalParkId && !this.data._isTempPark) {
      const pid = Number(globalParkId)
      if (this.data.currentParkId !== pid) {
        const baseDevices = parkDevices[pid] || this.data.devices
        const devices = this._syncDevicesFromOverride(baseDevices, pid)
        this.setData({ currentParkId: pid, currentPark: app.globalData.currentPark, devices: devices })
      }
    }
    if (app.globalData.homePage && app.globalData.homePage.weatherData) {
      this.setData({ weatherData: app.globalData.homePage.weatherData })
    }
    this.fetchSensorData()
    this.fetchAutoConfig()
  },

  fetchAutoConfig() {
    const app = getApp()
    const pid = this.data.currentParkId
    if (!pid) return
    wx.request({
      url: `${app.globalData.baseUrl}/api/agent/llm/status/${pid}`,
      header: { 'X-User-Id': app.globalData.userId || 1 },
      success: (res) => {
        const agentEnabled = res.data && res.data.data && res.data.data.enabled
        this.setData({ agentEnabled })
        wx.request({
          url: `${app.globalData.baseUrl}/api/agent/auto/config/${pid}`,
          header: { 'X-User-Id': app.globalData.userId || 1 },
          success: (res2) => {
            const configs = res2.data && res2.data.data || []
            const aliasMap = { 'led': 'light', 'fan_power': 'ventilation', 'irrigation': 'irrigation', 'nutrient': 'nutrient' }
            const devices = this.data.devices
            let changed = false
            configs.forEach(cfg => {
              const key = aliasMap[cfg.deviceKey]
              if (key && devices[key] !== undefined) {
                const autoEnabled = (cfg.autoEnabled === 1 || cfg.autoEnabled === true)
                if (devices[key].auto !== autoEnabled) {
                  devices[key].auto = autoEnabled
                  devices[key].on = agentEnabled ? autoEnabled : false
                  changed = true
                }
              }
            })
            if (!agentEnabled) {
              ['irrigation', 'nutrient', 'ventilation', 'light'].forEach(k => {
                if (devices[k].on !== false || devices[k].auto !== false) {
                  devices[k].on = false
                  devices[k].auto = false
                  changed = true
                }
              })
            }
            if (changed) this.setData({ devices })
          }
        })
      }
    })
  },

  fetchSensorData() {
    const app = getApp()
    const pid = this.data.currentParkId
    if (!pid) return
    wx.request({
      url: `${app.globalData.baseUrl}/api/sensor/latest/park/${pid}`,
      header: { 'X-User-Id': app.globalData.userId || 1 },
      success: (res) => {
        if (res.data.code === 200 && res.data.data) {
          const d = res.data.data
          const devices = this.data.devices
          if (d.humidity != null) devices.irrigation.currentHumidity = d.humidity
          if (d.soilMoisture != null) devices.irrigation.currentHumidity = d.soilMoisture
          devices.irrigation.isIrrigationOk = devices.irrigation.currentHumidity >= 40 && devices.irrigation.currentHumidity <= 70
          if (d.temperature != null) {
            devices.irrigation.temp = d.temperature
            devices.ventilation.temp = d.temperature
          }
          if (d.light != null && ![5, 6].includes(this.data.currentParkId)) devices.light.brightness = d.light
          this.setData({ devices })
        }
      }
    })
  },

  onSliderChange(e) {
    const key = e.currentTarget.dataset.key
    const value = e.detail.value
    const devices = this.data.devices
    if (key === 'irrigation') {
      devices.irrigation.targetFlow = value
      this.setData({ devices })
      this.sendDeviceCmd(key, value)
    } else if (key === 'nutrient') {
      devices.nutrient.targetAmount = value
      this.setData({ devices })
      this.sendDeviceCmd(key, value)
    } else if (key === 'ventilation') {
      devices.ventilation.targetRpm = value
      this.setData({ devices })
      this.sendDeviceCmd(key, value)
    } else if (key === 'light') {
      devices.light.targetBrightness = value
      this.setData({ devices })
      this.sendDeviceCmd(key, value)
    }
  },

  sendDeviceCmd(key, value) {
    const app = getApp()
    wx.request({
      url: `${app.globalData.baseUrl}/api/sensor/device/control`,
      method: 'POST',
      header: { 'Content-Type': 'application/json', 'X-User-Id': app.globalData.userId || 1 },
      data: { deviceKey: key, value: value },
      fail: () => { wx.showToast({ title: '下发失败', icon: 'none', duration: 1000 }) },
      success: (res) => {
        if (res.data.code === 200) {
          const labels = { irrigation: '流量', nutrient: '补给量', ventilation: '转速', light: '亮度' }
          wx.showToast({ title: `${labels[key] || key}已设置为${value}`, icon: 'none', duration: 800 })
        }
      }
    })
  },

  onLightBtn(e) {
    const type = e.currentTarget.dataset.type
    const devices = this.data.devices
    devices.light.lightMode = type
    this.setData({ devices })
    this.sendDeviceCmd('light', { lightMode: type })
  },

  showParkPicker() { this.setData({ showParkPicker: true }) },

  selectPark(e) {
    const id = Number(e.currentTarget.dataset.id)
    this.setData({ isSelectingPark: true })
    this.selectParkById(id)
  },

  selectParkById(id) {
    const app = getApp()
    const list = this.data.parkList && this.data.parkList.length > 0 ? this.data.parkList : (app.globalData.parkList || [])
    const nid = Number(id)
    let park = list.find(p => Number(p.id) === nid)
    if (park) { this._doSwitchPark(park); return }
    if (list.length > 0) this._doSwitchPark(list[0])
  },

  // ========== 核心修复：切换园区后同步数据 ==========
  _doSwitchPark(park) {
    const app = getApp()
    const pid = Number(park.id)
    const ov = _statusOverride[pid]
    let statusClass = 'green'
    let displayStatus = '健康'
    if (ov) {
      statusClass = ov.status === 'warning' ? 'yellow' : (ov.status === 'danger' ? 'red' : 'green')
      displayStatus = ov.healthStatus || '健康'
    }
    const normalizedPark = Object.assign({}, park, { statusClass, displayStatus, healthStatus: displayStatus })
    // 立即更新 UI
    this.setData({ currentParkId: pid, currentPark: normalizedPark, showParkPicker: false, isSelectingPark: false })
    app.globalData.currentParkId = pid
    app.globalData.currentPark = normalizedPark
    // 持久化到 storage（与首页一致）
    app.saveCurrentPark(pid, normalizedPark)
    // 通知后端切换园区
    wx.request({
      url: app.globalData.baseUrl + '/api/park/switch',
      method: 'POST',
      header: { 'X-User-Id': app.globalData.userId || 1, 'Content-Type': 'application/json' },
      data: { gardenId: pid },
      fail: () => { this.fetchSensorData() }
    })
    // 异步拉取新园区真实环境数据
    wx.request({
      url: app.globalData.baseUrl + '/api/analysis/overview/' + pid,
      header: { 'X-User-Id': app.globalData.userId || 1 },
      timeout: 10000,
      success: (res) => {
        if (res.data.code === 200 && res.data.data) {
          const overview = res.data.data
          const fullPark = Object.assign({}, normalizedPark, {
            temperature: overview.temperature || normalizedPark.temperature,
            temp: overview.temperature || normalizedPark.temp,
            humidity: overview.humidity || normalizedPark.humidity,
            nutrient: overview.nutrient || normalizedPark.nutrient,
            light: overview.light || normalizedPark.light,
            healthScore: overview.healthScore || normalizedPark.healthScore,
            healthStatus: overview.healthStatus || normalizedPark.healthStatus,
            healthClass: overview.healthClass || normalizedPark.healthClass,
            gardenId: overview.gardenId || '',
            status: overview.status || normalizedPark.status,
            abnormalType: overview.abnormalType || normalizedPark.abnormalType,
            diagnoses: overview.diagnoses || [],
            pendingCount: overview.pendingCount != null ? overview.pendingCount : 0
          })
          const ov2 = _statusOverride[pid]
          if (ov2) {
            fullPark.status = ov2.status
            fullPark.healthStatus = ov2.healthStatus
            fullPark.healthClass = ov2.healthClass
            fullPark.healthScore = ov2.healthScore
            fullPark.abnormalType = ov2.abnormalType
            fullPark.statusClass = statusClass
            fullPark.displayStatus = displayStatus
          }
          app.globalData.currentPark = fullPark
          app.globalData.parkData[pid] = fullPark
          app.saveCurrentPark(pid, fullPark)
          // 同步 devices 的 nutrient/light 与首页一致
          const baseDevices = parkDevices[pid] || this.data.devices
          const syncedDevices = this._syncDevicesFromOverride(baseDevices, pid)
          this.setData({ currentPark: fullPark, devices: syncedDevices })
          if (app.globalData.homePage) app.globalData.homePage.currentPark = fullPark
        }
      },
      fail: () => { this.fetchSensorData() }
    })
  },
  // ================================================

  hideParkPicker() {
    if (this.data.isSelectingPark) return
    if (this.data.showParkPicker) this.setData({ showParkPicker: false })
  },

  stopPropagation(e) { e && e.stopPropagation && e.stopPropagation() },

  toggleAuto(e) {
    const app = getApp()
    const key = e.currentTarget.dataset.key
    const device = this.data.devices[key]
    const newAuto = !device.auto
    wx.request({
      url: `${app.globalData.baseUrl}/api/agent/auto/config`,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: { parkId: this.data.currentParkId, deviceKey: key, enabled: newAuto, threshold: -1 },
      success: (res) => {
        if (res.data.code === 200) {
          device.auto = newAuto
          device.on = newAuto
          this.setData({ devices: this.data.devices })
          app.speakText(newAuto ? '已开启自动托管' : '已关闭自动托管')
        }
      }
    })
  },

  goHome() { const app = getApp(); app.speakText('正在返回首页'); wx.navigateTo({ url: '/pages/home/home' }) },
  goMine() { const app = getApp(); app.speakText('正在打开个人中心'); wx.navigateTo({ url: '/pages/mine/mine' }) },
  goSettings() { const app = getApp(); app.speakText('正在打开设置页面'); wx.navigateTo({ url: '/pages/service/settings/settings' }) },
})
