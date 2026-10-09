// End-to-end tests: runs the real app against an in-memory database and
// clicks through the student, driver and admin flows on phone and desktop.
//
//   npm run test:e2e            (set CHROME_PATH if Chromium is elsewhere)
//
// Screenshots of every screen are saved in tests/e2e/screenshots/.
import { createServer } from 'vite'
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const configFile = fileURLToPath(new URL('./vite.e2e.config.js', import.meta.url))
const shotsDir = fileURLToPath(new URL('./screenshots/', import.meta.url))
mkdirSync(shotsDir, { recursive: true })

const server = await createServer({ configFile })
await server.listen()
const BASE = `http://localhost:${server.config.server.port}/`

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium',
})

const results = []
let failures = 0

function check(name, condition, detail = '') {
  results.push(`${condition ? 'PASS' : 'FAIL'} ${name}${condition || !detail ? '' : ` — ${detail}`}`)
  if (!condition) failures++
}

async function newPage(width) {
  const context = await browser.newContext({
    viewport: { width, height: width < 700 ? 844 : 900 },
    deviceScaleFactor: 1,
    isMobile: width < 700,
    hasTouch: width < 700,
  })
  const page = await context.newPage()
  page.__errors = []
  page.on('pageerror', (e) => page.__errors.push(e.message))
  page.on('dialog', (d) => d.accept())
  return page
}

async function open(page, role, extra = '') {
  await page.goto(`${BASE}?role=${role}${extra}`)
  await page.waitForTimeout(700)
}

async function noOverflow(page, label) {
  const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }))
  check(`${label}: fits the screen without sideways scrolling`, sw <= w + 1, `scrollWidth ${sw} > ${w}`)
}

async function shot(page, name, fullPage = true) {
  await page.screenshot({ path: `${shotsDir}${name}.png`, fullPage })
}

const text = (page, selector) => page.locator(selector).first().innerText()

// A large photo, made in the browser, to test upload compression.
async function makePhoto(page) {
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = 2400
    c.height = 1800
    const ctx = c.getContext('2d')
    for (let i = 0; i < 4000; i++) {
      ctx.fillStyle = `hsl(${(i * 37) % 360} 70% ${30 + (i % 50)}%)`
      ctx.fillRect(Math.random() * 2400, Math.random() * 1800, 60, 60)
    }
    return c.toDataURL('image/png').split(',')[1]
  })
  return { name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') }
}

