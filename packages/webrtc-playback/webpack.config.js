const path = require('path')

module.exports = {
  entry: './src/webrtc-playback.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'webrtc-playback.js',
    library: {
      name: 'WebRTCPlayback',
      type: 'umd',
      export: 'default'
    }
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          'css-loader',
          'sass-loader'
        ]
      },
      {
        test: /\.html$/,
        use: [
          {
            loader: 'html-loader',
            options: {
              minimize: true
            }
          }
        ]
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.scss', '.html']
  }
} 