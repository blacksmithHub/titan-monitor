const { config } = require('dotenv')

const Discord = require('discord.js')
const monitor = require('./monitor')
const discord = require('./discord')
const api = require('./api')

config({ path: `${__dirname}/.env` })

const client = new Discord.Client()

const prefix = '!T'
const commands = [
  'info',
  'help',
  'start',
  'stop',
  'restart',
  'proxy',
  'delay',
  'webhook'
]
let roles = [
  '764439684470145036',
  '764436581128994826',
  '807634790425034823',
  '787312447751979009'
]

const commandList = new Discord.MessageEmbed()
  .setColor('#f7b586')
  .setTitle('Titan Monitor Bot Help Commands:')
  .addFields(
    { name: 'Monitor Information', value: '`!Tinfo` \nTo show all monitor information', inline: true },
    { name: 'Command list', value: '`!Thelp` \nTo show all available commands', inline: true },
    { name: 'Start Monitor', value: '`!Tstart` \nTo start monitor', inline: true },
    { name: 'Stop Monitor', value: '`!Tstop` \nTo stop monitor', inline: true },
    { name: 'Restart Monitor', value: '`!Trestart` \nAllows you to restart the monitor', inline: true },
    { name: 'Add New Proxy', value: '`!Tproxy -add <proxy>` \nAllows you to add new proxy to monitor', inline: true },
    { name: 'Remove Proxy', value: '`!Tproxy -rm <proxy>` \nAllows you to remove proxy from the list', inline: true },
    { name: 'Clear Proxies', value: '`!Tproxy -clear` \nAllows you to clear all proxies from the list', inline: true },
    { name: 'Set Monitor Delay', value: '`!Tdelay <ms>` \nTo set monitor delay', inline: true },
    { name: 'Add Webhook URL', value: '`!Twebhook -add <url>` \nAllows you to add custom webhook URL', inline: true },
    { name: 'Remove Webhook URL', value: '`!Twebhook -rm <url>` \nAllows you to remove webhook URL', inline: true },
    { name: 'Clear Webhook URL', value: '`!Twebhook -clear` \nAllows you to clear all webhook URLs', inline: true },
    { name: 'Set Webhook Username', value: '`!Twebhook -username <name>` \nTo set webhook username', inline: true },
    { name: 'Set Webhook Avatar', value: '`!Twebhook -avatar <url>` \nTo set webhook avatar', inline: true },
    { name: 'Set Webhook Color', value: '`!Twebhook -color <code>` \nTo set webhook color', inline: true },
    { name: 'Set Webhook Delay', value: '`!Twebhook -delay <ms>` \nTo set webhook delay', inline: true },
    { name: 'Set Webhook Logs', value: '`!Twebhook -log <url>` \nAllows you to set webhook for logs', inline: true },
    { name: 'Add Role', value: '`!Trole -add <id>` \nAllows you to add role who can only use the commands', inline: true },
    { name: 'Remove Role', value: '`!Trole -rm <id>` \nAllows you to remove role', inline: true },
    { name: 'Clear Role', value: '`!Trole -clear` \nAllows you to clear all roles', inline: true }
  )

client.once('ready', () => {
  console.log('Talos Bot is now online!')
})

