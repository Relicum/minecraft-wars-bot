const colors = require('./colors.js');
const fs = require('fs');

global.sleep = sleep;

global.colors = colors;

module.exports.color = color;
module.exports.randColor = randColor;

module.exports.writeAccountTimes = writeAccountTimes;
module.exports.readAccountTimes = readAccountTimes;

module.exports.writeAccountUsernames = writeAccountUsernames;
module.exports.readAccountUsernames = readAccountUsernames;

module.exports.writeAccountCoins = writeAccountCoins;
module.exports.readAccountCoins = readAccountCoins;

module.exports.writeAccountSignPos = writeAccountSignPos;
module.exports.readAccountSignPos = readAccountSignPos;

module.exports.getSignPosition = getSignPosition;
module.exports.updateSignPosition = updateSignPosition;

module.exports.readUsernames = readUsernames;

module.exports.readAccounts = readAccounts;
module.exports.readAfkAccounts = readAfkAccounts;

module.exports.disconnectSafely = disconnectSafely;

module.exports.clickItemDesc = clickItemDesc;

module.exports.craftItem = craftItem;

module.exports.parseMobcoinShop = parseMobcoinShop;

function color(string, color) {
   if (!string) return ''
   return color + string + colors.Fg.White
}

function randColor(string) {
   const colorKeys = Object.keys(colors.Fg)
   const colorKey = colorKeys[Math.floor(colorKeys.length * Math.random())]
   return colors.Fg[colorKey] + string + colors.Fg.White
}

async function parseMobcoinShop(bot) {

   return new Promise((resolve, reject) => {
      const watchDogId = setTimeout(() => {
         bot.off('windowOpen', onWindowOpen)
         reject(new Error("Timeout: Could not parse mobcoin shop items"))
      }, 10 * 1000)

      console.log('Executing /mobcoins')
      bot.chat('/mobcoins')
      
      bot.once('windowOpen', onWindowOpen)
      
      async function onWindowOpen(window) {
         
         console.log('Mobcoin shop opened with title: ' + window.title)
         
         await sleep(2000)
         
         let items = window.slots.filter((item, index) => {
            if (!item) return false

            item.slot = index

            if (item.name == 'stained_glass_pane' || item.slot >= 36)
               return false

            const nbtDisp = item.nbt.value.display 
            if (nbtDisp.value.Name) {
               item.desc = nbtDisp.value.Name.value
                  .replace(/§[0-9a-flnmokr]/g, '')
            } else {
               item.desc = item.displayName
            }

            if (nbtDisp.value.Lore) {
               const nbtLore = nbtDisp.value.Lore
               if (nbtLore.value.value) {
                  for (const lore of nbtDisp.value.Lore.value.value) {
                     if (lore.toLowerCase().indexOf('price') != -1)
                        try {
                           item.price = parseInt(lore
                              .replace(/§[0-9a-flnmokr]/g, '')
                              .split(' ')
                              .pop()
                              .replace(/\D/g,''))
                        } catch (err) {

                        }
                  }
               }
            }

            return !!item.price
         })
         
         bot.closeWindow(window)
         resolve(items)
      }

   })
}

async function clickItemDesc(bot, window, desc, clickBtn = 0) {

   let blocks = window.slots
      .filter((it, index) => {
         if (!it) return false

         let hasNbtName = 
            it.nbt && 
            it.nbt.value && 
            it.nbt.value.display &&
            it.nbt.value.display.value &&
            it.nbt.value.display.value.Name &&
            it.nbt.value.display.value.Name.value

         it.displayName = hasNbtName ? 
            it.nbt.value.display.value.Name.value
               .replace(/§[0-9a-flnmokr]/g, '') :
            it.displayName
         
         it.slot = index

         return true
      })

   let targetBlock = blocks.filter(s => s.displayName.indexOf(desc) != -1)[0]

   if (!targetBlock) {
      console.log("Only found", blocks.map(b => b.displayName), desc)
      throw new Error("Could not find a block with the given description")
   }

   console.log("Clicking", targetBlock.name) 

   return new Promise((resolve, reject) => {
      
      setTimeout(async () => {
         reject(new Error("Timeout: Clicking item with desc"))
      }, 10 * 1000)
      
      bot.clickWindow(targetBlock.slot, 0, clickBtn, (err) => {
         if (err) reject(new Error(err))
         else resolve()
      })

   })
   
}

