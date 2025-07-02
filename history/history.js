let weekOffset = 0;

async function loadHistory() {
  try {
    const tokenData = await browser.storage.local.get('scrobblerToken');
    const token = tokenData.scrobblerToken;

    if (!token) {
      document.getElementById('history-body').innerHTML = '<tr><td colspan="8">No token found. Please log in.</td></tr>';
      return;
    }



    const response2 = await fetch('https://127.0.0.1:5000/backupJson', {
      method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token
        }
      });
      const data2 = await response2.json();

      if (!response2.ok) {
        alert('Error: ' + data2.error);
          return;
      }



    const response = await fetch('https://127.0.0.1:5000/scrobbleHistory', {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });

    if (!response.ok) {
      document.getElementById('history-body').innerHTML = '<tr><td colspan="8">Error fetching history</td></tr>';
      return;
    }

    const data = await response.json();
    const tbody = document.getElementById('history-body');
    tbody.innerHTML = '';


    if (!data.history || data.history.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8">No scrobbles found</td></tr>';
      document.getElementById('most-replayed-song').textContent = 'N/A';
      document.getElementById('most-replayed-artist').textContent = 'N/A';
      document.getElementById('most-replayed-album').textContent = 'N/A';
      return;
    }

    data.history.forEach(song => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="text-align: center;"><img src="${song.photo_url}" alt="Song Image" class="song-image" /></div>
        </td>
        <td><div style="text-align: center;">${song.id}<div/></td>
        <td>${song.song_name}</td>
        <td>${song.artist_name}</td>
        <td>${song.album_name || ''}</td>
        <td><div style="text-align: center;">${song.song_year || ''}<div/></td>
        <td class="${song.is_favorite ? 'favorite' : ''}">
          <div class="its_favorite"; style="text-align: center;">${song.is_favorite ? '❤️' : '🤍'}</div>
        </td>
        <td>${song.listened_at ? new Date(song.listened_at).toLocaleString() : ''}</td>
        <td>
          <div style="display: flex; justify-content: center; gap: 10px;">
            <button class=update-btn><i class="fa-solid fa-pen-to-square" style="font-size: 1.25em;"></i></button>
            <button class="delete-btn"><i class="fa-solid fa-trash" style="font-size: 1.25em;"></i></button>
          </div>
        </td>
      `;

      tr.querySelector('.update-btn').addEventListener('click', (e) => {
        if (e.currentTarget.classList.contains('confirm-edit-btn')) return;

        try {
         // console.log(song.id);

          const deletebtn = tr.querySelector('.delete-btn');
          const updatebtn = tr.querySelector('.update-btn');

          if (!deletebtn || !updatebtn) throw new Error("Buttons not found in row");

          const deleteIcon = deletebtn.querySelector('i');
          const confirmIcon = updatebtn.querySelector('i');

          if (!deleteIcon || !confirmIcon) throw new Error("Icons not found inside buttons");

          const imageTd = tr.querySelector('td:nth-child(1)');
          const nameTd = tr.querySelector('td:nth-child(3)');
          const artistTd = tr.querySelector('td:nth-child(4)');
          const albumTd = tr.querySelector('td:nth-child(5)');
          const yearTd = tr.querySelector('td:nth-child(6)');
          const dateTd = tr.querySelector('td:nth-child(8)');

          if (!imageTd || !nameTd || !artistTd || !albumTd || !yearTd || !dateTd)
            throw new Error("Some <td> elements not found");

          // Update icons and class names
          confirmIcon.className = 'fa-solid fa-check';
          confirmIcon.style.color = 'green';

          updatebtn.classList.remove('update-btn');
          updatebtn.classList.add('confirm-edit-btn');

          deleteIcon.className = 'fa-solid fa-ban';
          deleteIcon.style.color = 'red';

          deletebtn.classList.remove('delete-btn');
          deletebtn.classList.add('cancel-edit-btn');

          function toDatetimeLocal(date) {
            const pad = n => String(n).padStart(2, '0');
            return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
          }

          const listenedAtDate = new Date(song.listened_at);
          const localDate = toDatetimeLocal(listenedAtDate);

          // Create editable inputs
          imageTd.innerHTML = `<input class='edit-input' type="url" value="${song.photo_url}" placeholder="Image URL">`;
          nameTd.innerHTML = `<input class='edit-input' type="text" value="${song.song_name}" placeholder="Song Name">`;
          artistTd.innerHTML = `<input class='edit-input' type="text" value="${song.artist_name}" placeholder="Artist">`;
          albumTd.innerHTML = `<input class='edit-input' type="text" value="${song.album_name}" placeholder="Album">`;
          yearTd.innerHTML = `<input class='edit-input' type="number" value="${song.song_year}" placeholder="Year">`;
          dateTd.innerHTML = `<input class='edit-input' type="datetime-local" value="${localDate}">`;

          updatebtn.addEventListener('click', async (e) => {
            if (e.currentTarget.classList.contains('update-btn')) return;

            try {
             // console.log("READY TO UPDATE THE DATABASE OF THIS SPECIFIC ROW...");

              const updatedTrack = {
                photo_url: imageTd.querySelector('input').value,
                song_name: nameTd.querySelector('input').value,
                album_name: albumTd.querySelector('input').value,
                artist_name: artistTd.querySelector('input').value,
                listened_at: dateTd.querySelector('input').value,
              };

              const res = await fetch(`https://127.0.0.1:5000/updateTrack/${song.id}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify(updatedTrack)
              });

              const result = await res.json();

              if (!res.ok) throw new Error(result.error || 'Unknown error');

              alert(result.message || "Track updated successfully!");

              loadHistory();

            } catch (err) {
              console.error("Failed to update track:", err);
              alert("Failed to update track: " + err.message);
            }

            updatebtn.classList.remove('confirm-edit-btn');
            updatebtn.classList.add('update-btn');
          }, { once: true });


          // Cancel button behavior (was delete)
          deletebtn.addEventListener('click', () => {
            try {
              const deleteIcon = deletebtn.querySelector('i');
              if (!deleteIcon) throw new Error("Cancel icon not found");

              // Reset buttons
              deleteIcon.className = 'fa-solid fa-trash';
              deleteIcon.style.color = '';
              deletebtn.classList.remove('cancel-edit-btn');
              deletebtn.classList.add('delete-btn');

              confirmIcon.className = 'fa-solid fa-pen-to-square';
              confirmIcon.style.color = '';
              updatebtn.classList.remove('confirm-edit-btn');
              updatebtn.classList.add('update-btn');

              // Restore row content
              imageTd.innerHTML = `<img src="${song.photo_url}" alt="Song Image" class="song-image" />`;
              nameTd.innerHTML = song.song_name;
              artistTd.innerHTML = song.artist_name;
              albumTd.innerHTML = song.album_name;
              yearTd.innerHTML = `<div style="text-align: center;">${song.song_year || ''}</div>`;
              dateTd.innerHTML = `${song.listened_at ? new Date(song.listened_at).toLocaleString() : ''}`;

            } catch (cancelError) {
              console.error("Error during cancel-edit:", cancelError);
            }
          }, { once: true });

        } catch (error) {
          console.error("Failed to enter edit mode for row:", error);
          alert("An error occurred while editing this row. Please try again.");
        }
      });




        tr.querySelector('.its_favorite').addEventListener('click', () => {
          fetch(`https://127.0.0.1:5000/toggleFavorite/${song.id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': 'Bearer ' + token
            }
          })
          .then(response => response.json())
          .then(data => {
            //console.log(data.message);
            loadHistory();
          });
        });

        tr.querySelector('.delete-btn').addEventListener('click', (e) => {
          if(e.currentTarget.classList.contains('cancel-edit-btn')) return;

        if (confirm(`Are you sure you want to delete track ID ${song.id}?`)) {
          fetch(`https://127.0.0.1:5000/deleteTrack/${song.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': 'Bearer ' + token
            }
          })
          .then(response => response.json().then(data => ({status: response.status, body: data})))
          .then(({status, body}) => {
            if (status === 200) {
              tr.remove();
            } else {
              alert(`Error: ${body.error || 'Unknown error'}`);
            }
          })
          .catch(err => {
            console.error('Delete request failed', err);
            alert('Failed to delete track');
          });
        }
      });

      tbody.appendChild(tr);
    });

    function getAverageYear(items) {
      let totalValues = 0;
      let accumulatedYear = 0;

      items.forEach(item => {
        const year = Number(item.song_year);
        if (!isNaN(year)) {
          totalValues++;
          accumulatedYear += year;
        }
      });

      return totalValues === 0 ? 0 : (accumulatedYear / totalValues).toFixed(2);
    }

    function getMostReplayed(items, key) {
      const counts = {};
      items.forEach(item => {
        const val = item[key] || '';
        if (val) counts[val] = (counts[val] || 0) + 1;
      });
      return Object.entries(counts).reduce((max, cur) => cur[1] > max[1] ? cur : max, ['', 0])[0] || 'N/A';
    }

    function getMostReplayedCount(items, key) {
      const counts = {};
      items.forEach(item => {
        const val = item[key] || '';
        if (val) counts[val] = (counts[val] || 0) + 1;
      });
      return Object.values(counts).reduce((max, cur) => cur > max ? cur : max, 0);
    }

    const mostSong = getMostReplayed(data.history, 'song_name');
    const mostSongImg = getMostReplayed(data.history, 'photo_url');
    const mostArtist = getMostReplayed(data.history, 'artist_name');
    const mostAlbum = getMostReplayed(data.history, 'album_name');

    const mostSongReplays = getMostReplayedCount(data.history, 'song_name');
    const mostArtistReplays = getMostReplayedCount(data.history, 'artist_name');
    const mostAlbumReplays = getMostReplayedCount(data.history, 'album_name');

    const mostAverageYear = getAverageYear(data.history);

    document.getElementById('most-replayed-song').textContent = mostSong + "(" + mostSongReplays + ")";
    document.getElementById('most-replayed-artist').textContent = mostArtist + "(" + mostArtistReplays + ")";
    document.getElementById('most-replayed-album').textContent = mostAlbum + "(" + mostAlbumReplays + ")";
    document.getElementById('most-average-year').textContent = mostAverageYear;

    document.getElementById('img-most-replayed-song').src = mostSongImg;
    loadChart(data.history);

    document.getElementById('prev-week-btn').addEventListener('click', () => {
        weekOffset--;
        loadChart(data.history);
    });

    document.getElementById('next-week-btn').addEventListener('click', () => {
        weekOffset++;
        loadChart(data.history);
    });


  } catch (err) {
    console.error('Error loading history:', err);
    document.getElementById('history-body').innerHTML = '<tr><td colspan="8">Connection error</td></tr>';
    document.getElementById('most-replayed-song').textContent = 'N/A';
    document.getElementById('most-replayed-artist').textContent = 'N/A';
    document.getElementById('most-replayed-album').textContent = 'N/A';
    document.getElementById('most-average-year').textContent = 'N/A';
  }
}

