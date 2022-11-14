import puppeteer from 'puppeteer'
import sleep from 'await-sleep'

const waitUntil = ['networkidle2', 'domcontentloaded']

const isNumeric = (n) => {
  return !isNaN(parseFloat(n)) && isFinite(n)
}

export const browserIsOK = async () => {
  try {
    const browser = await puppeteer.launch()
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
    await page.$eval('input[name=votant]', (e, user) => {
      e.value = user
    }, user)
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
  const result = await page.evaluate(async () => {
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
  })

  // Check if the result is likely, else try again
  if (result.length !== 2 || !isNumeric(result)) {
    page.reload({ waitUntil: ['networkidle2', 'domcontentloaded'] })
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
      await page.goBack(({ waitUntil: ['networkidle2', 'domcontentloaded'] }))
      await resolveGrid(page, user)
    }
  }
}

export const vote = async ({ name, url, grid }, user, silent) => {
  const browser = await puppeteer.launch({ headless: silent })
  const page = await browser.newPage()

  // Navigate twice because of a quirk in root-top code
  await page.goto(url, { waitUntil })
  await page.goto(url, { waitUntil })

  await sleep(1500)

  const [alreadyVoted] = await page.$x("//p[contains(., 'déjà voté')]")
  if (alreadyVoted) {
    console.log(`Vous avez déjà voté pour ${name}. Next!`)
    await browser.close()
    return false
  }

  if (grid) await resolveGrid(page, user)
  else await resolveSimple(page, user)

  await browser.close()

  return true
}
