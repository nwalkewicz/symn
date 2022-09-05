import path from 'path';
import { stdout } from 'process';
import prompts from 'prompts';
import axios from 'axios';
import SpotifyWebApi from 'spotify-web-api-node';
import dotenv from 'dotenv';

dotenv.config();
const pkg = require(path.resolve('package.json'));

// TODO: outsource this class to a different file
class Track {
  constructor(options: Track) {
    Object.assign(this, options);
  }
}

/**
 * Provides the user with 3 options (song, artist, or album)
 * to search for music.
 * 
 * @returns [ "song" | "artist" | "album" ]
 */
async function getSearchMethod(): Promise<string> {
  const prompt = await prompts({
    type: 'select',
    name: 'searchMethod',
    message: 'How would you like to search?',
    choices: [
      {title: 'Song'},
      {title: 'Artist'},
      {title: 'Album'}
    ]
  });

  switch (prompt.searchMethod) {
    case 0:
      return 'song';
    case 1:
      return 'artist';
    case 2:
      return 'album';
    default:
      throw new Error(`Invalid search method`);
  }
}

async function inpText(message: string): Promise<string> {
  const prompt = await prompts({
    name: 'text',
    type: 'text',
    message
  });

  return prompt.text;
}

async function inpSelect(message: string, choices: string[]): Promise<number> {
  const prompt = await prompts({
    name: 'sel',
    type: 'select',
    message,
    choices: choices.map((choice) => {
      return {title: choice}
    })
  });

  return prompt.sel;
}

async function searchTracks(trackName: string): Promise<SpotifyApi.TrackObjectFull[]> {
  try {
    const { data } = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.SP_CLIENT_ID as string,
        client_secret: process.env.SP_CLIENT_SECRET as string
      }),
      {headers: {'Content-Type': 'application/x-www-form-urlencoded'}}
    );
    const SP_ACCESS_TOKEN = data.access_token;

    const spotify = new SpotifyWebApi({accessToken: SP_ACCESS_TOKEN});

    const tracks = await spotify.searchTracks(trackName, {limit: 15});
    return tracks.body.tracks?.items || [];
  } catch(err) {
    throw err;
  }
}

// Entry point
(async () => {
  try {
    // Greeting
    stdout.write(`${pkg.name} v${pkg.version}\n\n`);
    
    const searchMethod = await getSearchMethod();
    switch(searchMethod) {
      case 'song':
        const songName = await inpText('test');
        const trackList = (await searchTracks(songName))
        .map((track: SpotifyApi.TrackObjectFull) => {
          return {
            id: track.id,
            name: track.name,
            artists: track.artists.map((artist: SpotifyApi.ArtistObjectSimplified) => artist.name).join('; '),
            album: {
              id: track.album.id,
              artists: track.album.artists.map((artist: SpotifyApi.ArtistObjectSimplified) => artist.name).join('; '),
              images: track.album.images.map((img) => img.url)
            }
          }
        });
        const trackListArr: string[] = trackList.map((track) => `${track.name} by ${track.artists}`);
        const userSel = await inpSelect('Select a song', trackListArr);
        console.log(trackList[userSel]);
        break;
      case 'artist':
        break;
      case 'album':
        break;
    }
  } catch(err) {}
})();
