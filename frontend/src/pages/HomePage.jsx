import React, { useState, useContext, useEffect } from "react";
import { UserContext } from "../App";
import LoadingIcon from "../LoadingIcon";

export default function HomePage() {

    const [loading, setLoading] = useState(true);
    const userContext = useContext(UserContext);

    useEffect(() => {
        fetch('/my_info')
        .then(response => response.json())
        .then(data => {
            userContext.setUserInfo(data.body);
            setLoading(false);
        })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])


    const WelcomeScreen = () => {

        return <p>Welcome, {userContext.userInfo.display_name}</p>

    }


    return (
        <>
        
            {loading ? <LoadingIcon /> : <WelcomeScreen />}

        </>
    )
}