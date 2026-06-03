
const { Client, GatewayIntentBits, Events, SlashCommandBuilder, REST, Routes } = require('discord.js');
const fs = require('fs');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const TRADE_CHANNEL_ID = '1511242268126744596';
const LOG_CHANNEL_ID = '1511235450160021614';
const DB='trades.json';

function readDB(){ try{return JSON.parse(fs.readFileSync(DB));}catch{return [];}}
function writeDB(d){fs.writeFileSync(DB, JSON.stringify(d,null,2));}

const commands=[
new SlashCommandBuilder().setName('trade-create').setDescription('Create trade')
.addStringOption(o=>o.setName('have').setDescription('Items you have').setRequired(true))
.addStringOption(o=>o.setName('want').setDescription('Items you want').setRequired(true)),
new SlashCommandBuilder().setName('trade-browse').setDescription('Browse trades'),
new SlashCommandBuilder().setName('trade-mytrades').setDescription('My trades'),
new SlashCommandBuilder().setName('trade-remove').setDescription('Remove trade')
.addIntegerOption(o=>o.setName('id').setDescription('Trade ID').setRequired(true))
].map(c=>c.toJSON());

const client=new Client({intents:[GatewayIntentBits.Guilds]});

client.once(Events.ClientReady, async ()=>{
 const rest=new REST({version:'10'}).setToken(TOKEN);
 await rest.put(Routes.applicationCommands(CLIENT_ID),{body:commands});
 console.log('Agent Barista ready');
});

client.on(Events.InteractionCreate, async i=>{
 if(!i.isChatInputCommand()) return;

 let trades=readDB();

 if(i.commandName==='trade-create'){
   const have=i.options.getString('have');
   const want=i.options.getString('want');
   const trade={id:Date.now(),user:i.user.id,have,want};
   trades.push(trade);
   writeDB(trades);

   const matches=trades.filter(t=>t.user!==i.user.id &&
      t.have.toLowerCase().includes(want.toLowerCase()) &&
      have.toLowerCase().includes(t.want.toLowerCase()));

   for(const m of matches){
      try{
        const u=await client.users.fetch(m.user);
        await u.send(`Trade match found with ${i.user.tag}\nHave: ${have}\nWant: ${want}`);
        await i.user.send(`Trade match found with ${u.tag}\nHave: ${m.have}\nWant: ${m.want}`);
      }catch{}
   }

   return i.reply({content:`Trade created. ID: ${trade.id}. Matches found: ${matches.length}`,ephemeral:true});
 }

 if(i.commandName==='trade-browse'){
   if(!trades.length) return i.reply('No active trades.');
   return i.reply(trades.slice(0,20).map(t=>`#${t.id} | Have: ${t.have} | Want: ${t.want}`).join('\n'));
 }

 if(i.commandName==='trade-mytrades'){
   const mine=trades.filter(t=>t.user===i.user.id);
   return i.reply(mine.length?mine.map(t=>`#${t.id} ${t.have} -> ${t.want}`).join('\n'):'No trades.');
 }

 if(i.commandName==='trade-remove'){
   const id=i.options.getInteger('id');
   trades=trades.filter(t=>t.id!==id || t.user!==i.user.id);
   writeDB(trades);
   return i.reply({content:'Removed if owned by you.',ephemeral:true});
 }
});

client.login(TOKEN);
