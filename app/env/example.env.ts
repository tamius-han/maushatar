export default {
  // BASIC DISCORD BOT CONFIGURATION 
  //
  // bot will respond to commands that start with these characters
  prefixes: [":logger", ":l"],
  // discord token
  token: "INSERT_DISCORD_TOKEN_HERE",


  // this block handles settings related to recording voice with intent
  // of having it stored permanently. If deepSpeech/STT is enabled, 
  // a separate recording will be made in .pcm format
  enableRecording: true,
  recordingFormat: 'opus',                           
  voiceRecordingDir: '/PATH/TO/FOLDER',


  // Speech-to-text settings
  //
  // enableSTT options:
  //  * false: no STT
  //  * 'deepspeech': use Mozilla DeepSpeech
  enableSTT: false,

  // Directory in which voice recordings will be kept.
  // can be same folder as voiceRecordingsDir, but only if recordingFormat
  // is opus.
  STTRecordingDir: '/PATH/TO/FOLDER',
  
  // if set to 'false', recordings will be deleted as soon as STT is complete.
  persistSTTRecordings: false,


  // DeepSpeech related settings
  //
  // if enableDeepSpeech is disabled, this can be anything as long as it's not missing
  deepspeechModelDir: '/PATH/TO/TRAINED/model.pbmm',
}
