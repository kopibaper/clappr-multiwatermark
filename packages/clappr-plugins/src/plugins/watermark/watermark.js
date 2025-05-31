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
    
    // Set default timeout duration (4 minutes in milliseconds)
    this.bottomWatermarkTimeout = (this.options.watermarkTimeout || 240000)
    // Set default visibility duration (15 seconds in milliseconds)
    this.bottomWatermarkVisibility = (this.options.watermarkVisibility || 15000)
    console.log(`${this.getTimestamp()} Bottom watermark timeout set to ${this.bottomWatermarkTimeout/1000} seconds`)
    console.log(`${this.getTimestamp()} Bottom watermark visibility delay set to ${this.bottomWatermarkVisibility/1000} seconds`)
    
    if (this.watermarks.length > 0) {
      this.render()
      this.$el.show()
      this.startBottomWatermarkTimer()
    } else {
      this.$el.remove()
    }
  }

  onPlay() {
    console.log(`${this.getTimestamp()} Play event triggered`)
    if (!this.hidden) {
      this.$el.css('display', 'block')
      console.log(`${this.getTimestamp()} Watermarks shown on play`)
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
    this.stopBottomWatermarkTimer()
    
    const bottomWatermarks = this.$el.find('.watermark-bottom_center')
    console.log(`${this.getTimestamp()} Found bottom watermarks:`, bottomWatermarks.length)
    if (bottomWatermarks.length === 0) return

    // Add transition style
    bottomWatermarks.css({
      'transition': 'opacity 0.5s ease-in-out',
      'opacity': '1'
    })

    let isVisible = true
    console.log(`${this.getTimestamp()} Initial state: watermarks visible`)

    const toggleVisibility = () => {
      console.log(`${this.getTimestamp()} Toggle called, current visibility:`, isVisible)
      if (isVisible) {
        console.log(`${this.getTimestamp()} Fading out watermarks`)
        bottomWatermarks.css('opacity', '0')
        setTimeout(() => {
          isVisible = false
          console.log(`${this.getTimestamp()} Watermarks faded out`)
          // Schedule next show after configured timeout
          setTimeout(() => {
            console.log(`${this.getTimestamp()} Fading in watermarks`)
            bottomWatermarks.css('opacity', '1')
            setTimeout(() => {
              isVisible = true
              console.log(`${this.getTimestamp()} Watermarks faded in`)
              // Schedule next hide after configured visibility duration
              setTimeout(() => toggleVisibility(), this.bottomWatermarkVisibility)
            }, 500)
          }, this.bottomWatermarkTimeout)
        }, 500)
      }
    }

    // Initial delay before starting the toggle cycle
    console.log(`${this.getTimestamp()} Setting initial delay of ${this.bottomWatermarkVisibility/1000} seconds`)
    setTimeout(() => {
      console.log(`${this.getTimestamp()} Initial delay complete, starting toggle cycle`)
      toggleVisibility()
    }, this.bottomWatermarkVisibility)
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
