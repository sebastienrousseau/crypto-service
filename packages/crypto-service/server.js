import fastify from "fastify";
import encrypt from "./lib/encrypt.js";
import decrypt from "./lib/decrypt.js";

/* Creating a new instance of the fastify server. */
const app = fastify();
await app.register(import("@fastify/compress"), {
  global: true
});
console.log(process.argv);

/* This is a route handler. It is a function that is called when a request is made
to the server. */
app.get("/v1/encrypt", async(request, reply) => {
  console.log(request.headers);
  let encryptedData = await encrypt({...request.headers});
  reply
    .send({"data": encryptedData});
});

app.get("/v1/decrypt", async(request, reply) => {
  let decryptedData = await decrypt({...request.headers});
  reply
    .send({"data": decryptedData});
});

/* Telling the server to listen on port 3000. */
app.listen(3000).then(() => {
  console.log("Server running at http://localhost:3000/");
});
