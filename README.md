# PlayDate Pass v1

Static, private-by-design play-date info cards. Live: https://playdateplaypass.github.io/PlayDate-PlayPass/

- `index.html`: landing page
- `app.html` + `app.js`: My Kids, Edit Kid, Share (profiles are saved in localStorage only)
- `card.html`: received card. The data is in the URL fragment (`#z…` = deflate-raw + base64url JSON) and is decoded on the phone.
- `pp.js` / `pp.css`: shared codec, card renderer and styles. `fonts/` holds self-hosted Boogaloo and DM Sans (SIL OFL).
- `old/`: the previous version (pre-v1)

No server, no analytics, no third-party requests (enforced by CSP).
