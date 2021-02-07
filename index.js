const { config } = require('dotenv')

const Discord = require('discord.js')
const monitor = require('./monitor')

config({ path: `${__dirname}/.env` })

const client = new Discord.Client()

const prefix = '!T'
const commands = ['info', 'help', 'start', 'stop', 'restart', 'proxy', 'delay']
const roles = ['764438322276728845', '764439684470145036', '764436581128994826', '807634790425034823', '787312447751979009']

const commandList = new Discord.MessageEmbed()
  .setColor('#f7b586')
  .setTitle('Talos Bot Help Commands:')
  .addFields(
    { name: 'Monitor Information', value: '`!Tinfo` \nTo show all monitor information', inline: true },
    { name: 'Command list', value: '`!Thelp` \nTo show all available commands', inline: true },
    { name: 'Start Monitor', value: '`!Tstart` \nTo start monitor', inline: true },
    { name: 'Stop Monitor', value: '`!Tstop` \nTo stop monitor', inline: true },
    { name: 'Restart Monitor', value: '`!Trestart` \nAllows you to restart the monitor', inline: true },
    { name: 'Add New Proxy', value: '`!Tproxy -add <proxy>` \nAllows you to add new proxy to monitor', inline: true },
    { name: 'Remove Proxy', value: '`!Tproxy -rm <proxy>` \nAllows you to remove proxy from the list', inline: true },
    { name: 'Clear Proxies', value: '`!Tproxy -clear` \nAllows you to clear all proxies from the list', inline: true },
    { name: 'Set Delay', value: '`!Tdelay <ms>` \nTo set monitor delay', inline: true }
  )

client.once('ready', () => {
  console.log('Talos Bot is now online!')
})

client.on('message', message => {
  if (!message.content.startsWith(prefix) || message.author.bot) return

  if (!message.member.roles.cache.find((val) => roles.includes(val.id))) {
    message.channel.send('You must have the permission to use this command!')
    return
  }

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
            { name: 'Delay', value: monitor.getDelay(), inline: true }
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

    case 'delay':
      {
        const ms = message.content.slice((`${prefix}${command}`).length + 1).split(/ +/).shift().toLowerCase()

        if (parseInt(ms)) {
          monitor.setDelay(parseInt(ms))
          bot.send('Delay has been set successfully!')
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
              let proxies = message.content.slice((`${prefix}${command} ${key}`).length + 1).split(/ +/).shift().toLowerCase()

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
  }
})

client.login(process.env.DISCORD_TOKEN)
