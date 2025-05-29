import { Playback, Events, Styler, template, HTML5Video, Log, PlayerError, Utils } from '@clappr/core'
import pluginStyle from './public/style.scss'
import pluginTemplate from './public/template.html'
const $ = require('jquery')

const { now } = Utils
const DEFAULT_RECOVER_ATTEMPTS = 3

// Override Clappr logging
const originalLog = Log.log
Log.log = () => {}
Log.debug = () => {}
Log.info = () => {}
Log.warn = () => {}
Log.error = () => {}

// Override console.debug to prevent Clappr debug messages
const originalConsoleDebug = console.debug
console.debug = () => {}

export default class WebRTCPlayback extends HTML5Video {
  get name() { return 'webrtc_playback' }
  get template() { return template(pluginTemplate) }
  get attributes() {
    return {
      'data-webrtc-playback': '',
      class: 'webrtc-playback'
    }
  }

  get style() {
    return Styler.getStyleFor(pluginStyle)
  }

  get supportedVersion() { 
    return { min: '0.11.0', max: '0.12.0' } // Compatible with Clappr 0.11.x
  }

  get isReady() {
    return this._isReadyState
  }

  get defaultOptions() {
    return {
      preload: true,
      webrtc: {
        offerOptions: {
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        }
      }
    }
  }

  get sourceMedia() {
    return this.options.src
  }

  static get version() { return '0.1.0' }

  static get supportedMimeTypes() {
    return ['application/sdp', 'application/x-webrtc']
  }

  constructor(...args) {
    super(...args)
    this.options.webrtcPlayback = { ...this.defaultOptions, ...this.options.webrtcPlayback }
    this._setInitialState()
    this._isInitialLoad = true
    
    // Override media control events to prevent debug messages
    this.on(Events.PLAYBACK_PLAY, () => {})
    this.on(Events.PLAYBACK_PLAYING, () => {})
    this.on(Events.PLAYBACK_PAUSE, () => {})
    this.on(Events.PLAYBACK_STOP, () => {})
    
    // Override error events to prevent error screen
    this.on(Events.PLAYBACK_ERROR, () => {})
  }

  _setInitialState() {
    this._recoverAttemptsRemaining = this.options.webrtcRecoverAttempts || DEFAULT_RECOVER_ATTEMPTS
    this._isReadyState = false
    this._pc = null
    this._connectedStatus = 0
    this._intervalValue = null
    this._isPlaying = false
    this._isRefreshing = false
    this._isInitialLoad = true
  }

  _setup() {
    this._destroyWebRTCInstance()
    this._createWebRTCInstance()
    this._listenWebRTCEvents()
    this._attachWebRTCMedia()
  }

  _destroyWebRTCInstance() {
    if (!this._pc) return
    this._connectedStatus = 0
    if (this._intervalValue) {
      clearInterval(this._intervalValue)
      this._intervalValue = null
    }
    this._pc.close()
    this._pc = null
    this._isPlaying = false
    this._isReadyState = false
  }