async function craftItem(bot, name, amount) {
   
   await sleep(500)
   const item = require('minecraft-data')(bot.version).findItemOrBlockByName(name)
   const craftingTable = bot.findBlock({
      matching: (it) => it && it.type == 58
   })

   if (!item) throw new Error('Could not find the item')
   if (!craftingTable) throw new Error('No nerby crafting tables')

   console.log("Trying to craft " + item.displayName +
      " with crafting table " + Math.floor(bot.entity.position
         .distanceTo(craftingTable.position)) + " blocks away")

   let recipe = bot.recipesAll(item.id, null, craftingTable)[0]
   
   for (let i = 1; i < 10; i++) {
      if (recipe) break
      await sleep(200)
      recipe = bot.recipesAll(item.id, null, craftingTable)[0]
   }

   if (!recipe) throw new Error('Could not find a recipe')

   return new Promise((resolve, reject) => {
      
      setTimeout(() => {
         reject(new Error("Timeout: Clicking item with desc"))
      }, 20 * 1000)

      try {
         bot.craft(recipe, amount, craftingTable, (err) => {
            if (err) reject(new Error(err))
            else {
               console.log("Crafted " + item.displayName)
               resolve()
            }
         })
      } catch (err) {
         console.log("Could not craft " + item.displayName)
         reject(new Error(err))
      }

   })

}


async function disconnectSafely(bot) {

   let hasEnded = false
   return new Promise((resolve, reject) => {
      
      try {
         bot.on('end', () => {
            try {
               bot.removeAllListeners()
               hasEnded = true
               resolve()
            } catch {
               resolve()
            }
         })
         bot.quit()
      } catch {
         resolve()
      }

      
      setTimeout(() => {
         try {
            if (hasEnded) return;
            bot.end()
            setTimeout(() => {
               try {
                  bot.removeAllListeners()
                  resolve()
               } catch {
                  resolve()
               }
            }, 3000) // incase end is never triggered
         } catch {
            resolve()
         }
      }, 3000)

   })
}

function readUsernames() {
   const contents = readAccountUsernames()
   
   let usernames = []
   
   Object.entries(contents).forEach(([email, val]) => {
      usernames.push(val.username);
   });
   
   return usernames
}

function readAfkAccounts() {
   return readAccounts(false, '../afk.txt')
}

function readAccounts(printDisabled = false, file = '../accounts.txt') {
   const contents = fs.readFileSync(file, 'utf8')
   const lines = contents.split('\n')
   
   let accounts = []
   
   for (let line of lines) {

      if (!line) continue     

      if (line.split(':').length < 2) {
         console.log("Could not read the row (" + line.trim() +
            ") in accounts.txt, make sure it cotains username:password")

         continue
      }

      if (!line.split(':')[0]) {
         if (printDisabled) console.log('Account disabled ' + line.split(':')[1])
         continue
      }
      
      let parts = line.split(':')
      const username = parts[0].trim()
      const password = parts[1].trim()
      
      accounts.push({ username, password, isMaster: parts.length > 2 })
   }
   
   if (accounts.filter(acc => acc.isMaster).length > 1) 
      console.log('Warning found two masters, the first one will most likley be used')
   if (accounts.filter(acc => acc.isMaster).length < 1) 
      console.log('Warning found no master, some things may not work as expected')

   return accounts
}

function getSignPosition(username, fallbackPosition) {
   const signs = readAccountSignPos()
   let pos = signs[username]
   if (!pos) return fallbackPosition

   return { x: pos.x, y: pos.y, z: pos.z }
}

function updateSignPosition(sign, username) {
   const signs = readAccountSignPos()

   const pos = sign.position
   signs[username] = { x: pos.x, y: pos.y, z: pos.z }

   writeAccountSignPos(signs)
}

function readAccountSignPos() {
   return readJSONFile('signs.txt')
}

function writeAccountSignPos(signs) {
   return writeJSONFile('signs.txt', signs)
}

function readAccountCoins() {
   return readJSONFile('mobcoins.txt')
}

function writeAccountCoins(coins) {
   return writeJSONFile('mobcoins.txt', coins)
}

function readAccountUsernames() {
   return readJSONFile('usernames.txt')
}

function writeAccountUsernames(usernames) {
   return writeJSONFile('usernames.txt', usernames)
}

function readAccountTimes() {
   return readJSONFile('times.txt')
}

function writeAccountTimes(times) {
   return writeJSONFile('times.txt', times)
}

function readJSONFile(file, object) {
   if (!fs.existsSync(file)) writeJSONFile(file, {});
   return JSON.parse(fs.readFileSync(file, 'utf8') || "{}") 
}

function writeJSONFile(file, object) {
   fs.writeFileSync(file, JSON.stringify(object, null, 2))
}

function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}

