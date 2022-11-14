import yaml from 'js-yaml'
import fs from 'fs'
import { configPath, topName } from './utils.js'
import { browserIsOK, vote } from './puppet.js'

let user
let tops
let silent
try {
  console.log('Bienvenue sur Top Top Voter !! :D')

  const config = yaml.load(fs.readFileSync(configPath(), 'utf8'))

  silent = config.silent

  user = (config.name || '').trim()
  if (user) console.log(`Les votes seront effectués pour l'identifiant "${user}".`)
  else console.warning('Aucun identifiant de voteur configuré !')

  tops = [
    ...config.tops.map(url => ({ url, name: topName(url), grid: false })),
    ...config.stupid_grid_tops.map(url => ({ url, name: topName(url), grid: true }))
  ]

  if (!tops.length) {
    console.error('Aucun top enregistré !')
    process.exit()
  }

  console.log(`Top sites enregistrés : ${tops.map(({ url }) => url).join(', ')}.`)
} catch (e) {
  console.error('Impossible de lire votre fichier config.txt !', e)
  process.exit()
}

const handler = async () => {
  for (const top of tops) {
    try {
      console.log(`Vote pour ${top.name} en cours...`)
      if (await vote(top, user, silent)) console.log(`Le vote pour ${top.name} est une réussite ! :)`)
    } catch (e) {
      console.error(`Le vote pour ${top.name} a échoué... :(`, e)
    }
  }
  console.log('Séquence finie. Ce programme essaie de voter environ toutes les 30 minutes (au cas où vous auriez voté avant...).')
  setTimeout(handler, Math.round((1000 * 60 * 30) + (1000 * 3 * Math.random())))
}

(async () => {
  if (!(await browserIsOK())) {
    console.error('Impossible de localiser votre navigateur... Chrome ou Chromium est nécessaire !')
    process.exit()
  }

  handler()
})()