try {
  // ---------------- Student on a phone ----------------
  {
    const page = await newPage(390)
    await open(page, 'student')

    check('home: next delivery ticket shows a time', /\d{1,2}:\d{2}/.test(await text(page, '.next-drop-time')))
    check('home: countdown to ordering deadline', /Order in the next (4[0-2]|\d+) min/.test(await text(page, '.next-drop-note')))
    const tiles = await page.locator('.cat-tile').allInnerTexts()
    check('home: categories come from the admin (hidden ones left out)', tiles.length === 3 && tiles[0].includes('Burgers') && !tiles.join().includes('Desserts'), tiles.join(' | '))
    check('home: category shows its dish count', tiles[0].includes('2 dishes'), tiles[0])
    check('home: only active restaurants are listed', (await page.locator('.restaurant-card').count()) === 2)
    await noOverflow(page, 'student home')
    await shot(page, 'student-home-phone')

    await page.locator('.cat-tile', { hasText: 'Pizza' }).click()
    await page.waitForTimeout(200)
    check('category: shows its dishes with size pricing', (await page.locator('.dish-card').allInnerTexts()).join().includes('from 120 EGP'))
    check('category: filters restaurants to those serving it', (await page.locator('.restaurant-card').allInnerTexts()).join().includes('Pizza Corner') && (await page.locator('.restaurant-card').count()) === 1)
    await shot(page, 'student-category-phone')

    await page.locator('.dish-card', { hasText: 'Margherita' }).click()
    await page.waitForTimeout(700)
    check('dish: opens the restaurant with the dish sheet already open', await page.locator('.food-sheet').isVisible())
    const addBtn = page.locator('.food-sheet .btn-primary')
    check('sizes: must pick a size before adding', (await addBtn.isDisabled()) && (await addBtn.innerText()).includes('Choose a size'))
    check('sizes: all sizes listed with prices', (await page.locator('.size-option').allInnerTexts()).join(' ').replace(/\s+/g, ' ').includes('L 160 EGP'))
    await shot(page, 'student-size-picker-phone', false)
    await page.locator('.size-option', { hasText: 'L' }).first().click()
    await page.locator('.qty-stepper.lg button[aria-label="Increase quantity"]').click()
    check('sizes: price follows size and quantity', (await addBtn.innerText()).includes('320 EGP'), await addBtn.innerText())
    await addBtn.click()
    await page.waitForTimeout(300)
    check('cart bar: shows count and total', (await text(page, '.menu-cart-bar')).replace(/\s+/g, ' ').includes('2 View cart 320 EGP'))

    const brownie = page.locator('.menu-item', { hasText: 'Brownie' })
    check('menu: unavailable dish cannot be added', (await brownie.count()) === 0 || (await brownie.isDisabled()))

    await page.locator('.menu-cart-bar').click()
    await page.waitForTimeout(400)
    check('cart: line shows the chosen size', (await text(page, '.cart-sheet-item')).includes('L'))
    await shot(page, 'student-cart-phone', false)
    await page.locator('.cart-sheet .btn-primary').click()
    await page.waitForTimeout(800)

    check('checkout: bigger order uses the higher delivery tier (40)', (await text(page, '.checkout-summary')).replace(/\s+/g, ' ').includes('Delivery fee 40 EGP'))
    check('checkout: total = 320 + 40', (await text(page, '.checkout-summary')).includes('360 EGP'))
    check('checkout: closed batches are hidden', (await page.locator('.batch-option').count()) === 2)
    check('checkout: a batch that opens later is shown but locked', await page.locator('.batch-option.is-later').isDisabled())
    await noOverflow(page, 'checkout')
    await shot(page, 'student-checkout-phone')
    await page.locator('.batch-option:not(.is-later)').first().click()
    await page.locator('.checkout-continue').click()
    await page.waitForTimeout(700)

    await page.locator('.pay-method').first().click()
    await page.locator('.pay-upload input[type=file]').setInputFiles(await makePhoto(page))
    await page.waitForTimeout(300)
    await page.locator('.submit-payment-button').click()
    await page.waitForTimeout(900)
    check('payment: order placed', await page.locator('.payment-success').isVisible())
    const placed = await page.evaluate(() => window.__lastOrder?.args?.p_items)
    check('payment: sends item, size and quantity only (prices come from the server)', JSON.stringify(placed) === JSON.stringify([{ food_item_id: 'f4', size_id: 's2', quantity: 2 }]), JSON.stringify(placed))
    check('payment: success shows the server total', (await text(page, '.payment-success-card')).includes('360 EGP'))
    await shot(page, 'student-success-phone')

    await page.locator('.payment-success .btn-primary').click()
    await page.waitForTimeout(800)
    check('orders: new order appears with its size', (await page.locator('.student-order-card').first().innerText()).includes('Margherita (L)'))
    await noOverflow(page, 'my orders')
    await shot(page, 'student-orders-phone')

    // Small order → base fee and a hint about the next tier
    await open(page, 'student')
    await page.locator('.restaurant-card', { hasText: 'Burger Hub' }).click()
    await page.waitForTimeout(700)
    await page.locator('.menu-item', { hasText: 'Loaded Fries' }).click()
    await page.locator('.food-sheet .btn-primary').click()
    await page.locator('.menu-cart-bar').click()
    await page.locator('.cart-sheet .btn-primary').click()
    await page.waitForTimeout(800)
    check('checkout: small order uses the base fee (25)', (await text(page, '.checkout-summary')).replace(/\s+/g, ' ').includes('Delivery fee 25 EGP'))
    check('checkout: tells the student when the fee changes', (await text(page, '.checkout-fee-hint')).includes('300 EGP'))

    await open(page, 'student')
    await page.locator('.search-box input').fill('latte')
    await page.waitForTimeout(200)
    check('search: finds restaurants by dish name', (await page.locator('.restaurant-card').allInnerTexts()).join().includes('Pizza Corner') && (await page.locator('.restaurant-card').count()) === 1)

    check('student: no script errors', page.__errors.length === 0, page.__errors.join(' / '))
    await page.context().close()
  }

  // ---------------- Student with an empty database ----------------
  {
    const page = await newPage(390)
    await open(page, 'student', '&empty=1')
    check('empty: friendly empty state', (await text(page, '.empty-state')).includes('Restaurants coming soon'))
    await shot(page, 'student-empty-phone')
    await page.context().close()
  }

  // ---------------- Driver on a phone ----------------
  {
    const page = await newPage(390)
    await open(page, 'driver')
    const tabs = (await page.locator('.driver-tab').allInnerTexts()).map((t) => t.replace(/\s+/g, ' '))
    check('driver: PREPARING/CONFIRMED orders in my batch are ready to pick up (even without a driver set)', tabs[0].startsWith('2 '), tabs.join(' | '))
    check('driver: unpaid and other-batch orders are hidden', !(await page.locator('.driver-orders').innerText()).includes('B-105') && !(await page.locator('.driver-orders').innerText()).includes('B-106'))
    check('driver: card shows the student and a call button', (await page.locator('.driver-call').count()) >= 1)
    check('driver: card lists the items', (await text(page, '.driver-order-items')).includes('2× Classic Smash Burger'))
    await noOverflow(page, 'driver')
    await shot(page, 'driver-phone')
    await page.locator('.driver-primary-button').first().click()
    await page.waitForTimeout(500)
    const after = (await page.locator('.driver-tab').allInnerTexts()).map((t) => t.replace(/\s+/g, ' '))
    check('driver: pickup moves the order to "On the way"', after[0].startsWith('1 ') && after[1].startsWith('2 '), after.join(' | '))
    check('driver: no script errors', page.__errors.length === 0, page.__errors.join(' / '))
    await page.context().close()
  }

  // ---------------- Admin on desktop ----------------
  {
    const page = await newPage(1280)
    await open(page, 'admin')
    const go = async (label) => {
      await page.locator('.admin-nav-button', { hasText: new RegExp(`^\\W*${label}$`) }).first().click()
      await page.waitForTimeout(700)
    }

    await go('Home Categories')
    check('admin: home categories listed (including hidden)', (await page.locator('.home-cats-card').count()) === 4)
    check('admin: shows dishes linked per category', (await text(page, '.home-cats-card')).includes('2 dishes linked'))
    await page.locator('button', { hasText: '+ Add Category' }).click()
    await page.locator('#home-cat-name').fill('Shawarma')
    await page.locator('.home-cats-emoji-picks button[aria-label="Use 🌯"]').click()
    await page.locator('.home-cats-form .admin-primary-button').click()
    await page.waitForTimeout(600)
    check('admin: adds a home category', (await page.locator('.home-cats-card').allInnerTexts()).join().includes('Shawarma'))
    await page.locator('button', { hasText: '+ Add Category' }).click()
    await page.locator('.home-cats-form .admin-primary-button').click()
    check('admin: category name is required', (await text(page, '.home-cats-message')).includes('name'))
    await shot(page, 'admin-home-categories-desktop')

    await go('Food & Menu')
    await page.locator('.restaurant-selector-button').click()
    await page.locator('.restaurant-dropdown-item', { hasText: 'Pizza Corner' }).click()
    await page.waitForTimeout(700)
    check('admin: food list shows prices by size', (await page.locator('.food-price-line').allInnerTexts()).join().includes('M 120 EGP'))
    await page.locator('.admin-restaurant-row', { hasText: 'Margherita' }).locator('button', { hasText: 'Edit' }).click()
    check('admin: editing loads all sizes', (await page.locator('.sizes-row:not(.sizes-row-head)').count()) === 3)
    check('admin: editing keeps the home category', (await page.locator('#food-home-category').inputValue()) === 'h2')
    await page.locator('button', { hasText: 'Cancel' }).first().click()

    await page.locator('button', { hasText: 'Add Food' }).click()
    await page.locator('#food-name').fill('BBQ Pizza')
    await page.locator('#food-section').selectOption('c3')
    await page.locator('#food-home-category').selectOption('h2')
    await page.locator('.sizes-presets button', { hasText: '+ M' }).click()
    await page.locator('.sizes-presets button', { hasText: '+ L' }).click()
    await page.locator('input[aria-label="Size 1 price"]').fill('130')
    await page.locator('input[aria-label="Size 2 price"]').fill('175')
    const photo = await makePhoto(page)
    await page.locator('.food-form .image-uploader input[type=file]').setInputFiles(photo)
    await page.waitForTimeout(1500)
    const upload = await page.evaluate(() => window.__lastUpload)
    check('upload: photo is compressed before upload', upload && upload.size < photo.buffer.length / 2 && upload.size <= 260 * 1024, JSON.stringify(upload) + ` original ${photo.buffer.length}`)
    check('upload: stored as WebP or JPEG in the food folder', upload && /^food\/.+\.(webp|jpg)$/.test(upload.path) && /image\/(webp|jpeg)/.test(upload.type), JSON.stringify(upload))
    check('upload: shows how much it saved', (await text(page, '.food-form .image-uploader-info')).includes('→'))
    await shot(page, 'admin-food-form-desktop')
    await page.locator('button', { hasText: 'Save Food' }).click()
    await page.waitForTimeout(1200)
    const calls = await page.evaluate(() => window.__mockCalls.filter((c) => c.table === 'food_item_sizes' && c.mode === 'insert').map((c) => c.payload[0]))
    check('admin: saves each size with its price', calls.length === 2 && calls[0].name === 'M' && calls[0].selling_price === 130 && calls[1].selling_price === 175, JSON.stringify(calls))
    const saved = await page.evaluate(() => window.__db.food_items.find((f) => f.name === 'BBQ Pizza'))
    check('admin: base price = cheapest size, linked to home category, photo saved', saved && saved.selling_price === 130 && saved.home_category_id === 'h2' && saved.image_url?.includes('food/'), JSON.stringify(saved))

    await go('Restaurants')
    await page.locator('button', { hasText: /Add Restaurant/ }).first().click().catch(() => {})
    await page.waitForTimeout(300)
    check('admin: restaurant form uses a photo upload button, not a link', (await page.locator('.image-uploader-button', { hasText: 'Upload photo' }).count()) >= 1 && (await page.locator('input[placeholder="https://example.com/image.jpg"]').count()) === 0)

    await go('Settings')
    check('admin: delivery tiers loaded', (await page.locator('.tiers-row:not(.tiers-head)').count()) === 2)
    await page.locator('#tiers-preview-input').fill('350')
    check('admin: preview shows the tier fee', (await text(page, '.tiers-preview')).includes('40 EGP'))
    await page.locator('input[aria-label="Tier 2 starts at"]').fill('0')
    check('admin: duplicate tier start is blocked', (await text(page, '.delivery-settings-message')).includes('same amount') && (await page.locator('button', { hasText: 'Save delivery fees' }).isDisabled()))
    await page.locator('input[aria-label="Tier 2 starts at"]').fill('300')
    await page.locator('.tiers-add').click()
    await page.locator('input[aria-label="Tier 3 starts at"]').fill('800')
    await page.locator('input[aria-label="Tier 3 fee"]').fill('0')
    await page.locator('button', { hasText: 'Save delivery fees' }).click()
    await page.waitForTimeout(800)
    const tiers = await page.evaluate(() => window.__db.delivery_fee_tiers.map((t) => `${t.min_order_total}:${t.fee}`).sort())
    check('admin: tiers saved', JSON.stringify(tiers) === JSON.stringify(['0:25', '300:40', '800:0']), JSON.stringify(tiers))
    check('admin: save confirmation shown', (await text(page, '.delivery-settings-message')).includes('saved'))
    await shot(page, 'admin-delivery-tiers-desktop')
    check('admin: no script errors', page.__errors.length === 0, page.__errors.join(' / '))
    await page.context().close()
  }

  // ---------------- Phone layouts for admin screens ----------------
  for (const section of ['Home Categories', 'Food & Menu', 'Settings']) {
    const page = await newPage(390)
    await open(page, 'admin')
    await page.locator('.admin-menu-toggle').click()
    await page.locator('.admin-nav-button', { hasText: section }).first().click()
    await page.waitForTimeout(700)
    if (section === 'Food & Menu') {
      await page.locator('.restaurant-selector-button').click()
      await page.locator('.restaurant-dropdown-item', { hasText: 'Pizza Corner' }).click()
      await page.waitForTimeout(600)
      await page.locator('.admin-restaurant-row', { hasText: 'Margherita' }).locator('button', { hasText: 'Edit' }).click()
    }
    await noOverflow(page, `admin ${section} (phone)`)
    await shot(page, `admin-${section.toLowerCase().replace(/[^a-z]+/g, '-')}-phone`)
    await page.context().close()
  }

  // ---------------- Desktop student home ----------------
  {
    const page = await newPage(1280)
    await open(page, 'student')
    await page.locator('.cat-tile', { hasText: 'Burgers' }).click()
    await page.waitForTimeout(200)
    await shot(page, 'student-home-desktop')
    await page.context().close()
  }
} catch (error) {
  failures++
  results.push(`FAIL test run crashed — ${error.message.split('\n')[0]}`)
} finally {
  await browser.close()
  await server.close()
}

console.log(results.join('\n'))
console.log(`\n${results.length - failures} passed, ${failures} failed`)
process.exit(failures ? 1 : 0)
