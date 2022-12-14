const puppeteer = require('puppeteer')
const sleep = require('await-sleep')
const { AsyncFunction } = require('./utils')

const waitUntil = ['networkidle2', 'domcontentloaded']

const isNumeric = (n) => {
  return !isNaN(parseFloat(n)) && isFinite(n)
}

const browserIsOK = async (config) => {
  try {
    const browser = await puppeteer.launch(config)
    await browser.close()
    return true
  } catch (e) {
    console.log(e)
    return false
  }
}

// Fill voter id field
const fillUser = async (page, user) => {
  if (user) {
    // eslint-disable-next-line no-return-assign
    await page.$eval('input[name=votant]', '(e, user) => e.value = user', user)
  }
}

// Simple tops don't have any captcha, just a (somewhat hidden) button
const resolveSimple = async (page, user) => {
  await fillUser(page, user)
  await page.click('input[type=image]')
}

// Some tops are protected with a captcha, but it's so bad it can usually be performed by Teserract
const resolveGrid = async (page, user) => {
  await fillUser(page, user)

  await page.addScriptTag({ url: 'https://unpkg.com/tesseract.js@v2.0.0-beta.1/dist/tesseract.min.js' })
  const result = await page.evaluate(new AsyncFunction('', `
    const image = document.getElementById('Patcha')

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    canvas.height = 80
    canvas.width = 120
    context.drawImage(image, 0, 0)
    const dataURL = canvas.toDataURL('image/jpeg')

    // eslint-disable-next-line no-undef
    const { data: { text } } = await Tesseract.recognize(dataURL)
    return text.trim()
  `))

  // Check if the result is likely, else try again
  if (result.length !== 2 || !isNumeric(result)) {
    console.log('wrong result')
    await page.reload({ waitUntil })
    await resolveGrid(page, user)
  } else {
    // Enter digits in grid
    for (const digit of result) {
      (await page.$x(`//td[@class='case'][contains(., '${digit}')]`))[0].click()
    }

    // Look for error message to check if it succeed, else try again
    await page.waitForNavigation({ waitUntil })
    const failure = (await page.$x('//p[@class=\'nv_adm\'][contains(., \'mal reproduite\')]'))[0]
    if (failure) {
      console.log('failure...')
      await page.goBack(({ waitUntil }))
      await resolveGrid(page, user)
    }
  }
}

const vote = async ({ name, url, grid }, user, silent, config) => {
  const browser = await puppeteer.launch({ headless: silent, ...config })
  const page = await browser.newPage()

  // Navigate twice because of a quirk in root-top code
  await page.goto(url, { waitUntil })
  await page.goto(url, { waitUntil })

  await sleep(1500)

  const [alreadyVoted] = await page.$x("//p[contains(., 'd??j?? vot??')]")
  if (alreadyVoted) {
    console.log(`Vous avez d??j?? vot?? pour ${name}. Next!`)
    await browser.close()
    return false
  }

  if (grid) await resolveGrid(page, user)
  else await resolveSimple(page, user)

  await browser.close()

  return true
}

module.exports = { browserIsOK, vote }
