/*!
 * Copyright (c) 2025 Brian Walczak
 * All rights reserved.
 *
 * This source code is licensed under the MIT License found in the
 * LICENSE file in the root directory of this source tree.
*/

// Reserve variables for the map and geolocation control
var map;
var geolocateControl;
var index;
window.alreadyLocated = false;
window.duplicates = [];

// Creates the map and all of its features
function spawnMapInstance() {
    return new Promise((resolve, reject) => {
        let mapTheme = settings.theme();
        if (map && geolocateControl && index) {
            return resolve(true);
        }

        console.warn('A map request has been called, creating a new map instance with Mapbox GL JS.\nWarning: You WILL be charged for Mapbox API requests!');
        mapboxgl.accessToken = 'pk.eyJ1IjoiYnJpYW53YWxjemFrIiwiYSI6ImNtNXE2ZXJzZzA4emIyanExdmI0MGZhYW4ifQ.58j41e6A78-4Md1B0EJ5FQ';
        // Warning: if anybody is planning to use this, you literally can't do anything with this token... it's meant to be public lol
        // You won't be able to use it on any other site, so don't even try it.
        // If you want to use Mapbox, you need to get your own token from their website.
        // Oh... and I also update this token every time I commit, so it's useless to you anyway. :P
        
        if(mapTheme == 'light') {
            mapTheme = 'mapbox://styles/mapbox/light-v11'
        } else if(mapTheme == 'dark') {
            mapTheme = 'mapbox://styles/mapbox/dark-v11'
        }

        map = new mapboxgl.Map({
            container: 'map',
            style: mapTheme,
            center: [-98.5795, 39.8283],
            zoom: 2
        });

        geolocateControl = new mapboxgl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: true,
            showUserHeading: true
        });

        index = new Supercluster({
            log: false,
            radius: 60,
            extent: 256,
            maxZoom: 15
        });


        map.addControl(geolocateControl, 'top-left');

        map.on('load', function() {
            map.resize();
            console.log('The map has been loaded successfully, user can now access.');
            resolve(true);
        });

        map.on('error', function(err) {
            console.error('Error loading the map:', err);
            reject(err);
        });

        geolocateControl.once('geolocate', (event) => {
            window.alreadyLocated = true;
        });
    });
}

// Creates GeoJSON features from store data
function createGeoJSON(stores) {
    const featuresMap = new Map(); // used to prevent duplicate coordinates

    Object.entries(stores).forEach(([key, kiosk]) => {
        const coordsKey = `${kiosk.coords.lon},${kiosk.coords.lat}`;
        
        const newFeature = {
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [kiosk.coords.lon, kiosk.coords.lat],
            },
            properties: {
                id: key,
                bannerName: kiosk.banner?.banner_name || kiosk.vendor?.vendor_name || 'Unknown',
                address: kiosk.address,
                openDate: kiosk.open_date ? new Date(kiosk.open_date).toLocaleDateString() : 'Unknown',
            }
        };

        if (featuresMap.has(coordsKey)) {
            const existing = featuresMap.get(coordsKey); // get the already-existing one
            
            // Prefer the address with longer length (obv may not be good enough but it's the best we can do, we want the most detailed!)
            if (newFeature.properties.address.length > existing.properties.address.length) {
                // Merge the two items into one (merge values if one includes data the other doesn't)
                if(existing.properties.openDate !== 'Unknown') {
                    newFeature.properties.openDate = existing.properties.openDate;
                    newFeature.properties.isMerged = true;
                }

                if(existing.properties.bannerName !== 'Unknown') {
                    newFeature.properties.bannerName = existing.properties.bannerName;
                    newFeature.properties.isMerged = true;
                }

                featuresMap.set(coordsKey, newFeature); // update to the new, merged item
                window.duplicates.push(existing); // add the old one to duplicates
            } else {
                window.duplicates.push(newFeature); // add the new one to duplicates
            }
        } else {
            featuresMap.set(coordsKey, newFeature); // add if no duplicates
        }
    });

    // Convert the map values into an array
    return Array.from(featuresMap.values());
}

