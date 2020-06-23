# maushatar

Discdord recorder & transcriber bot. More like 'recorder', because 'transcription' part ~~sucks big time~~ flat out doesn't work.

## Transcription

Transcription is based on Mozilla's deep speech, and while very exciting from the geek/nerd/techie perspective, it's very much a work in progress — or in 
simple terms: it works awful. Just how awful? This is me speaking the first few lines of the infamous navy seals copypasta:

> m angi  te n o who boha mon i  o i to her o oe o pe fi   o ao er had  foe oi hado hole of po ad bie o hiohi hem welo the havl i  who lite foe oo  hack ot o.

I mean I know my accent is less than stellar but it's not _that_ bad.

In deepspeech's defense, I am feeding it overly compressed data from discord (my voice quality is otherwise — in terms of background noise — rather stellar).

### Can transcription be improved?

If you trained your models yourself, and you trained them on compressed voice transmitted over discord (preferably yours, even more preferrably the voice of
every participant you're going to record in other to deal with accents and varying amounts of background noise each participant has) ... then maybe.

I haven't tried and am not going to try for the time being. 

I might also seek out other alternatives. Google cloud speech to text is off the table — not just because it's only free for 1h worth of audio per month,
but because trying to get that API key almost gave me cancer. At the time, I don't really have the will to search for something that would be free and 
easily integrated into a typescript discord bot, but then again ... linux is already required for transcription to work because `fluent-ffmpeg` can only
convert to 16 bit pcm if your file ends with .wav, and that adds another 44 extra bytes to the file that need to be cut off. This is solved through the
magic of `shelljs` and `dd`. But I digress.

# Installing

## Requirements:

* Node 14
* npm

The rest presumably installs when you run `npm ci`.

If you want to play around with transcription, you'll also need:

* linux
* dd

## Pre-installation

Acquire `env.ts` and put it in `/app/env/env.ts`. See `example.env.ts` for things your env file should 

## Compiling

```sh
npm ci
npm run build
```

# Usage

```
:l rec           - starts recording
```

### Helpful documentation links

* [Deep speech](https://deepspeech.readthedocs.io/en/latest/NodeJS-API.html)