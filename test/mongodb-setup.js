import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';

let mongoServer = null;
let mongoClient = null;

export async function setupDatabase() {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();

  return {
    uri: mongoUri,
    client: mongoClient,
    db: mongoClient.db('scholarmarket-test'),
  };
}

export async function teardownDatabase() {
  if (mongoClient) {
    await mongoClient.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
}

export async function clearDatabase(db) {
  const collections = await db.listCollections().toArray();
  for (const collection of collections) {
    await db.collection(collection.name).deleteMany({});
  }
}
