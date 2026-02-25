import { Router } from '@vaadin/router'
import './simpleweb/boundary/navigation/ResponsiveMenu'
import './simpleweb/boundary/pages/Calculator'
import './simpleweb/boundary/pages/Commander'
import './simpleweb/boundary/pages/CommandParameter'
import './simpleweb/boundary/pages/DartsCounter'
import './simpleweb/boundary/pages/DocManager'
import './simpleweb/boundary/pages/Faq'
import './simpleweb/boundary/pages/GarbageFinder'
import './simpleweb/boundary/pages/JSONFormatter'
import './simpleweb/boundary/pages/MoneyFinder'
import './simpleweb/boundary/pages/SystemMonitor'
import './simpleweb/boundary/pages/restic/ResticUI'
import './simpleweb/boundary/pages/taskboard/TaskBoard'

const LAST_APP_KEY = 'nh-toolbox-last-app'

// Valid app paths (excluding fallback)
const validPaths = [
  '/faq',
  '/backend',
  '/commander',
  '/moneyfinder',
  '/garbagefinder',
  '/restic',
  '/taskboard',
  '/docmanager',
  '/tools/jsonformatter',
  '/tools/calculator',
  '/tools/darts-counter',
  '/tools/system-monitor',
]

const outlet = document.querySelector('.view')
outlet?.classList.add('view')
export const router = new Router(outlet)

router.setRoutes([
  { path: '/', component: 'simple-commander' },
  { path: '/faq', component: 'nh-faq' },
  { path: '/backend', component: 'command-params' },
  { path: '/commander', component: 'simple-commander' },
  { path: '/moneyfinder', component: 'nh-moneyfinder' },
  { path: '/garbagefinder', component: 'nh-garbagefinder' },
  { path: '/restic', component: 'nh-restic' },
  { path: '/taskboard', component: 'nh-taskboard' },
  { path: '/docmanager', component: 'nh-docmanager' },
  { path: '/tools/jsonformatter', component: 'nh-json-formatter' },
  { path: '/tools/calculator', component: 'nh-calculator' },
  { path: '/tools/darts-counter', component: 'nh-darts-counter' },
  { path: '/tools/system-monitor', component: 'nh-system-monitor' },
  { path: '(.*)', component: 'simple-commander' }, // fallback
])

// Save last used app on route change
window.addEventListener('vaadin-router-location-changed', (event: any) => {
  const path = event.detail?.location?.pathname
  if (path && validPaths.includes(path)) {
    localStorage.setItem(LAST_APP_KEY, path)
  }
})

// Restore last used app on startup
const lastApp = localStorage.getItem(LAST_APP_KEY)
if (lastApp && validPaths.includes(lastApp)) {
  // Small delay to ensure router is ready
  setTimeout(() => Router.go(lastApp), 0)
}

let basePath = ''

function go2Path(pathName: any) {
  Router.go(basePath + pathName)
}

export { basePath, go2Path }
