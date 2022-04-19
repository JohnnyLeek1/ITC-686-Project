import React, { useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserContext } from "../App";

export default function Authenticate() {

    const { accessToken, refreshToken } = useParams();
    const navigate = useNavigate();
    const userContext = useContext(UserContext);

    useEffect(() => {
        if(userContext.accessToken === undefined) userContext.setAccessToken(accessToken);
        if(userContext.refreshToken === undefined) userContext.setRefreshToken(refreshToken);

        navigate('/home');
    }, [userContext, accessToken, refreshToken, navigate]);


    return (
        <>
        Authenticating...
        </>
    )

}