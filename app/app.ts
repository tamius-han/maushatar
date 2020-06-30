import * as Discord from 'discord.js';
import env from './env/env';
import { ensureDirSync } from './lib/fs-helpers';
import CommandProcessor from './command-processor/command-processor';

// prepare data directories
ensureDirSync(env.voiceRecordingDir);
ensureDirSync(env.STTRecordingDir);
ensureDirSync(env.STTTmpDir);

// initiate discord client & command processor
const client = new Discord.Client();
const commandProcessor = new CommandProcessor(client);

client.once('ready', () => {
  console.log('Client ready.');
})
client.once('error', (e) => {
  console.log('There\'s been an error:', e);
}) 
client.once('disconnect', () => {
  console.log('Client disconnected.');
})

// process message
client.on('message', async message => {
  if (message.author.bot) {
    return;
  }

  for (const p of env.prefixes) {
    if (message.content.startsWith(p)) {
      commandProcessor.processCommand(message, message.content.substring(p.length).trim());
    };
  }  

});

client.login(env.token);