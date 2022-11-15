const yaml = require('js-yaml')
const fs = require('fs')
const { configPath, topName, fatal } = require('./utils.js')
const { browserIsOK, vote } = require('./puppet.js');

(async () => {
  let user
  let tops
  let silent
  let puppeteerConfig
  try {
    console.log('Bienvenue sur Top Top Voter !! :D')

    const config = yaml.load(fs.readFileSync(configPath(), 'utf8'))

    silent = config.silent

    if (silent) console.log('Ce programme ouvrira Chrome en arrière plan, vous ne verrez rien. La seule chose que vous ayez à faire est de garder cette console ouverte !')
    else console.log('Ce programme ouvrira Chrome de manière visible. Si ça vous gêne, vous pouvez configurer silent à true dans le fichier config.txt.')

    if (!config.chrome_path || config.chrome_path === 'auto') {
      puppeteerConfig = {}
      console.log('Le programme essayera de trouver automatiquement Chrome sur votre machine.')
    } else {
      puppeteerConfig = { executablePath: config.chrome_path }
      console.log(`Le programme utilisera votre .exe de Chrome situé sur ce chemin : ${config.chrome_path}.`)
    }

    user = (config.name || '').trim()
    if (user) console.log(`Les votes seront effectués pour l'identifiant "${user}".`)
    else console.warning('Aucun identifiant de voteur configuré !')

    tops = [
      ...config.tops.map(url => ({ url, name: topName(url), grid: false })),
      ...config.stupid_grid_tops.map(url => ({ url, name: topName(url), grid: true }))
    ]

    if (!tops.length) await fatal('Aucun top enregistré !')

    console.log(`Top sites enregistrés : ${tops.map(({ url }) => url).join(', ')}.`)
  } catch (e) {
    await fatal('Impossible de lire votre fichier config.txt !', e)
  }

  if (!(await browserIsOK(puppeteerConfig))) {
    await fatal('Impossible de localiser votre navigateur... Chrome ou Chromium est nécessaire ! Vous pouvez essayer de changer chrome_path dans le fichier config.txt pour indiquer votre chrome.exe...')
  }

  const handler = async () => {
    for (const top of tops) {
      try {
        console.log(`Vote pour ${top.name} en cours...`)
        if (await vote(top, user, silent, puppeteerConfig)) console.log(`Le vote pour ${top.name} est une réussite ! :)`)
      } catch (e) {
        console.error(`Le vote pour ${top.name} a échoué... :(`, e)
      }
    }
    console.log('Séquence finie. Ce programme essaie de voter environ toutes les 30 minutes (au cas où vous auriez voté avant...). Laissez le ouvert !')
    setTimeout(handler, Math.round((1000 * 60 * 30) + (1000 * 3 * Math.random())))
  }

  handler()
})()
