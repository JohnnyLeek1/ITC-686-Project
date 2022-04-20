import React, { useState } from 'react';

import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import Authenticate from './pages/Authenticate';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';

import './styles/App.scss';
import SelectedSongPage from './pages/SelectedSongPage';

export const UserContext = React.createContext({});

function App() {
  const [accessToken, setAccessToken] = useState(undefined);
  const [refreshToken, setRefreshToken] = useState(undefined);
  const [userInfo, setUserInfo] = useState(undefined);
  const [selectedSong, setSelectedSong] = useState(undefined);

  return (
    <div id="app_container">
        <UserContext.Provider value={{ 
          accessToken: accessToken, setAccessToken: setAccessToken, 
          refreshToken: refreshToken, setRefreshToken: setRefreshToken, 
          userInfo: userInfo, setUserInfo: setUserInfo,
          selectedSong: selectedSong, setSelectedSong: setSelectedSong
        }}>
          <Router>
            <Routes>
              <Route path="/login/:accessToken/:refreshToken" element={<Authenticate />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/confirm_selection" element={<SelectedSongPage />} />
              <Route path="/" element={<LoginPage />} />
            </Routes>
          </Router>
        </UserContext.Provider>
    </div>
  );
}

export default App;
