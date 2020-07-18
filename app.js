const express = require("express");
const schema = require("./schema/schema");
const bodyParser = require("body-parser");
const { graphqlHTTP } = require("express-graphql");
const app = express();
const { MONGODB } = require("./config");
const cors = require("cors");
const mongoose = require("mongoose");
const chechAuth = require("./util/check-auth");

const PORT = process.env.PORT || 4000;

app.use(bodyParser.json());

app.use(cors());

mongoose
  .connect(MONGODB, { useNewUrlParser: true, useUnifiedTopology: true })
  .catch((err) => console.error(err));
mongoose.connection.once("open", () => {
  console.log("MongoDB connected");
});

app.use(chechAuth);

app.use(
  "/graphql",
  graphqlHTTP({
    schema,
    graphiql: true,
  })
);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
