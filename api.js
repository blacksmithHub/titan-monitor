const axios = require('axios')
const UserAgent = require('user-agents')
const qs = require('qs')

let token = ''

/**
 * Perform search API
 */
function search (params) {
  const query = qs.stringify(params.payload)
  const userAgent = new UserAgent()

  const config = {
    baseURL: `${process.env.TITAN_DOMAIN}/rest`,
    url: `/V2/products?${query}`,
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'User-Agent': userAgent.toString()
    }
  }

  if (params.proxy) {
    const proxy = params.proxy.split(':')

    config.proxy = {
      host: proxy[0],
      port: proxy[1]
    }

    if (proxy.length > 2) {
      config.proxy.auth = {
        username: proxy[2],
        password: proxy[3]
      }
    }
  }

  return axios(config)
    .then(({ data }) => data)
    .catch(({ response }) => response)
}

/**
 * set api token
 *
 * @param param
 */
function setToken (param) {
  token = param.trim()
}

module.exports = {
  search,
  setToken
}
