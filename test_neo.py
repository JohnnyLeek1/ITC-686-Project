from concurrent.futures import process
from pypher import Pypher
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
            session.write_transaction(self._create_song, song_info)

    def _create_song(self, tx, song_info):
        # Create song, album, and artist nodes
        tx.run("CREATE (a:Song) "
                        "SET a.id = $id "
                        "SET a.name = $name "
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
                        id=song_info[0], name=song_info[1],
                        explicit=song_info[6], danceability=song_info[7], energy=song_info[8],
                        key=song_info[9], loudness=song_info[10], speechiness=song_info[11],
                        acousticness=song_info[12], instrumentalness=song_info[13], liveness=song_info[14],
                        valence=song_info[15], tempo=song_info[16], duration_ms=song_info[17],
                        year=song_info[18], release_date=song_info[19])
        tx.run("MERGE (a:Album{name:$album, id:$album_id})", album=song_info[2], album_id=song_info[3])
        for i in range(0, len(song_info[4])):
            tx.run("MERGE (a:Artist{name:$artist, id:$artist_id})", artist=song_info[4][i], artist_id=song_info[5][i])

        # Connect each together as needed
        tx.run("MATCH (a:Song), (b:Album) "
                "WHERE a.id = $id AND b.id = $album_id "
                "CREATE (a)-[r:ALBUM_TRACK]->(b) ",
            id=song_info[0], album_id=song_info[3])


        for i in range(0, len(song_info[4])):
            if i == 0:
                tx.run("MATCH (a:Album), (b:Artist) "
                        "WHERE a.id = $album_id AND b.id = $artist_id "
                        "CREATE (a)-[r:CREATED_BY]->(b) ",
                    artist_id=song_info[4][i], album_id=song_info[3])
                tx.run("MATCH (a:Song), (b:Artist) "
                        "WHERE a.id = $id AND b.id = $artist_id "
                        "CREATE (a)-[r:BY]->(b) ",
                    id=song_info[0], artist_id=song_info[4][i])
            else:
                tx.run("MATCH (a:Song), (b:Artist) "
                        "WHERE a.id = $id AND b.id = $artist_id "
                        "CREATE (a)-[r:FEATURING]->(b) ",
                    artist_id=song_info[4][i], id=song_info[0])

if __name__ == "__main__":
    database = SpotifyDatabase("bolt://localhost:7687", "neo4j", "password")

    os.chdir(os.getcwd() + '/')
    song_info = []

    with pd.read_csv(f'tracks_features.csv', chunksize=1000) as reader:
        print('creating songs')
        for chunk in reader:
            for i in range(chunk['id'][:1].index.start, len(chunk['id']) + chunk['id'][:1].index.start):
                song = []
                for key in chunk:
                    if (key == 'track_number' or key == 'disc_number' or key == 'mode' or key == 'time_signature'):
                        continue
                    elif (key == 'explicit'):
                        song.append(bool(chunk[key][i]))
                    elif (key == 'artists' or key == 'artist_ids'):
                        song.append(eval(chunk[key][i]))
                    elif (key == 'id' or key == 'name' or key == 'album' or key == 'album_id' or key == 'release_date'):
                        song.append(chunk[key][i])
                    else:
                        song.append(float(chunk[key][i]))
                database.create_song(song_info=song)

    database.close()