  _createWebRTCInstance() {
    try {
      this._pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      })
    } catch (error) {
      this._handleError(error)
    }
  }

  _attachWebRTCMedia() {
    if (!this._pc) return
    this._pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.el.srcObject = event.streams[0]
        if (this.options.webrtcPlayback.preload) {
          this.el.play().catch(() => {})
        }
      }
    }
  }

  _listenWebRTCEvents() {
    if (!this._pc) return

    this._pc.onicecandidate = () => {}

    this._pc.oniceconnectionstatechange = (e) => {
      if (this._connectedStatus === 0 && this._pc.iceConnectionState === 'connected') {
        this._connectedStatus = 1
        this._isReadyState = true
        this._isPlaying = true
        this._isInitialLoad = false
        this.trigger(Events.PLAYBACK_READY)
      } else if (this._pc.iceConnectionState === 'disconnected') {
        this._isPlaying = false
        this.stop()
      }
    }

    this._pc.onicegatheringstatechange = () => {}
    this._pc.onsignalingstatechange = () => {}
  }

  render() {
    this._ready()
    return super.render()
  }

  _ready() {
    if (this._isReadyState) return
    !this._pc && this._setup()
    this._isReadyState = true
    this.trigger(Events.PLAYBACK_READY, this.name)
  }

  _handleError(error) {
    if (this._recoverAttemptsRemaining > 0) {
      this._recoverAttemptsRemaining -= 1
      this._recover(error)
    } else {
      this._isPlaying = false
      this._recover(error)
    }
  }

  _recover(error) {
    this._destroyWebRTCInstance()
    this._setup()
    this.trigger(Events.PLAYBACK_READY)
    this.play()
  }

  load(url) {
    this.options.src = url
    this._setup()
  }

  play() {
    if (this._isRefreshing) return

    this._isInitialLoad = false

    if (!this._pc) {
      this._setup()
    }
    this._createOffer()
    super.play()
  }

  pause() {
    if (!this._pc) return
    this.el.pause()
  }

  stop() {
    this._destroyWebRTCInstance()
    super.stop()
  }

  destroy() {
    this._destroyWebRTCInstance()
    super.destroy()
  }

  _createOffer() {
    if (!this._pc || !this.options.src) return

    const offerOptions = {
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
      ...(this.options.webrtc?.offerOptions || {})
    }

    this._pc.createOffer(offerOptions)
      .then(offer => this._pc.setLocalDescription(offer))
      .then(() => {
        const request = {
          version: "v1.0",
          sessionId: "sessionid_test",
          localSdp: this._pc.localDescription
        }

        return $.ajax({
          type: "post",
          url: this.options.src,
          data: JSON.stringify(request),
          dataType: "json",
          crossDomain: true
        }).then(data => this._handleServerResponse(data))
      })
      .catch(err => this._recover(err))
  }

  _handleServerResponse(data) {
    if (!this._pc) {
      this._recover(new Error('WebRTC connection was closed before remote description could be set'))
      return
    }

    if (data.code != 200) {
      this._recover(new Error(`Server error: ${data.code}`))
      return
    }

    const remoteSdp = data.remoteSdp

    this._pc.setRemoteDescription(new RTCSessionDescription(remoteSdp))
      .catch(err => this._recover(err))
  }

  getPlaybackType() {
    return Playback.LIVE
  }

  isPlaying() {
    return this._isPlaying
  }

  getDuration() {
    return Infinity
  }

  getCurrentTime() {
    return this.el.currentTime
  }

  seek() {
    // WebRTC doesn't support seeking
    return
  }

  volume() {
    return this.el.volume * 100
  }

  setVolume(value) {
    this.el.volume = value / 100
  }

  static canPlay(resource, mimeType) {
    return mimeType === 'application/sdp' || mimeType === 'application/x-webrtc'
  }

  refresh() {
    this._isRefreshing = true
    this._isInitialLoad = false
    
    this.trigger(Events.PLAYBACK_READY)
    
    this._setInitialState()
    this._setup()
    
    setTimeout(() => {
      this._isRefreshing = false
      this.play()
    }, 100)
  }

  // Override error creation to prevent error screen
  createError() {
    return null
  }
}

// H5Player class implementation
class H5Player {
  constructor(options) {
    console.log('H5Player constructor called with options:', options)
    this.container = options.container
    this.protocol = options.protocol || 'webrtc'
    this.url = options.url
    this.autoplay = options.autoplay || true
    this.webrtcOptions = options.webrtc || {}
    
    this.pc = null
    this.connectedStatus = 0
    this.intervalValue = null
    
    this.init()
  }

  init() {
    console.log('H5Player init called')
    if (this.protocol === 'webrtc') {
      this.initWebRTC()
    } else {
      this.initOtherProtocol()
    }
  }

  initWebRTC() {
    console.log('H5Player initWebRTC called')
    
    if (!this.url) {
      console.error('Signal URL is required for WebRTC')
      return
    }

    const offerSdpOption = {
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
      ...this.webrtcOptions.offerOptions
    }

    try {
      console.log('Creating RTCPeerConnection with STUN servers')
      this.pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      })
      
      this.pc.onicecandidate = (e) => {
        console.log('ICE candidate:', e.candidate)
        this.onIceCandidate(e)
      }

