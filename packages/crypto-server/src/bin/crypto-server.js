import fastify from "fastify";
import generate from "@sebastienrousseau/crypto-core/src/lib/generate.js";
import encrypt from "@sebastienrousseau/crypto-core/src/lib/encrypt.js";
import decrypt from "@sebastienrousseau/crypto-core/src/lib/decrypt.js";

/* Taking the arguments from the command line and putting them into an array. */
const args = process.argv.slice(2);

const CryptoServer = async() => {
  /* Creating a new instance of the fastify server. */
  const app = fastify();
  await app.register(import("@fastify/compress"), {
    global: true
  });
  console.log(process.argv);

  /* This is a route handler. It is a function that is called when a request is made
  to the server. */
  app.get("/v1/generate", async(request, reply) => {
    console.log(request.headers);
    let generateKeyPair = await generate({ ...request.headers });
    reply
      .send({ "data": generateKeyPair });
  });

  app.get("/v1/encrypt", async(request, reply) => {
    console.log(request.headers);
    let encryptedData = await encrypt({ ...request.headers });
    reply
      .send({ "data": encryptedData });
  });

  app.get("/v1/decrypt", async(request, reply) => {
    let decryptedData = await decrypt({ ...request.headers });
    reply
      .send({ "data": decryptedData });
  });

  /* Telling the server to listen on port 3000. */
  app.listen(3000).then(() => {
    console.log("Server running at http://localhost:3000/");
  });
};
/* Calling the function with the arguments. */
CryptoServer({
  curve: args[1],
  email: args[3],
  expiration: args[5],
  format: args[7],
  name: args[9],
  passphrase: args[11],
  sign: args[13],
  size: args[15],
  type: args[17],
});
export default CryptoServer;
