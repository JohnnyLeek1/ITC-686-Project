import React, { useState, useContext, useEffect } from "react";
import { UserContext } from "../App";
import LoadingIcon from "../LoadingIcon";
import defaultProfile from '../images/default_profile_pic.png';
import defaultPlaylist from '../images/default_playlist_pic.png';
import { useNavigate } from "react-router-dom";

export default function HomePage() {

    const [showNextScreen, setShowNextScreen] = useState(false);
    const [topTracks, setTopTracks] = useState(undefined);
    const [topArtists, setTopArtists] = useState(undefined);
    const [playlists, setPlaylists] = useState(undefined);

    const userContext = useContext(UserContext);
    const navigate = useNavigate();

    useEffect(() => {
        if(userContext.userInfo === undefined || topTracks === undefined) {
            fetch('/my_info')
            .then(response => response.json())
            .then(data => userContext.setUserInfo(data.body));

            fetch('/top_tracks')
            .then(response => response.json())
            .then(data => setTopTracks(data.body.items));

            fetch('/top_artists')
            .then(response => response.json())
            .then(data => setTopArtists(data.body.items));

            fetch('/my_playlists')
            .then(response => response.json())
            .then(data => setPlaylists(data.body.items));
        }
    }, [userContext, topTracks])

    const selectSong = song => {
        userContext.setSelectedSong(song);
        navigate('/confirm_selection');
    }

    const WelcomeScreen = () => {
        const [animationClass, setAnimationClass] = useState('fade_in');
        const ANIMATION_DELAY = 2000;
        setTimeout(() => setAnimationClass('fade_out'), ANIMATION_DELAY);
        setTimeout(() => setShowNextScreen(true), ANIMATION_DELAY + 1000);

        return <>{showNextScreen ? undefined : <p className={animationClass}>Welcome, {userContext.userInfo.display_name}...</p>}</>
    }

    const HomeScreen = () => {
        const [currentTab, setCurrentTab] = useState("top_tracks");

        const TrackDisplay = ({image, albumName, trackName, artist, type, songId}) => {

            return (
                <div className="track" onClick={() => selectSong({ image: image, albumName: albumName, trackName: trackName, artist: artist, type: type, songId: songId })}>
                    <img src={image} alt={`Album art for ${albumName}`} />
                    <div className="text_container">
                        <p className="track_name">{trackName}</p>
                        <p className="artist_name">{artist}</p>
                    </div>
                </div>
            );
        }

        const TopTracks = () => {
            return (
                <>
                    <h3 className="help_text">Select one of your top tracks:</h3>

                    <div id="track_container" className="fade_in">
                        {topTracks.map((track, index) => <TrackDisplay image={track.album.images[0].url} albumName={track.album.name} trackName={track.name} artist={track.artists[0].name} type="song" songId={track.id} key={index} />)}
                    </div>
                </>
            );
        }

        const TopArtists = () => {
            return (
                <>
                    <h3 className="help_text">Select one of your top artists:</h3>

                    <div id="track_container" className="fade_in">
                        {topArtists.map((artist, index) => <TrackDisplay image={artist.images[0].url} albumName={artist.name} trackName={artist.name} artist="" type="artist" songId={artist.id} key={index} />)}
                    </div>
                </>
            );
        }

        const MyPlaylists = () => {
            return (
                <>
                    <h3 className="help_text">Select one of your playlists:</h3>

                    <div id="track_container" className="fade_in">
                        {playlists.map((playlist, index) => <TrackDisplay image={playlist.images[0] ? playlist.images[0].url : defaultPlaylist} albumName={playlist.name} trackName={playlist.name} artist="" type="playlist" key={index} /> )}
                    </div>
                </>
            );
        }

        const getTab = () => {
            const tabs = {
                "top_tracks": <TopTracks />,
                "top_artists": <TopArtists />,
                "my_playlists": <MyPlaylists />
            }
            return tabs[currentTab];
        }

        return (
            <div id="home_screen" className="fade_in">
                <div id="profile_pic_container">
                    <img src={ userContext.userInfo.images[0] ? userContext.userInfo.images[0].url : defaultProfile } alt={`${userContext.userInfo.display_name}'s Profile Picture}`} />
                    <p>{userContext.userInfo.display_name}</p>
                </div>
                
                <div id="select_table">
                    <div className="tabs">
                        <div className={`tab ${currentTab === "top_tracks" ? 'active' : ''}`} onClick={() => setCurrentTab("top_tracks")}>My Top Tracks</div>
                        <div className={`tab ${currentTab === "top_artists" ? 'active' : ''}`} onClick={() => setCurrentTab("top_artists")}>My Top Artists</div>
                        <div className={`tab ${currentTab === "my_playlists" ? 'active' : ''}`} onClick={() => setCurrentTab("my_playlists")}>My Playlists</div>
                    </div>
                    <div className="body">
                        {getTab()}
                    </div>
                </div>
            </div>
        );
    }


    return (
        <>
            {userContext.userInfo === undefined || topTracks === undefined ? <LoadingIcon /> : <WelcomeScreen />}
            {showNextScreen ? <HomeScreen /> : undefined}
        </>
    )
}