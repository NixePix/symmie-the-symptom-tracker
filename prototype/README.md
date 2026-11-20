# Symmie clickable prototype

Static HTML, CSS and JS; no build step. Run locally:

    cd prototype && python3 -m http.server 8080   # then open http://localhost:8080

Demo login: username `anna`, password `demo`. Data is fake (400 days, seeded) and kept in localStorage; the side panel resets it, shows the first-run lock, and triggers the offline, install and reminder states.
The password check uses a toy hash; the real app needs a salted hash.

The side panel lists the features the prototype covers.
