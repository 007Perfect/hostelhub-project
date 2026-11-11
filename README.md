# HostelHub – Room Allotment API

HostelHub helps a hostel warden manage residents, rooms and room allotments using an Express server and SQLite database.

## Technologies
- Node.js
- Express.js
- SQLite
- sqlite and sqlite3 packages
- Postman

## Run the project on Windows
1. Install Node.js.
2. Extract this ZIP file.
3. Open the extracted folder in VS Code.
4. Open Terminal → New Terminal.
5. Run `npm install`.
6. Run `npm start`.
7. Open `http://localhost:3000` in your browser.
8. Keep the terminal open while testing.

The SQLite database is created automatically in the `database` folder. Stop the server with Ctrl+C. Restart it after changing code. For automatic restarts, use `npm run dev`.

## Database tables

### residents
resident_id, resident_name, student_id, phone, course

### rooms
room_id, room_name, block, status

### allotments
allotment_id, resident_id, room_id, allotment_date

The allotments table connects residents and rooms.

## API routes

| Method | URL | Purpose |
|---|---|---|
| GET | `/` | Welcome message |
| GET | `/residents` | Get all residents |
| POST | `/residents` | Add resident |
| GET | `/rooms` | Get all rooms |
| GET | `/rooms?block=A` | Search rooms by block |
| GET | `/rooms/1` | Get one room |
| POST | `/rooms` | Add room |
| PUT | `/rooms/1` | Update room |
| DELETE | `/rooms/1` | Delete room |
| GET | `/allotments` | Get all allotments |
| POST | `/allotments` | Add allotment |
| GET | `/allotments/details` | JOIN resident and room details |
| DELETE | `/allotments/1` | Cancel allotment |

## JSON request examples

### Add resident – POST /residents
```json
{
  "resident_name": "Aarav Sharma",
  "student_id": "STU1001",
  "phone": "9876543210",
  "course": "B.Tech CSE"
}
```

### Add room – POST /rooms
```json
{
  "room_name": "Room 204",
  "block": "A"
}
```

### Update room – PUT /rooms/1
```json
{
  "room_name": "Room 205",
  "block": "B",
  "status": "Available"
}
```

Allowed room statuses: Available, Occupied, Maintenance.

### Add allotment – POST /allotments
```json
{
  "resident_id": 1,
  "room_id": 1,
  "allotment_date": "2026-11-11"
}
```
Add the resident and room first, then use their actual IDs.

## Special rule: no duplicate room names

Room names are checked without considering capital letters:
- Room 204
- room 204
- ROOM 204

All three count as the same name.

Tests:
1. Add Room 204 → expected 201.
2. Add room 204 → expected 409.
3. Add a different room, then rename it to ROOM 204 → expected 409.

## Status codes
- 200: successful request.
- 201: new record created.
- 400: missing or invalid input.
- 404: record not found.
- 409: duplicate name or allotment conflict.
- 500: unexpected server/database problem.

## Postman
Import `postman/HostelHub.postman_collection.json`. Start the server first. For POST and PUT requests choose Body → raw → JSON, enter the request body and click Send.

## Notes
- Cancel an allotment before deleting its room.
- An allotted room becomes Occupied. Cancelling the allotment makes it Available.
- This project uses a simple single-server duplicate check for the classroom assignment.
- SQL `?` placeholders are used to pass values safely into queries.
