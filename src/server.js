import fastify from "fastify";
import encrypt from "./lib/encrypt.js";
import decrypt from "./lib/decrypt.js";

/* Creating a new instance of the fastify server. */
const app = fastify();
console.log(process.argv);

/* This is a route handler. It is a function that is called when a request is made
to the server. */
app.get("/encrypt", async(request, reply) => {
  let encryptedData = await encrypt({...request.query});
  reply.send({"data": encryptedData});
});

app.get("/decrypt", async(request, reply) => {
  let decryptedData = await decrypt({...request.query});
  reply.send({"data": decryptedData});
});

/* Telling the server to listen on port 3000. */
app.listen(3000).then(() => {
  console.log("Server running at http://localhost:3000/");
});
