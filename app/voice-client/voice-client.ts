import * as Discord from 'discord.js';

export default class VoiceClient {
  discordClient: Discord.Client;
  voiceChannel?: Discord.VoiceChannel | null | undefined;
  connection?: Discord.VoiceConnection | null | undefined;
  receiver?: Discord.VoiceReceiver | null | undefined;

  messageSequence: number = 0;

  automuteList: {[speakingUser: string]: Discord.GuildMember} = {};

  constructor(discordClient: Discord.Client) {
    this.discordClient = discordClient;
  }

  async connect(message: Discord.Message) {
    this.voiceChannel = message.member?.voice.channel;
    if (!this.voiceChannel) {
      return message.channel.send('Connecting to voice failed: user not in channel');
    }

    const permissions = this.voiceChannel.permissionsFor(message.client.user as Discord.User);
    if (!permissions?.has("CONNECT")) {
      return message.channel.send('CHECK MY PRIVILEGE! (I need permissions to access voice channel)');
    }

    this.connection = await this.voiceChannel.join();
    this.receiver = this.connection.receiver;

    console.info('[VoiceClient::connect] connection established!');

    this.connection.play('/media/Dragon/tmp/dnd-in-progress/23 - Shadow of War Theme.flac');
  }
}
