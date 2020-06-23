import * as Discord from 'discord.js';
import * as fs from 'fs';
import { ensureDirSync, rm } from '../lib/fs-helpers';
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

  async createOutputStreams(speaker: Discord.User, mode: 'opus' | 'pcm'): Promise<{recording?: RecordedFile, sttRecording?: RecordedFile} | undefined> {
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

    // make the filename
    const filenameBase = `${this.voiceChannel.id}-${speaker.id}-${Date.now()}`;

    let recording;
    let sttRecording;

    if (env.enableRecording) {    
      const filename = `${filenameBase}.${mode}`;
      const fullDirectory = `${env.voiceRecordingDir}/${dateDir}/${hourDir}`;
      const fullPath = `${fullDirectory}/${filename}`;

      ensureDirSync(fullDirectory);
      recording = {
        directory: fullDirectory,
        name: filename,
        fullPath: fullPath,
        stream: fs.createWriteStream(fullPath)
      }
    }
    
    if (env.enableSTT) {
      const sttFilename = `${filenameBase}.pcm`;
      const sttFullDirectory = `${env.STTRecordingDir}/${dateDir}/${hourDir}`;
      const sttFullPath =  `${sttFullDirectory}/${sttFilename}`;

      ensureDirSync(sttFullDirectory);

      sttRecording = {
        directory: sttFullDirectory,
        name: sttFilename,
        fullPath: sttFullPath,
        stream: fs.createWriteStream(sttFullPath)
      }
    }

    return {
      recording,
      sttRecording
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
      if (speaking) {
        message.channel.send(`User ${user.username} is speaking!`);

        const outputFiles = await this.createOutputStreams(user, env.recordingFormat as 'opus' | 'pcm');

        if (!outputFiles) {
          message.channel.send(`Cannot create file!`);
          return;
        }

        message.channel.send(`
\`\`\`
do we have receiver?      ${!!this.receiver}
outputFiles.recording?    ${outputFiles.recording?.fullPath}
outputFiles.sttRecording? ${outputFiles.sttRecording?.fullPath}
\`\`\`
        `)

        if (env.enableRecording && outputFiles.recording) {
          try {
            console.info('Starting recording stream!')
            const audioStream = await this.receiver?.createStream(user, {mode: env.recordingFormat as 'opus' | 'pcm'});
            if (!audioStream) {
              throw new Error('Failed to create audio stream!');
            }
            audioStream.pipe(outputFiles.recording.stream);
            // outputFiles.recording.stream.on('data', console.log);
            audioStream.on('end', () => {
              this.onRecordingEnded(message, user, outputFiles.recording as RecordedFile);
            });
          } catch (e) {
            console.error('Failed to create or write to recording stream', e);
          }
        }

        if (env.enableSTT && outputFiles.sttRecording) {
          try {
            console.info('Starting stt stream!')
            const audioStream = await this.receiver?.createStream(user, {mode: 'pcm'});
            if (!audioStream) {
              throw new Error('Failed to create audio stream!');
            }
            audioStream.pipe(outputFiles.sttRecording.stream);
            // outputFiles.sttRecording.stream.on('data', console.log);
            audioStream.on('end', () => {
              console.log('stream ended!')
              this.processSpeech(message, user, outputFiles.sttRecording as RecordedFile);
            });
          } catch (e) {
            console.error('STT failed.', e);
          }
        }
      }
    });
  }

  async onRecordingEnded(message: Discord.Message, user: Discord.User, outputFile: RecordedFile) {
    // Discord has a problem where it'll make two recordings: one with actual data and one empty one
    // We don't process empty recordings & delete them to avoid clogging our filesystem
    const fileStats = fs.statSync(outputFile.fullPath);
    if (fileStats.size === 0) {
      rm(outputFile.fullPath);
      return;
    }

    console.info(`Ended recording for ${user.username}`);
  }

  async processSpeech(message: Discord.Message, user: Discord.User, outputFile: RecordedFile) {
    console.info('Ended STT recording');
    // TODO: if there's ever multiple types of transcription, we need to check what STT method
    // is set in env.enableSTT as this is not simply a true/false value.

    // let's label the message we're currently processing
    const messageSequence = this.messageSequence++;

    // Discord has a problem where it'll make two recordings: one with actual data and one empty one
    // We don't process empty recordings & delete them to avoid clogging our filesystem
    const fileStats = fs.statSync(outputFile.fullPath);
    if (fileStats.size === 0) {
      rm(outputFile.fullPath);
      return;
    }

    message.channel.send(`
      [${messageSequence}] User ${user.username} stopped speaking — attempting to transcribe speech.
      File stats:
\`\`\`
File: ${outputFile.name}
Path: ${outputFile.fullPath}
Size: ${fileStats.size / 1000} kB
\`\`\`
    `);

    const results = await this.transcriber?.transcribe(outputFile?.fullPath);

    message.channel.send(`
      [${messageSequence}] Transcription complete. ${user.username} said (period (.) marks the end of transcription):
> ${results?.result}.
~~(Deepspeech technical details — sample rate: ${results?.sampleRate}, beam width: ${results?.beamWidth})~~
    `);
  };
}