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
    
    switch (env.enableSTT) {
      case 'deepspeech':
        return this.transcribeDeepSpeech(tmpFile, sttFile, userId);
      case 'julius':
        return this.transcribeJulius(tmpFile, userId);
    }
  }

  private async transcribeDeepSpeech(tmpFile: string, sttFile: string, userId?: string): Promise<{result: string, [x: string]: any}> {
    // if userId is given, use userModels[id] model. Otherwise, use default model to transcribe
    const model = userId ? this.userModels[userId] ?? this.defaultModel : this.defaultModel;

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

  private async transcribeJulius(tmpFile: string, userId?: string): Promise<{result: string, [x: string]: any}> {
    // we assume julius is installed
    const tmpFileName = (tmpFile.split('/').reverse())[0];
    
    console.log("file:", tmpFileName, "tmpFile full", tmpFile)

    const {stdout, stderr} = await shelljs.exec(`
      echo "${tmpFile}" > "${env.STTTmpDir}/${tmpFileName}.julius-filelist"
      cd "${env.juliusDnnDir}"
      ${env.juliusBinaryDir} -C ${env.juliusJconfDir} \
                             -input rawfile \
                             -filelist "${env.STTTmpDir}/${tmpFileName}.julius-filelist" \
                             -dnnconf "${env.juliusDnnJconfDir}" | grep ": <s> " \  # only save pass1 and sentence1 
      rm "${env.STTTmpDir}/${tmpFileName}.julius-filelist"
    `, {async: true});

    console.log("stdout:", stdout)
    const transcriptArray = (stdout as string).split('\n');

    return {
      result: transcriptArray.filter((x: string) => x.startsWith('s')).map((x: string) => x.slice(15).substring(x.length - 20)),
      firstPassBest: transcriptArray.filter((x: string) => x.startsWith('p')).map((x: string) => x.slice(16).substring(x.length - 21)),
      error: stderr,
    }
  }
}
