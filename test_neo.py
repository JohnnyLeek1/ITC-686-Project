from concurrent.futures import process
from neo4j import GraphDatabase
import pandas as pd
import os

class SpotifyDatabase:

    def __init__(self, uri, user, password):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        self.driver.close()

    def create_song(self, song_info):
        with self.driver.session() as session:
            song = session.write_transaction(self._create_song, song_info)
            print(song)

    @staticmethod
    def _create_song(tx, song_info):
        result = tx.run("CREATE (a:Song) "
                        "SET a.id = $id "
                        "SET a.name = $name "
                        "SET a.album = $album "
                        "SET a.album_id = $album_id "
                        "SET a.artist = $artist "
                        "SET a.artist_id = $artist_id "
                        "SET a.explicit = $explicit "
                        "SET a.danceability = $danceability "
                        "SET a.energy = $energy "
                        "SET a.key = $key "
                        "SET a.loudness = $loudness "
                        "SET a.speechiness = $speechiness "
                        "SET a.acousticness = $acousticness "
                        "SET a.instrumentalness = $instrumentalness "
                        "SET a.liveness = $liveness "
                        "SET a.valence = $valence "
                        "SET a.tempo = $tempo "
                        "SET a.duration_ms = $duration_ms "
                        "SET a.year = $year "
                        "SET a.release_date = $release_date "
                        "RETURN a.name",
                        id=song_info[0], name=song_info[1], album=song_info[2], 
                        album_id=song_info[3], artist=song_info[4][0], artist_id=song_info[5][0],
                        explicit=song_info[6], danceability=song_info[7], energy=song_info[8],
                        key=song_info[9], loudness=song_info[10], speechiness=song_info[11],
                        acousticness=song_info[12], instrumentalness=song_info[13], liveness=song_info[14],
                        valence=song_info[15], tempo=song_info[16], duration_ms=song_info[17],
                        year=song_info[18], release_date=song_info[19])
        return result.single()[0]


if __name__ == "__main__":
    database = SpotifyDatabase("bolt://localhost:7687", "neo4j", "password")

    os.chdir(os.getcwd() + '/')
    song_info = []

    with pd.read_csv(f'tracks_features.csv', chunksize=10000) as reader:
        for chunk in reader:
            for i in range(0, len(chunk['id'])):
                song = []
                for key in chunk:
                    if (key == 'track_number' or key == 'disc_number' or key == 'mode' or key == 'time_signature'):
                        continue
                    elif (key == 'explicit'):
                        song.append(bool(chunk[key][i]))
                    elif (key == 'id' or key == 'name' or key == 'album' or key == 'album_id' or key == 'release_date' or key == 'artists' or key == 'artist_ids'):
                        song.append(chunk[key][i])
                    else:
                        song.append(float(chunk[key][i]))
                database.create_song(song_info=song)

    database.close()