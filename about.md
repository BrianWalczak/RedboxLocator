# About
### This file explains the difference between some of the files here, and their purpose.

> [!TIP]
> This project and its store data has now been migrated to the Find-a-Redbox database!

### Databases
- `stores.orig.json`: This is the original file, and contains all of the store data as found on Redbox machines across the U.S. This file is completely unmodified and is kept for preservation purposes.
- `stores.raw.json`: This file contains the original store data (as provided by `stores.orig.json`), with coordinates added (geocoded by Brian Walczak). The store data is entirely unmodified, and coordinates were generated with the help of `scrape/index.js`.
- `stores.json`: Similar to the `stores.raw.json`, this file contains the store data with geocoded coordinates. However, some placeholder stores (such as ones named "NULL", used for testing purposes by the previous Redbox developers) have been removed for easier use. Some coordinates were also manually reviewed with the help of `scrape/modify.js` and updated with more accurate information.

### Other Files
- `coordinates.json`: This file contains all of the coordinates for each store location (as found in the other store JSON files). This file has only the coordinates extracted and the store data is not persisted. This file was generated with the help of `scrape/coords.js`, and is currently created with the modified `stores.json` file.