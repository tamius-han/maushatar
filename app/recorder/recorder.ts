import * as Discord from 'discord.js';
import * as fs from 'fs';
import { ensureDirSync } from '../lib/fs-helpers';
import env from '../env/env';
import Transcriber from '../transcriber/transcriber';

export interface RecordedFile {
  directory: string,
  name: string,
  fullPath: string,
  stream: any
};

export default class Recorder {
  discordClient: Discord.Client;
  voiceChannel?: Discord.VoiceChannel | null | undefined;
  connection?: Discord.VoiceConnection | null | undefined;
  receiver?: Discord.VoiceReceiver | null | undefined;
  transcriber?: Transcriber;

  messageSequence: number = 0;

  constructor(discordClient: Discord.Client) {
    this.discordClient = discordClient;
    this.transcriber = new Transcriber();
  }

  async createOutputStream(speaker: Discord.User): Promise<RecordedFile | undefined> {
    if (!this.voiceChannel) {
      console.warn(`[Recorder::createOutputStream] we are trying to create a file while not connected to a voice channel. This is fishy, so we'll not do it.`);
      return;
    }
    const dateTimeStr = new Date().toISOString();
    const dateStr = dateTimeStr.split('T')[0];

    // date to directory
    const dateDir = dateStr.replace(/-/g, '/');

    // new directory for every hour, everything else is pointless
    const hourDir = dateTimeStr.split('T')[1].split(':')[0];

    const fullDirectory = `${env.voiceRecordingDir}/${dateDir}/${hourDir}`;
    ensureDirSync(fullDirectory);

    const filename = `${this.voiceChannel.id}-${speaker.id}-${Date.now()}.pcm`;
    const fullPath = `${fullDirectory}/${filename}`;
    return {
      directory: fullDirectory,
      name: filename,
      fullPath: fullPath,
      stream: fs.createWriteStream(fullPath)
    };
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

    console.info('[Recorder::connect] connection established!');

    this.connection.play('/media/Dragon/tmp/dnd-in-progress/23 - Shadow of War Theme.flac');
  }

  handleVocalMessage(userOrMember: any, speaking: any){
    console.log(userOrMember.displayName || userOrMember.username, "is talking?", speaking);
  }

  async startRecording(message: Discord.Message) {
    console.log("start recording. Do we have connection:", !!this.connection);

    this.discordClient.on('guildMemberSpeaking', this.handleVocalMessage); 


    this.connection?.on('speaking', async (user, speaking) => {
      console.log('speaking happened!')
      if (speaking) {
        message.channel.send(`User ${user.username} is speaking!`);

        const audioStream = this.receiver?.createStream(user, {mode: 'pcm'});
        const outputFile = await this.createOutputStream(user);

        if (!outputFile) {
          message.channel.send(`Cannot create file!`);
          return;
        }

        audioStream.pipe(outputFile.stream);

        outputFile?.stream.on('data', console.log);
        audioStream.on('end', () => {
          this.processSpeech(message, user);
        });
      }
    });
  }

  async processSpeech(message: Discord.Message, user: Discord.User) {
    message.channel.send(`User ${user.username} stopped speaking`);
  };
}