      this.pc.oniceconnectionstatechange = (e) => {
        console.log('ICE connection state changed:', this.pc.iceConnectionState)
        this.onIceStateChange(e)
      }

      this.pc.onaddstream = (e) => {
        console.log('Stream added:', e.stream)
        this.gotRemoteStream(e)
      }

      this.pc.onicegatheringstatechange = (e) => {
        console.log('ICE gathering state:', this.pc.iceGatheringState)
      }

      this.pc.onsignalingstatechange = (e) => {
        console.log('Signaling state:', this.pc.signalingState)
      }

      this.createOffer(this.url, offerSdpOption)
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error)
      this.handleError(error)
    }
  }

  createOffer(signal_url, offerSdpOption) {
    console.log('Creating offer with options:', offerSdpOption)
    this.pc.createOffer(offerSdpOption)
      .then(offer => {
        console.log('Offer created:', offer)
        return this.pc.setLocalDescription(offer)
      })
      .then(() => {
        console.log('Local description set successfully')
        
        const request = {
          version: "v1.0",
          sessionId: "sessionid_test",
          localSdp: this.pc.localDescription
        }

        console.log('Sending offer to:', signal_url)
        return $.ajax({
          type: "post",
          url: signal_url,
          data: JSON.stringify(request),
          dataType: "json",
          crossDomain: true
        }).then(data => {
          console.log('Server response received:', data)
          this.handleServerResponse(data)
        })
      })
      .catch(err => {
        console.error('Error in offer creation:', err)
        this.handleError(err)
      })
  }

  handleServerResponse(data) {
    console.log('Handling server response:', data)
    if (data.code != 200) {
      console.error('Server returned error code:', data.code)
      this.handleError(new Error(`Server error: ${data.code}`))
      return
    }

    const remoteSdp = data.remoteSdp
    console.log('Received remote SDP:', remoteSdp)

    this.pc.setRemoteDescription(new RTCSessionDescription(remoteSdp))
      .then(() => {
        console.log('Remote description set successfully')
      })
      .catch(err => {
        console.error('Failed to set remote description:', err)
        this.handleError(err)
      })
  }

  onIceCandidate(event) {
    console.log('ICE candidate: \n' + (event.candidate ? event.candidate.candidate : '(null)'))
  }

  onIceStateChange(event) {
    if (this.pc) {
      console.log('ICE state changed to:', this.pc.iceConnectionState)
      if (this.connectedStatus === 0 && this.pc.iceConnectionState === 'connected') {
        this.connectedStatus = 1
        if (!this.intervalValue) {
          this.intervalValue = setInterval(() => this.getStats(), 2000)
        }
        if (this.onConnected) {
          this.onConnected()
        }
      } else if (this.pc.iceConnectionState === 'disconnected') {
        this.stop()
      }
    }
  }

  getStats() {
    if (this.pc) {
      this.pc.getStats()
        .then(stats => {
          stats.forEach(report => {
            if (report.type === 'inbound-rtp') {
              this.handleStats(report)
            }
          })
        })
        .catch(err => console.error('Error getting stats:', err))
    }
  }

  handleStats(report) {
    console.log('Stats:', report)
  }

  gotRemoteStream(event) {
    console.log('Got remote stream, setting up video element')
    const remoteVideo = this.container
    
    if (remoteVideo) {
      remoteVideo.srcObject = event.stream
      if (this.autoplay) {
        remoteVideo.play().catch(err => {
          console.error('Failed to autoplay:', err)
        })
      }
      console.log('Stream set to video element')
    } else {
      console.error('Video container not found')
    }
  }

  stop() {
    console.log('Stopping player')
    
    if (this.intervalValue) {
      clearInterval(this.intervalValue)
      this.intervalValue = null
    }

    if (this.pc) {
      this.pc.close()
      this.pc = null
    }

    this.connectedStatus = 0
    
    if (this.container) {
      this.container.srcObject = null
    }
  }

  handleError(error) {
    console.error('Player error:', error)
    this.stop()
    if (this.onError) {
      this.onError(error)
    }
  }

  initOtherProtocol() {
    console.log('Other protocols not implemented yet')
  }
} 