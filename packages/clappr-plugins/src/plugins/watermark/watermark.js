// Copyright 2014 Globo.com Player authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import { Events, UIContainerPlugin, template, Styler } from '@clappr/core'

import watermarkHTML from './public/watermark.html'
import watermarkStyle from './public/watermark.scss'

export default class WaterMarkPlugin extends UIContainerPlugin {
  get name() { return 'watermark' }
  get supportedVersion() { return { min: CLAPPR_CORE_VERSION } }
  get template() { return template(watermarkHTML) }

  constructor(container) {
    super(container)
    this.$el = $('<div class="clappr-watermark"></div>')
    this.bottomWatermarkTimer = null
    this.configure()
  }

  getTimestamp() {
    const now = new Date()
    const hours = now.getHours().toString().padStart(2, '0')
    const minutes = now.getMinutes().toString().padStart(2, '0')
    return `[${hours}:${minutes}]`
  }

  bindEvents() {
    this.listenTo(this.container, Events.CONTAINER_PLAY, this.onPlay)
    this.listenTo(this.container, Events.CONTAINER_STOP, this.onStop)
    this.listenTo(this.container, Events.CONTAINER_OPTIONS_CHANGE, this.configure)
  }

  configure() {
    // Check for watermarks configuration at root level
    if (this.options.watermark && Array.isArray(this.options.watermark)) {
      this.watermarks = this.options.watermark.map(wm => ({
        imageUrl: wm.imageUrl || '',
        imageLink: wm.imageLink || '',
        position: wm.position || 'top-right'
      }))
    } else {
      this.watermarks = []
    }

    // Configure watermark timing behavior
    // watermarkTimeout: Time in milliseconds between watermark appearances (default: 4 minutes)
    // watermarkVisibility: Duration in milliseconds that watermark stays visible (default: 15 seconds)
    // enableInitialDelay: Whether to wait before starting the first toggle cycle (default: true)
    this.bottomWatermarkTimeout = (this.options.watermarkTimeout || 240000)
    this.bottomWatermarkVisibility = (this.options.watermarkVisibility || 15000)
    this.enableInitialDelay = (this.options.enableInitialDelay !== undefined ? this.options.enableInitialDelay : true)

    console.log(`${this.getTimestamp()} Watermark timing configured:`)
    console.log(`${this.getTimestamp()} - Appears every ${this.bottomWatermarkTimeout / 1000} seconds`)
    console.log(`${this.getTimestamp()} - Stays visible for ${this.bottomWatermarkVisibility / 1000} seconds`)
    console.log(`${this.getTimestamp()} - Initial delay ${this.enableInitialDelay ? 'enabled' : 'disabled'}`)

    if (this.watermarks.length > 0) {
      this.render()
      this.$el.show()
      // this.startBottomWatermarkTimer()
    } else {
      this.$el.remove()
    }
  }

  onPlay() {
    console.log(`${this.getTimestamp()} Play event triggered`)
    if (!this.hidden) {
      this.$el.css('display', 'block')
      console.log(`${this.getTimestamp()} Watermarks container shown on play`)
      // Start the watermark timer when play begins
      this.startBottomWatermarkTimer()
    }
  }

  onStop() {
    console.log(`${this.getTimestamp()} Stop event triggered`)
    this.$el.css('display', 'none')
    this.stopBottomWatermarkTimer()
    console.log(`${this.getTimestamp()} Watermarks hidden on stop`)
  }

  startBottomWatermarkTimer() {
    console.log(`${this.getTimestamp()} Starting bottom watermark timer`)
    
    const bottomWatermarks = this.$el.find('.watermark-bottom_center')
    console.log(`${this.getTimestamp()} Found bottom watermarks:`, bottomWatermarks.length)
    if (bottomWatermarks.length === 0) return

    // Ensure watermarks start hidden
    bottomWatermarks.css({
      'transition': 'opacity 0.5s ease-in-out',
      'opacity': '0'
    })

    let isVisible = false
    console.log(`${this.getTimestamp()} Initial state: watermarks hidden`)

    const toggleVisibility = () => {
      console.log(`${this.getTimestamp()} Toggle called, current visibility:`, isVisible)
      if (!isVisible) {
        // Show watermark
        console.log(`${this.getTimestamp()} Fading in watermarks`)
        bottomWatermarks.css('opacity', '1')
        setTimeout(() => {
          isVisible = true
          console.log(`${this.getTimestamp()} Watermarks faded in`)
          // Schedule hide after visibility duration
          setTimeout(() => {
            console.log(`${this.getTimestamp()} Fading out watermarks`)
            bottomWatermarks.css('opacity', '0')
            setTimeout(() => {
              isVisible = false
              console.log(`${this.getTimestamp()} Watermarks faded out`)
              // Schedule next show after timeout
              setTimeout(() => toggleVisibility(), this.bottomWatermarkTimeout)
            }, 500)
          }, this.bottomWatermarkVisibility)
        }, 500)
      }
    }

    // Start with initial timeout before showing
    console.log(`${this.getTimestamp()} Starting initial timeout of ${this.bottomWatermarkTimeout/1000} seconds`)
    setTimeout(() => {
      console.log(`${this.getTimestamp()} Initial timeout complete, starting watermark cycle`)
      toggleVisibility()
    }, this.bottomWatermarkTimeout)
  }

  stopBottomWatermarkTimer() {
    console.log(`${this.getTimestamp()} Stopping bottom watermark timer`)
    if (this.bottomWatermarkTimer) {
      clearInterval(this.bottomWatermarkTimer)
      this.bottomWatermarkTimer = null
      console.log(`${this.getTimestamp()} Timer cleared`)
    }
  }

  render() {
    this.$el.hide()
    const style = Styler.getStyleFor(watermarkStyle, { baseUrl: this.options.baseUrl })
    
    // Clear existing watermarks
    this.$el.empty()
    
    // Create a container for each watermark
    this.watermarks.forEach(watermark => {
      const watermarkContainer = $('<div class="clappr-watermark-container"></div>')
      const templateOptions = {
        position: watermark.position,
        imageUrl: watermark.imageUrl,
        imageLink: watermark.imageLink,
        className: `watermark-${watermark.position.replace('-', '_')}`
      }
      
      // Ensure position is one of the valid options
      if (!['top-left', 'top-right', 'bottom-center'].includes(watermark.position)) {
        templateOptions.position = 'top-right'
        templateOptions.className = 'watermark-top_right'
      }
      
      watermarkContainer.html(this.template(templateOptions))
      
      // Add click handler for close button if it's a bottom-center watermark
      if (watermark.position === 'bottom-center') {
        watermarkContainer.find('.watermark-close-btn').on('click', () => {
          watermarkContainer.remove()
        })
      }
      
      this.$el.append(watermarkContainer)
    })
    
    this.$el.append(style[0])
    this.container.$el.append(this.$el)
    return this
  }
}
