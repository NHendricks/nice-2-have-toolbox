import { Router } from '@vaadin/router'
import './simpleweb/boundary/navigation/ResponsiveMenu'
import './simpleweb/boundary/pages/Faq'
import './simpleweb/boundary/pages/Start'

const outlet = document.querySelector('.view')
outlet?.classList.add('view')
export const router = new Router(outlet)

router.setRoutes([
  { path: '/', component: 'simple-start' },
  { path: '/faq', component: 'simple-faq' },
  { path: '(.*)', component: 'simple-start' }, // fallback
])

let basePath = ''

function go2Path(pathName: any) {
  Router.go(basePath + pathName)
}

export { basePath, go2Path }
