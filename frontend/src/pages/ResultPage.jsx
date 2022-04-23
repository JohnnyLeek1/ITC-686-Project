import React, { useContext, useState, useEffect } from "react";
import { UserContext } from "../App";

export default function ResultPage() {

    const userContext = useContext(UserContext);
    const [playlistInfo, setPlaylistInfo] = useState(undefined);

    useEffect(() => {

        if(userContext.generatedPlaylist !== undefined) {
            fetch('/get_track_info', {
                method: 'POST',
                headers: {'content-type': 'application/json'},
                body: JSON.stringify({ids: userContext.generatedPlaylist})
            }).then(response => response.json())
            .then(data => setPlaylistInfo(data.body.tracks))
        }

    }, [userContext.generatedPlaylist])

    const SongDisplay = ({song, index}) => {
        return (
            <div className="song_display">
                <p className="number">{index + 1}</p>
                <img className="album_art" src={song.album.images[0].url} alt={`Album art for ${song.album.name}`} />
                <div className="title">
                    <p className="song">{song.name}</p>
                    <p className="artists">{song.artists.map(artist => artist.name).join(", ")}</p>
                </div>
                <p className="album_name">{song.album.name}</p>
                <p className="duration">{song.duration_ms / 1000} seconds</p>
            </div>
        );

    }

    return (
        <div id="results">
            <div className="song_display title_bar">
                <p className="number">#</p>
                <p className="album_art"> </p>
                <div className="title">
                    <p className="song">Title </p>
                </div>
                <p className="album_name">Album</p>
                <p className="duration">Duration</p>
            </div>
            {playlistInfo ? playlistInfo.map((song, i) => <SongDisplay song={song} index={i} key={i} /> ) : undefined}
        </div>
    )


}