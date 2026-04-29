import { Redis } from "ioredis";


const createRedisConnection = () => {
  return new Redis({ host: "localhost", port: 6379 });
};
export const publisher = createRedisConnection()
export const subscriber = createRedisConnection()
export const redisState = createRedisConnection()
