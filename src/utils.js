const { resolve } = require('path')
const sleep = require('await-sleep')

const configPath = () => {
  return resolve('./config.txt')
}

const topName = (url) => {
  return url.split('/')[4]
}

const fatal = async (...errors) => {
  console.error(errors)
  console.error('Pour réessayer, vous pouvez fermer cette fenêtre (elle se fermera seule dans 2 minutes).')
  await sleep(2 * 60 * 1000)
  process.exit()
}

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

module.exports = { configPath, topName, fatal, AsyncFunction }
