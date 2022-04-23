const cors = require('cors')
require('dotenv').config();
const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');
const APP = express();
const PORT = 8000;
const neo4j = require('neo4j-driver')
const driver = neo4j.driver("bolt://localhost:7687", neo4j.auth.basic("neo4j", "password"))

APP.use(cors());
APP.use(express.json());

const credentials = {
    clientId: '0f34b94d851840ea81395883148fcd72',
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: 'http://localhost:8000/authenticate/'
};

const api = new SpotifyWebApi(credentials);

APP.get('/authenticate', (req, res) => {
    const { code } = req.query;

    api.authorizationCodeGrant(code).then(data => {
        const { expires_in, access_token, refresh_token } = data.body;
        api.setAccessToken(access_token);
        api.setRefreshToken(refresh_token);
        res.redirect(`http://localhost:3000/login/${access_token}/${refresh_token}`);
      }).catch(err => {
        console.log(err);
        res.sendStatus(400);
      });
});

APP.get('/my_info', (_, res) => {
    api.getMe().then(data => {
        res.json(data);
    })
});

APP.get('/top_tracks', (_, res) => {
    api.getMyTopTracks().then(data => {
        res.json(data);
    })
});

APP.get('/top_artists', (_, res) => {
    api.getMyTopArtists().then(data => {
        res.json(data);
    })
});

APP.get('/my_playlists', (_, res) => {
    api.getUserPlaylists().then(data => {
        res.json(data);
    })
});

APP.get('/get_track_features', (req, res) => {
    api.getAudioFeaturesForTrack(req.query.trackId).then(data => {
        res.json(data);
    })
});

APP.post('/generate_similar', async (req, res) => {
    const { id, idType } = req.body;

    if (idType == 'artist') {
        createArtist(id)
        .finally(res.json({'success': id, 'type': idType}))
    } else if (idType == 'song') {
        let trackInfo = {'id': id}
        let artists = []
        let album_id = ""
        let {body} = await api.getTrack(id)

        trackInfo['id'] = body.id;
        trackInfo['name'] = body.name;
        trackInfo['year'] = body.album.release_date.substring(0, 4);
        trackInfo['release_date'] = body.album.release_date;
        for (const artist of body.artists) {
            await createArtist(artist.id)
            artists.push(artist.id);
        }
        await createAlbum(body.album.id);
        album_id = body.album.id;


        audio = await api.getAudioFeaturesForTrack(id)

        trackInfo['danceability'] = audio.body.danceability
        trackInfo['energy'] = audio.body.energy
        trackInfo['key'] = audio.body.key
        trackInfo['loudness'] = audio.body.loudness
        trackInfo['speechiness'] = audio.body.speechiness
        trackInfo['acousticness'] = audio.body.acousticness
        trackInfo['instrumentalness'] = audio.body.instrumentalness
        trackInfo['liveness'] = audio.body.liveness
        trackInfo['valence'] = audio.body.valence
        trackInfo['tempo'] = audio.body.tempo
        trackInfo['duration_ms'] = audio.body.duration_ms
        

        await runQuery("MERGE (a:Song{id:$id, name:$name, danceability:$danceability, "+
                "energy:$energy, key:$key, loudness:$loudness, speechiness:$speechiness, "+
                "acousticness:$acousticness, instrumentalness:$instrumentalness, liveness:$liveness, valence:$valence, "+
                "tempo:$tempo, duration_ms:$duration_ms, year:$year, release_date:$release_date})", trackInfo);

        for (let i = 0; i<artists.length; i++) {
            if (i == 0) {
                await runQuery("MATCH (a:Album), (b:Artist) "+
                        "WHERE a.id = $album_id AND b.id = $artist_id "+
                        "MERGE (a)-[r:CREATED_BY]->(b) ",
                    {'artist_id': artists[i], 'album_id': album_id})
                await runQuery("MATCH (a:Song), (b:Artist) "+
                        "WHERE a.id = $id AND b.id = $artist_id "+
                        "MERGE (a)-[r:BY]->(b) ",
                    {'id': trackInfo['id'], 'artist_id': artists[i]})
            }
            else {
                await runQuery("MATCH (a:Song), (b:Artist) "+
                        "WHERE a.id = $id AND b.id = $artist_id "+
                        "MERGE (a)-[r:FEATURING]->(b) ",
                    {'artist_id': artists[i], 'id': trackInfo['id']})
            }
        }

        await runQuery("MATCH (a:Song), (b:Album) "+
            "WHERE a.id = $id AND b.id = $album_id "+
            "MERGE (a)-[r:ALBUM_TRACK]->(b) ",
            {'id': trackInfo['id'], 'album_id': album_id})


        let playlist = await runQuery("MATCH (p1:Song), (p2:Song) "+
            "WHERE p1 <> p2 AND p1.id =$id "+
            "WITH SUM(ABS(p1.danceability - p2.danceability) + ABS(p1.energy - p2.energy) + "+
            "ABS(p1.speechiness - p2.speechiness) + ABS(p1.acousticness - p2.acousticness) + "+
            "ABS(p1.instrumentalness - p2.instrumentalness) + ABS(p1.liveness - p2.liveness) + "+
            "ABS(p1.valence - p2.valence)) + ABS((p1.tempo / 250) - (p2.tempo / 250)) + "+ 
            "ABS((p1.key / 250) - (p2.key / 250)) + ABS(((p1.loudness + 60) / 67.23) - ((p2.loudness + 60) / 67.23)) AS sim, "+
            "p1, p2 "+
            "RETURN p2.id "+
            "ORDER BY sim ASC "+
            "LIMIT 50 ",
            {'id': id});

        cleaned_playlist = []

        for (let i = 0; i<playlist.records.length; i++) {
            cleaned_playlist.push(playlist.records[i]._fields[0]);
        }

        await res.json({'success': id, 'playlist': cleaned_playlist})
    } else if (idType == 'playlist') {
        createAlbum(id)
        .finally(res.json({'success': id, 'type': idType}))
    }
    
})

async function createArtist(id) {
    let artistInfo = {'id': id}
    api.getArtist(id)
    .then(data => {
        artistInfo['artist'] = data.body.name;
    })
    .then(() => {
        // Make sure the artist exists in the database
        runQuery("MERGE (a:Artist{id:$id, name:$artist})", artistInfo);
    })

    return Promise;
}

async function createAlbum(id) {
    let albumInfo = {'id': id}
    api.getAlbum(id)
    .then(data => {
        albumInfo['name'] = data.body.name;
    })
    .then(() => {
        // Make sure the album exists in the database
        runQuery("MERGE (a:Album{id:$id, name:$name})", albumInfo);
    })

    return Promise;
}

async function runQuery(query, params) {
    const session = driver.session();
    let results = await session.run(query, params);
    await session.close();

    return results;
}

APP.listen(PORT, () => {
    console.log(`App listening @ http://localhost:${PORT}`);
})