import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../App";
import defaultSong from '../images/default_playlist_pic.png';
import LoadingIcon from "../LoadingIcon";

export default function ResultPage() {

    const userContext = useContext(UserContext);
    const [playlistInfo, setPlaylistInfo] = useState(undefined);
    const [playlistButtonText, setPlaylistButtonText] = useState('Add playlist to my Spotify');

    const navigate = useNavigate();

    useEffect(() => {

        if(userContext.generatedPlaylist !== undefined) {
            fetch('/get_track_info', {
                method: 'POST',
                headers: {'content-type': 'application/json'},
                body: JSON.stringify({ids: userContext.generatedPlaylist})
            }).then(response => response.json())
            .then(data => setPlaylistInfo(data.body.tracks))
        }

    }, [userContext.generatedPlaylist]);

    const addPlaylist = () => {
        setPlaylistButtonText("Adding...");
        fetch('/add_tracks_to_spotify', {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: JSON.stringify({name: userContext.selectedSong.trackName, ids: userContext.generatedPlaylist})
        }).then(response => response.json())
        .then(data => {
            userContext.setGeneratedPlaylistName(data.name);
            userContext.setGeneratedPlaylistLink(data.link);
            navigate('/done');
        })
    }

    const convertTime = timeMs => {
        const totalSeconds = timeMs / 1000;
        const minutes = ~~(totalSeconds / 60);
        const seconds = ~~(totalSeconds - (minutes * 60));
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    const SongDisplay = ({song, index}) => {
        return (
            <a href={song.uri} target="_blank" rel="noreferrer noopener">
                <div className="song_display">
                    <p className="number">{index + 1}</p>
                    <img className="album_art" src={song.album.images[0] ? song.album.images[0].url : defaultSong} alt={`Album art for ${song.album.name}`} />
                    <div className="title">
                        <p className="song">{song.name}</p>
                        <p className="artists">{song.artists.map(artist => artist.name).join(", ")}</p>
                    </div>
                    <p className="album_name">{song.album.name}</p>
                    <p className="duration">{convertTime(song.duration_ms)}</p>
                </div>
            </a>
        );

    }

    return (
        <div id="result_page">
            <h1 className="result_title">The Results are in...</h1>
            <div id="results">
                <div className="song_display title_bar">
                    <p className="number">#</p>
                    <p className="album_art"> </p>
                    <div className="title">
                        <p className="song">Title</p>
                    </div>
                    <p className="album_name">Album</p>
                    <p className="duration">Duration</p>
                </div>
                {playlistInfo ? playlistInfo.map((song, i) => <SongDisplay song={song} index={i} key={i} /> ) : <div className="center"><LoadingIcon /></div>}
            </div>
            <div id="add_button" onClick={() => playlistButtonText !== "Adding..." ? addPlaylist() : {}}>{playlistButtonText}</div>
        </div>
    )


}