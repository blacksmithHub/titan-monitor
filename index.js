const { config } = require('dotenv')

const Discord = require('discord.js')
const monitor = require('./monitor')

config({ path: `${__dirname}/.env` })

const client = new Discord.Client()

const prefix = '!T'
const commands = ['info', 'help', 'start', 'stop', 'restart', 'proxy', 'delay']

const commandList = new Discord.MessageEmbed()
  .setColor('#f7b586')
  .setTitle('Talos Bot Help Commands:')
  .addFields(
    { name: 'Monitor Information', value: '`!info` \nTo show all monitor information', inline: true },
    { name: 'Command list', value: '`!help` \nTo show all available commands', inline: true },
    { name: 'Start Monitor', value: '`!start` \nTo start monitor', inline: true },
    { name: 'Stop Monitor', value: '`!stop` \nTo stop monitor', inline: true },
    { name: 'Restart Monitor', value: '`!restart` \nAllows you to restart the monitor', inline: true },
    { name: 'List All Proxy', value: '`!proxy -list` \nTo show all proxies', inline: true },
    { name: 'Add New Proxy', value: '`!proxy -add <proxy>` \nAllows you to add new proxy to monitor', inline: true },
    { name: 'Remove Proxy', value: '`!proxy -rm <proxy>` \nAllows you to remove proxy from the list', inline: true },
    { name: 'Clear Proxies', value: '`!proxy -clear` \nAllows you to clear all proxies from the list', inline: true },
    { name: 'Set Delay', value: '`!delay <ms>` \nTo set monitor delay', inline: true }
  )

client.once('ready', () => {
  console.log('Talos Bot is now online!')
  monitor.startMonitor()
})

client.on('message', message => {
  if (!message.content.startsWith(prefix) || message.author.bot || message.channel.id !== process.env.CHANNEL) return

  const args = message.content.slice(prefix.length).split(/ +/)
  const command = args.shift().toLowerCase()
  const bot = client.channels.cache.find(channel => channel.id === process.env.CHANNEL)

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
      // monitor.restartMonitor()
      bot.send('Monitor is now running!')
      break

    case 'stop':
      // monitor.stopMonitor()
      bot.send('Monitor has been stopped running!')
      break

    case 'restart':
      // monitor.restartMonitor()
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
          case '-list':
            {
              const proxies = new Discord.MessageEmbed()
                .setColor('#f7b586')
                .addFields({ name: 'Proxy Pool', value: `${(monitor.getPool().length) ? monitor.getPool() : 'empty'}`, inline: true })

              bot.send(proxies)
            }
            break

          case '-add':
            {
              let proxy = message.content.slice((`${prefix}${command} ${key}`).length + 1).split(/ +/).shift().toLowerCase()

              if (!proxy) {
                bot.send(commandList)
                break
              }

              proxy = proxy.split(':')

              switch (proxy.length) {
                case 4:
                case 2:
                  if (!monitor.getPool().find((el) => el === proxy.join(':'))) {
                    monitor.addProxy(proxy.join(':'))
                    bot.send('Proxy has been added successfully!')
                  } else {
                    bot.send('Proxy already exists!')
                  }
                  break

                default:
                  bot.send('Proxy format should be: <ip:port> / <ip:port:username:password>')
                  break
              }
            }
            break

          case '-rm':
            {
              let proxy = message.content.slice((`${prefix}${command} ${key}`).length + 1).split(/ +/).shift().toLowerCase()

              if (!proxy) {
                bot.send(commandList)
                break
              }

              proxy = proxy.split(':')

              switch (proxy.length) {
                case 4:
                case 2:
                  if (monitor.getPool().find((el) => el === proxy.join(':'))) {
                    monitor.removeProxy(proxy.join(':'))
                    bot.send('Proxy has been removed successfully!')
                  } else {
                    bot.send('Proxy doesn\'t exists!')
                  }
                  break

                default:
                  bot.send('Proxy format should be: <ip:port> / <ip:port:username:password>')
                  break
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
