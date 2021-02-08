let color = '#f7b586'
let username = 'TALOS-IO'
let avatar = 'https://i.imgur.com/3HQZ0ol.png'
let webhooks = ['https://discord.com/api/webhooks/803602456101126194/YZCRPd6RNvWVxWRNv6_pG9DVcgH6nnYUZlPQTDO_AicKSt2m2rvcSxBgPTGAOFT1Pvkp']

/**
 * set webhook color
 *
 * @param code
 */
function setColor (code) {
  color = code.trim()
}

/**
 * set webhook username
 *
 * @param username
 */
function setUsername (name) {
  username = name.trim()
}

/**
 * set webhook avatar
 *
 * @param avatar
 */
function setAvatar (img) {
  avatar = img.trim()
}

/**
 * add webhook
 *
 * @param webhook
 */
function addWebhook (webhook) {
  webhooks.push(webhook.trim())
}

/**
 * remove webhook
 *
 * @param webhook
 */
function removeWebhook (webhook) {
  webhooks = webhooks.slice().filter((val) => val.trim() !== webhook.trim())
}

/**
 * clear all webhooks
 */
function clearWebhooks () {
  webhooks = []
}

/**
 * return webhook color
 *
 * @return string
 */
function getColor () {
  return color
}

/**
 * return webhook username
 *
 * @return string
 */
function getUsername () {
  return username
}

/**
 * return webhook avatar
 *
 * @return string
 */
function getAvatar () {
  return avatar
}

/**
 * return all webhooks
 *
 * @return string
 */
function getWebhooks () {
  return webhooks
}

module.exports = {
  setColor,
  setUsername,
  setAvatar,
  addWebhook,
  removeWebhook,
  clearWebhooks,
  getColor,
  getUsername,
  getAvatar,
  getWebhooks
}
