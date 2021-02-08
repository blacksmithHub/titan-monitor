const { config } = require('dotenv')

const Discord = require('discord.js')
const moment = require('moment')
const _ = require('lodash')
const api = require('./api')
const discord = require('./discord')

config({ path: `${__dirname}/.env` })

let hooks = []
let pool = ['45.91.115.146:63146:run:K35f2SvF']
let loop = null
let status = 'idle'
let monitorInterval = 60000
let webhookInterval = 5000

/**
 * Start backend monitor
 */
function startMonitor () {
  const currentDate = moment().format('YYYY-MM-DD')
  const validate = hooks.find((val) => moment(val.created_at).format('YYYY-MM-DD') !== currentDate || moment(val.updated_at).format('YYYY-MM-DD') !== currentDate)
  // clear hooks if not to date
  if (validate) hooks = []

  loop = setTimeout(async () => {
    // exit if idle
    if (status === 'idle') {
      clearTimeout(loop)
      return false
    }

    try {
      const response = await getUpdatedProducts()

      if (response && !response.status) {
        const products = response.items

        const footwearSizes = products.slice().filter((val) => val.custom_attributes.find((el) => el.attribute_code === 'm_footwear_size'))
        const footwear = products.slice().filter((val) => !val.custom_attributes.find((el) => el.attribute_code === 'm_footwear_size'))

        let collect = []
        // collect all main sku
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
          // fetch all available sizes per sku
          const filters = collect.slice().map(element => {
            return {
              field: 'sku',
              value: `%${element}%`,
              condition_type: 'like'
            }
          })

          const chunks = new Array(Math.ceil(filters.length / 15))
            .fill()
            .map(_ => filters.splice(0, 15))

          const results = await getAvailableSizes(chunks)

          const main = results.filter((el) => collect.includes(el.sku))
          const sub = results.filter((el) => !collect.includes(el.sku))

          sendWebhook(main, sub)
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
  }, monitorInterval)
}

/**
 * Get updated products
 *
 * @return object
 */
async function getUpdatedProducts () {
  let data = null

  while (!data) {
    console.log('Monitoring...')

    await new Promise(resolve => setTimeout(resolve, 1000))

    const currentDate = moment('00:00:00', 'HH:mm').format('YYYY-MM-DD HH:mm:ss')

    const params = {
      payload: {
        searchCriteria: {
          filterGroups: [
            {
              filters: [
                {
                  field: 'updated_at',
                  value: currentDate,
                  condition_type: 'gteq'
                },
                {
                  field: 'created_at',
                  value: currentDate,
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
          ],
          pageSize: 10000
        }
      }
    }

    if (pool.length) {
      const proxy = pool[Math.floor(Math.random() * pool.length)]
      params.proxy = proxy
    }

    const response = await api.search(params)

    if (response && !response.status) {
      data = response
    } else {
      console.log(response)
    }
  }

  return data
}

/**
 * Chunk all sizes
 *
 * @param chunks
 * @return array
 */
async function getAvailableSizes (chunks) {
  let data = []

  for (let index = 0; index < chunks.length; index++) {
    const response = await fetchSizes(chunks[index])

    if (response && !response.status) {
      data = data.concat(response.items)
    } else {
      console.log(response)
      continue
    }
  }

  return data
}

/**
 * Fetch all sizes
 *
 * @param chunk
 * @return object
 */
async function fetchSizes (chunk) {
  let data = null

  while (!data) {
    console.log('Fetching...')

    await new Promise(resolve => setTimeout(resolve, 1000))

    const params = {
      payload: {
        searchCriteria: {
          filterGroups: [
            {
              filters: chunk
            }
          ],
          pageSize: 10000
        }
      }
    }

    if (pool.length) {
      const proxy = pool[Math.floor(Math.random() * pool.length)]
      params.proxy = proxy
    }

    const response = await api.search(params)

    if (response && !response.status) {
      data = response
    } else {
      console.log(response)
    }
  }

  return data
}

/**
 * Send webhook to discord
 *
 * @param footwear
 * @param footwearSizes
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
        let imgurlSize = val.custom_attributes.find((value) => value.attribute_code === 'image')

        imgurlSize = (imgurlSize) ? imgurlSize.value : ''

        item.price = val.price || item.price
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
      console.log(results[index].sku, results[index].name)

      if (index) await new Promise(resolve => setTimeout(resolve, webhookInterval))

      for (let i = 0; i < discord.getWebhooks().length; i++) {
        const url = discord.getWebhooks()[i].split('/')
        const webhookClient = new Discord.WebhookClient(url[5], url[6])

        const embed = new Discord.MessageEmbed()
          .setColor(discord.getColor())
          .setTimestamp()
          .setFooter(discord.getUsername(), discord.getAvatar())

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
          username: discord.getUsername(),
          avatarURL: discord.getAvatar(),
          embeds: [embed]
        })
      }
    }
  }

  clearTimeout(loop)
  startMonitor()
}

/**
 * Add new proxy
 *
 * @param proxy
 */
function addProxy (proxy) {
  pool.push(proxy.trim())
}

/**
 * Remove proxy
 *
 * @param proxy
 */
function removeProxy (proxy) {
  pool = pool.slice().filter((val) => val.trim() !== proxy.trim())
}

/**
 * Clear proxy pool
 */
function clearProxies () {
  pool = []
}

/**
 * Restart monitor
 */
function restartMonitor () {
  status = 'running'
  clearTimeout(loop)
  startMonitor()
}

/**
 * Stop monitor
 */
function stopMonitor () {
  status = 'idle'
  clearTimeout(loop)
}

/**
 * Set monitor interval
 *
 * @param ms
 */
function setMonitorInterval (ms) {
  monitorInterval = ms

  if (status === 'running') restartMonitor()
}

/**
 * Return proxy pool
 *
 * @return array
 */
function getPool () {
  return pool
}

/**
 * Return monitor interval
 *
 * @return integer
 */
function getMonitorInterval () {
  return monitorInterval
}

/**
 * Return webhook interval
 *
 * @return integer
 */
function getWebhookInterval () {
  return webhookInterval
}

/**
 * Set webhook interval
 *
 * @param ms
 */
function setWebhookInterval (ms) {
  webhookInterval = ms
}

/**
 * Return status
 *
 * @return string
 */
function getStatus () {
  return status
}

module.exports = {
  // actions
  startMonitor,
  restartMonitor,
  stopMonitor,
  sendWebhook,
  // proxy handlers
  addProxy,
  removeProxy,
  clearProxies,
  // monitor handlers
  setMonitorInterval,
  setWebhookInterval,
  // request
  getStatus,
  getMonitorInterval,
  getWebhookInterval,
  getPool,
  getAvailableSizes,
  getUpdatedProducts
}
