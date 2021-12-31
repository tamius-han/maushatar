import * as Discord from 'discord.js';
import Recorder from '../recorder/recorder';
import env from '../env/env';
import { VoiceChannel } from 'discord.js';

export default class CommandProcessor {
  discordClient: Discord.Client;

  voiceChannel?: Discord.VoiceChannel | null;
  voiceConnection?: Discord.VoiceConnection | null;

  muteList: {[speakingUserId: string]: Discord.GuildMember[]} = {};
  muteDisplayName: {[speakingUserId: string]: string} = {};

  constructor(discordClient: Discord.Client) {
    this.discordClient = discordClient;

    this.discordClient.on('guildMemberSpeaking', (member, speaking) => {
      // this user has people who get muted when they speak
      if (this.muteList[member.id]) {
        const muteValue = !!speaking.bitfield;

        for(const user of this.muteList[member.id]) {
          user.voice.setMute(muteValue, 'Echo prevention');
        }
      }
    });
  }

  /**
   * String is in format [user(s) to be muted — comma separated] on [user speaking]
   * @param message
   * @param commandString
   * @returns
   */
  async processCommand(message: Discord.Message, commandString: string) {
    const [command, ...args] = commandString.split(' ');

    switch (command) {
      case 'set':
        const mentions = message.mentions.members;

        if (!mentions) {
          return message.channel.send('You must give at least two users');
        }

        const speakingUser = mentions.last();
        const speakingUserId = mentions?.lastKey() || '';
        const mutes: Discord.GuildMember[] = [];

        for (const mention of mentions) {
          if (mention[0] !== speakingUserId) {
            mutes.push(mention[1]);
          }
        }

        this.muteList[speakingUserId] = mutes;
        this.muteDisplayName[speakingUserId] = speakingUser?.displayName ?? '[no display name ???]';

        console.log('when user with id:', speakingUserId, 'speaks, we mute these guys:', mutes);
        console.info('mute list:', this.muteList);
        break;
      case 'get':
        let out = '```';
        for (const key in this.muteList) {
          out += `when id ${this.muteDisplayName[key]} (id: ${key}) is speaking, mute the following:`;

          for (const user of this.muteList[key]) {
            out += `\n      → ${user.displayName} (id: ${user.id}`;
          }

          out += `\n\n`;
        }
        out += '```';
        return message.channel.send(`Current mute config:\n\n${out}`);
      case 'clear':
        if (!message.mentions.members) {
          return;
        }
        for (const mention of message.mentions.members) {
          delete this.muteList[mention[0]];
          delete this.muteDisplayName[mention[0]];
        }
        return;
      case 'start':
        this.voiceChannel = message.member?.voice.channel;
        if (!this.voiceChannel) {
          return message.channel.send('Connecting to voice failed: user not in channel');
        }

        const permissions = this.voiceChannel.permissionsFor(message.client.user as Discord.User);
        if (!permissions?.has("CONNECT")) {
          return message.channel.send('CHECK MY PRIVILEGE! (I need permissions to access voice channel)');
        }

        this.voiceConnection = await this.voiceChannel.join();
        this.playSilence();

        // this.receiver = this.connection.receiver;
        return message.channel.send('Started automute!');
      default:
        return message.channel.send(
          `Unknown command: \`${commandString.trim()}\`\n\nvalid commands:
          * \`set [user mentions] on [speaking user mention]\` — mutes mentioned users when speaking user talks
          * \`clear [speaking user]\` — removes any muting rules for when given speaking user talks.
        `);
    }
  }

  async playSilence() {
    console.info('attempting to play silence');
    if (this.voiceConnection) {
      this.voiceConnection.play('./app/res/silence.ogg').on('finish', () => this.playSilence());
    }
  }
}
