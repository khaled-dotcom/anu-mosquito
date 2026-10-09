import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { performance, monitorEventLoopDelay } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const outputDirectory = new URL('load-test-results/', root)
const availableSites = [
  'https://anu-mosquito.vercel.app/',
  'https://khaled-dotcom.github.io/anu-mosquito/',
]
const requestedSite = process.argv.find((arg) => arg.startsWith('--site='))?.slice('--site='.length)
if (requestedSite && !availableSites.includes(requestedSite)) throw new Error('Choose one of the two configured application URLs')
const sites = requestedSite ? [requestedSite] : availableSites
const backendOnly = process.argv.includes('--backend-only')
const preflightOnly = process.argv.includes('--preflight-only')
const stages = [100, 250, 500]
const requestBudget = 8000
const byteBudget = 100 * 1024 * 1024
let totalRequests = 0
let totalBytes = 0
let inFlight = 0
let peakInFlight = 0
let circuitOpen = false
let loggedFailures = 0

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const percentile = (values, fraction) => {
  const sorted = [...values].sort((a, b) => a - b)
  return Math.round(sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)] || 0)
}
const eventLoop = monitorEventLoopDelay({ resolution: 20 })
eventLoop.enable()

async function request(fixture) {
  if (circuitOpen || totalRequests >= requestBudget || totalBytes >= byteBudget) {
    throw new Error('Load-test budget or stop condition reached')
  }
  totalRequests++
  inFlight++
  peakInFlight = Math.max(peakInFlight, inFlight)
  const start = performance.now()
  let status = 0
  let text = ''
  let error = null
  try {
    const response = await fetch(fixture.url, {
      ...fixture.options,
      signal: AbortSignal.timeout(15000),
    })
    status = response.status
    text = await response.text()
    totalBytes += Buffer.byteLength(text)
    if (!response.ok) {
      error = `HTTP ${status}`
      if (loggedFailures++ < 3) console.error(JSON.stringify({
        failedRequest: fixture.name, status,
        server: response.headers.get('server'),
        mitigation: response.headers.get('x-vercel-mitigated'),
        retryAfter: response.headers.get('retry-after'),
        responseType: response.headers.get('content-type'),
        responseExcerpt: text.slice(0, 350),
      }))
    }
    else if (fixture.check && !fixture.check(text, response)) error = 'Unexpected response content'
    if (status === 403 || status === 429 || status >= 500) circuitOpen = true
  } catch (cause) {
    error = cause.name === 'TimeoutError' ? 'Request timed out' : 'Network request failed'
  } finally {
    inFlight--
  }
  return { status, text, error, ms: performance.now() - start, name: fixture.name }
}

async function runStage(name, users, fixtures, rounds = 3) {
  const samples = []
  const journeys = []
  peakInFlight = 0
  eventLoop.reset()
  const start = performance.now()
  for (let round = 0; round < rounds; round++) {
    await Promise.all(Array.from({ length: users }, async () => {
      const journeyStart = performance.now()
      for (const fixture of fixtures) {
        if (circuitOpen) break
        const result = await request(fixture)
        samples.push({ name: result.name, ms: result.ms, status: result.status, error: result.error })
      }
      journeys.push(performance.now() - journeyStart)
    }))
    if (circuitOpen) break
    if (round + 1 < rounds) await delay(1500)
  }
  const seconds = (performance.now() - start) / 1000
  const failures = samples.filter((sample) => sample.error)
  const result = {
    name, virtualClients: users, configuredRounds: rounds, requests: samples.length,
    peakConcurrentRequests: peakInFlight,
    seconds: Number(seconds.toFixed(2)),
    requestsPerSecond: Number((samples.length / seconds).toFixed(2)),
    failures: failures.length,
    errorRatePercent: Number((100 * failures.length / Math.max(samples.length, 1)).toFixed(2)),
    requestMedianMs: percentile(samples.map((sample) => sample.ms), 0.5),
    requestP95Ms: percentile(samples.map((sample) => sample.ms), 0.95),
    requestMaxMs: percentile(samples.map((sample) => sample.ms), 1),
    journeyP95Ms: percentile(journeys, 0.95),
    generatorEventLoopP95Ms: Math.round(eventLoop.percentile(95) / 1e6),
    statuses: Object.fromEntries([...new Set(samples.map((sample) => sample.status))]
      .map((status) => [status, samples.filter((sample) => sample.status === status).length])),
    errors: [...new Set(failures.map((sample) => sample.error))],
    passed: !circuitOpen && samples.length === users * fixtures.length * rounds
      && failures.length / Math.max(samples.length, 1) < 0.01
      && percentile(samples.map((sample) => sample.ms), 0.95) < 2000,
  }
  console.log(JSON.stringify(result))
  return result
}

