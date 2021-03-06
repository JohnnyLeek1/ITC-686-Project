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

APP.post('/get_track_info', (req, res) => {
    const { ids } = req.body;

    console.log(`Getting info for ${ids.length} ids`);

    api.getTracks(ids).then(data => {
        res.json(data);
    })
});

APP.post('/add_tracks_to_spotify', async (req, res) => {
    const { name, ids } = req.body;
    const playlistName = `Songs similar to ${name}`;
    const playlist = await api.createPlaylist(playlistName, {description: "Generated with ITC-686 Music Recommendation App"});
    const addTracks = await api.addTracksToPlaylist(playlist.body.id, ids.map(id => `spotify:track:${id}`));

    res.json({name: playlistName, link: `spotify:playlist:${playlist.body.id}`});
})

APP.post('/generate_similar', async (req, res) => {
    const { id, idType } = req.body;

    if (idType == 'artist') {
        createArtist(id)

        // grab 50 songs from the same artist
        let similar_songs = await runQuery("MATCH (:Artist{id:$id})<-[:BY]-(p1:Song) "+
            "RETURN p1.id "+
            "LIMIT 50 ",
            {'id': id});

        // grab 50 songs featuring the same artist
        let similar_songs_artist_featuring_artist = await runQuery("MATCH (:Artist{id:$id})<-[:BY]-(:Song)-[:FEATURING]->(:Artist)<-[:BY]-(p1:Song) "+
            "RETURN p1.id "+
            "LIMIT 50 ",
            {'id': id});
        
        // grab 50 songs featuring the same artist
        let similar_songs_featured = await runQuery("MATCH (:Artist{id:$id})<-[:FEATURING]-(p1:Song) "+
            "RETURN p1.id "+
            "LIMIT 50 ",
            {'id': id});

        // grab 50 songs featuring the same artist
        let similar_songs_artist_featuring_featuring = await runQuery("MATCH (:Artist{id:$id})<-[:BY]-(:Song)-[:FEATURING]->(:Artist)<-[:FEATURING]-(p1:Song) "+
            "RETURN p1.id "+
            "LIMIT 25 ",
            {'id': id});

        // grab 50 songs featuring the same artist
        let similar_songs_featured_by = await runQuery("MATCH (:Artist{id:$id})<-[:FEATURING]-(:Song)-[:BY]->(:Artist)<-[:BY]-(p1:Song) "+
            "RETURN p1.id "+
            "LIMIT 50 ",
            {'id': id});
        
        // grab 50 songs by a featured artist
        let similar_artist_songs = await runQuery("MATCH (:Artist{id:$id})<-[:BY]-(p1:Song) "+
            "RETURN p1.id "+
            "LIMIT 50 ",
            {'id': id});
        
        // grab 50 songs featuring a featured artist 
        let similar_artist_featured = await runQuery("MATCH (:Artist{id:$id})<-[:FEATURING]-(p1:Song) "+
            "RETURN p1.id "+
            "LIMIT 50 ",
            {'id': id});

        

        cleaned_playlist = []

        for (let i = 0; i<50; i++) {
            if (similar_artist_songs.records.length > i && !cleaned_playlist.includes(similar_artist_songs.records[i]._fields[0])) {
                cleaned_playlist.push(similar_artist_songs.records[i]._fields[0]);
            }
            if (similar_songs_featured.records.length > i && !cleaned_playlist.includes(similar_songs_featured.records[i]._fields[0])) {
                cleaned_playlist.push(similar_songs_featured.records[i]._fields[0]);
            }
            if (similar_songs_featured_by.records.length > i && !cleaned_playlist.includes(similar_songs_featured_by.records[i]._fields[0])) {
                cleaned_playlist.push(similar_songs_featured_by.records[i]._fields[0]);
            }
            if (similar_songs_artist_featuring_artist.records.length > i && !cleaned_playlist.includes(similar_songs_artist_featuring_artist.records[i]._fields[0])) {
                cleaned_playlist.push(similar_songs_artist_featuring_artist.records[i]._fields[0]);
            }
            if (similar_artist_featured.records.length > i && !cleaned_playlist.includes(similar_artist_featured.records[i]._fields[0])) {
                cleaned_playlist.push(similar_artist_featured.records[i]._fields[0]);
            }
            if (similar_songs.records.length > i && !cleaned_playlist.includes(similar_songs.records[i]._fields[0])) {
                cleaned_playlist.push(similar_songs.records[i]._fields[0]);
            }
            if (similar_songs_artist_featuring_featuring.records.length > i && !cleaned_playlist.includes(similar_songs_artist_featuring_featuring.records[i]._fields[0])) {
                cleaned_playlist.push(similar_songs_artist_featuring_featuring.records[i]._fields[0]);
            }
            if (cleaned_playlist.length >= 50) {
                break;
            }
        }

        if(cleaned_playlist.length > 50)
            cleaned_playlist.splice(50);

        await res.json({'success': id, 'playlist': cleaned_playlist})

        // .finally(res.json({'success': id, 'type': idType}))
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

        let similarity_function = "WHERE p1 <> p2 "+
        "WITH SUM(ABS(p1.danceability - p2.danceability) + ABS(p1.energy - p2.energy) + "+
        "ABS(p1.speechiness - p2.speechiness) + ABS(p1.acousticness - p2.acousticness) + "+
        "ABS(p1.instrumentalness - p2.instrumentalness) + ABS(p1.liveness - p2.liveness) + "+
        "ABS(p1.valence - p2.valence)) + ABS((p1.tempo / 250) - (p2.tempo / 250)) + "+ 
        "ABS((p1.key / 250) - (p2.key / 250)) + ABS(((p1.loudness + 60) / 67.23) - ((p2.loudness + 60) / 67.23)) AS sim, "+
        "p1, p2 "+
        "RETURN p2.id "+
        "ORDER BY sim ASC "

        // grab 50 songs with similar features
        let similar_features = await runQuery("MATCH (p1:Song{id:$id}), (p2:Song) "+
            similarity_function+
            "LIMIT 50 ",
            {'id': id});

        // grab 50 songs from the same artist
        let similar_songs = await runQuery("MATCH (p1:Song{id:$id})-[:BY]->(:Artist)<-[:BY]-(p2:Song) "+
            similarity_function+
            "LIMIT 50 ",
            {'id': id});

        // grab 50 songs featuring the same artist
        let similar_songs_artist_featuring_artist = await runQuery("MATCH (p1:Song{id:$id})-[:BY]->(:Artist)<-[:BY]-(:Song)-[:FEATURING]->(:Artist)<-[:BY]-(p2:Song) "+
            similarity_function+
            "LIMIT 25 ",
            {'id': id});

        // grab 50 songs featuring the same artist
        let similar_songs_artist_featuring_featuring = await runQuery("MATCH (p1:Song{id:$id})-[:BY]->(:Artist)<-[:BY]-(:Song)-[:FEATURING]->(:Artist)<-[:FEATURING]-(p2:Song) "+
            similarity_function+
            "LIMIT 25 ",
            {'id': id});
        
        // grab 50 songs featuring the same artist
        let similar_songs_featured = await runQuery("MATCH (p1:Song{id:$id})-[:BY]->(:Artist)<-[:FEATURING]-(p2:Song) "+
            similarity_function+
            "LIMIT 50 ",
            {'id': id});

        // grab 50 songs featuring the same artist
        let similar_songs_featured_by = await runQuery("MATCH (p1:Song{id:$id})-[:BY]->(:Artist)<-[:FEATURING]-(:Song)-[:BY]->(:Artist)<-[:BY]-(p2:Song) "+
            similarity_function+
            "LIMIT 25 ",
            {'id': id});
        
        // grab 50 songs by a featured artist
        let similar_artist_songs = await runQuery("MATCH (p1:Song{id:$id})-[:FEATURING]->(:Artist)<-[:BY]-(p2:Song) "+
            similarity_function+
            "LIMIT 50 ",
            {'id': id});
        
        // grab 50 songs featuring a featured artist 
        let similar_artist_featured = await runQuery("MATCH (p1:Song{id:$id})-[:FEATURING]->(:Artist)<-[:FEATURING]-(p2:Song) "+
            similarity_function+
            "LIMIT 50 ",
            {'id': id});

        

        cleaned_playlist = []

        for (let i = 0; i<similar_features.records.length; i++) {
            if (similar_artist_songs.records.length > i && !cleaned_playlist.includes(similar_artist_songs.records[i]._fields[0])) {
                cleaned_playlist.push(similar_artist_songs.records[i]._fields[0]);
            }
            if (similar_songs_featured.records.length > i && !cleaned_playlist.includes(similar_songs_featured.records[i]._fields[0])) {
                cleaned_playlist.push(similar_songs_featured.records[i]._fields[0]);
            }
            if (similar_songs_featured_by.records.length > i && !cleaned_playlist.includes(similar_songs_featured_by.records[i]._fields[0])) {
                cleaned_playlist.push(similar_songs_featured_by.records[i]._fields[0]);
            }
            if (similar_songs_artist_featuring_artist.records.length > i && !cleaned_playlist.includes(similar_songs_artist_featuring_artist.records[i]._fields[0])) {
                cleaned_playlist.push(similar_songs_artist_featuring_artist.records[i]._fields[0]);
            }
            if (similar_artist_featured.records.length > i && !cleaned_playlist.includes(similar_artist_featured.records[i]._fields[0])) {
                cleaned_playlist.push(similar_artist_featured.records[i]._fields[0]);
            }
            if (similar_songs.records.length > i && !cleaned_playlist.includes(similar_songs.records[i]._fields[0])) {
                cleaned_playlist.push(similar_songs.records[i]._fields[0]);
            }
            if (similar_songs_artist_featuring_featuring.records.length > i && !cleaned_playlist.includes(similar_songs_artist_featuring_featuring.records[i]._fields[0])) {
                cleaned_playlist.push(similar_songs_artist_featuring_featuring.records[i]._fields[0]);
            }
            if (cleaned_playlist.length >= 50) {
                break;
            }
        }

        for (let i = 0; similar_features.records.length; i++) {
            if (!cleaned_playlist.includes(similar_features.records[i]._fields[0])) {
                cleaned_playlist.push(similar_features.records[i]._fields[0]);
            }
            if (cleaned_playlist.length >= 50) {
                break;
            }
        }

        if(cleaned_playlist.length > 50)
            cleaned_playlist.splice(50);

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