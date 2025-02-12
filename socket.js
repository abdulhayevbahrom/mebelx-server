const users = [
  {
    id: 1,
    name: "John",
    room: "A",
  },
  {
    id: 2,
    name: "Doe",
    room: "B",
  },
];

class soket {
  async connect(io) {
    io.on("connection", async (socket) => {
      // get users
      console.log("start");

      socket.on("users", async () => {
        socket.emit("users", users);
      });

      // disconnect a user
      socket.on("disconnect", async () => {});
    });
  }
}

module.exports = new soket();
