import { redisState } from "./app/common/configs/redis.js";
export const stateKey = "checkboxs";
const arraySize = 1000;
export async function stateConnect() {
  if (!(await redisState.get(stateKey))) {
    await redisState.set(
      "checkboxs",
      JSON.stringify(new Array(arraySize).fill(false)),
    );
  }else{
    return;
  }
}
