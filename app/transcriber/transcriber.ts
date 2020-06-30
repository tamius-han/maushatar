import {Model} from 'deepspeech';
import * as fs from 'fs';
import FfmpegCommand from 'fluent-ffmpeg';
import * as shelljs from 'shelljs';
import * as Discord from 'discord.js';
import env from '../env/env';

export interface Transcription {

}

export default class Transcriber {
  defaultModel: Model;
  userModels: {[userId: string]: Model};

  constructor() {
    // TODO: if there's ever multiple types of transcription, we need to check what STT method
    // is set in env.enableSTT as this is not simply a true/false value.
    this.defaultModel = new Model(env.deepspeechModelDir);
    this.userModels = {};
  }

  async transcribe(filepath: string, userId?: string) {
    
    
    switch (env.enableSTT) {
      case 'deepspeech':
        return this.transcribeDeepSpeech(filepath, userId);
      case 'julius':
        return this.transcribeJulius(filepath, userId);
    }
  }

  private async transcribeDeepSpeech(filepath: string, userId?: string): Promise<{result: string, [x: string]: any}> {
    // if userId is given, use userModels[id] model. Otherwise, use default model to transcribe
    const model = userId ? this.userModels[userId] ?? this.defaultModel : this.defaultModel;

    // discord gives us 32bit pcm, probably. We likely need to convert that to
    // 16-bit PCM, because that's what model expects
    //
    // there's only one problem: if we don't save 16bit file as .wav,
    // ffmpeg will throw a hissy fit and just fail completely
    const tmpFile = `${filepath}.16.wav`;
    const sttFile = `${filepath}.16.pcm`;

    await new Promise((resolve) => {
      const command = FfmpegCommand(filepath)
        .inputOptions(['-f s32le', '-ac 1'])
        .output(tmpFile)
        .outputOption(['-acodec pcm_s16le'])
        .on('end', () => resolve())
        .run();
    });

    // the problem with .wav files is, of course, that we get an extra 44 bytes
    // at the start of the file that we really don't want.
    //
    // NOTE: shelljs is not async. It would be great if it were at some time tho
   
    shelljs.exec(`
      dd if="${tmpFile}" of="${sttFile}" bs=44 skip=1
      rm "${tmpFile}"
    `);

    const data = fs.readFileSync(sttFile);

    const result: string = await new Promise( (resolve, reject) => {
      const result = model.stt(data);
      resolve(result)
    });

    console.log("result:", result, 'pcm thing of model:', {sampleRate: model.sampleRate(), beamWidth: model.beamWidth()})
    return {result, sampleRate: model.sampleRate(), beamWidth: model.beamWidth()};
  }

  private async transcribeJulius(filepath: string, userId?: string): Promise<{result: string, [x: string]: any}> {
    // discord gives us 32bit pcm, probably and at 44100 Hz. We likely need to convert that to
    // 16-bit PCM, because that's what model expects. Julius also wants sample rate of 16000,
    // which means we can't reuse same ffmpeg call as with deepSpeech
    //
    // there's only one problem: if we don't save 16bit file as .wav,
    // ffmpeg will throw a hissy fit and just fail completely
    const sttFile = `${filepath}.16.wav`;

    await new Promise((resolve) => {
      const command = FfmpegCommand(filepath)
        .inputOptions(['-f s32le', '-ac 1'])
        .output(sttFile)
        .outputOption(['-acodec pcm_s16le', '-ar 16000'])
        .on('end', () => resolve())
        .run();
    });
    // we assume julius is installed
    const tmpFileName = (sttFile.split('/').reverse())[0];
    
    console.log("file:", tmpFileName, "tmpFile full", sttFile)

    let stdoutTxt = '';
    const {stdout, stderr} = await shelljs.exec(`
      echo "${sttFile}" > "${env.STTTmpDir}/${tmpFileName}.julius-filelist"
      cd "${env.juliusDnnDir}"
      ${env.juliusBinaryDir} -C ${env.juliusJconfDir} \
                             -input rawfile \
                             -filelist "${env.STTTmpDir}/${tmpFileName}.julius-filelist" \
                             -dnnconf "${env.juliusDnnJconfDir}" 2>/dev/null | grep ": <s> " # only save pass1 and sentence1 
      rm "${env.STTTmpDir}/${tmpFileName}.julius-filelist"
    `, {async: true});

    stdout.on('data', (data: string) => {
      stdoutTxt = `${stdoutTxt}${data}`;
    });

    await new Promise((resolve) => {
      stdout.on('close', (data: string) => {
        console.log("\n\n---------------------------------- s t r e a m   o v e r ---------------------------------- \n\nstdout:\n", stdoutTxt);
        resolve();
      })
    })

    console.log("——————————————————————————————————— end transcription ———————————————————————————————————");
    const transcriptArray = stdoutTxt.split('\n');

    return {
      result: transcriptArray.filter((x: string) => x.startsWith('s')).map((x: string) => x.slice(15).substring(0, x.length - 20)).join('. '),
      firstPassBest: transcriptArray.filter((x: string) => x.startsWith('pass1_best:')).map((x: string) => x.slice(16).substring(0, x.length - 21)),
      // error: stderr,
    }
  }
}
