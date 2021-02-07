const { config } = require('dotenv')

const Discord = require('discord.js')
const UserAgent = require('user-agents')
const qs = require('qs')
const moment = require('moment')
const _ = require('lodash')

config({ path: `${__dirname}/.env` })

let hooks = []
let loop = null
let delay = 60000
let status = 'idle'
let pool = []

/**
 * Start backend monitor
 *
 */
function startMonitor () {
  const validate = hooks.find((val) => moment(val.created_at).format('YYYY-MM-DD') !== moment().format('YYYY-MM-DD') || moment(val.updated_at).format('YYYY-MM-DD') !== moment().format('YYYY-MM-DD'))

  if (validate) hooks = []

  loop = setTimeout(async () => {
    if (status === 'idle') {
      clearTimeout(loop)
      return false
    }

    try {
      console.log('Monitoring...')

      let request = require('request')

      if (pool.length) {
        let proxy = pool[Math.floor(Math.random() * pool.length)]

        console.log(proxy)

        proxy = proxy.split(':')

        // username:password:ip:port
        request = request.defaults({ proxy: `http://${proxy[2]}:${proxy[3]}@${proxy[0]}:${proxy[1]}` })
      }

      const payload = {
        searchCriteria: {
          filterGroups: [
            {
              filters: [
                {
                  field: 'updated_at',
                  value: moment('00:00:00', 'HH:mm').format('YYYY-MM-DD HH:mm:ss'),
                  condition_type: 'gteq'
                },
                {
                  field: 'created_at',
                  value: moment('00:00:00', 'HH:mm').format('YYYY-MM-DD HH:mm:ss'),
                  condition_type: 'gteq'
                }
              ]
            },
            {
              filters: [
                {
                  field: 'attribute_set_id',
                  value: '10'
                }
              ]
            }
          ]
        }
      }

      const query = qs.stringify(payload)

      const userAgent = new UserAgent()

      const config = {
        uri: `${process.env.TITAN_DOMAIN}/rest/V2/products?${query}`,
        method: 'get',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.TITAN_TOKEN}`,
          'User-Agent': userAgent.toString()
        }
      }

      await request(config, async (error, response) => {
        try {
          if (error) {
            console.log(error)
            restartMonitor()
          }

          if (response.statusCode === 200) {
            const products = JSON.parse(response.body).items

            const footwearSizes = products.slice().filter((val) => val.custom_attributes.find((el) => el.attribute_code === 'm_footwear_size'))
            const footwear = products.slice().filter((val) => !val.custom_attributes.find((el) => el.attribute_code === 'm_footwear_size'))

            let collect = []

            if (footwearSizes.length) {
              collect = footwearSizes.slice().map(element => {
                const sku = element.sku.split('-')
                sku.pop()

                const check = footwear.slice().find((val) => _.includes(val.sku, sku.join('-')))

                return (!check) ? sku.join('-') : ''
              })

              collect = _.uniq(collect).filter((el) => el)
            }

            collect = collect.concat(footwear.slice().map(element => element.sku))

            if (collect.length) {
              const filters = collect.slice().map(element => {
                return {
                  field: 'sku',
                  value: `%${element}%`,
                  condition_type: 'like'
                }
              })

              const payload = {
                searchCriteria: {
                  filterGroups: [
                    {
                      filters: filters
                    }
                  ]
                }
              }

              const query = qs.stringify(payload)

              const userAgent = new UserAgent()

              const config = {
                uri: `${process.env.TITAN_DOMAIN}/rest/V2/products?${query}`,
                method: 'get',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${process.env.TITAN_TOKEN}`,
                  'User-Agent': userAgent.toString()
                }
              }

              await request(config, async (error, response) => {
                try {
                  if (error) {
                    console.log(error)
                    restartMonitor()
                  }

                  if (response.statusCode === 200) {
                    const products = JSON.parse(response.body).items
                    const main = products.filter((el) => collect.includes(el.sku))
                    const sub = products.filter((el) => !collect.includes(el.sku))
                    sendWebhook(main, sub)
                  } else {
                    console.log(response)
                    restartMonitor()
                  }
                } catch (error) {
                  console.log(error)
                  restartMonitor()
                }
              })
            } else {
              restartMonitor()
            }
          } else {
            console.log(response)
            restartMonitor()
          }
        } catch (error) {
          console.log(error)
          restartMonitor()
        }
      })
    } catch (error) {
      console.log(error)
      restartMonitor()
    }
  }, delay)
}

/**
   * Send webhook to discord
   *
   * @param {*} footwear
   * @param {*} footwearSizes
   */
