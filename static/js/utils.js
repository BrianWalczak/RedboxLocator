/*!
 * Copyright (c) 2025 Brian Walczak
 * All rights reserved.
 *
 * This source code is licensed under the MIT License found in the
 * LICENSE file in the root directory of this source tree.
*/

// Used to copy the address to clipboard (not used yet)
function copyText(element) {
    var text = element.textContent;
    navigator.clipboard.writeText(text).then(function() {
        alert('The address for this location was copied to the clipboard.');
    }, function(err) {
        console.error(err);
        alert("An error occurred while copying the text to the clipboard. Please check the console for more information.");
    });
}

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