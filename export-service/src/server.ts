import { createApp } from "./app";

const port = Number(process.env.EXPORT_SERVICE_PORT ?? process.env.PORT ?? 3002);
const app = createApp();

app.listen(port, () => {
  console.log(JSON.stringify({
    level: "info",
    event: "service_started",
    service: "songslide-export-service",
    port
  }));
});
