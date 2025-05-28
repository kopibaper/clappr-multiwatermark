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
    this.configure()
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
    
    if (this.watermarks.length > 0) {
      this.render()
    } else {
      this.$el.remove()
    }
  }

  onPlay() {
    if (!this.hidden)
      this.$el.show()
  }

  onStop() {
    this.$el.hide()
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
      this.$el.append(watermarkContainer)
    })
    
    this.$el.append(style[0])
    this.container.$el.append(this.$el)
    return this
  }
}