async function loadChart(data) {
    console.log(data);
    const canvas = document.getElementById('songsByDay');

    try {
        if (!canvas) {
            throw new Error("Canvas element with ID 'songsByDay' not found.");
        }

        // Process the data to get current week's song counts
        const weeklyData = processWeeklyData(data, weekOffset);

        document.getElementById('actual-week').textContent = `Week of ${weeklyData.weekStart}`;

        // Set up canvas for high DPI displays
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.clientWidth * dpr;
        canvas.height = canvas.clientHeight * dpr;
        canvas.getContext('2d').scale(dpr, dpr);

        // Destroy existing chart if it exists
        if (canvas.chart) {
            canvas.chart.destroy();
        }

        // Create the stacked bar chart
        canvas.chart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                datasets: [
                    {
                        label: 'Favorite(s)',
                        data: weeklyData.favorites,
                        backgroundColor: 'rgba(255, 64, 129, 0.7)',
                        borderColor: 'rgba(255, 64, 129, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Other(s)',
                        data: weeklyData.nonFavorites,
                        backgroundColor: 'rgba(0, 188, 212, 0.5)',
                        borderColor: 'rgba(0, 188, 212, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                indexAxis: 'y',
                elements: {
                    bar: {
                        borderWidth: 2,
                    }
                },
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: 'white'
                        }
                    },
                    title: {
                        display: false,
                        text: `Week of ${weeklyData.weekStart}`,
                        color: '#ff4081'
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: {
                            color: '#00bcd4'
                        },
                        grid: {
                            color: 'rgba(0, 188, 212, 0.1)'
                        }
                    },
                    y: {
                        stacked: true,
                        ticks: {
                            color: '#00bcd4'
                        },
                        grid: {
                            color: 'rgba(0, 188, 212, 0.1)'
                        }
                    }
                }
            }
        });

    } catch (error) {
        console.error("Failed to load chart:", error);
    }
}


