import { route } from "@entitify/express";
import cors from "cors";
import express from "express";
import { ConnectionOptions, createConnection } from "typeorm";

import { Address } from "./models/address.model";
import { User } from "./models/user.model";

const start = async () => {
  const connectionOptions: ConnectionOptions = {
    type: "mssql",
    host: "localhost",
    port: 1434,
    database: "entitify",
    username: "Niv54",
    password: "myCoolDbPassword123",
    entities: [User, Address],
    // next values are optional
    synchronize: true,
    logging: true,
    logger: "advanced-console",
    options: {
      encrypt: false
    },
    // set this to enable cache
    cache: true
  };
  await createConnection(connectionOptions);

  const app = express();
  app.use(express.json());
  app.use(cors());
  app.use(express.urlencoded({ extended: true }));

  const userRouter = route(User, { cache: 3000 });
  app.use("/api/user", userRouter);

  app.listen(3000, () => console.log("App in running"));
};

start();
