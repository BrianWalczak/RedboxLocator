/*!
 * Copyright (c) 2025 Brian Walczak
 * All rights reserved.
 *
 * This source code is licensed under the MIT License found in the
 * LICENSE file in the root directory of this source tree.
*/

// Track the user's geolocation on initial load
function trackGeolocation() {
    return new Promise((resolve, reject) => { 
      geolocateControl.off('geolocate'); 
      geolocateControl.off('error');

      if(!window.alreadyLocated) {
        geolocateControl.once('geolocate', (event) => {
          map.setCenter([event.coords.longitude, event.coords.latitude]);
          map.setZoom(14);
          resolve(true);
        });
      
        geolocateControl.once('error', () => {
          resolve(false);
        });

        geolocateControl.trigger();
      } else {
        $('.mapboxgl-ctrl-geolocate').click();
        resolve(true);
      }
    });
}

// Look for duplicate coordinates in the data
function searchDuplicates(lon, lat) {
  let matchingEntries = [];

  window.duplicates.forEach(duplicate => {
    const [dLon, dLat] = duplicate.geometry.coordinates;

    if(Number(lon) == Number(dLon) && Number(lat) == Number(dLat)) {
      matchingEntries.push(duplicate);
    }
  });

  return matchingEntries;
}

// Get the store data from the API
async function getStoreData(storeId) {
  const req = await fetch("https://findaredbox.kbots.tech/search/?id=" + storeId);
  const res = await req.json();

  return res[0];
}

// Update status of a kiosk location
async function submitFeedback(storeId, status, notes = null) {
  if(notes == null) {
    const oldData = await getStoreData(storeId);

    notes = oldData.notes;
  }
  
  const req = await fetch("https://findaredbox.kbots.tech/update", {
    method: "POST",
    headers: {
        "content-type": "application/json"
    },
    body: JSON.stringify({
        id: storeId,
        notes,
        status
    })
  });
  const res = await req.json();

  if(res.message === "Store updated successfully.") {
    console.log("The user feedback for this location was sent successfully.");
    return true;
  } else {
    console.error("The user feedback was not submitted successfully: ", res);
    return false;
  }
}

// -- Transitions (we have to use opacity for the map transitions, or else it will break) -- //

async function fadeInOpacity(selector, duration = 200) {
  // set values to default
  selector.css("visibility", "visible"); // obviously needs to be visible to see the fade in
  selector.css("opacity", "0"); // start at 0 opacity

  var oldTransition = selector.css("transition");
  selector.css("transition", `opacity ${duration}ms ease`);
  selector.css("opacity", "1");

  await sleep(200);
  selector.css("visibility", "visible");
  selector.css("transition", oldTransition);
}

async function fadeOutOpacity(selector, duration = 200) {
  // set values to default
  selector.css("visibility", "visible"); // obviously needs to be visible to see the fade out
  selector.css("opacity", "1"); // start at 1 opacity

  var oldTransition = selector.css("transition");
  selector.css("transition", `opacity ${duration}ms ease`);
  selector.css("opacity", "0");

  await sleep(200);
  selector.css("visibility", "hidden");
  selector.css("transition", oldTransition);
}