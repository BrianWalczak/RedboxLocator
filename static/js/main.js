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

// Creates the map and all of its features
function spawnMapInstance() {
    return new Promise((resolve, reject) => {
        let mapTheme = settings.theme();
        if (map && geolocateControl && index) {
            return resolve(true);
        }

        console.warn('A map request has been called, creating a new map instance with Mapbox GL JS.\nWarning: You WILL be charged for Mapbox API requests!');
        mapboxgl.accessToken = 'pk.eyJ1IjoiYnJpYW53YWxjemFrIiwiYSI6ImNtNW44dnRuejA5a3Ayam5janV3MTRnankifQ.JplS-AFP2eXI-3M97bo_OQ';
        
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
            maxZoom: 17
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
    const features = [];

    Object.entries(stores).forEach(([key, kiosk]) => {            
        features.push({
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
        });
    });

    return features;
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

    clusters.forEach(feature => {
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

            const popup = new mapboxgl.Popup({ offset: [5, -15] }).setHTML(`
                <h3 style='margin: 0px; margin-top: 5px; margin-bottom: 10px'>${store.bannerName}</h3>
                ${store.address}<br>
                <b>Opening Date: </b>${store.openDate}<br>
                <b>Latitude: </b>${lat}<br>
                <b>Longitude: </b>${lng}<br><br>
                <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank">Get Directions</a>
            `);
            marker.setPopup(popup);

            window.currentMarkers.push(marker);
        }
    });
}

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

async function initMap() {
    await sleep(200);
    await spawnMapInstance(); // create the map instance (if not already created)

    $("#start").fadeOut(200); // fade out the start screen (if not already hidden)
    await fadeInOpacity($("#map"), 200); // fade in the map
    $(".toggle#settings").show(); // show the settings toggle

    setInterval(() => {
        map.resize(); // always resize map to adjust for display sizes/changes
    }, 1);

    downloadClusters(); // start downloading the clusters
    return true;
}