const io = require("socket.io-client");
const socket = io("http://localhost:3000", { transports: ["websocket"] });

// socket.emit("users");
// socket.on("users", (data) => console.log(data));

class SocketService {
  // get users
  async getUsers(params) {
    return new Promise(async (resolve, reject) => {
      await socket.emit("users", params);
      await socket.on("users", (data) => resolve(data));
    });
  }
}

module.exports = new SocketService();
