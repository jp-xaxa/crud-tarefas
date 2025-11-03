import http from "node:http"

import { json } from "./middlewares/json.js"
import { formDataMiddleware } from "./middlewares/formDataMiddleware.js"
import { routes } from "./routes.js"
import { extractQueryParams } from "./utils/extract-query-params.js"

const server = http.createServer(async (req, res) => {
  const { method, url } = req

  if (req.headers["content-type"]?.includes("application/json")) {
    await json(req, res)
  } else if (req.headers["content-type"]?.includes("multipart/form-data")) {
    await formDataMiddleware(req, res)
  }

  const route = routes.find((route) => {
    return route.method === method && route.path.test(url)
  })

  if (route) {
    const routeParams = req.url.match(route.path)

    const { query, ...params } = routeParams.groups

    req.params = params
    req.query = query ? extractQueryParams(query) : {}

    return route.handler(req, res)
  }

  return res.writeHead(404).end()
})

server.listen(3333)
