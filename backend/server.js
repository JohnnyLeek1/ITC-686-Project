const cors = require('cors')
require('dotenv').config();
const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');
const APP = express();
const PORT = 8000;

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

APP.post('/generate_similar', (req, res) => {
    const { id, idType } = req.body;

    console.log(id);
    console.log(idType);

    res.json({'success': id, 'type': idType});
})

APP.listen(PORT, () => {
    console.log(`App listening @ http://localhost:${PORT}`);
})