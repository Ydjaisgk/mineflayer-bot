process.removeAllListeners('warning')
const mineflayer = require('mineflayer');
const { Vec3 } = require('mineflayer')
const { pathfinder, Movements, goals: { GoalNear, GoalFollow, GoalBlock } } = require('mineflayer-pathfinder')
const readline = require('node:readline');

const commands = {
  help: {
    usage: ['help'],
    description: '  Show all commands',
    action: function() {
      Object.values(commands).forEach(command => {
        const aliases = command.usage.map(u => `.${u}`).join(', ');
        console.log(`${aliases} - ${command.description}`);
      });
    }
  },
  chat: {
    usage: ['chat', 'say', 'send'],
    description: 'Make bot chat',
    action: function(bot, args) {
      const message = args.join(' ');
      bot.chat(message);
    }
  },
  server: {
    usage: ['server'],
    description: 'Show server info',
    action: function(bot) {
      console.log(`Server: ${bot.host}:${bot.port}`)
      console.log(`Version: ${bot.version}`)
      console.log(`TPS: ${bot.getTps()}`)
      console.log(`Difficulty: ${bot.game.difficulty}`)
      console.log(`Hardcore: ${bot.game.hardcore}`)
      console.log(`Maxplayer: ${bot.game.maxPlayers}`)
      console.log(`World tpye: ${bot.game.levelType}`)
    }
  },
  tps: {
    usage: ['tps'],
    description: 'Show server tps',
    action: function(bot) {
      console.log(`Server tps: ${bot.getTps()}`)
    }
  },
  players: {
    usage: ['players'],
    description: 'Show players list',
    action: function(bot) {
      const players = Object.keys(bot.players).map((name) => `\x1b[32m${name}(${bot.players[name].ping}ms)\x1b[0m`).join(' | ');
      console.log(`[Player List] ${players}`);
    }
  },
  look: {
    usage: ['look'],
    description: 'Look yaw pitch',
    method: '.look <yaw> <pitch>',
    action: function(bot, args) {
      if (args.length < 2) {
        console.log(`Usage: ${this.method}`);
        return;
      }
      const [yaw, pitch] = args.split(' ')
      const mcyaw = ((360 - yaw) % 360 * Math.PI / 180) - Math.PI
      const mcpitch = Math.PI / 2 * Math.sin(-pitch * Math.PI / 180);
      bot.look(mcyaw, mcpitch, false)
    }
  },
  lookat: {
    usage: ['lookat'],
    description: 'Look at postion or player',
    method: '.lookat <x> <y> <z> | <player>',
    action: function(bot, args) {
      let targetPos;
      if (args.length === 2) {
        const [x, y, z] = args.split(' ');
        targetPos = new Vec3(parseFloat(x), parseFloat(y), parseFloat(z));
      } else if (args.length === 3) {
        const player = bot.players[args];
        if (!player) {
          console.log(`Không tìm thấy người chơi '${args}'`);
          return;
        }
        targetPos = player.entity.position;
      } else {
        console.log(`Usage: ${this.method}`);
        return;
      }
      bot.lookAt(targetPos);
    }
  },
  dropslot: {
    usage: ['dropslot'],
    description: 'Drop all item in select slot',
    method: '.dropslot <slot> (1-44)',
    action: function(bot, args) {
      if (!args || typeof args !== 'number' || args < 1 || args > 44) {
        console.log(`Usage: ${this.method}`)
        return
      }
      let slot = bot.inventory.slots[args]
      if (slot && slot.type !== -1) {
        bot.tossStack(slot)
        console.log(`Drop slot ${args}`)
      } else {
        console.log(`Slot ${args} is empty or invalid`)
      }
    }
  },
  dropall: {
    usage: ['dropall'],
    description: 'Drop all item in inventory',
    action: async function(bot, args) {
      let items = bot.inventory.items()
      for (const item of items) {
        await bot.tossStack(item)
      }
    }
  },
  hand: {
    usage: ['hand', 'hotbar'],
    description: 'Change hotbar slot',
    method: '.hand <slot> (1-9)',
    action: function(bot, args) {
      if (!args || typeof args !== 'number' || args < 1 || args > 9) {
        console.log(`Usage: ${this.method}`)
        return
      }
      bot.setQuickBarSlot(args - 1)
    }
  },
  move: {
    usage: ['move'],
    description: 'Set bot control state',
    method: '.move <forward/back/left/right/sprint/sneak> <true/false>',
    action: function(bot, args) {
      
      const [control, state] = args.split(' ');
      const controls = new Set(['forward', 'back', 'left', 'right', 'jump', 'sprint', 'sneak']);
      const states = new Set(['true', 'false']);

      if (args.length !== 2 || !controls.has(control) || !states.has(state)) {
        console.log(`Usage: ${this.method}`);
        return;
      }

      bot.pathfinder.setGoal(null);
      bot.setControlState(control, state === 'true');
    }
  },
  coordinate: {
    usage: ['coord', 'coordinate'],
    description: 'Show bot coordinate',
    action: function(bot, args) {
      console.log(`${bot.game.dimension} - ${bot.entity.position}`)
    }
  },
  inventory: {
    usage: ['inv', 'inventory'],
    description: 'Show bot inventory',
    action: function(bot, args) {
    	function getSlotName(index) {
    		if (index >= 36 && index <= 44) return `Hotbar ${index - 35}`;
    		if (index === 45) return 'Off Hand';
    		if (index === 5) return 'Helmet';
    		if (index === 6) return 'Chestplate';
    		if (index === 7) return 'Leggings';
    		if (index === 8) return 'Boots';
    		if (index >= 9 && index <= 35) return `Container ${index - 8}`;
    		return `Slot ${index}`;
    	}

    	console.log(`                                   BOT INVENTORY                                       `);
    	console.log(`| Slot | Slot Name    | Name                      | Count | id_item                   |`);
    	console.log(`=======================================================================================`);

    	const slots = bot.inventory.slots;

    	slots.forEach((item, index) => {
    		const slotName = getSlotName(index);

    		if (item) {
    			console.log(`| ${item.slot.toString().padEnd(4)} | ${slotName.padEnd(12)} | ${item.displayName.padEnd(25)} | ${item.count.toString().padEnd(2)}/${item.stackSize.toString().padEnd(2)} | ${item.name.padEnd(25)} |`);
    		} else {
    			console.log(`| ${index.toString().padEnd(4)} | ${slotName.padEnd(12)} | Empty                     | null  | empty                     |`);
    		}
    	});
    },
  },
  goto: {
    usage: ['goto'],
    description: 'Goto player or coordinate',
    method: '.goto <x> <y> <z> | <player>',
    action: function(bot, args) {
      
      const arg = args.split(' ');

      if (arg.length < 1) {
        console.log(`Usage: ${this.method}`);
        return;
      }

      ['forward', 'back', 'left', 'right', 'jump', 'sprint', 'sneak'].forEach(control => {
        bot.setControlState(control, false);
      });

      if (arg.length === 3) {
        const x = parseFloat(arg[0]);
        const y = parseFloat(arg[1]);
        const z = parseFloat(arg[2]);
  
        if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
          console.log(`Going to coordinates: ${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}`);
          bot.pathfinder.setGoal(new GoalNear(x, y, z, 0));
        } else {
          console.log('Invalid coordinates provided.');
        }
      } else if (arg.length === 1) {
        const targetPlayerName = arg[0];
        const targetPlayer = bot.players[targetPlayerName];
  
        if (targetPlayer) {
          const position = targetPlayer.entity.position;
          console.log(`Going to ${targetPlayerName}'s position: ${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}`);
          bot.pathfinder.setGoal(new GoalNear(position.x, position.y, position.z, 0));
        } else {
          console.log(`Can't find player: ${targetPlayerName}`);
        }
      } 
      else {
        console.log(`Usage: ${this.method}`);
      }
    }
  }
};

