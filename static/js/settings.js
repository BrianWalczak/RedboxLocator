/*!
 * Copyright (c) 2025 Brian Walczak
 * All rights reserved.
 *
 * This source code is licensed under the MIT License found in the
 * LICENSE file in the root directory of this source tree.
*/

const settings = {
    get: function(value = null) {
        const getSettings = localStorage.getItem('settings');
        let result = {};

        if(getSettings) {
            try {
                result = JSON.parse(getSettings);
            } catch(error) {
                result = {}; // keep empty
            }
        }

        if(value) {
            return result[value] || null;
        } else {
            return result;
        }
    },

    set: function(key, value) {
        const getSettings = localStorage.getItem('settings');
        let result = {};

        if(getSettings) {
            try {
                result = JSON.parse(getSettings);
            } catch(error) {
                result = {}; // keep empty
            }
        }

        result[key] = value;
        localStorage.setItem('settings', JSON.stringify(result));
        return result;
    },

    del: function(key = null) {
        if(!key) {
            localStorage.removeItem('settings');
            return {};
        }

        let result = settings.get();
        try {
            delete result[key];
        } catch(error) {
            return result;
        }

        localStorage.setItem('settings', JSON.stringify(result));
        return result;
    },

    theme: function(value) {
        let result = settings.get();

        if(value) {
            settings.set('theme', value);
            result.theme = value;
        }

        if(result.theme === 'light') {
            $('body').removeClass('darkMode').addClass('lightMode');

            if(map) map.setStyle('mapbox://styles/mapbox/light-v11');
            return 'light';
        } else if(result.theme === 'dark') {
            $('body').removeClass('lightMode').addClass('darkMode');

            if(map) map.setStyle('mapbox://styles/mapbox/dark-v11');
            return 'dark';
        } else {
            return settings.theme('dark'); // default to dark theme
        }
    }
};

settings.theme.swap = function() {
    if ($('body').hasClass('lightMode')) {
        return settings.theme('dark');
    } else if($('body').hasClass('darkMode')) {
        return settings.theme('light');
    }
};