const { MongoClient } = require("mongodb");

const dev = process.argv.find(f => f == 'dev');
const uri = "mongodb+srv://evertonjackson:ars111213@clustercatalog.hjfuh.mongodb.net/CatalogProduct?retryWrites=true&w=majority";

let client = null;
async function mongoConnect() {
  client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  await client.connect();

  return dev ? client.db("teste") : client.db("CatalogProduct");
}

module.exports = mongoConnect; 