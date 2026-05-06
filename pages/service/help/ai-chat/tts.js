// 语音播报工具
const app = getApp()
let audioCtx = null

function speak(text) {
  if (!text || !app.globalData.voiceBroadcast) return
  if (audioCtx) {
    audioCtx.stop()
    audioCtx.destroy()
    audioCtx = null
  }
  wx.request({
    url: app.globalData.baseUrl + '/api/tts/speak',
    method: 'POST',
    header: { 'Content-Type': 'text/plain' },
    data: text,
    success: (res) => {
      if (res.data.code === 200 && res.data.data) {
        audioCtx = wx.createInnerAudioContext()
        audioCtx.src = app.globalData.baseUrl + res.data.data
        audioCtx.play()
        audioCtx.onError = () => {
          if (audioCtx) { audioCtx.destroy(); audioCtx = null }
        }
        audioCtx.onPlay = () => {
          setTimeout(() => {
            if (audioCtx) { audioCtx.stop(); audioCtx.destroy(); audioCtx = null }
          }, 30000)
        }
      }
    }
  })
}

module.exports = { speak }
