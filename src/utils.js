import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const getDirname = () => {
  const __filename = fileURLToPath(import.meta.url)
  return dirname(__filename)
}

export const configPath = () => {
  return join(getDirname(), '../config.txt')
}

export const topName = (url) => {
  return url.split('/')[4]
}