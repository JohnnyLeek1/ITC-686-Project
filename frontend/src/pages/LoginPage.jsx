import React from "react";
import spotifyLogo from '../images/Spotify_Logo_RGB_Green.png';
import { loginURL } from "../util/spotify_auth";

export default function LoginPage() {

    return (
        <>
        <div id="logo_container">
            <h1><img src={spotifyLogo} id="spotify_logo" alt="Spotify Logo" /> Recommendation Generator</h1>
        </div>
        <a href={loginURL}>
            <div id="login_button">
                Login with spotify
            </div>
        </a>
        {/* <p>{loginURL}</p> */}
        </>
    );

}