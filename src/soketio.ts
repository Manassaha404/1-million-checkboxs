import {Server} from "socket.io"

const io = new Server()
import { publisher, subscriber, redisState } from "./redis.js";
import { raw } from "express";

await subscriber.subscribe("redis:client:checkbox:event")
subscriber.on('message', async (channel, message) => {
    if(channel === "redis:client:checkbox:event"){
        const {isChecked, index, userId, displayName} = JSON.parse(message);
        const rawData = await redisState.get("checkboxs")
        if(rawData){
            let checkboxs = JSON.parse(rawData);
            checkboxs[index] = isChecked;
            await redisState.set("checkboxs", JSON.stringify(checkboxs));
            io.emit("server:checkbox:event", { isChecked, index, userId, displayName })
        }
    }
})

io.on('connection',(socket) => {
    socket.on("client:checkbox:event", async({ isChecked, index, userId, displayName }) => {
        await publisher.publish("redis:client:checkbox:event", JSON.stringify({ isChecked, index, userId, displayName }))
    })
})

export default io;