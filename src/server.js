import fastify from "fastify";
import encrypt from "./lib/encrypt.js";
import decrypt from "./lib/decrypt.js";

/* Creating a new instance of the fastify server. */
const app = fastify();

/* This is a route handler. It is a function that is called when a request is made
to the server. */
app.get("/encrypt", async(request, reply) => {
  const encryptedData = await encrypt(request.params);
  reply.send({"data": encryptedData});
});

app.get("/decrypt", async(request, reply) => {
  const decryptedData = await decrypt(request.params);
  reply.send({"data": decryptedData});
});

/* Telling the server to listen on port 3000. */
app.listen(3000).then(() => {
  console.log("Server running at http://localhost:3000/");
});