function processWeeklyData(data, weekOffset = 0) {
    // Get current week's Monday
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // Handle Sunday as 0
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset + weekOffset * 7);
    monday.setHours(0, 0, 0, 0);

    // Create array for the week (Monday to Sunday)
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
        const day = new Date(monday);
        day.setDate(monday.getDate() + i);
        weekDays.push(new Date(day));
    }

    // Initialize counters for each day
    const favorites = [0, 0, 0, 0, 0, 0, 0];
    const nonFavorites = [0, 0, 0, 0, 0, 0, 0];

    // Handle both array and object formats
    const songs = Array.isArray(data) ? data : Object.values(data);

    songs.forEach((song, index) => {
        try {
            const listenedDate = new Date(song.listened_at);
            if (isNaN(listenedDate.getTime())) {
                console.warn(`Invalid date for song ${index}:`, song.listened_at);
                return;
            }

            const songDate = new Date(listenedDate);
            songDate.setHours(0, 0, 0, 0);

            for (let i = 0; i < 7; i++) {
                const weekDay = new Date(weekDays[i]);
                weekDay.setHours(0, 0, 0, 0);

                if (songDate.getTime() === weekDay.getTime()) {
                    if (song.is_favorite) {
                        favorites[i]++;
                    } else {
                        nonFavorites[i]++;
                    }
                    break;
                }
            }
        } catch (error) {
            console.error(`Error processing song ${index}:`, error, song);
        }
    });

    const weekStart = monday.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });

    return {
        favorites,
        nonFavorites,
        weekStart,
        totalSongs: favorites.reduce((sum, f, i) => sum + f + nonFavorites[i], 0)
    };
}


function processWeeklyDataForDate(data, targetDate) {
    const target = new Date(targetDate);
    const currentDay = target.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(target);
    monday.setDate(target.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    // Rest of the logic is the same as processWeeklyData
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
        const day = new Date(monday);
        day.setDate(monday.getDate() + i);
        weekDays.push(new Date(day));
    }

    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    const songs = Array.isArray(data) ? data : Object.values(data);
    
    songs.forEach((song) => {
        try {
            const listenedDate = new Date(song.listened_at);
            if (isNaN(listenedDate.getTime())) return;

            const songDate = new Date(listenedDate);
            songDate.setHours(0, 0, 0, 0);

            for (let i = 0; i < 7; i++) {
                const weekDay = new Date(weekDays[i]);
                weekDay.setHours(0, 0, 0, 0);
                
                if (songDate.getTime() === weekDay.getTime()) {
                    dayCounts[i]++;
                    break;
                }
            }
        } catch (error) {
            console.error('Error processing song:', error);
        }
    });

    const weekStart = monday.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
    });

    return {
        counts: dayCounts,
        weekStart: weekStart,
        totalSongs: dayCounts.reduce((sum, count) => sum + count, 0)
    };
}

loadHistory();