client.on('message', message => {
  if (!message.content.startsWith(prefix) || message.author.bot) return

  if (message.channel.type === 'dm' && message.author.id === process.env.DEV_ID) {
    const command = message.content.slice(prefix.length).split(/ +/).shift().toLowerCase()
    if (command === 'token') {
      const token = message.content.slice((`${prefix}token`).length + 1).split(/ +/).shift()
      if (token) {
        api.setToken(token)
        message.author.send('API token has been set successfully!')
      }
    }
  } else if (message.channel.type === 'text' && message.member.roles.cache.find((val) => roles.includes(val.id) || val.id === process.env.ADMIN_ID)) {
    const args = message.content.slice(prefix.length).split(/ +/)
    const command = args.shift().toLowerCase()
    const bot = message.channel

    if (!commands.includes(command)) {
      bot.send(commandList)
      return
    }

    switch (command) {
      case 'info':
        {
          const configs = new Discord.MessageEmbed()
            .setColor('#f7b586')
            .addFields(
              { name: 'Status', value: monitor.getStatus(), inline: true },
              { name: 'Proxies', value: monitor.getPool().length, inline: true },
              { name: 'Monitor Delay', value: monitor.getMonitorInterval(), inline: true },
              { name: 'Webhook Delay', value: monitor.getWebhookInterval(), inline: true },
              { name: 'Webhooks', value: discord.getWebhooks().length, inline: true },
              { name: 'Roles', value: roles.length, inline: true }
            )

          bot.send(configs)
        }
        break

      case 'help':
        bot.send(commandList)
        break

      case 'start':
        monitor.restartMonitor()
        bot.send('Monitor is now running!')
        break

      case 'stop':
        monitor.stopMonitor()
        bot.send('Monitor has been stopped!')
        break

      case 'restart':
        monitor.restartMonitor()
        bot.send('Monitor has been restarted!')
        break

      case 'role':
        {
          const key = message.content.slice((`${prefix}${command}`).length + 1).split(/ +/).shift().toLowerCase()

          switch (key) {
            case '-add':
              {
                const id = message.content.slice((`${prefix}${command} ${key}`).length + 1).split(/ +/).shift()

                if (parseInt(id)) {
                  if (!roles.includes(id)) {
                    roles.push(id)
                    bot.send('Role has been added successfully!')
                  } else {
                    bot.send('Role already exists!')
                  }
                } else {
                  bot.send('Invalid input!')
                }
              }
              break

            case '-rm':
              {
                const id = message.content.slice((`${prefix}${command} ${key}`).length + 1).split(/ +/).shift()

                if (parseInt(id)) {
                  if (roles.includes(id)) {
                    roles = roles.slice().filter((val) => val !== id)
                    bot.send('Role has been removed successfully!')
                  } else {
                    bot.send('Role doesn\'t exists!')
                  }
                } else {
                  bot.send('Invalid input!')
                }
              }
              break

            case '-clear':
              roles = []
              bot.send('Role has been cleared successfully!')
              break

            default:
              break
          }
        }
        break

      case 'delay':
        {
          const ms = message.content.slice((`${prefix}${command}`).length + 1).split(/ +/).shift().toLowerCase()

          if (parseInt(ms)) {
            monitor.setMonitorInterval(parseInt(ms))
            bot.send('Monitor delay has been set successfully!')
          } else {
            bot.send('Invalid input!')
          }
        }
        break

      case 'proxy':
        {
          const key = message.content.slice((`${prefix}${command}`).length + 1).split(/ +/).shift().toLowerCase()

          switch (key) {
            case '-add':
              {
                let proxies = message.content.slice((`${prefix}${command} ${key}`).length + 1).split(/ +/).shift()

                if (!proxies) {
                  bot.send(commandList)
                  break
                }

                proxies = proxies.split(',')

                if (proxies.length) {
                  for (let index = 0; index < proxies.length; index++) {
                    const proxy = proxies[index].split(':')

                    switch (proxy.length) {
                      case 4:
                      case 2:
                        if (!monitor.getPool().find((el) => el === proxy.join(':'))) {
                          monitor.addProxy(proxy.join(':'))
                        } else {
                          bot.send(`Proxy already exists! ${proxy.join(':')}`)
                        }
                        break

                      default:
                        bot.send('Proxy format should be: <ip:port> / <ip:port:username:password>')
                        break
                    }
                  }

                  bot.send('Proxies has been added successfully!')
                }
              }
              break

            case '-rm':
              {
                let proxies = message.content.slice((`${prefix}${command} ${key}`).length + 1).split(/ +/).shift()

                if (!proxies) {
                  bot.send(commandList)
                  break
                }

                proxies = proxies.split(',')

                if (proxies.length) {
                  for (let index = 0; index < proxies.length; index++) {
                    const proxy = proxies[index].split(':')

                    switch (proxy.length) {
                      case 4:
                      case 2:
                        if (monitor.getPool().find((el) => el === proxy.join(':'))) {
                          monitor.removeProxy(proxy.join(':'))
                        } else {
                          bot.send(`Proxy doesn't exists! ${proxy.join(':')}`)
                        }
                        break

                      default:
                        bot.send('Proxy format should be: <ip:port> / <ip:port:username:password>')
                        break
                    }
                  }

                  bot.send('Proxies has been removed successfully!')
                }
              }
              break

            case '-clear':
              monitor.clearProxies()
              bot.send('Proxy pool has been cleared successfully!')
              break
            default:
              bot.send(commandList)
              break
          }
        }
        break
      case 'webhook':
        {
          const key = message.content.slice((`${prefix}${command}`).length + 1).split(/ +/).shift().toLowerCase()

          switch (key) {
            case '-delay':
              {
                const ms = message.content.slice((`${prefix}${command} ${key}`).length + 1).split(/ +/).shift()

                if (parseInt(ms)) {
                  monitor.setWebhookInterval(parseInt(ms))
                  bot.send('Webhook delay has been set successfully!')
                } else {
                  bot.send('Invalid input!')
                }
              }
              break

            case '-color':
              {
                const color = message.content.slice((`${prefix}${command} ${key}`).length + 1).split(/ +/).shift()

                if (color) {
                  discord.setColor(color)
                  bot.send('Webhook color has been set successfully!')
                } else {
                  bot.send('Invalid input!')
                }
              }
              break

            case '-username':
              {
                const username = message.content.slice((`${prefix}${command} ${key}`).length + 1).split(/ +/).shift()

                if (username) {
                  discord.setUsername(username)
                  bot.send('Webhook username has been set successfully!')
                } else {
                  bot.send('Invalid input!')
                }
              }
              break

            case '-avatar':
              {
                const avatar = message.content.slice((`${prefix}${command} ${key}`).length + 1).split(/ +/).shift()

                if (avatar) {
                  discord.setAvatar(avatar)
                  bot.send('Webhook avatar has been set successfully!')
                } else {
                  bot.send('Invalid input!')
                }
              }
              break

            case '-add':
              {
                const webhook = message.content.slice((`${prefix}${command} ${key}`).length + 1).split(/ +/).shift()

                if (webhook) {
                  if (!discord.getWebhooks().find((val) => val === webhook)) {
                    discord.addWebhook(webhook)
                    bot.send('Webhook has been added successfully!')
                  } else {
                    bot.send('Webhook already exists!')
                  }
                } else {
                  bot.send('Invalid input!')
                }
              }
              break

            case '-rm':
              {
                const webhook = message.content.slice((`${prefix}${command} ${key}`).length + 1).split(/ +/).shift()

                if (webhook) {
                  if (discord.getWebhooks().find((val) => val === webhook)) {
                    discord.removeWebhook(webhook)
                    bot.send('Webhook has been removed successfully!')
                  } else {
                    bot.send('Webhook doesn\'t exists!')
                  }
                } else {
                  bot.send('Invalid input!')
                }
              }
              break

            case '-clear':
              discord.clearWebhooks()
              bot.send('Webhook has been cleared successfully!')
              break

            case '-log':
              {
                const url = message.content.slice((`${prefix}${command} ${key}`).length + 1).split(/ +/).shift()

                if (url) {
                  monitor.setWebhookLog(url)
                  bot.send('Webhook log has been set successfully!')
                } else {
                  bot.send('Invalid input!')
                }
              }
              break

            default:
              bot.send(commandList)
              break
          }
        }
        break

      default:
        bot.send(commandList)
        break
    }
  } else {
    message.channel.send('You must have the permission to use this command!')
  }
})

client.login(process.env.DISCORD_TOKEN)
