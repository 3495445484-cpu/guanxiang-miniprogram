const app = getApp()

// 状态覆盖：所有园区数据统一管理，硬件真数据（温度/湿度/光照）保持真实，缺失的土壤养分做模拟展示
// 数据库真实园区ID：1=01号种植园集群, 5=02号科技种植区, 6=03号古树保护区
const _statusOverride = {
  1: { status: 'healthy', abnormalType: '', healthScore: 92, healthStatus: '健康', healthClass: 'green', nutrient: 75, soilMoisture: 48, soilTag: '', soilAdvice: '' },
  5: { status: 'warning', abnormalType: 'light', healthScore: 85, healthStatus: '注意', healthClass: 'yellow', nutrient: 42, soilMoisture: 38, light: 28000, lightTag: '光照偏高', lightAdvice: '光度偏高，建议开启遮阳棚', soilTag: '', soilAdvice: '' },
  6: { status: 'danger', abnormalType: 'soil', healthScore: 72, healthStatus: '危及', healthClass: 'red', nutrient: 28, soilMoisture: 25, light: 15000, lightTag: '', lightAdvice: '', soilTag: '缺少钾元素', soilAdvice: '土壤养分严重不足，请立即施肥' }
}


Page({
  data: {
    currentParkId: 1,
    currentPark: { id: 1, name: '01号种植园集群', displayName: '01号种植园集群', address: '东莞市大岭山镇', healthStatus: '健康', healthClass: 'green', temp: '--', humidity: '--', diagnoses: [], pendingCount: 0 },
    weatherData: { weather: '晴', temperature: '--', windText: '无风' },
    sensorWeatherData: { temperature: '--', humidity: '--' },
    _isDark: false,
    _sensorSeq: 0,
    _fontIndex: 0,
    _geocodeCache: {},
    autoMode: false,
    // 扩展字段（状态覆盖用）
    parkStatus: 'healthy',
    abnormalType: '',
    lightTag: '',
    lightAdvice: '',
    soilTag: '',
    soilAdvice: '',
    deviceStatus: {
      irrigation: { running: true, status: '运行中' },
      ventilation: { running: true, status: '运行中' },
      light: { running: true, status: '运行中' },
      camera: { running: true, status: '运行中' },
      fertilizer: { running: true, status: '运行中' }
    }
  },

  // 应用园区状态覆盖（对02/03号园区始终用本地覆盖，不受API返回值影响）
  _applyParkStatus(park) {
    const ov = _statusOverride[Number(park.id)]
    if (ov) {
      const p = Object.assign({}, park, {
        healthScore: ov.healthScore,
        healthStatus: ov.healthStatus,
        healthClass: ov.healthClass,
        nutrient: ov.nutrient,
        soilMoisture: ov.soilMoisture
      })
      this.setData({
        parkStatus: ov.status,
        abnormalType: ov.abnormalType,
        autoMode: ov.autoMode !== undefined ? ov.autoMode : this.data.autoMode,
        lightTag: ov.lightTag || '',
        lightAdvice: ov.lightAdvice || '',
        soilTag: ov.soilTag || '',
        soilAdvice: ov.soilAdvice || ''
      })
      return p
    }
    // 非重点园区
    this.setData({ parkStatus: 'healthy', abnormalType: '', autoMode: this.data.autoMode, lightTag: '', lightAdvice: '', soilTag: '', soilAdvice: '' })
    return park
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    const statusBarHeight = sysInfo.statusBarHeight || 20
    const app = getApp()
    this.setData({ statusBarHeight })
    this.fetchParkList()
    this.fetchWeather()
    // fetchSensorData 由 fetchWeather 的 fail/catch 触发
    // 页面加载时立即查询LLM Agent状态（不依赖onShow的currentParkId）
    this.fetchLLMAgentStatus()
    // 每60秒刷新一次天气和传感器数据
    this.weatherTimer = setInterval(() => {
      this.fetchWeather()
      this.fetchSensorData()
    }, 60 * 1000)
    this.sensorTimer = setInterval(() => {
      this.fetchSensorData()
    }, 30 * 1000)
  },

  onUnload() {
    if (this.weatherTimer) clearInterval(this.weatherTimer)
    if (this.sensorTimer) clearInterval(this.sensorTimer)
  },

  onShow() {
    const app = getApp()
    // 确保弹窗关闭（防止切换页面回来时自动弹出）
    if (this.data.showParkPicker) {
      this.setData({ showParkPicker: false, isSelectingPark: false })
    }
    // 每次切到首页都刷新最新数据
    this.fetchWeather()
    this.fetchSensorData()
    // 同步首页数据供其他页面使用
    app.globalData.homePage = {
      weatherData: this.data.weatherData,
      currentPark: this.data.currentPark
    }
    // 同步LLM Agent状态
    this.fetchLLMAgentStatus()
  },

  // 查询LLM Agent状态
  fetchLLMAgentStatus() {
    const app = getApp()
    // 兜底：用parkId=1（首页默认园区）
    const pid = this.data.currentParkId || 1
    wx.request({
      url: `${app.globalData.baseUrl}/api/agent/llm/status/${pid}`,
      method: 'GET',
      header: { 'X-User-Id': app.globalData.userId || 1 },
      success: (res) => {
        if (res.data.code === 200 && res.data.data) {
          this.setData({ autoMode: !!res.data.data.enabled })
        }
      },
      fail: () => { /* LLMAgent status optional */ }
    })
  },

  // 获取传感器真实数据（温度、湿度来自 OneNET）
  fetchSensorData() {
    const app = getApp()
    const pid = app.globalData.currentParkId
    if (!pid) return
    const existingWeather = this.data.weatherData ? this.data.weatherData.weather : '晴'
    const existingWind = this.data.weatherData ? this.data.weatherData.windText : '无风'
    const existingTemp = this.data.weatherData ? this.data.weatherData.temperature : undefined
    const existingHum = this.data.weatherData ? this.data.weatherData.humidity : undefined
    wx.request({
      url: `${app.globalData.baseUrl}/api/sensor/latest/park/${pid}`,
      header: { 'X-User-Id': app.globalData.userId || 1 },
      success: (res) => {
        if (res.data.code === 200 && res.data.data) {
          const d = res.data.data
          const temp = d.temperature != null ? d.temperature : (existingTemp !== undefined ? existingTemp : '--')
          const humidity = d.humidity != null ? d.humidity : (existingHum !== undefined ? existingHum : '--')
          // 02/03号园区使用 _statusOverride 的光照值（硬件不完善），01号用 OneNET 真实值
          const isPark5or6 = [5, 6].includes(Number(app.globalData.currentParkId))
          const overrideLight = isPark5or6 ? (_statusOverride[Number(app.globalData.currentParkId)] || {}).light : null
          const light = isPark5or6
            ? (overrideLight != null ? overrideLight : '--')
            : (d.light != null ? d.light : (_statusOverride[1] || {}).light || '--')
          // 传感器数据写入 sensorWeatherData，不影响 wttr 天气（weather/windText）
          const newSensorWeatherData = { temperature: temp, humidity: humidity }
          this.setData({ sensorWeatherData: newSensorWeatherData })
          const updatedPark = Object.assign({}, app.globalData.currentPark, { temperature: temp, temp: temp, humidity: humidity, light: light || app.globalData.currentPark.light })
          app.globalData.currentPark = updatedPark
          app.globalData.homePage = {
            weatherData: this.data.weatherData,
            sensorWeatherData: newSensorWeatherData,
            currentPark: updatedPark
          }
          this.setData({ currentPark: updatedPark })
        }
      },
      complete: () => {
        app.globalData.homePage = {
          weatherData: this.data.weatherData,
          currentPark: this.data.currentPark
        }
      }
    })
  },


  fetchWeather() {
    // wttr 天气直接用东莞坐标，无需地理编码
    this._doFetchWeather(22.97, 113.88)
  },

  _doFetchWeather(lat, lng) {
    const app = getApp()
    wx.request({
      url: `https://wttr.in/Dongguan?format=j1`,
      success: (res) => {
        try {
          const data = res.data
          if (!data || !data.current_condition || data.current_condition.length === 0) return
          const c = data.current_condition[0]
          const weatherDesc = (c.weatherDesc && c.weatherDesc[0] && c.weatherDesc[0].value) || '晴'
          const ws = parseFloat(c.windspeedKmph || 0)
          // 英文描述转中文
          const weatherMap = {
            'Sunny': '晴', 'Clear': '晴',
            'Partly cloudy': '多云', 'Cloudy': '阴', 'Overcast': '阴',
            'Mist': '薄雾', 'Fog': '雾', 'Haze': '雾',
            'Light rain': '小雨', 'Moderate rain': '中雨', 'Heavy rain': '大雨',
            'Light rain shower': '小雨', 'Moderate or heavy rain shower': '阵雨',
            'Heavy rain shower': '大雨', 'Torrential rain': '暴雨',
            'Light drizzle': '毛毛雨', 'Patchy light rain': '零星小雨',
            'Thundery outbreaks': '雷阵雨', 'Thunder': '雷暴',
            'Snow': '小雪', 'Heavy snow': '大雪',
            'Light snow': '小雪', 'Blowing snow': '吹雪'
          }
          const cnWeather = weatherMap[weatherDesc] || (weatherDesc.includes('rain') ? '雨' : (weatherDesc.includes('cloud') ? '多云' : (weatherDesc.includes('snow') ? '雪' : (weatherDesc.includes('thunder') ? '雷' : (weatherDesc.includes('fog') || weatherDesc.includes('mist') ? '雾' : weatherDesc)))))
          let windText = '无风'
          if (ws > 0 && ws <= 5) windText = '微风'
          else if (ws > 5 && ws <= 11) windText = '轻风'
          else if (ws > 11 && ws <= 19) windText = '和风'
          else if (ws > 19 && ws <= 28) windText = '强风'
          else if (ws > 28) windText = '烈风'

          const newWeatherData = {
            weather: cnWeather,
            windText: windText,
            temperature: c.temp_C,
            humidity: c.humidity
          }
          this.setData({ weatherData: newWeatherData })
        } catch (e) {
          // weather 失败不影响传感器数据刷新
        }
      },
      fail: () => { /* onShow 已调用 fetchSensorData，无需重复 */ }
    })
  },

  // 获取园区列表（统一数据源：所有页面共享 globalData.parkList）
  fetchParkList() {
    const app = getApp()
    const userId = app.globalData.userId || 1
    wx.request({
      url: app.globalData.baseUrl + '/api/park/list',
      header: { 'X-User-Id': userId },
      success: (res) => {
        if (res.data.code === 200 && res.data.data && res.data.data.length > 0) {
          const list = res.data.data
          // 直接使用 API 返回的园区列表
          const apiParks = list.map(p => ({
            id: Number(p.id),
            name: p.name || ('园区' + p.id),
            displayName: p.name || ('园区' + p.id),
            address: p.address || '',
            temp: '26',
            humidity: '62',
            nutrient: '75',

            temperature: '26',
            healthScore: '85',
            healthStatus: '健康',
            healthClass: 'green',
            diagnoses: [],
            pendingCount: 0,
            weather: p.weather || '晴',
            status: 'healthy',
            abnormalType: ''
          }))
          // 合并已有 status 信息（来自 overview 接口）
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
          // 对所有园区重新应用 _statusOverride（确保状态正确显示在园区选择器）
          apiParks.forEach(p => {
            const ov = _statusOverride[Number(p.id)]
            if (ov) {
              p.status = ov.status
              p.healthStatus = ov.healthStatus
              p.healthClass = ov.healthClass
              p.abnormalType = ov.abnormalType
              if (p.status === 'warning') p.statusClass = 'yellow'
              else if (p.status === 'danger') p.statusClass = 'red'
              else p.statusClass = 'green'
            } else {
              if (!p.status || p.status === 'healthy') {
                p.status = 'healthy'
                p.statusClass = 'green'
              }
            }
            if (!p.displayStatus) p.displayStatus = p.healthStatus || '健康'
          })
          app.globalData.parkList = apiParks
          this.setData({ parkList: apiParks })
          // 自动跟随当前选中园区（优先用缓存的，未缓存则默认选第一个）
          const savedId = app.globalData.currentParkId
          const savedPark = app.globalData.currentPark
          if (!savedId || !apiParks.find(p => Number(p.id) === Number(savedId))) {
            // 首次或缓存失效：从 overview 拉取该园区的真实数据
            const first = apiParks[0]
            app.globalData.currentParkId = first.id
            this.setData({ currentParkId: first.id, currentPark: first })
            this._fetchParkOverview(first.id, first)
            // 刷新天气（weather独立于园区，不被fetchParkList覆盖）
            this.fetchWeather()
          } else if (savedPark) {
            // 对复用园区也应用 _statusOverride（确保状态正确）
            const ov = _statusOverride[Number(savedId)]
            if (ov) {
              savedPark.status = ov.status
              savedPark.healthStatus = ov.healthStatus
              savedPark.healthClass = ov.healthClass
              savedPark.abnormalType = ov.abnormalType
            }
            this.setData({ currentParkId: Number(savedId), currentPark: savedPark })
            // 后台刷新最新数据（不阻塞 UI）
            this._fetchParkOverview(Number(savedId), savedPark)
            // 持久化（确保 overview 回来后也保存）
            app.saveCurrentPark(Number(savedId), savedPark)
            // 刷新天气（weather独立于园区，不被fetchParkList覆盖）
            this.fetchWeather()
          }
          // 同步首页数据（fetchParkList完成后立即更新 globalData.homePage）
          app.globalData.homePage = {
            weatherData: this.data.weatherData,
            currentPark: this.data.currentPark
          }
        }
      },
      fail: (err) => {
        const cached = app.globalData.parkList
        if (cached && cached.length > 0) {
          this.setData({ parkList: cached })
          const savedId = app.globalData.currentParkId
          const cur = cached.find(p => Number(p.id) === Number(savedId)) || cached[0]
          this.setData({ currentParkId: Number(cur.id), currentPark: cur })
        } else {
          const fallback = [
            { id: 1, name: '01号种植园集群', displayName: '01号种植园集群', address: '东莞市大岭山镇', healthStatus: '健康', healthClass: 'green', temp: '26', humidity: '62', diagnoses: [], pendingCount: 0 },
            { id: 5, name: '02号科技种植区', displayName: '02号科技种植区', address: '东莞市大岭山镇', healthStatus: '健康', healthClass: 'green', temp: '26', humidity: '62', diagnoses: [], pendingCount: 0 },
            { id: 6, name: '03号古树保护区', displayName: '03号古树保护区', address: '东莞市大岭山镇', healthStatus: '健康', healthClass: 'green', temp: '26', humidity: '62', diagnoses: [], pendingCount: 0 }
          ]
          app.globalData.parkList = fallback
          this.setData({ parkList: fallback, currentParkId: 1, currentPark: fallback[0] })
          app.globalData.currentParkId = 1
          app.globalData.currentPark = fallback[0]
        }
      }
    })
  },

  // 内部方法：获取园区实时数据（不阻塞 UI）
  _fetchParkOverview(parkId, basePark) {
    const app = getApp()
    wx.request({
      url: app.globalData.baseUrl + '/api/analysis/overview/' + parkId,
      header: { 'X-User-Id': app.globalData.userId || 1 },
      timeout: 10000,
      success: (res) => {
        if (res.data.code === 200 && res.data.data) {
          const overview = res.data.data
          // 直接用 API 返回值，不再 fallback 到 basePark
          // 保留 weatherData 中的实时天气数据（不被后端固定值覆盖）
          const existingWeather = (app.globalData.currentPark && app.globalData.currentPark.weather) ? app.globalData.currentPark.weather : basePark.weather
          const fullPark = Object.assign({}, basePark, {
            temperature: overview.temperature != null ? overview.temperature : basePark.temperature,
            temp: overview.temperature != null ? overview.temperature : basePark.temp,
            humidity: overview.humidity != null ? overview.humidity : basePark.humidity,
            nutrient: ([5, 6].includes(parkId) ? basePark.nutrient : (overview.nutrient != null ? overview.nutrient : basePark.nutrient)),
            light: ([5, 6].includes(parkId) ? basePark.light : (overview.light != null ? overview.light : basePark.light)),
            healthScore: overview.healthScore != null ? overview.healthScore : basePark.healthScore,
            healthStatus: overview.healthStatus != null ? overview.healthStatus : basePark.healthStatus,
            healthClass: overview.healthClass != null ? overview.healthClass : basePark.healthClass,
            gardenId: overview.gardenId || '',
            status: overview.status || 'healthy',
            abnormalType: overview.abnormalType || '',
            diagnoses: overview.diagnoses || [],
            pendingCount: overview.pendingCount != null ? overview.pendingCount : 0,
            weather: existingWeather
          })
          const normalizedPark = this._applyParkStatus(fullPark)
          app.globalData.currentPark = normalizedPark
          app.globalData.parkData[parkId] = normalizedPark
          // 同步 status 到 parkList（让弹窗里能读到状态颜色）
          if (app.globalData.parkList && app.globalData.parkList.length > 0) {
            app.globalData.parkList = app.globalData.parkList.map(p => {
              if (Number(p.id) === Number(parkId)) {
                return Object.assign({}, p, { status: normalizedPark.status, abnormalType: normalizedPark.abnormalType })
              }
              return p
            })
            this.setData({ parkList: app.globalData.parkList })
          }
          // 只有当前选中的是这个园区才更新 UI
          if (Number(app.globalData.currentParkId) === Number(parkId)) {
            this.setData({ currentPark: normalizedPark })
          }
          // 同步首页数据供其他页面使用（不覆盖 weatherData 的实时温湿度）
        }
      },
      fail: (err) => {
      }
    })
  },

  // 公开方法：切换园区（供弹窗调用）
  selectPark(e) {
    const id = Number(e.currentTarget.dataset.id)
    this.setData({ isSelectingPark: true })
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
    // 列表为空，直接从 API 获取真实园区数据后切换
    if (list.length === 0) {
      wx.request({
        url: app.globalData.baseUrl + '/api/park/list',
        header: { 'X-User-Id': app.globalData.userId || 1 },
        success: (res) => {
          if (res.data.code === 200 && res.data.data) {
            const fresh = res.data.data.map(p => ({
              id: Number(p.id), name: p.name || ('园区' + p.id),
              displayName: p.name || ('园区' + p.id), address: p.address || '',
              temp: '26', humidity: '62', nutrient: '75',
  
              healthScore: '85', healthStatus: '健康', healthClass: 'green',
              diagnoses: [], pendingCount: 0, weather: '晴'
            }))
            app.globalData.parkList = fresh
            this.setData({ parkList: fresh })
            const found = fresh.find(p => Number(p.id) === nid)
            if (found) this._doSwitchPark(found)
          }
        },
        fail: () => { this.fetchSensorData() }
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

    // 先构建基础对象（临时状态，立即响应 UI）
    const basePark = {
      id: pid,
      name: parkName,
      displayName: parkName,
      address: park.address || '',
      temp: '26',
      temperature: '26',
      humidity: '62',
      nutrient: '75',

      light: pid === 5 ? '28000' : (pid === 6 ? '15000' : '15000'),

      healthScore: '85',
      healthStatus: '健康',
      healthClass: 'green',
      diagnoses: [],
      pendingCount: 0,
      weather: this.data.weatherData ? this.data.weatherData.weather : '晴'
    }

    // 立即更新 UI（关闭弹窗）
    const normalizedBase = this._applyParkStatus(basePark)
    this.setData({ currentParkId: pid, currentPark: normalizedBase, showParkPicker: false, isSelectingPark: false })
    app.globalData.currentParkId = pid
    app.globalData.currentPark = normalizedBase
    app.globalData.parkData[pid] = normalizedBase
    // 持久化到 storage
    app.saveCurrentPark(pid, normalizedBase)

    // 通知后端切换园区
    wx.request({
      url: app.globalData.baseUrl + '/api/park/switch',
      method: 'POST',
      header: { 'X-User-Id': app.globalData.userId || 1, 'Content-Type': 'application/json' },
      data: { gardenId: pid },
      fail: () => { this.fetchSensorData() }
    })

    // 异步拉取真实环境数据（带超时，避免挂起）
    wx.request({
      url: app.globalData.baseUrl + '/api/analysis/overview/' + pid,
      header: { 'X-User-Id': app.globalData.userId || 1 },
      timeout: 10000,
      success: (res) => {
        if (res.data.code === 200 && res.data.data) {
          const overview = res.data.data
          const fullPark = Object.assign({}, basePark, {
            temperature: overview.temperature || basePark.temperature,
            temp: overview.temperature || basePark.temp,
            humidity: overview.humidity || basePark.humidity,
            nutrient: ([5, 6].includes(pid) ? basePark.nutrient : (overview.nutrient || basePark.nutrient)),
            light: ([5, 6].includes(pid) ? basePark.light : (overview.light || basePark.light)),
            healthScore: overview.healthScore || basePark.healthScore,
            healthStatus: overview.healthStatus || basePark.healthStatus,
            healthClass: overview.healthClass || basePark.healthClass,
            gardenId: overview.gardenId || '',
            status: overview.status || 'healthy',
            abnormalType: overview.abnormalType || '',
            diagnoses: overview.diagnoses || [],
            pendingCount: overview.pendingCount || 0
          })
          const normalizedPark = this._applyParkStatus(fullPark)
          app.globalData.currentPark = normalizedPark
          app.globalData.parkData[pid] = normalizedPark
          app.saveCurrentPark(pid, normalizedPark)
          this.setData({ currentPark: normalizedPark })
          // API 返回真实数据后，再播报温度
          app.speakText('已切换到' + parkName + '，当前' + (normalizedPark.healthStatus || '健康') + '，温度' + (fullPark.temperature || '--') + '度')
        }
      },
      fail: () => { this.fetchSensorData() }
    })
  },

  // 刷新页面显示
  updateParkDisplay() {
    const app = getApp()
    const cur = app.globalData.currentPark
    const pid = this.data.currentParkId
    if (!cur) return
    this.setData({ currentParkId: pid, currentPark: cur })
  },

  // 园区选择器弹窗
  showParkPicker() { this.setData({ showParkPicker: true }) },
  hideParkPicker() {
    if (this.data.isSelectingPark) return
    if (this.data.showParkPicker) {
      this.setData({ showParkPicker: false })
    }
  },
  stopPropagation(e) { e && e.stopPropagation && e.stopPropagation() },

  // 新增园区
  // 导航
  goHome() {},

  goRemote() {
    const app = getApp()
    app.speakText('正在打开远程控制页面')
    wx.navigateTo({ url: '/pages/remote/remote' })
  },
  goMine() {
    const app = getApp()
    app.speakText('正在打开个人中心')
    wx.navigateTo({ url: '/pages/mine/mine' })
  },
  goVideo() {
    const app = getApp()
    app.speakText('正在打开实时视频监控')
    wx.navigateTo({ url: '/pages/video/video' })
  },
  goAnalysis() {
    const app = getApp()
    app.speakText('正在打开数据分析')
    wx.navigateTo({ url: '/pages/analysis/analysis' })
  },
  goAlarm() {
    const app = getApp()
    app.speakText('正在打开警报中心')
    wx.navigateTo({ url: '/pages/analysis/alarm/alarm' })
  },
  goEnvDetail() {
    const app = getApp()
    app.speakText('正在打开环境详情')
    wx.navigateTo({ url: '/pages/env-detail/env-detail' })
  },
  goSettings() {
    const app = getApp()
    app.speakText('正在打开设置页面')
    wx.navigateTo({ url: '/pages/service/settings/settings' })
  },

  // 环境监测卡片点击播报
  onEnvCardTap(e) {
    const app = getApp()
    const type = e.currentTarget.dataset.type
    const park = this.data.currentPark
    const weather = this.data.weatherData
    const sensorWeather = this.data.sensorWeatherData
    const infoMap = {
      temperature: '当前温度' + (sensorWeather.temperature || '--') + '度',
      humidity: '当前湿度百分之' + (sensorWeather.humidity || '--'),
      nutrient: '土壤养分百分之' + (park.nutrient || '--'),
      light: '当前光照' + (park.light || '--') + '勒克斯'
    }
    app.speakText(infoMap[type] || '')
  },

  // 全局一键托管开关 → LLM 智能体
  toggleAutoMode() {
    if (this.data._toggleLock) return
    this.setData({ _toggleLock: true })
    setTimeout(() => this.setData({ _toggleLock: false }), 2000)

    const app = getApp()
    const newMode = !this.data.autoMode
    const pid = this.data.currentParkId || 1

    wx.showLoading({ title: newMode ? '开启中...' : '关闭中...' })

    const endpoint = newMode
      ? `${app.globalData.baseUrl}/api/agent/llm/enable/${pid}`
      : `${app.globalData.baseUrl}/api/agent/llm/disable/${pid}`

    wx.request({
      url: endpoint,
      method: 'POST',
      header: { 'X-User-Id': app.globalData.userId || 1, 'Content-Type': 'application/json' },
      success: (res) => {
        wx.hideLoading()
        if (res.data.code === 200) {
          this.setData({ autoMode: newMode })
          const msg = newMode ? 'LLM智能体已开启' : 'LLM智能体已关闭'
          wx.showToast({ title: msg, icon: 'none' })
          app.speakText(msg)
        } else {
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  // 立即触发 LLM Agent 一次决策
  onLLMTrigger() {
    const app = getApp()
    const pid = this.data.currentParkId || 1
    wx.showLoading({ title: 'AI 决策中...', icon: 'none' })
    wx.request({
      url: `${app.globalData.baseUrl}/api/agent/llm/trigger/${pid}`,
      method: 'POST',
      header: { 'X-User-Id': app.globalData.userId || 1, 'Content-Type': 'application/json' },
      success: (res) => {
        wx.hideLoading()
        if (res.data.code === 200) {
          wx.showToast({ title: '决策已下发', icon: 'none' })
        } else {
          wx.showToast({ title: res.data.msg || '执行失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  toggleIrrigation() {
    const app = getApp()
    const ds = this.data.deviceStatus
    ds.irrigation.running = !ds.irrigation.running
    ds.irrigation.status = ds.irrigation.running ? '运行中' : '已停止'
    this.setData({ deviceStatus: ds })
    app.speakText(ds.irrigation.running ? '灌溉设备已开启' : '灌溉设备已关闭')
    this._controlDevice('irrigation', ds.irrigation.running ? 1 : 0)
  },
  toggleVentilation() {
    const app = getApp()
    const ds = this.data.deviceStatus
    ds.ventilation.running = !ds.ventilation.running
    ds.ventilation.status = ds.ventilation.running ? '运行中' : '已停止'
    this.setData({ deviceStatus: ds })
    app.speakText(ds.ventilation.running ? '通风设备已开启' : '通风设备已关闭')
    this._controlDevice('ventilation', ds.ventilation.running ? 1 : 0)
  },
  toggleLight() {
    const app = getApp()
    const ds = this.data.deviceStatus
    ds.light.running = !ds.light.running
    ds.light.status = ds.light.running ? '运行中' : '已停止'
    this.setData({ deviceStatus: ds })
    app.speakText(ds.light.running ? '补光设备已开启' : '补光设备已关闭')
    this._controlDevice('light', ds.light.running ? 1 : 0)
  },
  toggleFertilizer() {
    const app = getApp()
    const ds = this.data.deviceStatus
    ds.fertilizer.running = !ds.fertilizer.running
    ds.fertilizer.status = ds.fertilizer.running ? '运行中' : '已停止'
    this.setData({ deviceStatus: ds })
    app.speakText(ds.fertilizer.running ? '施肥设备已开启' : '施肥设备已关闭')
    this._controlDevice('fertilizer', ds.fertilizer.running ? 1 : 0)
  },
  toggleCamera() {
    const app = getApp()
    const ds = this.data.deviceStatus
    ds.camera.running = !ds.camera.running
    ds.camera.status = ds.camera.running ? '运行中' : '已停止'
    this.setData({ deviceStatus: ds })
    app.speakText(ds.camera.running ? '摄像头已开启' : '摄像头已关闭')
  },
  _controlDevice(device, status) {
    const app = getApp()
    wx.request({
      url: app.globalData.baseUrl + '/api/video/deviceControl',
      method: 'POST',
      header: { 'X-User-Id': app.globalData.userId || 1, 'Content-Type': 'application/json' },
      data: { deviceKey: device, value: status, gardenId: app.globalData.currentParkId },
      fail: () => { this.fetchSensorData() }
    })
  }
})