const report = {
  startedAt: new Date().toISOString(),
  generator: { node: process.version, location: 'one client machine and IP', model: 'three synchronized request bursts per stage' },
  thresholds: { requestP95Ms: 2000, errorRatePercentLessThan: 1 },
  limits: { requestBudget, decodedByteBudget: byteBudget },
  publicSites: [],
  database: { tested: false, reason: 'A student test account is required' },
  orderSubmission: { tested: false, reason: 'Requires staging and disposable order/payment fixtures' },
  loginConcurrency: { tested: false, reason: 'A shared account and source IP do not represent distinct student logins' },
  limitations: [
    'HTTP requests simulate visitors; hundreds of real browser sessions were not launched.',
    'Short bursts measure immediate response, not sustained peak-hour capacity.',
    'Frontend results do not establish authenticated student or order-submission capacity.',
  ],
}

try {
  if (!backendOnly) {
    for (const site of sites) {
      const page = { name: 'page', url: site, check: (body) => body.includes('id="root"') && body.includes('Campus Food Delivery') }
      const preflight = await request(page)
      if (preflight.error) throw new Error(`${site}: ${preflight.error}`)
      const assetUrls = [...new Set([...preflight.text.matchAll(/(?:src|href)="([^"]+)"/g)]
        .map((match) => new URL(match[1], site).href)
        .filter((url) => new URL(url).origin === new URL(site).origin))]
      const assets = assetUrls.map((url) => ({ name: new URL(url).pathname, url }))
      for (const asset of assets) {
        const response = await request(asset)
        if (response.error) throw new Error(`Static asset: ${response.error}`)
        if (asset.url.endsWith('.js')) {
          const authChunk = response.text.match(/\bAuth-[\w-]+\.js\b/)
          if (authChunk) {
            const url = new URL(authChunk[0], asset.url).href
            if (!assets.some((entry) => entry.url === url)) assets.push({ name: 'authentication screen JavaScript', url })
          }
        }
      }
      const siteResult = { url: site, assetsChecked: assets.length, stages: [] }
      report.publicSites.push(siteResult)
      if (!preflightOnly) {
        if (site === availableSites[0]) {
          const cold = await runStage('Vercel: uncached app assets', 100, assets, 1)
          siteResult.stages.push(cold)
          if (!cold.passed) break
        }
        for (const users of stages) {
          const result = await runStage(`${new URL(site).hostname}: public page`, users, [page])
          siteResult.stages.push(result)
          if (!result.passed) { process.exitCode = 1; break }
          await delay(2000)
        }
      }
      if (circuitOpen) break
    }
  }

  const source = await readFile(new URL('frontend/src/supabase.js', root), 'utf8')
  const supabaseUrl = process.env.VITE_SUPABASE_URL || source.match(/DEFAULT_SUPABASE_URL = '([^']+)'/)?.[1]
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || source.match(/DEFAULT_SUPABASE_ANON_KEY\s*=\s*'([^']+)'/)?.[1]
  if (!supabaseUrl || !key) throw new Error('Supabase connection configuration was not found')
  const health = await request({ name: 'Supabase Auth health', url: `${supabaseUrl}/auth/v1/health`, options: { headers: { apikey: key } } })
  report.database.authHealth = { status: health.status, ms: Math.round(health.ms), error: health.error }

  const email = process.env.SUPABASE_TEST_EMAIL || (process.env.SUPABASE_TEST_ID && `${process.env.SUPABASE_TEST_ID}@anu-mosquito.com`)
  const password = process.env.SUPABASE_TEST_PASSWORD
  if (email && password && !circuitOpen) {
    const login = await request({ name: 'test-account login', url: `${supabaseUrl}/auth/v1/token?grant_type=password`, options: {
      method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
    } })
    if (login.error) throw new Error(`Test-account login: ${login.error}`)
    const session = JSON.parse(login.text)
    const headers = { apikey: key, Authorization: `Bearer ${session.access_token}` }
    const fixture = (name, table, params) => ({ name, url: `${supabaseUrl}/rest/v1/${table}?${new URLSearchParams(params)}`, options: { headers }, check: (body) => Array.isArray(JSON.parse(body)) })
    const profile = fixture('profile', 'profiles', { select: 'id,full_name,university_id,driver_id,phone,role,admin_id', id: `eq.${session.user.id}` })
    const profileResponse = await request(profile)
    if (profileResponse.error) throw new Error(`Profile preflight: ${profileResponse.error}`)
    const accountRole = JSON.parse(profileResponse.text)[0]?.role
    if (!['student', 'admin'].includes(accountRole)) throw new Error('Use an existing student or admin test account with a valid profile')
    const restaurants = fixture('restaurants', 'restaurants', { select: 'id,name,code,description,image_url,is_active', order: 'name.asc' })
    const restaurantResponse = await request(restaurants)
    if (restaurantResponse.error) throw new Error(`Restaurant preflight: ${restaurantResponse.error}`)
    const restaurant = JSON.parse(restaurantResponse.text).find((entry) => entry.is_active !== false)
    const fixtures = [profile, restaurants]
    if (restaurant) fixtures.push(
      fixture('menu categories', 'food_categories', { select: 'id,restaurant_id,name,sort_order,is_active', restaurant_id: `eq.${restaurant.id}`, order: 'sort_order.asc,name.asc' }),
      fixture('menu items', 'food_items', { select: 'id,restaurant_id,category_id,name,description,image_url,selling_price,cost_price,is_available', restaurant_id: `eq.${restaurant.id}`, order: 'name.asc' }),
    )
    fixtures.push(
      fixture('checkout batches', 'delivery_batches', { select: '*', is_active: 'eq.true', order: 'delivery_date.asc,batch_number.asc' }),
      fixture('checkout delivery fee', 'delivery_settings', { select: '*', order: 'updated_at.desc', limit: '1' }),
      fixture('payment methods', 'payment_methods', { select: '*', is_active: 'eq.true', order: 'created_at.asc' }),
      fixture('student orders', 'orders', { select: 'id,order_number,restaurant_id,batch_id,food_subtotal,delivery_fee,total_amount,payment_status,status,payment_screenshot_path,created_at,restaurants(name),delivery_batches(batch_number,delivery_time),order_items(id,food_name_snapshot,quantity,unit_selling_price,line_total)', student_id: `eq.${session.user.id}`, order: 'created_at.desc' }),
    )
    report.database = { tested: true, authHealth: report.database.authHealth, accountRole, studentPermissionsTested: accountRole === 'student', oneAccountSharedAcrossClients: true, menuAvailable: Boolean(restaurant), preflightRowCounts: {}, stages: [] }
    if (accountRole !== 'student') report.limitations.push('The supplied account is an admin; student Row Level Security performance is untested.')
    for (const entry of fixtures) {
      const response = await request(entry)
      if (response.error) throw new Error(`Database preflight ${entry.name}: ${response.error}`)
      report.database.preflightRowCounts[entry.name] = JSON.parse(response.text).length
    }
    for (const users of stages) {
      const result = await runStage('Supabase: student browsing and checkout reads', users, fixtures, 1)
      report.database.stages.push(result)
      if (!result.passed) break
      await delay(2000)
    }
  } else if (backendOnly) throw new Error('Set SUPABASE_TEST_ID or SUPABASE_TEST_EMAIL, and SUPABASE_TEST_PASSWORD')
} catch (cause) {
  report.error = cause.message
  console.error(cause.message)
  process.exitCode = 1
} finally {
  eventLoop.disable()
  report.finishedAt = new Date().toISOString()
  report.totalRequests = totalRequests
  report.decodedMegabytes = Number((totalBytes / 1024 / 1024).toFixed(2))
  report.stoppedOnServerErrorOrRateLimit = circuitOpen
  await mkdir(outputDirectory, { recursive: true })
  const filename = `${report.startedAt.replace(/[:.]/g, '-')}${backendOnly ? '-backend' : ''}.json`
  const path = new URL(filename, outputDirectory)
  await writeFile(path, JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify({ report: fileURLToPath(path), totalRequests, decodedMegabytes: report.decodedMegabytes, databaseTested: report.database.tested, error: report.error || null }))
}
