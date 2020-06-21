import * as Discord from 'discord.js';
import Recorder from '../recorder/recorder';

export default class CommandProcessor {
  discordClient: Discord.Client;
  recorder?: Recorder;

  constructor(discordClient: Discord.Client) {
    this.discordClient = discordClient;
  }

  async processCommand(message: Discord.Message, commandString: string) {
    const [command, ...args] = commandString.split(' ');
    switch (command) {
      case 'help': 
        return this.printHelp(message);
      case 'rec':
        return this.processRecording(message, []);
      default: 
        return message.channel.send(`Unknown command: \`${commandString.trim()}\``);
    }
  }

  async printHelp(message: Discord.Message) {
    message.channel.send(`List of commands:
\`\`\`
help                    display this help
rec start               start recording audio
\`\`\`
    `)
  }

  async processRecording(message: Discord.Message, options: string[]) {
    this.recorder = new Recorder(this.discordClient);

    await this.recorder.connect(message)
    this.recorder.startRecording(message);
  }
}