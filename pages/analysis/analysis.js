const app = getApp()

// 状态覆盖（与首页 home.js 保持一致，确保切换园区后数值同步）
const _statusOverride = {
  5: { nutrient: '42', status: 'warning' },
  6: { nutrient: '28', status: 'danger' }
}

Page({
  data: {
    statusBarHeight: 20,
    // 状态: normal | warning | alert
    pageStatus: 'normal',
    pageBodyClass: 'status-normal',
    alertItem: null,
    currentTab: '园区综合',

    // 园区列表
    currentParkId: null,
    currentParkName: '请选择园区',
    parkList: [],

    // 评分
    score: 0,
    scoreChange: '0.5%',

    // 时间维度
    currentPeriod: '按日查看',

    // 详情卡片
    detailData: {
      humidity: { value: '72.5%', sub: '环比昨日 +2.4%', status: '适宜区间' },
      light: { value: '8.4h', sub: '当前 28000 Lux', status: '充足' },
      nutrient: { value: '优', sub: '状态稳定', status: '含量充足' },
      temperature: { value: '26.4℃', sub: '当前环境温度', status: '正常范围' }
    },

    // 今日概况小卡片（2x2网格）
    overviewTemp: '优',
    overviewHumidity: '优',
    overviewNutrient: '优',
    overviewLight: '优',
    updateTime: '',

    // 图表
    chartLabels: ['06:00', '12:00', '18:00', '现在'],
    chartValues: [82, 88, 93, 94],
    chartYSteps: [60, 70, 80, 90, 100],
    chartStandardRange: null,
    themeColor: '#00A896',

    // 真实数据（来自首页或本页面 API）
    realScore: null,
    realTemp: null,
    realHumidity: null,

    // AI 建议
    aiData: {
      title: 'AI 农事建议',
      sub: '基于今日实时环境监测',
      suggestions: [
        '土壤养分处于最佳状态，建议维持当前的灌溉频率',
        '今日天气良好，作物长势正常'
      ],
      hasAction: true
    }
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: sysInfo.statusBarHeight || 20 })
    // 获取真实园区列表（fetchParkList 完成后不会再调 loadParkData，避免重复请求）
    this.fetchParkList()
    // 延迟一下，等 fetchParkList 的请求发出后再发起 overview，避免竞态
    setTimeout(() => this.loadParkData(), 100)
  },

  // 从 API 获取真实园区列表
  fetchParkList() {
    const app = getApp()
    const userId = app.globalData.userId || 1
    wx.request({
      url: `${app.globalData.baseUrl}/api/park/list`,
      header: { 'X-User-Id': userId },
      success: (res) => {
        if (res.data.code === 200 && res.data.data && res.data.data.length > 0) {
          // 复用已有园区完整对象，仅更新 id/name/status 字段
          const existingParks = app.globalData.parkList || []
          const list = res.data.data.map(p => {
            const existing = existingParks.find(e => Number(e.id) === Number(p.id))
            const status = p.healthStatus === '健康' ? 'normal' : (p.healthStatus === '注意' ? 'warning' : 'alert')
            if (existing) {
              return { ...existing, id: Number(p.id), name: p.name || ('园区' + p.id), status }
            }
            return { id: Number(p.id), name: p.name || ('园区' + p.id), status }
          })
          app.globalData.parkList = list
          this.setData({ parkList: list })
          // 自动跟随当前选中园区
          const globalId = app.globalData.currentParkId
          const cid = globalId ? Number(globalId) : null
          const c = cid ? (list.find(x => Number(x.id) === cid) || list[0]) : list[0]
          if (c) {
            // 保留现有 currentPark 的完整字段，只更新 id/name/status
            const existing = app.globalData.currentPark
            const fullPark = existing && existing.id === Number(c.id)
              ? { ...existing, id: Number(c.id), name: c.name, status: c.status }
              : c
            app.globalData.currentParkId = Number(c.id)
            app.globalData.currentPark = fullPark
            app.saveCurrentPark(Number(c.id), fullPark)
            this.setData({ currentParkId: Number(c.id), currentParkName: c.name })
          }
        }
      }
    })
  },

  // 获取首页共享的真实数据
  fetchHomeData(pid) {
    const app = getApp()
    // 读取首页缓存的 weatherData
    const homePage = app.globalData.homePage
    if (homePage) {
      this.setData({
        realTemp: homePage.weatherData ? homePage.weatherData.temperature : null,
        realHumidity: homePage.weatherData ? homePage.weatherData.humidity : null,
        realScore: homePage.currentPark ? homePage.currentPark.healthScore : null
      })
    }
    // 同时发请求获取土壤养分趋势
    this.fetchNutrientTrend(pid)
  },

  // 获取土壤养分趋势
  fetchNutrientTrend(pid) {
    const app = getApp()
    wx.request({
      url: `${app.globalData.baseUrl}/api/analysis/nutrient/trend/${pid}`,
      header: { 'X-User-Id': app.globalData.userId || 1 },
      success: (res) => {
        if (res.data.code === 200 && res.data.data) {
          this.setData({ nutrientTrend: res.data.data })
        }
      },
      fail: () => {}
    })
  },

  fetchTemperatureTrend(pid) {
    const app = getApp()
    wx.request({
      url: `${app.globalData.baseUrl}/api/analysis/temperature/trend/${pid}`,
      header: { 'X-User-Id': app.globalData.userId || 1 },
      success: (res) => {
        if (res.data.code === 200 && res.data.data) {
          this.setData({ temperatureTrend: res.data.data })
        }
      },
      fail: () => {}
    })
  },

  fetchHumidityTrend(pid) {
    const app = getApp()
    wx.request({
      url: `${app.globalData.baseUrl}/api/analysis/humidity/trend/${pid}`,
      header: { 'X-User-Id': app.globalData.userId || 1 },
      success: (res) => {
        if (res.data.code === 200 && res.data.data) {
          this.setData({ humidityTrend: res.data.data })
        }
      },
      fail: () => {}
    })
  },

  fetchAiSuggestion(pid) {
    const app = getApp()
    // 请求序列号，防止竞态覆盖
    this._aiSeq = (this._aiSeq || 0) + 1
    const seq = this._aiSeq
    wx.request({
      url: `${app.globalData.baseUrl}/api/analysis/ai/suggestion/${pid}`,
      header: { 'X-User-Id': app.globalData.userId || 1 },
      success: (res) => {
        // 丢弃旧请求的响应
        if (seq !== this._aiSeq) return
        if (res.data.code === 200 && res.data.data) {
          // 合并 API 数据与默认字段，确保 hasAction 始终有值
          this.setData({
            aiData: Object.assign({}, this.data.aiData, res.data.data, { hasAction: res.data.data.hasAction !== undefined ? res.data.data.hasAction : true })
          })
        }
      },
      fail: () => {}
    })
  },

  onShow() {
    const app = getApp()
    // 检查 globalData.currentParkId 是否有变化，有则刷新页面数据
    const globalParkId = app.globalData.currentParkId
    if (globalParkId) {
      const pid = Number(globalParkId)
      if (this.data.currentParkId !== pid) {
        const park = app.globalData.parkList.find(p => Number(p.id) === pid) || app.globalData.currentPark
        const parkName = park ? park.name : this.data.currentParkName
        this.setData({ currentParkId: pid, currentParkName: parkName })
        this.loadParkData()
      }
    }
    setTimeout(() => this.drawLineChart(), 300)
  },

  // 园区选择器弹窗
  showParkPicker() { this.setData({ showParkPicker: true }) },
  hideParkPicker() { this.setData({ showParkPicker: false }) },
  stopPropagation(e) { e && e.stopPropagation && e.stopPropagation() },

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
    if (list.length > 0) this._doSwitchPark(list[0])
  },

  // 内部方法：真正执行园区切换
  _doSwitchPark(park) {
    const app = getApp()
    const pid = Number(park.id)
    const parkName = park.name || ('园区' + pid)
    // 保留原有 currentPark 的完整信息（地址等），只更新必要字段
    const existingPark = app.globalData.currentPark
    const fullPark = existingPark && existingPark.id === pid
      ? { ...existingPark, id: pid, name: parkName, status: park.status || existingPark.status || 'normal',
          address: existingPark.address || park.address || '', displayName: existingPark.displayName || parkName }
      : park
    this.setData({ currentParkId: pid, currentParkName: parkName, showParkPicker: false })
    app.globalData.currentParkId = pid
    app.globalData.currentPark = fullPark
    app.saveCurrentPark(pid, fullPark)
    // 通知后端切换园区
    wx.request({
      url: app.globalData.baseUrl + '/api/park/switch',
      method: 'POST',
      header: { 'X-User-Id': app.globalData.userId || 1, 'Content-Type': 'application/json' },
      data: { gardenId: pid },
      fail: () => {}
    })
    // 刷新当前园区数据
    this.loadParkData()
  },

  // 点击园区选择器（使用 ActionSheet）
  onParkTap() {
    const parks = this.data.parkList
    if (!parks || parks.length === 0) {
      wx.showToast({ title: '园区列表加载中...', icon: 'none' })
      return
    }
    wx.showActionSheet({
      itemList: parks.map(p => p.name),
      success: (res) => {
        const park = parks[res.tapIndex]
        if (park) {
          this._doSwitchPark(park)
          const app = getApp()
          app.speakText('已切换到' + park.name)
        }
      }
    })
  },

  // 加载当前园区数据
  loadParkData() {
    const app = getApp()
    const pid = app.globalData.currentParkId
    if (!pid) return
    // 请求序列号：丢弃旧请求的响应，防止竞态覆盖
    this._overviewSeq = (this._overviewSeq || 0) + 1
    const seq = this._overviewSeq
    this.fetchNutrientTrend(pid)
    this.fetchTemperatureTrend(pid)
    this.fetchHumidityTrend(pid)
    this.fetchAiSuggestion(pid)
    this.setData({ aiDataLoaded: false })
    wx.request({
      url: `${app.globalData.baseUrl}/api/analysis/overview/${pid}`,
      header: { 'X-User-Id': app.globalData.userId || 1 },
      timeout: 10000,
      success: (res) => {
        // 丢弃旧请求的响应
        if (seq !== this._overviewSeq) return
        if (res.data.code === 200 && res.data.data) {
          const d = res.data.data
          const status = d.healthStatus === '健康' ? 'normal' : (d.healthStatus === '注意' ? 'warning' : 'alert')
          const isAlert = d.alertItem || ''
          const lightHighlighted = isAlert === 'light'
          const nutrientHighlighted = isAlert === 'soil'
          const humidityHighlighted = isAlert === 'humidity'
          const temperatureHighlighted = isAlert === 'temperature'
          const now = new Date()
          const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
          this.setData({
            realTemp: d.temperature || null,
            realHumidity: d.humidity || null,
            realScore: d.healthScore || null,
            lightHighlighted: lightHighlighted,
            nutrientHighlighted: nutrientHighlighted,
            humidityHighlighted: humidityHighlighted,
            temperatureHighlighted: temperatureHighlighted,
            alertItem: isAlert,
            updateTime: timeStr
          })
          this.applyMockData(status, isAlert || null, d)
        } else {
          const park = this.data.parkList.find(p => Number(p.id) === Number(pid)) || this.data.parkList[0]
          const status = park ? park.status : 'normal'
          this.setData({
            lightHighlighted: false,
            nutrientHighlighted: false,
            humidityHighlighted: false,
            temperatureHighlighted: false,
            alertItem: ''
          })
          this.applyMockData(status, null, null)
        }
        setTimeout(() => this.drawLineChart(), 200)
      },
      fail: () => {
        if (seq !== this._overviewSeq) return
        const park = this.data.parkList.find(p => Number(p.id) === Number(pid)) || this.data.parkList[0]
        const status = park ? park.status : 'normal'
        this.setData({
          lightHighlighted: false,
          nutrientHighlighted: false,
          humidityHighlighted: false,
          temperatureHighlighted: false,
          alertItem: ''
        })
        this.applyMockData(status, null, null)
        setTimeout(() => this.drawLineChart(), 200)
      }
    })
  },

  onReady() {
    setTimeout(() => this.drawLineChart(), 500)
  },

  // 根据 nutrient 数值和告警类型计算状态文本
  _getNutrientStatus(nutrient, alertItem) {
    const val = parseFloat(nutrient)
    if (isNaN(val) || val > 60) return '含量充足'
    if (val >= 30) return '含量偏低'
    if (alertItem === 'soil') return '严重不足'
    return '含量偏低'
  },

  // 根据 nutrient 数值判断 overview 展示文本
  _getNutrientOverview(nutrient, status) {
    if (status === 'alert') return '差'
    const val = parseFloat(nutrient)
    if (isNaN(val) || val > 60) return '优'
    if (val >= 30) return '良'
    return '差'
  },

  // 使用真实 API 数据（d 参数）渲染，d 为空时使用兜底假数据
  applyMockData(status, alertItem, d) {
    const classMap = { normal: 'status-normal', warning: 'status-warning', alert: 'status-alert' }
    const colorMap = { normal: '#00A896', warning: '#FFB800', alert: '#FF3B30' }

    const mockData = {
      normal: {
        score: 94.5,
        chartLabels: ['06:00', '12:00', '18:00', '现在'],
        chartValues: [82, 88, 93, 94],
        chartYSteps: [60, 70, 80, 90, 100],
        detail: {
          humidity: { value: '72.5%', sub: '环比昨日 +2.4%', status: '适宜区间' },
          light: { value: '8.4h', sub: '当前 28000 Lux', status: '充足' },
          nutrient: { value: '优', sub: '状态稳定', status: '含量充足' },
          temperature: { value: '26.4℃', sub: '当前环境温度', status: '正常范围' }
        },
        ai: {
          title: 'AI 农事建议',
          sub: '基于今日实时环境监测',
          suggestions: [
            '土壤养分处于最佳状态，建议维持当前的灌溉频率',
            '今日天气良好，作物长势正常'
          ]
        }
      },
      warning: {
        score: 78.2,
        chartLabels: ['06:00', '12:00', '18:00', '现在'],
        chartValues: [80, 81, 77, 78],
        chartYSteps: [60, 70, 80, 90, 100],
        detail: {
          humidity: { value: '72.5%', sub: '环比昨日 +2.4%', status: '适宜区间' },
          light: { value: '8.4h', sub: '当前 28000 Lux', status: '充足' },
          nutrient: { value: '极低', sub: '含量充足', status: '含量充足' },
          temperature: { value: '26.4℃', sub: '当前环境温度', status: '正常范围' }
        },
        ai: {
          title: 'AI 农事建议',
          sub: '基于今日实时环境监测',
          suggestions: [
            '土壤养分处于最佳状态，建议维持当前的灌溉频率',
            '午间光照强，建议开启02区遮阳网，防止叶片蒸腾过度'
          ]
        }
      },
      alert: {
        score: 58.2,
        chartLabels: ['06:00', '12:00', '18:00', '现在'],
        chartValues: [82, 72, 58, 58],
        chartYSteps: [40, 55, 70, 85, 100],
        detail: {
          humidity: { value: '72.5%', sub: '环比昨日 +2.4%', status: '适宜区间' },
          light: { value: '8.4h', sub: '当前 28000 Lux', status: '充足' },
          nutrient: { value: '极低', sub: '含量充足', status: '含量充足' },
          temperature: { value: '26.4℃', sub: '当前环境温度', status: '正常范围' }
        },
        ai: {
          title: '紧急农事建议',
          sub: '监测到土壤关键养分持续流失',
          suggestions: [
            '土壤养分已降至临界值以下！当前古树保护区生态平衡面临威胁，需立即干预。',
            '建议立即开启智能精准施肥系统，补充高浓度有机氮钾复合肥，并同步进行根部促活作业。'
          ]
        }
      }
    }

    const mock = mockData[status]
    // 如果传入了真实 API 数据 d，优先使用真实数据渲染
    if (d) {
      const detailData = {
        humidity: {
          value: (d.humidity || '--') + '%',
          sub: d.humidity ? '实时数据' : '暂无数据',
          status: '正常'
        },
        light: {
          value: d.light || '--',
          sub: '当前 ' + (this.data.currentParkId === 5 ? '28000' : (this.data.currentParkId === 6 ? '15000' : (d.light || '--'))) + ' Lux',
          status: (alertItem === 'light') ? '良' : '正常'
        },
        nutrient: {
          value: (d.nutrient || '--') + '%',
          sub: '土壤养分综合',
          status: this._getNutrientStatus(d.nutrient, d.alertItem)
        },
        temperature: {
          value: (d.temperature || '--') + '℃',
          sub: '当前环境温度',
          status: '正常'
        }
      }
      this.setData({
        pageStatus: status,
        pageBodyClass: classMap[status],
        alertItem: alertItem,
        themeColor: colorMap[status],
        score: parseFloat(d.healthScore) || mock.score,
        scoreChange: '0.5%',
        chartLabels: mock.chartLabels,
        chartValues: mock.chartValues,
        chartYSteps: mock.chartYSteps,
        chartStandardRange: { min: 90, max: 100 },
        detailData: detailData,
        overviewTemp: '优',
        overviewHumidity: '优',
        overviewNutrient: this._getNutrientOverview(d.nutrient, status),
        overviewLight: status === 'warning' ? '良' : '优'
      })
    } else {
      this.setData({
        pageStatus: status,
        pageBodyClass: classMap[status],
        alertItem: alertItem,
        themeColor: colorMap[status],
        score: mock.score,
        scoreChange: '0.5%',
        chartLabels: mock.chartLabels,
        chartValues: mock.chartValues,
        chartYSteps: mock.chartYSteps,
        chartStandardRange: { min: 90, max: 100 },
        detailData: mock.detail,
        overviewTemp: '优',
        overviewHumidity: '优',
        overviewNutrient: status === 'alert' ? '差' : '优',
        overviewLight: status === 'warning' ? '良' : '优'
      })
    }
  },

  // 切换图表指标
  onTagTap(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === this.data.currentTab) return

    const labels = ['06:00', '12:00', '18:00', '现在']
    let values = [82, 88, 93, 94]
    let standardRange = null

    if (tab === '园区综合') {
      const score = this.data.realScore || parseFloat(this.data.score) || 85
      values = [score - 10, score - 5, score - 2, score]
      standardRange = { min: 90, max: 100 }
    } else if (tab === '大气温度') {
      const trend = this.data.temperatureTrend
      if (trend && trend.trendData && trend.trendData.length > 0) {
        const td = trend.trendData
        const fixedIndices = [0, 2, 4, 5]
        const fixedLabels = ['06:00', '12:00', '18:00', '现在']
        values = fixedIndices.map(function(i) { return td[i] ? td[i].temperature : 0 })
        this.setData({
          chartLabels: fixedLabels,
          chartValues: values,
          chartStandardRange: { min: 22, max: 28 },
          currentTab: tab
        })
        setTimeout(() => this.drawLineChart(), 100)
        return
      } else {
        const temp = parseFloat(this.data.realTemp) || 26
        values = [(temp - 4).toFixed(1) * 1, (temp + 2).toFixed(1) * 1, (temp + 1).toFixed(1) * 1, temp.toFixed(1) * 1]
        standardRange = { min: 22, max: 28 }
      }
    } else if (tab === '空气湿度') {
      const trend = this.data.humidityTrend
      if (trend && trend.trendData && trend.trendData.length > 0) {
        const td = trend.trendData
        const fixedIndices = [0, 2, 4, 5]
        const fixedLabels = ['06:00', '12:00', '18:00', '现在']
        values = fixedIndices.map(function(i) { return td[i] ? td[i].humidity : 0 })
        this.setData({
          chartLabels: fixedLabels,
          chartValues: values,
          chartStandardRange: { min: 40, max: 70 },
          currentTab: tab
        })
        setTimeout(() => this.drawLineChart(), 100)
        return
      } else {
        const hum = parseFloat(this.data.realHumidity) || 65
        values = [(hum + 6).toFixed(1) * 1, (hum - 2).toFixed(1) * 1, (hum + 2).toFixed(1) * 1, hum.toFixed(1) * 1]
        standardRange = { min: 60, max: 70 }
      }
    } else if (tab === '光照强度') {
      values = [12000, 13500, 14800, 15000]
      standardRange = { min: 10000, max: 20000 }
    } else if (tab === '土壤养分') {
      const that = this
      wx.request({
        url: `${getApp().globalData.baseUrl}/api/analysis/nutrient/trend/${that.data.currentParkId}`,
        header: { 'X-User-Id': getApp().globalData.userId || 1 },
        success: function(res) {
          if (res.data.code === 200 && res.data.data) {
            const td = res.data.data.trendData
            const fixedLabels = ['06:00', '12:00', '18:00', '现在']
            const fixedIndices = [0, 2, 4, 5]
            that.setData({
              nutrientTrend: res.data.data,
              chartLabels: fixedLabels,
              chartValues: fixedIndices.map(function(i) { return td[i] ? td[i].nutrient : 42 }),
              chartStandardRange: { min: 40, max: 60 },
              currentTab: tab
            })
          } else {
            that.setData({
              chartLabels: labels,
              chartValues: [41.8, 42.2, 42.0, 42.0],
              chartStandardRange: { min: 40, max: 60 },
              currentTab: tab
            })
          }
          setTimeout(function() { that.drawLineChart() }, 100)
        },
        fail: function() {
          that.setData({
            chartLabels: labels,
            chartValues: [41.8, 42.2, 42.0, 42.0],
            chartStandardRange: { min: 40, max: 60 },
            currentTab: tab
          })
          setTimeout(function() { that.drawLineChart() }, 100)
        }
      })
      return
    }

    this.setData({
      currentTab: tab,
      chartLabels: labels,
      chartValues: values,
      chartStandardRange: standardRange
    })
    setTimeout(() => this.drawLineChart(), 100)
  },

  // 绘制折线图
  drawLineChart() {
    const ctx = wx.createCanvasContext('lineChart', this)
    this._doDrawLineChart(ctx, 300, 280)
  },

  _doDrawLineChart(ctx, width, height) {
    if (!width || !height) return
    const padding = { top: 24, right: 40, bottom: 36, left: 40 }
    const chartW = width - padding.left - padding.right
    const chartH = height - padding.top - padding.bottom

    const labels = this.data.chartLabels
    const values = this.data.chartValues
    const themeColor = this.data.themeColor || '#00A896'
    const stdRange = this.data.chartStandardRange

    // 动态计算 Y 轴范围
    const dataMin = Math.min(...values)
    const dataMax = Math.max(...values)
    const pad = Math.max((dataMax - dataMin) * 0.2, 2)
    const rawMin = Math.floor(dataMin - pad)
    const rawMax = Math.ceil(dataMax + pad)
    const dynMin = Math.max(0, rawMin)
    const dynMax = Math.max(rawMax, dynMin + 10)
    const step = (dynMax - dynMin) / 4
    const ySteps = [dynMin, Math.round(dynMin + step), Math.round(dynMin + step * 2), Math.round(dynMin + step * 3), dynMax]
    const minVal = dynMin
    const maxVal = dynMax

    ctx.clearRect(0, 0, width, height)

    // 标准区间背景（如果存在）
    if (stdRange) {
      const stdTop = padding.top + chartH * (1 - (Math.min(stdRange.max, maxVal) - minVal) / (maxVal - minVal))
      const stdBottom = padding.top + chartH * (1 - (Math.max(stdRange.min, minVal) - minVal) / (maxVal - minVal))
      ctx.beginPath()
      ctx.setFillStyle('rgba(224, 224, 224, 0.3)')
      ctx.fillRect(padding.left, stdTop, chartW, stdBottom - stdTop)
      // 标准区间虚线
      if (stdRange.max <= maxVal) {
        const y90 = padding.top + chartH * (1 - (stdRange.max - minVal) / (maxVal - minVal))
        ctx.beginPath()
        ctx.setStrokeStyle('#E0E0E0')
        ctx.setLineWidth(1)
        ctx.setLineDash([4, 4])
        ctx.moveTo(padding.left, y90)
        ctx.lineTo(width - padding.right, y90)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    // Y 轴网格线和刻度（画在区域内，右侧）
    ySteps.forEach(v => {
      const y = padding.top + chartH * (1 - (v - minVal) / (maxVal - minVal))
      ctx.beginPath()
      ctx.setStrokeStyle('#F0F0F0')
      ctx.setLineWidth(1)
      ctx.moveTo(padding.left, y)
      ctx.lineTo(width - padding.right, y)
      ctx.stroke()
      ctx.setFillStyle('#999999')
      ctx.setFontSize(12)
      ctx.setTextAlign('right')
      ctx.fillText(v.toString(), width - padding.right - 4, y - 4)
    })

    // X 轴刻度（画在区域内）
    ctx.setFillStyle('#999999')
    ctx.setFontSize(12)
    ctx.setTextAlign('center')
    labels.forEach((label, i) => {
      let x = padding.left + (chartW / (labels.length - 1)) * i
      if (i === labels.length - 1) x -= 10 // "现在"往左挪10px
      ctx.fillText(label, x, height - padding.bottom + 12)
    })

    // 渐变填充
    const pts = values.map((v, i) => ({
      x: padding.left + (chartW / (values.length - 1)) * i,
      y: padding.top + chartH * (1 - (v - minVal) / (maxVal - minVal))
    }))

    const grad = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom)
    grad.addColorStop(0, 'rgba(0, 160, 144, 0.30)')
    grad.addColorStop(1, 'rgba(0, 160, 144, 0.00)')

    ctx.beginPath()
    ctx.moveTo(pts[0].x, height - padding.bottom)
    pts.forEach(p => ctx.lineTo(p.x, p.y))
    ctx.lineTo(pts[pts.length - 1].x, height - padding.bottom)
    ctx.closePath()
    ctx.setFillStyle(grad)
    ctx.fill()

    // 折线 3px
    ctx.beginPath()
    pts.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    })
    ctx.setStrokeStyle(themeColor)
    ctx.setLineWidth(3)
    ctx.stroke()

    // 数据点
    pts.forEach(p => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI)
      ctx.setFillStyle('#FFFFFF')
      ctx.fill()
      ctx.setStrokeStyle(themeColor)
      ctx.setLineWidth(1.5)
      ctx.stroke()
    })

    ctx.draw()
  },

  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${alpha})`
  },

  onAIExecute() {
    const app = getApp()
    const pid = this.data.currentParkId
    if (!pid) {
      wx.showToast({ title: '请先选择园区', icon: 'none' })
      return
    }
    wx.showLoading({ title: '执行中...' })
    wx.request({
      url: `${app.globalData.baseUrl}/api/analysis/ai/execute/${pid}`,
      method: 'POST',
      header: { 'X-User-Id': app.globalData.userId || 1, 'Content-Type': 'application/json' },
      success: (res) => {
        wx.hideLoading()
        if (res.data.code === 200) {
          wx.showModal({
            title: '执行成功',
            content: res.data.message || 'AI建议已成功执行',
            showCancel: false,
            confirmText: '好的'
          })
        } else {
          wx.showModal({
            title: '执行失败',
            content: res.data.message || 'AI建议无法执行',
            showCancel: false,
            confirmText: '知道了'
          })
        }
      },
      fail: () => {
        wx.hideLoading()
        wx.showModal({
          title: '网络错误',
          content: '无法连接服务器',
          showCancel: false,
          confirmText: '知道了'
        })
      }
    })
  },

  onPeriodTap() {
    wx.showActionSheet({
      itemList: ['按日查看', '按月查看', '按年查看'],
      success: (res) => {
        const map = { 0: '按日查看', 1: '按月查看', 2: '按年查看' }
        this.setData({ currentPeriod: map[res.tapIndex] })
      }
    })
  },

  goBack() {
    const app = getApp()
    app.speakText('正在返回')
    wx.navigateBack()
  }
})
