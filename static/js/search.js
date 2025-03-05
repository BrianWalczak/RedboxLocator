$(document).ready(function() {
    $('.close-icon').hide(); // hide the close icon
    $('.search-input').on('keydown', function(event) {
        if (event.key === 'Enter') {
            $('.search-icon').click(); // trigger click if enter key is clicked
        }
    });

    // calculates distances with lat and long
    function getDistance(lat1, lon1, lat2, lon2) {
        const toRad = (deg) => deg * (Math.PI / 180);
        const R = 3958.8; // Earth's radius in miles
    
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
    
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }    

    $('.search-icon').on('click', function() {
        let userCoords = null;
        if(settings.get('locate') === 'currentLocation') {
            userCoords = geolocateControl._lastKnownPosition.coords;
        } else {
            const stateCoords = stateCoordinates[settings.get('locate')].coordinates;
            userCoords = {
                latitude: stateCoords[1],
                longitude: stateCoords[0]
            };
        }
        const fullData = map.getSource('storeSource')._data.features;
        const searchResults = fullData.filter(feature => {
            if (feature.properties.bannerName.toLowerCase().includes($('.search-input').val().toLowerCase())) {
                return true;
            }

            return false;
        });
        const sortedData = [...searchResults].sort((a, b) => {
            const distA = getDistance(userCoords.latitude, userCoords.longitude, a.geometry.coordinates[1], a.geometry.coordinates[0]);
            const distB = getDistance(userCoords.latitude, userCoords.longitude, b.geometry.coordinates[1], b.geometry.coordinates[0]);
            return distA - distB;
        });
        
        let resultsToShow = 20;
        const loadMoreResults = () => {
            const currentResults = $('.search-results .locations').children().length;
            const newResults = sortedData.slice(currentResults, currentResults + resultsToShow);
            newResults.forEach(result => {
                const storeStatus = window.cache[result.properties.id].status;

                $('.search-results .locations').append(`
                <div class="location">
                    <h3>${result.properties.bannerName} - <span style="color:${settings.color(storeStatus, 'text')};">${storeStatus}</span></h3>
                    <p>${result.properties.address}</p>
                    <p>Opening Date: ${result.properties.openDate}</p>
                    <p><a class="get-directions">Get Directions</a> <span style='color:grey;'>(~${getDistance(userCoords.latitude, userCoords.longitude, result.geometry.coordinates[1], result.geometry.coordinates[0]).toFixed(1)} miles)</span></p>
                </div>
                `);

                $('.search-results .locations .location .get-directions').last().on('click', async function() {
                    $('.close-icon').click(); // close the search results
                    await sleep(300); // wait for the transition to finish

                    return map.flyTo({
                        center: [result.properties.lng, result.properties.lat],
                        zoom: 16
                    });
                });
            });
        };

        $('.search-results .locations').html(''); // clear previous results
        loadMoreResults(); // load initial results

        $('.search-results').addClass('visible'); // make the results visible
        $('.search-input').blur(); // unfocus the search bar
        $('.search-results').height($(window).height() * 0.33); // set height to 33%
        $('.search-results').scrollTop(0);

        $('.close-icon').show(); // show the close icon

        $('.search-results').off('scroll').on('scroll', function() {
            const $this = $(this);
            const scrollTop = $this.scrollTop();
            const innerHeight = $this.innerHeight();
            const scrollHeight = $this[0].scrollHeight;
        
            if (scrollTop + innerHeight >= scrollHeight - 5) { 
                loadMoreResults();
            }
        });        
    });

    $('.close-icon').on('click', async function() {
        $('.search-input').val(''); // clear the search input
        $('.close-icon').hide(); // hide the close icon

        $('.search-results').height(0); // set height to 0%
        await sleep(300); // wait for the transition to finish

        $('.search-results').removeClass('visible'); // hide the results
        $('.search-results .locations').html(''); // clear the results
    });

    let $searchResults = $('.search-results');
    let startY = 0;
    let startTime = 0;
    let currentHeight = 0;
    let expanded = false;
    let isDragging = false;

    function startTracking(event) {
        startY = event.touches ? event.touches[0].clientY : event.clientY;
        startTime = Date.now();
        currentHeight = $searchResults.height();
        isDragging = true;

        $(document).on('mousemove touchmove', liveResize);
        $(document).on('mouseup touchend', stopTracking);

        $searchResults.css('transition', 'none'); // Disable transition for live drag
    }

    function liveResize(event) {
        if (!isDragging) return;
        let currentY = event.touches ? event.touches[0].clientY : event.clientY;
        let deltaY = startY - currentY;
        let newHeight = currentHeight + deltaY;

        let minHeight = $(window).height() * 0.33;
        let maxHeight = $(window).height() * 0.66;

        if (newHeight >= minHeight && newHeight <= maxHeight) {
            $searchResults.height(newHeight);
        }
    }

    function stopTracking(event) {
        isDragging = false;
        let endY = event.changedTouches ? event.changedTouches[0].clientY : event.clientY;
        let endTime = Date.now();
        let duration = endTime - startTime;
        let velocity = (startY - endY) / duration;

        $(document).off('mousemove touchmove', liveResize);
        $(document).off('mouseup touchend', stopTracking);

        $searchResults.css('transition', 'height 0.3s ease-in-out'); // Re-enable smooth transition

        if (velocity > 1 || $searchResults.height() > $(window).height() * 0.5) {
            $searchResults.height($(window).height() * 0.66);
            expanded = true;
        } else {
            $searchResults.height($(window).height() * 0.33);
            expanded = false;
        }
    }

    $('.draggable-area').on('mousedown touchstart', startTracking);
});

const checkMapReady = setInterval(() => {
    if (map) { // When map is no longer null
        clearInterval(checkMapReady);

        map.on('zoom' && 'move', function() {
            if($('.search-results').hasClass('visible')) {
                $('.search-results').height($(window).height() * 0.33);
            }
        });

        // wait until the store data was loaded onto the map
        const checkSourceReady = setInterval(() => {
            if (map.getSource('storeSource')) {
                clearInterval(checkSourceReady);
                
                $('.search-container').show(); // show the search bar
            }
        }, 100); // poll every 100ms
    }
}, 100); // poll every 100ms