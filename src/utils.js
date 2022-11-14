const { resolve } = require('path')

const configPath = () => {
  return resolve('./config.txt')
}

const topName = (url) => {
  return url.split('/')[4]
}

module.exports = { configPath, topName }
