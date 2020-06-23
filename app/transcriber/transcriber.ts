import {Model} from 'deepspeech';
import * as fs from 'fs';
import FfmpegCommand from 'fluent-ffmpeg';
import * as shelljs from 'shelljs';
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
    // if userId is given, use userModels[id] model. Otherwise, use default model to transcribe
    const model = userId ? this.userModels[userId] ?? this.defaultModel : this.defaultModel;

    // discord gives us 32bit pcm, probably. We need to convert that to
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

    const result = await new Promise( (resolve, reject) => {
      const result = model.stt(data);
      resolve(result)
    });

    console.log("result:", result, 'pcm thing of model:', {sampleRate: model.sampleRate(), beamWidth: model.beamWidth()})
    return {result, sampleRate: model.sampleRate(), beamWidth: model.beamWidth()};
  }
}