// Updates the clusters on the map
function updateClusters() {
    const bounds = map.getBounds();
    const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
    const zoom = map.getZoom();

    const clusters = index.getClusters(bbox, Math.floor(zoom));
    
    if (window.currentMarkers) {
        window.currentMarkers.forEach(m => m.remove());
    }
    window.currentMarkers = [];

    clusters.forEach(async feature => {
        const [lng, lat] = feature.geometry.coordinates;
        const store = feature.properties;

        if (store.cluster) {
            const clusterSize =
                store.point_count < 100 ? 'small' :
                store.point_count < 1000 ? 'medium' : 'large';
            
            const clusterEl = document.createElement('div');
            clusterEl.className = `cluster cluster-${clusterSize}`;
            clusterEl.innerHTML = `<div><span>${store.point_count_abbreviated}</span></div>`;
            const clusterMarker = new mapboxgl.Marker(clusterEl).setLngLat([lng, lat]).addTo(map);
            
            clusterEl.addEventListener('click', () => {
                map.easeTo({
                    center: [lng, lat],
                    zoom: Math.floor(map.getZoom()) + 2,
                    duration: 500,
                    easing: function(t) {
                        return t * (2 - t);
                    }
                });
            });

            window.currentMarkers.push(clusterMarker);
        } else {
            const markerEl = document.createElement('div');
            markerEl.className = 'marker marker-single';

            const marker = new mapboxgl.Marker(markerEl).setLngLat([lng, lat]).addTo(map);
            const popup = new mapboxgl.Popup({ offset: [5, -15], closeButton: false, closeOnMove: true }).setHTML(`
                <span class="view_duplicates" onclick="actions.viewDuplicates(${lng}, ${lat}, this)">history</span>
                <div class=main>
                    <h3 style='margin: 0px; margin-top: 5px; margin-bottom: 10px'>${store.bannerName}${store.isMerged ? '<span onclick=actions.warnMerged() style="color:grey;cursor:help;"> (Modified)</span>' : ''}</h3>
                    ${store.address}<br>
                    <b>Status: </b><span class=status>Loading...</span><br>
                    <b>Opening Date: </b>${store.openDate}<br>
                    <b>Latitude: </b>${lat}<br>
                    <b>Longitude: </b>${lng}<br><br>
                    <span class=notes></span>
                    <a href="${actions.createDirections(lat, lng)}" onclick="actions.userFeedback('${store.id}')" target="_blank">Get Directions</a>
                </div>
                <div class=duplicates style="color: grey; display: none; data-loaded: false; width: 100%;">
                    <h3 style='margin: 0px; margin-top: 5px; margin-bottom: 10px'>Duplicate Records</h3>
                </div>
            `);

            marker.setPopup(popup);
            window.currentMarkers.push(marker);

            popup.on('open', async () => {
                const popupEl = popup.getElement();
                let oldData = await getStoreData(store.id);

                $(popupEl).find('.status').text(oldData.status); // get the status of the location to display

                if(oldData.notes) {
                    $(popupEl).find('.notes').html(`<b>Notes: </b>${oldData.notes}<br><br>`);
                }


                // Color code the status
                if(oldData.status == 'Operational') {
                    $(popupEl).find('.status').css('color', 'green');
                }

                if(oldData.status == 'Error (See notes for error code)') {
                    $(popupEl).find('.status').css('color', 'red');
                }

                if(oldData.status == 'Turned Off') {
                    $(popupEl).find('.status').css('color', '#FFC107');
                }

                if(oldData.status == 'Removed') {
                    $(popupEl).find('.status').css('color', 'red');
                }

                if(oldData.status == 'Never Existed') {
                    $(popupEl).find('.status').css('color', 'red');
                }
            });
        }
    });
}

// Downloads the store data and creates the clusters
async function downloadClusters() {
    try {
        const response = await fetch("./stores.json");

        if (!response.ok) {
            console.error(response);
            alert("An error occurred while loading the store data. Please check the console for more information.");
            return false;
        }

        const data = await response.json();
        index.load(createGeoJSON(data.stores));

        map.on('move', updateClusters);
        map.on('zoom', updateClusters);
        map.on('zoomend', updateClusters);
        updateClusters();

        return true;
    } catch (err) {
        console.error(err);
        alert("An error occurred while loading the store data. Please check the console for more information.");
        return false;
    }
}

// Initializes the map and starts processing the clusters
async function initMap() {
    await sleep(200);
    await spawnMapInstance(); // create the map instance (if not already created)

    $("#start").fadeOut(200); // fade out the start screen (if not already hidden)
    $(".toggle#settings").html("settings"); // set the settings toggle to the settings icon
    await fadeInOpacity($("#map"), 200); // fade in the map
    $(".toggle#settings").show(); // show the settings toggle

    setInterval(() => {
        map.resize(); // always resize map to adjust for display sizes/changes
    }, 1);

    downloadClusters(); // start downloading the clusters
    return true;
}