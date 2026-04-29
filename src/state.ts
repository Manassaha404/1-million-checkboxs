import { redisState } from "./redis.js";
export const stateKey = "checkboxs";
export async function stateConnect() {
  if (!(await redisState.get(stateKey))) {
    await redisState.set(
      "checkboxs",
      JSON.stringify(new Array(1000).fill(false)),
    );
  }else{
    return;
  }
}
