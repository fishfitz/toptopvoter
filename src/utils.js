import { resolve } from 'path'

export const configPath = () => {
  return resolve('./config.txt')
}

export const topName = (url) => {
  return url.split('/')[4]
}
