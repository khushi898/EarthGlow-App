import { MongoMemoryReplSet } from 'mongodb-memory-server-core';

// Starts one temporary MongoDB for the whole test run. Checkout uses
// transactions, which need a replica set. The first run downloads MongoDB.
export default async function setup() {
  const replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });

  process.env.TEST_MONGO_URI = replicaSet.getUri();

  return () => replicaSet.stop();
}
