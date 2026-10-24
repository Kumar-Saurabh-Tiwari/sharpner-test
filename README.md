# Feedback system

A plain HTML, CSS, and JavaScript feedback app backed by a hardcoded CrudCrud REST collection. It supports creating, listing, editing, and deleting feedback, and calculates the rating breakdown from the collection.

## Run it

1. Open `index.html` in a browser. The app loads its configured collection on startup.

The collection URL is set in `app.js`. Each feedback record is stored as `{ "name": "Alex Morgan", "description": "A short description", "rating": 5 }`. The description is optional. CrudCrud supplies each record's `_id`, used for update and delete requests.

The CrudCrud URL includes an API key and is visible to anyone who can access the page. Use a backend proxy instead of a hardcoded URL for production or sensitive data.

No build step is required. The app uses browser `fetch` for REST calls and loads Bootstrap 5.3.3 styles from jsDelivr.
