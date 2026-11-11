
const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const dbPath = path.join(__dirname, "database", "hostelhub.db");

let db = null;

// Database connection and table creation
const startServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS residents (
        resident_id INTEGER PRIMARY KEY AUTOINCREMENT,
        resident_name TEXT NOT NULL,
        student_id TEXT NOT NULL,
        phone TEXT NOT NULL,
        course TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS rooms (
        room_id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_name TEXT NOT NULL,
        block TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Available'
      );

      CREATE TABLE IF NOT EXISTS allotments (
        allotment_id INTEGER PRIMARY KEY AUTOINCREMENT,
        resident_id INTEGER NOT NULL,
        room_id INTEGER NOT NULL,
        allotment_date TEXT NOT NULL,
        FOREIGN KEY (resident_id) REFERENCES residents(resident_id),
        FOREIGN KEY (room_id) REFERENCES rooms(room_id),
        UNIQUE (resident_id),
        UNIQUE (room_id)
      );
    `);

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`HostelHub running on port ${PORT}`);
    });
  } catch (error) {
    console.log("Database Error:", error.message);
    process.exit(1);
  }
};

// Helper functions
const isValidText = (value) => {
  return typeof value === "string" && value.trim() !== "";
};

const findDuplicateRoom = async (roomName, currentRoomId = -1) => {
  const rooms = await db.all("SELECT * FROM rooms");

  return rooms.some((room) =>
    room.room_name.toLowerCase() === roomName.trim().toLowerCase() &&
    room.room_id !== Number(currentRoomId)
  );
};

// Home route
app.get("/", (request, response) => {
  response.send("Welcome to HostelHub");
});

// Resident routes

// Get all residents
app.get("/residents", async (request, response) => {
  const residents = await db.all(
    "SELECT * FROM residents ORDER BY resident_id"
  );

  response.send(residents);
});

// Add a resident
app.post("/residents", async (request, response) => {
  const { resident_name, student_id, phone, course } = request.body;

  if (
    !isValidText(resident_name) ||
    !isValidText(student_id) ||
    !isValidText(phone) ||
    !isValidText(course)
  ) {
    return response.status(400).send({
      error: "Enter resident name, student ID, phone and course",
    });
  }

  const query = `
    INSERT INTO residents (resident_name, student_id, phone, course)
    VALUES (?, ?, ?, ?)
  `;

  const result = await db.run(
    query,
    resident_name.trim(),
    student_id.trim(),
    phone.trim(),
    course.trim()
  );

  response.status(201).send({
    message: "Resident Added Successfully",
    resident_id: result.lastID,
  });
});

// Room routes

// Get all rooms or search rooms by block
app.get("/rooms", async (request, response) => {
  const { block } = request.query;

  let rooms;

  if (block) {
    rooms = await db.all(
      "SELECT * FROM rooms WHERE LOWER(block) = LOWER(?) ORDER BY room_id",
      block
    );
  } else {
    rooms = await db.all("SELECT * FROM rooms ORDER BY room_id");
  }

  response.send(rooms);
});

// Get one room
app.get("/rooms/:roomId", async (request, response) => {
  const { roomId } = request.params;

  const room = await db.get(
    "SELECT * FROM rooms WHERE room_id = ?",
    roomId
  );

  if (!room) {
    return response.status(404).send({
      error: "Room Not Found",
    });
  }

  response.send(room);
});

// Add a room
app.post("/rooms", async (request, response) => {
  const { room_name, block } = request.body;

  if (!isValidText(room_name) || !isValidText(block)) {
    return response.status(400).send({
      error: "Room name and block are required",
    });
  }

  const duplicate = await findDuplicateRoom(room_name);

  if (duplicate) {
    return response.status(409).send({
      error: `Room ${room_name.trim()} already exists`,
    });
  }

  const result = await db.run(
    `INSERT INTO rooms (room_name, block, status)
     VALUES (?, ?, 'Available')`,
    room_name.trim(),
    block.trim()
  );

  response.status(201).send({
    message: "Room Added Successfully",
    room_id: result.lastID,
  });
});

// Update a room
app.put("/rooms/:roomId", async (request, response) => {
  const { roomId } = request.params;
  const { room_name, block, status } = request.body;

  const room = await db.get(
    "SELECT * FROM rooms WHERE room_id = ?",
    roomId
  );

  if (!room) {
    return response.status(404).send({
      error: "Room Not Found",
    });
  }

  if (room_name !== undefined && !isValidText(room_name)) {
    return response.status(400).send({
      error: "Room name cannot be empty",
    });
  }

  if (block !== undefined && !isValidText(block)) {
    return response.status(400).send({
      error: "Block cannot be empty",
    });
  }

  if (
    status !== undefined &&
    !["Available", "Occupied", "Maintenance"].includes(status)
  ) {
    return response.status(400).send({
      error: "Status must be Available, Occupied or Maintenance",
    });
  }

  const newName = room_name === undefined
    ? room.room_name
    : room_name.trim();

  const newBlock = block === undefined
    ? room.block
    : block.trim();

  const newStatus = status === undefined
    ? room.status
    : status;

  const duplicate = await findDuplicateRoom(newName, roomId);

  if (duplicate) {
    return response.status(409).send({
      error: `Room ${newName} already exists`,
    });
  }

  await db.run(
    `UPDATE rooms
     SET room_name = ?, block = ?, status = ?
     WHERE room_id = ?`,
    newName,
    newBlock,
    newStatus,
    roomId
  );

  response.send({
    message: "Room Updated Successfully",
  });
});

// Delete a room
app.delete("/rooms/:roomId", async (request, response) => {
  const { roomId } = request.params;

  const room = await db.get(
    "SELECT * FROM rooms WHERE room_id = ?",
    roomId
  );

  if (!room) {
    return response.status(404).send({
      error: "Room Not Found",
    });
  }

  const allotment = await db.get(
    "SELECT * FROM allotments WHERE room_id = ?",
    roomId
  );

  if (allotment) {
    return response.status(409).send({
      error: "Cancel the allotment before deleting this room",
    });
  }

  await db.run(
    "DELETE FROM rooms WHERE room_id = ?",
    roomId
  );

  response.send("Room Deleted Successfully");
});

// Allotment routes

// Add a room allotment
app.post("/allotments", async (request, response) => {
  const { resident_id, room_id, allotment_date } = request.body;

  if (
    !resident_id ||
    !room_id ||
    !isValidText(allotment_date)
  ) {
    return response.status(400).send({
      error: "Resident ID, room ID and allotment date are required",
    });
  }

  const resident = await db.get(
    "SELECT * FROM residents WHERE resident_id = ?",
    resident_id
  );

  if (!resident) {
    return response.status(404).send({
      error: "Resident Not Found",
    });
  }

  const room = await db.get(
    "SELECT * FROM rooms WHERE room_id = ?",
    room_id
  );

  if (!room) {
    return response.status(404).send({
      error: "Room Not Found",
    });
  }

  if (room.status !== "Available") {
    return response.status(409).send({
      error: "Room is not available",
    });
  }

  const existingAllotment = await db.get(
    "SELECT * FROM allotments WHERE resident_id = ?",
    resident_id
  );

  if (existingAllotment) {
    return response.status(409).send({
      error: "Resident already has a room",
    });
  }

  await db.run(
    `INSERT INTO allotments (resident_id, room_id, allotment_date)
     VALUES (?, ?, ?)`,
    resident_id,
    room_id,
    allotment_date
  );

  await db.run(
    "UPDATE rooms SET status = 'Occupied' WHERE room_id = ?",
    room_id
  );

  response.status(201).send("Room Allotted Successfully");
});

// Get all allotments
app.get("/allotments", async (request, response) => {
  const allotments = await db.all(
    "SELECT * FROM allotments ORDER BY allotment_id"
  );

  response.send(allotments);
});

// Get allotment details using JOIN
app.get("/allotments/details", async (request, response) => {
  const query = `
    SELECT
      allotments.allotment_id,
      residents.resident_name,
      residents.student_id,
      rooms.room_name,
      rooms.block,
      allotments.allotment_date
    FROM allotments
    INNER JOIN residents
      ON allotments.resident_id = residents.resident_id
    INNER JOIN rooms
      ON allotments.room_id = rooms.room_id
    ORDER BY allotments.allotment_id
  `;

  const details = await db.all(query);

  response.send(details);
});

// Cancel an allotment
app.delete("/allotments/:allotmentId", async (request, response) => {
  const { allotmentId } = request.params;

  const allotment = await db.get(
    "SELECT * FROM allotments WHERE allotment_id = ?",
    allotmentId
  );

  if (!allotment) {
    return response.status(404).send({
      error: "Allotment Not Found",
    });
  }

  await db.run(
    "DELETE FROM allotments WHERE allotment_id = ?",
    allotmentId
  );

  await db.run(
    "UPDATE rooms SET status = 'Available' WHERE room_id = ?",
    allotment.room_id
  );

  response.send("Allotment Cancelled Successfully");
});

// Start the server
startServer();