const aliases = {};
Object.values(commands).forEach(command => {
  command.usage.forEach(alias => {
    aliases[alias] = command;
  });
});

async function createBot() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query) => new Promise((resolve) => {
    process.stdout.write(query);
    rl.question(query, resolve);
  });

  const botname = await question('Username: ');
  const botserver = await question('Server: ');
  const [bothost, botport] = botserver.split(':');
  const botversion = await question('Version: ')

  const bot = mineflayer.createBot({
    host: bothost,
    port: botport,
    username: botname,
    version: botversion
  })

  bot.host = bothost
  bot.port = botport

  bot._client.on('connect', () => {
    console.log(`Bot connect to ${bot.host}:${bot.port}`)
  })

  bot.on('login', () => {
    console.log(`${bot.username} login to ${bot.host}:${bot.port}`)
  })

  bot.once('spawn', () => {
    console.log(`${bot.username} spawn on ${bot.host}:${bot.port}`)
    const mcData = require('minecraft-data')(bot.version);
    let movements = new Movements(bot, mcData);
    bot.pathfinder.setMovements(movements)
  })

  bot.loadPlugin(pathfinder)

  bot.on('message', (message) => {
    console.log(message.toAnsi())
  })

  bot.on('kicked', console.log)
  bot.on('error', console.log)

  rl.setPrompt('')
  rl.prompt()
  rl.on('line', (input) => {
    if (input.startsWith('.')) {
      const [cmd, ...args] = input.slice(1).split(' ');
      const command = aliases[cmd];
      if (command) {
        command.action(bot, args);
      } else {
        console.log(`Invalid command. Type .help to show all command.`);
      }
    } else {
      bot.chat(input);
    }
  });
}

createBot()