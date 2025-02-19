self.onmessage = async function(event) {
    try {
        const response = await fetch('https://findaredbox.kbots.tech/search');
        
        if (!response.ok) {
            return self.postMessage({ error: response.statusText });
        }
        
        const storesData = await response.json();

        self.postMessage({ storesData }); // Send back the stores data once done
    } catch (error) {
        self.postMessage({ error: error.message });
    }
};