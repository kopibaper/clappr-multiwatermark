import { Playback, Events, Styler, template } from '@clappr/core'
import pluginStyle from './public/style.scss'
import pluginTemplate from './public/template.html'

export default class WebRTCPlayback extends Playback {
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

  static get version() { return '0.1.0' }

  constructor(options) {
    super(options)
    this.options = options
    this.player = null
    this.connectedStatus = 0
    this.intervalValue = null
  }

  bindEvents() {
    this.listenTo(this.container, Events.CONTAINER_STOP, this.stop)
    this.listenTo(this.container, Events.CONTAINER_DESTROY, this.destroy)
  }

  play() {
    if (!this.player) {
      this.initWebRTC()
    }
  }

  pause() {
    this.stop()
  }

  stop() {
    if (this.intervalValue) {
      clearInterval(this.intervalValue)
      this.intervalValue = null
    }

    if (this.player) {
      this.player.stop()
      this.player = null
    }

    this.connectedStatus = 0
    this.trigger(Events.PLAYBACK_STOP)
  }

  destroy() {
    this.stop()
    super.destroy()
  }

  initWebRTC() {
    const videoElement = this.el.querySelector('video')
    if (!videoElement) {
      console.error('Video element not found')
      return
    }

    this.player = new H5Player({
      container: videoElement,
      protocol: 'webrtc',
      url: this.options.src,
      autoplay: true,
      webrtc: {
        offerOptions: {
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        }
      }
    })

    this.player.onError = (error) => {
      console.error('WebRTC error:', error)
      this.trigger(Events.PLAYBACK_ERROR, { error })
    }
  }
}

// H5Player class implementation
class H5Player {
  constructor(options) {
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
    if (this.protocol === 'webrtc') {
      this.initWebRTC()
    } else {
      this.initOtherProtocol()
    }
  }

  initWebRTC() {
    console.log('Initializing WebRTC player')
    
    if (!this.url) {
      console.error('Signal URL is required for WebRTC')
      return
    }

    // Ensure .sdp extension
    let signal_url = this.url
    let pos = signal_url.indexOf(".sdp")
    if (-1 == pos) {
      pos = signal_url.indexOf("?")
      if (-1 == pos) {
        signal_url += ".sdp"
      } else {
        signal_url = signal_url.substr(0, pos) + ".sdp" + signal_url.substr(pos)
      }
    }

    const offerSdpOption = {
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
      ...this.webrtcOptions.offerOptions
    }

    this.pc = new RTCPeerConnection(null)
    
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

    this.createOffer(signal_url, offerSdpOption)
  }

  createOffer(signal_url, offerSdpOption) {
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

        return fetch(signal_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(request)
        }).then(response => response.json())
      })
      .then(data => {
        console.log('Server response received:', data)
        this.handleServerResponse(data)
      })
      .catch(err => {
        console.error('Error in offer creation:', err)
        this.handleError(err)
      })
  }

  handleServerResponse(data) {
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
      if (this.connectedStatus === 0 && this.pc.iceConnectionState === 'connected') {
        this.connectedStatus = 1
        if (!this.intervalValue) {
          this.intervalValue = setInterval(() => this.getStats(), 2000)
        }
      } else if (this.pc.iceConnectionState === 'disconnected') {
        this.stop()
      }
      console.log('ICE state: ' + this.pc.iceConnectionState)
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