async function sendWebhook (footwear, footwearSizes) {
  let results = footwear.slice().map(element => {
    const url = element.custom_attributes.find((val) => val.attribute_code === 'url_key')
    const img = element.custom_attributes.find((val) => val.attribute_code === 'image')

    const item = {
      name: element.name,
      sku: element.sku,
      price: element.price,
      page: (url) ? url.value : '',
      img: (img) ? img.value : ''
    }

    const sizes = footwearSizes.slice().filter((val) => _.includes(val.sku, item.sku))

    if (sizes.length) {
      item.sizes = sizes.map((val) => {
        let urlSize = val.custom_attributes.find((value) => value.attribute_code === 'url_key')
        let imgurlSize = val.custom_attributes.find((value) => value.attribute_code === 'image')

        urlSize = (urlSize) ? urlSize.value : ''
        imgurlSize = (imgurlSize) ? imgurlSize.value : ''

        item.price = val.price || item.price
        item.page = urlSize || item.page
        item.img = imgurlSize || item.img

        let sku = val.sku.slice(val.sku.length - 4)

        const format = /[-]/.exec(sku)

        if (format) sku = sku.slice(format.index + 1)

        if (_.includes(sku, 'Z')) sku = sku.slice(sku.indexOf('Z') + 1)

        if (_.includes(sku, 'P')) sku = sku.replace('P', '.')

        return (!val.extension_attributes.out_of_stock) ? sku : ''
      })
        .filter((el) => el)
    } else {
      item.sizes = []
    }

    return item
  })

  results = results.filter(element => {
    const hook = hooks.find((val) => val.sku === element.sku)

    if (!hook) {
      hooks.push(element)
      return true
    } else if (hook && hook.sizes.length !== element.sizes.length) {
      const collect = hooks.slice()

      const index = collect.indexOf(hook)
      collect[index] = element

      hooks = collect
      return true
    } else {
      return false
    }
  })

  if (results.length) {
    for (let index = 0; index < results.length; index++) {
      console.log(results[index].name)

      if (index) await new Promise(resolve => setTimeout(resolve, 5000))

      const url = process.env.WEBHOOK.split('/')
      const webhookClient = new Discord.WebhookClient(url[5], url[6])

      const embed = new Discord.MessageEmbed().setColor('#f7b586')

      if (results[index].img) {
        let slug = results[index].img.split(/ +/)

        if (slug.length > 1) {
          slug = slug.join('%20')
        } else {
          slug = results[index].img
        }

        embed.setThumbnail(`${process.env.TITAN_DOMAIN}/media/catalog/product${slug}`)
      }

      if (results[index].name && results[index].sku) embed.addField(results[index].name, results[index].sku)

      if (results[index].sizes.length) embed.addField('Sizes:', _.uniq(results[index].sizes), true)

      embed.addField('Price', `Php ${results[index].price.toLocaleString()}`, true)

      if (results[index].page) {
        let slug = results[index].page.split(/ +/)

        if (slug.length > 1) {
          slug = slug.join('%20')
        } else {
          slug = results[index].page
        }

        embed.addField('Product Page', `[Link](${process.env.TITAN_DOMAIN}/${slug}.html)`, true)
      }

      await webhookClient.send({
        username: 'TALOS-IO',
        avatarURL: 'https://i.imgur.com/3HQZ0ol.png',
        embeds: [embed]
      })
    }
  }

  clearTimeout(loop)
  startMonitor()
}

/**
 * Add new proxy
 *
 */
function addProxy (proxy) {
  pool.push(proxy.trim())
}

/**
 * Remove proxy
 *
 */
function removeProxy (proxy) {
  pool = pool.slice().filter((val) => val.trim() !== proxy.trim())
}

/**
 * Clear proxy pool
 *
 */
function clearProxies () {
  pool = []
}

/**
 * Restart monitor
 *
 */
function restartMonitor () {
  status = 'running'
  clearTimeout(loop)
  startMonitor()
}

/**
 * Stop monitor
 *
 */
function stopMonitor () {
  status = 'idle'
  clearTimeout(loop)
}

/**
 * Stop monitor
 *
 */
function setDelay (ms) {
  delay = ms

  if (status === 'running') restartMonitor()
}

/**
 * Return pool
 *
 */
function getPool () {
  return pool
}

/**
 * Return delay
 *
 */
function getDelay () {
  return delay
}

/**
 * Return status
 *
 */
function getStatus () {
  return status
}

module.exports = {
  startMonitor,
  restartMonitor,
  stopMonitor,
  addProxy,
  removeProxy,
  clearProxies,
  setDelay,
  getStatus,
  getDelay,
  getPool,
  sendWebhook
}
