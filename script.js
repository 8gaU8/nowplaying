const redirect_uri = 'https://8gaU8.github.io/nowplaying'; // GitHub PagesのURLを入力

const authEndpoint = 'https://accounts.spotify.com/authorize';
const scopes = [
    'user-read-playback-state',
];

document.getElementById('save-client-id').addEventListener('click', () => {
    const clientId = document.getElementById('client-id').value;
    const discogsToken = document.getElementById('discogs-token').value;
    if (clientId && discogsToken)
    {
        localStorage.setItem('spotify_client_id', clientId);
        localStorage.setItem('discogs_token', discogsToken);
        window.location.reload();
    }
});

document.getElementById('login-button').addEventListener('click', () => {
    const clientId = localStorage.getItem('spotify_client_id');
    if (clientId)
    {
        window.location = `${authEndpoint}?client_id=${clientId}&redirect_uri=${redirect_uri}&scope=${scopes.join('%20')}&response_type=token&show_dialog=true`;
    }
});

document.getElementById('logout-button').addEventListener('click', () => {
    localStorage.removeItem('spotify_access_token');
    window.location.reload();
});

function getAccessToken() {
    const hash = window.location.hash
        .substring(1)
        .split('&')
        .reduce((initial, item) => {
            if (item)
            {
                let parts = item.split('=');
                initial[parts[0]] = decodeURIComponent(parts[1]);
            }
            return initial;
        }, {});
    window.location.hash = '';

    let _token = hash.access_token;

    if (_token)
    {
        localStorage.setItem('spotify_access_token', _token);
    } else
    {
        _token = localStorage.getItem('spotify_access_token');
    }

    return _token;
}

function cleanTrackName(trackName) {
    return trackName.replace(/\s*\(.*?\)\s*/g, '');
}

async function fetchPersonnel(track, artist) {
    const query = `${track} ${artist}`;
    const discogsToken = localStorage.getItem('discogs_token');
    const url = `https://api.discogs.com/database/search?q=${encodeURIComponent(query)}&token=${discogsToken}`;

    try
    {
        const response = await fetch(url);
        const data = await response.json();

        if (data.results.length > 0)
        {
            const masterUrl = data.results[0].master_url;
            if (masterUrl)
            {
                const masterResponse = await fetch(masterUrl);
                const masterData = await masterResponse.json();

                const personnelList = masterData.tracklist
                    .filter(trackItem => cleanTrackName(trackItem.title.toLowerCase()) === track.toLowerCase())
                    .flatMap(trackItem => trackItem.extraartists || []);

                const personnelListElement = document.getElementById('personnel-list');
                personnelListElement.innerHTML = '';
                personnelList.forEach(person => {
                    const listItem = document.createElement('li');
                    listItem.textContent = `${person.name} - ${person.role}`;
                    personnelListElement.appendChild(listItem);
                });
            }
        }
    } catch (error)
    {
        console.error('Error fetching Discogs data:', error);
    }
}

async function getEnglishTrackDetails(trackId, token) {
    const url = `https://api.spotify.com/v1/tracks/${trackId}`;
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept-Language': 'en',
        }
    });
    const trackData = await response.json();
    return {
        name: cleanTrackName(trackData.name),
        artist: trackData.artists[0].name
    };
}

window.addEventListener('load', async () => {
    const clientId = localStorage.getItem('spotify_client_id');
    const discogsToken = localStorage.getItem('discogs_token');

    if (!clientId || !discogsToken)
    {
        document.getElementById('client-id-form').style.display = 'block';
        document.getElementById('login').style.display = 'none';
        document.getElementById('player').style.display = 'none';
    } else
    {
        const token = getAccessToken();

        if (token)
        {
            document.getElementById('client-id-form').style.display = 'none';
            document.getElementById('login').style.display = 'none';
            document.getElementById('player').style.display = 'block';

            try
            {
                const response = await fetch('https://api.spotify.com/v1/me/player', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept-Language': 'en',
                    }
                });
                const data = await response.json();

                if (data && data.is_playing)
                {
                    const track = data.item;
                    const trackDetails = await getEnglishTrackDetails(track.id, token);

                    document.getElementById('track-name').innerText = trackDetails.name;
                    document.getElementById('artist-name').innerText = trackDetails.artist;
                    document.getElementById('album-name').innerText = track.album.name;
                    document.getElementById('album-art').src = track.album.images[0].url;

                    fetchPersonnel(trackDetails.name, trackDetails.artist);
                } else
                {
                    document.getElementById('track-name').innerText = 'No track currently playing';
                }
            } catch (error)
            {
                console.error('Error fetching Spotify data:', error);
            }
        } else
        {
            document.getElementById('client-id-form').style.display = 'none';
            document.getElementById('login').style.display = 'block';
            document.getElementById('player').style.display = 'none';
        }
    }
});