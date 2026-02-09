import { Router } from '@vaadin/router'
import './simpleweb/boundary/navigation/ResponsiveMenu'
import './simpleweb/boundary/pages/Commander'
import './simpleweb/boundary/pages/CommandParameter'
import './simpleweb/boundary/pages/Faq'
import './simpleweb/boundary/pages/MoneyFinder'
import './simpleweb/boundary/pages/GarbageFinder'
import './simpleweb/boundary/pages/restic/ResticUI'

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
  { path: '(.*)', component: 'simple-commander' }, // fallback
])

let basePath = ''

function go2Path(pathName: any) {
  Router.go(basePath + pathName)
}

export { basePath, go2Path }
