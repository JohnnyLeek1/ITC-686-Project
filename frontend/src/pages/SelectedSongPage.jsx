import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../App";
import LoadingIcon from "../LoadingIcon";

export default function SelectedSongPage() { 
 
    const [songFeatures, setSongFeatures] = useState(undefined);
    const userContext = useContext(UserContext);
    const navigate = useNavigate();

    useEffect(() => {
        if(userContext.selectedSong === undefined) { navigate('/home'); return; }

        if(userContext.selectedSong.type === "song") {
            fetch(`/get_track_features/?trackId=${userContext.selectedSong.songId}`)
            .then(response => response.json())
            .then(data => setSongFeatures(data.body));
        }
    }, [userContext.selectedSong, navigate]);

    const selectSong = () => {

        console.log(userContext.selectedSong.songId);

        fetch('/generate_similar', {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: JSON.stringify({id: userContext.selectedSong.songId, idType: userContext.selectedSong.type})
        })
        .then(response => response.json())
        .then(data => { userContext.setGeneratedPlaylist(data.playlist); navigate('/results') });
    }    

    const AudioFeature = ({featureName, value, color}) => {
        return (
            <div className="audio_feature">
                {featureName} ({(value * 100).toFixed(1)}%)
                <div className="progress">
                    <div className={`progress-bar progress-bar-striped progress-bar-animated ${color}`} role="progressbar" aria-valuenow={value * 100} aria-valuemin="0" aria-valuemax="100" style={{width: `${value * 100}%`}}></div>
                </div>
            </div>
        );
    }

    return (
        <>
            {userContext.selectedSong !== undefined ? 
                <div id="selected_song_page" className="fade_in">
                    <h1 className={userContext.selectedSong.type === "song" ? 'left_align' : ''}>Good choice!</h1>
                    <div id="song_info_container">
                        <div className="left">
                            <img src={userContext.selectedSong.image} alt={`Album art for ${userContext.selectedSong.albumName}`} />
                            <p className="track_name">{userContext.selectedSong.trackName}</p>
                            <p className="artist_name">{userContext.selectedSong.artist}</p>
                        </div>
                        {userContext.selectedSong.type === "song" ?
                            <div className="right">
                                <p className="header">About this song:</p>
                                {songFeatures === undefined ? <LoadingIcon /> : 
                                    <>
                                    <AudioFeature featureName="Danceability" value={songFeatures?.danceability} color="bg-info" />
                                    <AudioFeature featureName="Energy" value={songFeatures?.energy} color="bg-warning" />
                                    <AudioFeature featureName="Acousticness" value={songFeatures?.acousticness} color="bg-success" />
                                    </>
                                }
                            </div>
                        : undefined
                        }
                    </div>
                    <div id="button_container">
                        <div id="back_button" onClick={() => navigate('/home')}>Go back</div>
                        <div id="recommend_button" onClick={() => selectSong()}>Recommend me songs like {userContext.selectedSong.trackName}</div>
                    </div>
                </div>
            : undefined
            }
        </>
    );

}