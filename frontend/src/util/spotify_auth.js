const authEndpoint = "https://accounts.spotify.com/authorize";
const redirectURL = "http://localhost:8000/authenticate/";
const clientId = "0f34b94d851840ea81395883148fcd72";

const oAuthScopes = [ "user-read-private" ]

// Join oAuthScopes with %20 because that is a space character with HTTP Encoding
export const loginURL = `${authEndpoint}?client_id=${clientId}&response_type=code&redirect_uri=${redirectURL}&scope=${oAuthScopes.join("%20")}`;