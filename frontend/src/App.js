import React, { useState } from 'react';

import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import Authenticate from './pages/Authenticate';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';

import './styles/App.scss';
import SelectedSongPage from './pages/SelectedSongPage';
import ResultPage from './pages/ResultPage';
import DonePage from './pages/DonePage';

export const UserContext = React.createContext({});

function App() {
  const [accessToken, setAccessToken] = useState(undefined);
  const [refreshToken, setRefreshToken] = useState(undefined);
  const [userInfo, setUserInfo] = useState(undefined);
  const [selectedSong, setSelectedSong] = useState(undefined);
  const [generatedPlaylist, setGeneratedPlaylist] = useState(undefined);
  const [generatedPlaylistName, setGeneratedPlaylistName] = useState(undefined);
  const [generatedPlaylistLink, setGeneratedPlaylistLink] = useState(undefined);

  return (
    <div id="app_container">
        <UserContext.Provider value={{ 
          accessToken, setAccessToken, 
          refreshToken, setRefreshToken, 
          userInfo, setUserInfo,
          selectedSong, setSelectedSong,
          generatedPlaylist, setGeneratedPlaylist,
          generatedPlaylistName, setGeneratedPlaylistName,
          generatedPlaylistLink, setGeneratedPlaylistLink
        }}>
          <Router>
            <Routes>
              <Route path="/login/:accessToken/:refreshToken" element={<Authenticate />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/confirm_selection" element={<SelectedSongPage />} />
              <Route path="/results" element={<ResultPage />} />
              <Route path="/done" element={<DonePage />} />
              <Route path="/" element={<LoginPage />} />
            </Routes>
          </Router>
        </UserContext.Provider>
    </div>
  );
}

export default App;
