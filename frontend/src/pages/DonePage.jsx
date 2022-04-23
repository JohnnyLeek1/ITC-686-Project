import React, { useContext } from "react";
import { UserContext } from "../App";

export default function DonePage() {

    const userContext = useContext(UserContext);

    return (
        <div id="done_page" className="fade_in">
            <h1>"{userContext.generatedPlaylistName}" has been created!</h1>
            <a href={userContext.generatedPlaylistLink} rel="noopener noreferrer"><div id="view_button">View your new playlist on Spotify</div></a>
            <a href="/home"><h6 className="generate_again_link">Or generate another...</h6></a>
        </div>
    );

}