from concurrent.futures import process
from pypher import Pypher
from neo4j import GraphDatabase
import pandas as pd
import os, json
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
from dotenv import load_dotenv

DATA_DIR = "data/"
CHUNK_SIZE = 50
class SpotifyDatabase:

    def __init__(self, uri, user, password):
        load_dotenv()
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        self.spotify = spotipy.Spotify(client_credentials_manager=SpotifyClientCredentials())

    def close(self):
        self.driver.close()

    def create_songs(self, song_list):
        song_ids = []

        songs = {}

        # Get song IDs from songs
        for song in song_list:
            song_ids.append(song["track_uri"].split(':')[-1])

        features = self.spotify.audio_features(song_ids)
        tracks = self.spotify.tracks(song_ids)


        for feature in features:
            songs[feature["id"]] = feature
            
        for track in tracks["tracks"]:
            songs[track["id"]]["album"] = track["album"]["name"]
            songs[track["id"]]["album_id"] = track["album"]["id"]
            songs[track["id"]]["name"] = track["name"]

            artist_names = []

            for artist in track["artists"]:
                artist_names.append({"name": artist["name"], "id": artist["id"]})

            songs[track["id"]]["artists"] = artist_names

        ### Debug print if needed
        # print(song_ids)
        # print(json.dumps(songs, indent=2))

        for song in songs:
            self.create_song(songs[song])
        print(f'Created chunk of {CHUNK_SIZE} songs')

    def create_song(self, song_info):
        with self.driver.session() as session:
            session.write_transaction(self._create_song, song_info)

    def _create_song(self, tx, song_info):
        # Create song, album, and artist nodes
        tx.run("MERGE (a:Song{id:$id, name:$name, danceability:$danceability, "
               "energy:$energy, key:$key, loudness:$loudness, speechiness:$speechiness, "
               "acousticness:$acousticness, instrumentalness:$instrumentalness, liveness:$liveness, valence:$valence, "
               "tempo:$tempo, duration_ms:$duration_ms})",
                id=song_info["id"], name=song_info["name"],
                danceability=song_info["danceability"], energy=song_info["energy"],
                key=song_info["key"], loudness=song_info["loudness"], speechiness=song_info["speechiness"],
                acousticness=song_info["acousticness"], instrumentalness=song_info["instrumentalness"], liveness=song_info["liveness"],
                valence=song_info["valence"], tempo=song_info["tempo"], duration_ms=song_info["duration_ms"])
        
        tx.run("MERGE (a:Album{name:$album, id:$album_id})", album=song_info["album"], album_id=song_info["album_id"])
        
        for i in range(0, len(song_info["artists"])):
            tx.run("MERGE (a:Artist{name:$artist, id:$artist_id})", artist=song_info["artists"][i]["name"], artist_id=song_info["artists"][i]["id"])
            # for genre in song_info["artists"][i]["genre"]:
            #     tx.run("MERGE (a:Genre{name:$genre})",
            #     genre=genre)
            #     tx.run("MATCH (a:Artist), (b:Genre) "
            #         "WHERE a.id = $id AND b.name = $genre "
            #         "CREATE (a)-[r:MUSIC_GENRE]->(b) ",
            #     id=song_info["artists"][i]["id"], genre=genre)

        # # Connect each together as needed
        tx.run("MATCH (a:Song), (b:Album) "
                "WHERE a.id = $id AND b.id = $album_id "
                "MERGE (a)-[r:ALBUM_TRACK]->(b) ",
            id=song_info["id"], album_id=song_info["album_id"])


        for i in range(0, len(song_info["artists"])):
            if i == 0:
                tx.run("MATCH (a:Album), (b:Artist) "
                        "WHERE a.id = $album_id AND b.id = $artist_id "
                        "MERGE (a)-[r:CREATED_BY]->(b) ",
                    artist_id=song_info["artists"][i]["id"], album_id=song_info["album_id"])
                tx.run("MATCH (a:Song), (b:Artist) "
                        "WHERE a.id = $id AND b.id = $artist_id "
                        "MERGE (a)-[r:BY]->(b) ",
                    id=song_info["id"], artist_id=song_info["artists"][i]["id"])
            else:
                tx.run("MATCH (a:Song), (b:Artist) "
                        "WHERE a.id = $id AND b.id = $artist_id "
                        "MERGE (a)-[r:FEATURING]->(b) ",
                    artist_id=song_info["artists"][i]["id"], id=song_info["id"])

if __name__ == "__main__":
    database = SpotifyDatabase("bolt://localhost:7687", "neo4j", "password")

    os.chdir(os.getcwd() + '/')

    filenames = os.listdir(DATA_DIR)

    print(f"Reading data from {DATA_DIR}...")

    current_songs = []

    os.chdir(f'{os.getcwd()}/{DATA_DIR}')
    for filename in sorted(filenames):
        if filename.startswith("mpd.slice"):
            playlist_file = open(filename)
            playlist_as_string = playlist_file.read()
            playlist_file.close()

            playlists = json.loads(playlist_as_string)["playlists"]
            for playlist in playlists:
                for track in playlist["tracks"]:
                    current_songs.append(track)

                    # Chunk size reached
                    if len(current_songs) == CHUNK_SIZE:
                        database.create_songs(current_songs)
                        current_songs = []   

    database.close()