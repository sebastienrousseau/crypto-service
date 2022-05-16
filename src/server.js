import fastify from "fastify";
import encrypt from "./lib/encrypt.js";
import decrypt from "./lib/decrypt.js";

/* Creating a new instance of the fastify server. */
const app = fastify();
console.log(process.argv);
/* This is a route handler. It is a function that is called when a request is made
to the server. */
app.get("/encrypt", async(request, reply) => {
  let encryptedData = {...request.query};
  console.log(encryptedData);
  encryptedData = await encrypt(encryptedData);
  //   console.log(encryptedData);
  reply.send({"data": encryptedData});
//   console.log(request.body);
//   console.log(request.query);
//   console.log(request.params);
//   console.log(request.headers);
//   console.log(request.raw);
//   console.log(request.server);
//   console.log(request.id);
//   console.log(request.ip);
//   console.log(request.ips);
//   console.log(request.hostname);
//   console.log(request.protocol);
//   console.log(request.url);
//   console.log(request.routerMethod);
//   console.log(request.routerPath);
});

app.get("/decrypt", async(request, reply) => {
  const decryptedData = await decrypt(request.params);
  reply.send({"data": decryptedData});
});

/* Telling the server to listen on port 3000. */
app.listen(3000).then(() => {
  console.log("Server running at http://localhost:3000/");
});

